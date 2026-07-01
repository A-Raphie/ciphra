// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {AuditorCredential} from "./AuditorCredential.sol";
import {ProofOfReserves} from "./ProofOfReserves.sol";

/**
 * @title  ProofOfReservesFactory
 * @notice Onboards exchanges: each call deploys a fresh, isolated
 *         `(AuditorCredential, ProofOfReserves)` pair so every exchange gets
 *         its own attestation contract, its own auditor registry, and its own
 *         immutable roles.
 *
 *         This is the "working product" seam: instead of a single hardcoded
 *         exchange, the app is a registry where any vetted deployer can stand
 *         up their own confidential PoR. The frontend indexes `ExchangeRegistered`
 *         to list all onboarded exchanges.
 *
 *         Design choice (factory over multi-exchange-single-contract): the core
 *         PoR contract's roles are `immutable` and its fraud/attestation maps
 *         are global. Refactoring to key-by-exchangeId would touch the
 *         constructor, modifiers, signature checks, and maps — invasive and
 *         risky to the proven ACL. A factory wrapping the proven per-exchange
 *         contract is additive and keeps the audited core intact.
 */
contract ProofOfReservesFactory {
    struct Exchange {
        address admin; // the exchange's hot key (creates epochs)
        address por; // the deployed ProofOfReserves for this exchange
        address auditorCredential; // the deployed credential contract
        uint64 registeredAt;
    }

    /// @notice All onboarded exchanges, indexed by exchangeId (0-based).
    mapping(uint256 => Exchange) private _exchanges;

    /// @notice Number of exchanges ever registered (monotonic).
    uint256 public exchangeCount;

    event ExchangeRegistered(
        uint256 indexed exchangeId,
        address indexed admin,
        address por,
        address auditorCredential,
        address exchangeSigner
    );

    error ZeroAddress();
    error AdminCannotBeSigner();
    error NoExchanges();

    /**
     * @notice Onboard a new exchange. Deploys an `AuditorCredential` (registrar
     *         = admin) and a `ProofOfReserves` bound to it.
     * @param  admin          The exchange's hot key — opens epochs, accredits auditors.
     * @param  exchangeSigner The exchange's cold key — signs attestations off-chain.
     * @return exchangeId     The new exchange's id (== exchangeCount before the call).
     */
    function registerExchange(address admin, address exchangeSigner)
        external
        returns (uint256 exchangeId)
    {
        if (admin == address(0) || exchangeSigner == address(0)) revert ZeroAddress();
        // The signing key MUST differ from the admin so a hot-key compromise
        // cannot forge attestations. Mirrors the PoR deploy warning.
        if (admin == exchangeSigner) revert AdminCannotBeSigner();

        AuditorCredential credential = new AuditorCredential(admin);
        ProofOfReserves por = new ProofOfReserves(admin, exchangeSigner, address(credential));

        exchangeId = exchangeCount++;
        _exchanges[exchangeId] = Exchange({
            admin: admin,
            por: address(por),
            auditorCredential: address(credential),
            registeredAt: uint64(block.timestamp)
        });

        emit ExchangeRegistered(exchangeId, admin, address(por), address(credential), exchangeSigner);
    }

    /**
     * @notice Fetch an exchange's deployed contracts + metadata.
     *         Reverts if `exchangeId >= exchangeCount`.
     */
    function getExchange(uint256 exchangeId) external view returns (Exchange memory) {
        if (exchangeCount == 0) revert NoExchanges();
        Exchange storage e = _exchanges[exchangeId];
        require(e.por != address(0), "Exchange does not exist");
        return e;
    }
}
