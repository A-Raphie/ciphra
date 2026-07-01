# X thread — draft

> Post as a reply-chain (1/ → n/). Replace `<URL>` placeholders before posting.
> Tone: builder, concrete, no hype words. Lead with the hook. Tag `@zama` and
> use `#ZamaDeveloperProgram` (that's the Season-3 promo requirement).

---

1/ After FTX, every exchange publishes "Proof-of-Reserves." But every approach in production today — Merkle-sum trees, signed balances, commit-reveal — leaks customer balances to the world.

What if an exchange could prove solvency without doxxing a single customer — and decide *who* gets to see the bottom line at all? 🧵

2/ Introducing **FHE Proof-of-Reserves** — composable confidential solvency on the @zama Protocol.

An exchange proves `reserves ≥ liabilities` — denominated in **real tokens** like cUSDC — while every customer balance stays encrypted on-chain. And it's a real product: any exchange can onboard itself. Built for Zama Developer Program Season 3: *"Composable Privacy Is the Key."*

<URL>

3/ The composition. Not everyone should see the reserve *total* — that's commercially sensitive. So decryption rights are split and gated by an on-chain credential:

🟢 1-bit solvency verdict → **public** (it's a public good)
🔒 Aggregate reserve total → **accredited auditors only**, off-chain
🔒 Each customer balance → **no one, ever** (summed, never read)

4/ How it works:

1️⃣ An exchange **onboards itself** via a factory contract — gets its own isolated attestation contract, auditor registry, and reserve token
2️⃣ Each customer's balance is encrypted in their browser (euint64), denominated in the epoch's token (cUSDC, cUSDT…)
3️⃣ The exchange signs the ciphertext off-chain; the contract sums **ciphertexts** with `FHE.add` — it never sees a plaintext
4️⃣ After the window, an auditor with a soulbound ERC-721 credential drives the reveal; `FHE.ge(total, liabilities)` decides solvency on-chain

5/ The composable-privacy seam: `requestReveal` checks `auditorCredential.balanceOf(msg.sender) > 0` *before any FHE work*, then calls `FHE.allow(encryptedTotal, msg.sender)`. The right to decrypt the total is derived from an on-chain identity primitive. Revoke the credential → the auditor loses all future access instantly.

6/ The key word is **trustless**. The solvency bit is computed on-chain over ciphertexts — no operator supplies a plaintext result. The public verdict is verified by KMS threshold-signatures (`FHE.checkSignatures`). The total is never even written on-chain — the auditor reads it off-chain via EIP-712 `userDecrypt`.

7/ ACL discipline is the whole game. Every customer balance gets `FHE.allowThis` only — permanently undecryptable by anyone, including the deployer. The *only* `FHE.allow` in the entire codebase is the one scoped to the auditor. The README ships an ACL audit table mapping every privacy claim to a line of Solidity.

8/ Why FHE and not ZK? ZK proves whatever the *prover* claims — the exchange picks the witness and could craft a false one. FHE *computes* the result over ciphertexts the exchange committed to and can't change. Trustless, not trust-the-prover.

9/ Plus a **fraud challenge path**: if the exchange signs two ciphertexts encrypting *different* values for one customer, the customer proves it on-chain with `FHE.ne` — revealing only a 1-bit "they differ" flag. Neither balance leaks, even during the challenge.

10/ Open source, 26 contract tests green, live on Sepolia, 3-pane demo (exchange / customer / auditor) + an auditor accreditation flow.

Built for the @zama Developer Program, Season 3 Builder Track. #ZamaDeveloperProgram

🔗 Demo: <URL>
📦 Code: <github>
🎥 3-min pitch: <video>

---

# Hashtags / mentions to use
@zama · #ZamaDeveloperProgram · #FHE · #FHEVM · #Ethereum · #Privacy · #ProofOfReserves · #ComposablePrivacy
