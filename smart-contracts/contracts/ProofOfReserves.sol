// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title  ProofOfReserves
 * @notice Confidential solvency proofs on Zama Protocol.
 *
 *         An exchange proves `sum(customerBalances) >= claimedLiabilities`
 *         WITHOUT revealing any individual customer balance:
 *
 *           1. Exchange off-chain signs + encrypts each customer's balance
 *              (the encrypted ciphertext + a signature over it).
 *           2. Customers submit (ciphertext, proof, signature) on-chain. The
 *              contract verifies the exchange's signature and homomorphically
 *              adds the ciphertext to a running encrypted total.
 *           3. After the attestation window closes, anyone calls
 *              `requestReveal()`. The contract computes the encrypted solvency
 *              bit `ge(total, claimedLiabilities)` and marks both the total
 *              and the bit as PUBLICLY decryptable.
 *           4. Anyone triggers public decryption via the FHEVM gateway; the
 *              threshold-decrypted result is verified on-chain in
 *              `fulfillPublicDecryption()` via KMS signatures.
 *
 *         TRUST MODEL — no operator is ever in the trust path:
 *           - Individual customer balances are NEVER decryptable by anyone
 *             (ACL: `allowThis` only). They are only ever homomorphically summed.
 *           - Only the aggregate total + the 1-bit solvency result are ever
 *             decrypted, and only publicly, only after the window closes.
 *           - The solvency bit is computed on-chain over ciphertexts; the
 *             operator cannot influence it. This is the difference vs. the
 *             predecessor "SealedBid" design which settled with operator-
 *             supplied plaintexts.
 */
contract ProofOfReserves is ZamaEthereumConfig {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Epoch {
        uint64 claimedLiabilities;
        uint64 deadline;
        euint64 encryptedTotal;
        ebool encryptedSolvent;
        uint64 revealedTotal;
        bool solvent;
        bool revealed; // requestReveal() called
        bool fulfilled; // public decryption result stored
        uint256 attestationCount;
    }

    /// @notice On-chain admin that creates epochs (hot wallet).
    address public immutable exchangeAdmin;
    /// @notice Off-chain key that signs each balance attestation (cold key).
    address public immutable exchangeSigner;

    uint256 public nextEpochId;

    mapping(uint256 => Epoch) private _epochs;
    /// @notice Prevents the same (epoch, customer, ciphertext) from being submitted twice.
    mapping(bytes32 => bool) public attestationUsed;

    event EpochCreated(uint256 indexed epochId, uint64 claimedLiabilities, uint64 deadline);
    event AttestationRegistered(uint256 indexed epochId, address indexed customer, bytes32 indexed attHash);
    event RevealRequested(uint256 indexed epochId, address indexed revealer);
    event PublicDecryptionFulfilled(uint256 indexed epochId, uint64 revealedTotal, bool solvent);

    error EpochNotFound();
    error EpochNotOpen();
    error EpochNotClosed();
    error NotRevealed();
    error NotFulfilled();
    error AlreadyFulfilled();
    error AttestationAlreadyUsed();
    error InvalidSignature();
    error NotExchangeAdmin();
    error HandleMismatch();
    error ZeroAddress();

    modifier onlyExchangeAdmin() {
        if (msg.sender != exchangeAdmin) revert NotExchangeAdmin();
        _;
    }

    constructor(address _exchangeAdmin, address _exchangeSigner) {
        if (_exchangeAdmin == address(0) || _exchangeSigner == address(0)) revert ZeroAddress();
        exchangeAdmin = _exchangeAdmin;
        exchangeSigner = _exchangeSigner;
    }

    // -------------------------------------------------------------------------------------------
    // Epoch lifecycle
    // -------------------------------------------------------------------------------------------

    /**
     * @notice Publish a new attestation window. Only the exchange admin may do this,
     *         since `claimedLiabilities` is the exchange's own solvency claim.
     */
    function createEpoch(uint64 claimedLiabilities, uint64 windowSeconds)
        external
        onlyExchangeAdmin
        returns (uint256 epochId)
    {
        unchecked {
            epochId = nextEpochId;
            ++nextEpochId;
        }
        Epoch storage e = _epochs[epochId];
        e.claimedLiabilities = claimedLiabilities;
        e.deadline = uint64(block.timestamp) + windowSeconds;

        // Initialize the encrypted running total to an encrypted zero.
        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(zero);
        e.encryptedTotal = zero;

        emit EpochCreated(epochId, claimedLiabilities, e.deadline);
    }

    /**
     * @notice Submit an exchange-signed encrypted balance attestation.
     *
     * @param encryptedBalance Client-encrypted balance (produced by the exchange CLI).
     * @param inputProof       FHEVM proof tying the ciphertext to a known plaintext.
     * @param signature        exchangeSigner's EIP-191 signature over the attestation hash.
     *
     * @dev ACL discipline (anti-pattern from SealedBid autopsy): the individual
     *      balance ciphertext receives `allowThis` ONLY — never `allow(operator)`.
     *      It is therefore permanently undecryptable by anyone; it can only be
     *      homomorphically added into the aggregate.
     */
    function registerAttestation(
        uint256 epochId,
        externalEuint64 encryptedBalance,
        bytes calldata inputProof,
        bytes calldata signature
    ) external {
        Epoch storage e = _epochs[epochId];
        if (e.deadline == 0) revert EpochNotFound();
        if (block.timestamp >= e.deadline) revert EpochNotOpen();

        // The exchange commits to the exact ciphertext + customer + epoch off-chain.
        bytes32 attHash = _hashAttestation(epochId, msg.sender, encryptedBalance, e.deadline);
        if (attestationUsed[attHash]) revert AttestationAlreadyUsed();

        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(attHash);
        if (ethSigned.recover(signature) != exchangeSigner) revert InvalidSignature();

        attestationUsed[attHash] = true;
        ++e.attestationCount;

        euint64 enc = FHE.fromExternal(encryptedBalance, inputProof);
        FHE.allowThis(enc); // contract-only ACL — individual balance stays private forever

        e.encryptedTotal = FHE.add(e.encryptedTotal, enc);
        FHE.allowThis(e.encryptedTotal);

        emit AttestationRegistered(epochId, msg.sender, attHash);
    }

    /**
     * @notice After the window closes, compute the encrypted solvency bit on-chain
     *         and mark the total + bit as publicly decryptable. Callable by anyone.
     *
     *         This is the trustless core: the contract decides solvency over
     *         ciphertexts; no operator supplies a plaintext result.
     */
    function requestReveal(uint256 epochId) external {
        Epoch storage e = _epochs[epochId];
        if (e.deadline == 0) revert EpochNotFound();
        if (block.timestamp < e.deadline) revert EpochNotClosed();
        if (e.revealed) revert AlreadyFulfilled();

        e.encryptedSolvent = FHE.ge(e.encryptedTotal, FHE.asEuint64(e.claimedLiabilities));

        // Mark both the aggregate total and the 1-bit solvency result as
        // PUBLICLY decryptable. Anyone can then drive the decryption via the
        // gateway; the result is verified on-chain in fulfillPublicDecryption().
        FHE.makePubliclyDecryptable(e.encryptedTotal);
        FHE.makePubliclyDecryptable(e.encryptedSolvent);

        e.revealed = true;
        emit RevealRequested(epochId, msg.sender);
    }

    /**
     * @notice Public-decryption callback. Verifies the KMS threshold signatures
     *         over the decrypted cleartexts and stores the result on-chain.
     *         Callable by anyone (a keeper, the auditor UI, etc.).
     *
     * @param handlesList         [encryptedTotal, encryptedSolvent] handles.
     * @param abiEncodedCleartexts abi.encode(uint64 total, bool solvent).
     * @param decryptionProof     KMS public-decryption proof.
     */
    function fulfillPublicDecryption(
        uint256 epochId,
        bytes32[] calldata handlesList,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external {
        Epoch storage e = _epochs[epochId];
        if (!e.revealed) revert NotRevealed();
        if (e.fulfilled) revert AlreadyFulfilled();

        bytes32 totalHandle = euint64.unwrap(e.encryptedTotal);
        bytes32 solventHandle = ebool.unwrap(e.encryptedSolvent);
        if (handlesList.length != 2 || handlesList[0] != totalHandle || handlesList[1] != solventHandle) {
            revert HandleMismatch();
        }

        // Reverts if KMS signatures are invalid; emits PublicDecryptionVerified on success.
        FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);

        (uint64 total, bool solvent) = abi.decode(abiEncodedCleartexts, (uint64, bool));
        e.revealedTotal = total;
        e.solvent = solvent;
        e.fulfilled = true;

        emit PublicDecryptionFulfilled(epochId, total, solvent);
    }

    // -------------------------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------------------------

    function getEpoch(uint256 epochId)
        external
        view
        returns (
            uint64 claimedLiabilities,
            uint64 deadline,
            uint64 revealedTotal,
            bool solvent,
            bool revealed,
            bool fulfilled,
            uint256 attestationCount
        )
    {
        Epoch storage e = _epochs[epochId];
        return (
            e.claimedLiabilities,
            e.deadline,
            e.revealedTotal,
            e.solvent,
            e.revealed,
            e.fulfilled,
            e.attestationCount
        );
    }

    function getEncryptedTotal(uint256 epochId) external view returns (euint64) {
        return _epochs[epochId].encryptedTotal;
    }

    function getEncryptedSolvent(uint256 epochId) external view returns (ebool) {
        return _epochs[epochId].encryptedSolvent;
    }

    function isSolvent(uint256 epochId) external view returns (bool) {
        if (!_epochs[epochId].fulfilled) revert NotFulfilled();
        return _epochs[epochId].solvent;
    }

    // -------------------------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------------------------

    /**
     * @dev Attestation hash. The exchange CLI MUST reproduce this exactly when signing.
     *      Bindings: epochId (replay scope), customer (who may submit), the ciphertext
     *      handle (prevents swapping in an inflated balance), and the deadline
     *      (window scope).
     */
    function _hashAttestation(
        uint256 epochId,
        address customer,
        externalEuint64 encryptedBalance,
        uint64 deadline
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(epochId, customer, externalEuint64.unwrap(encryptedBalance), deadline));
    }
}
