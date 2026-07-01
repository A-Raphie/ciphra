# 3-minute pitch — script outline

> Rules require a **real-person** pitch (no AI voice/video). This is the outline
> you record against. Target 2:45–3:00. The structure lands the hook, the
> composable-privacy angle (the Season-3 theme), the live demo, and the
> trustless differentiator.

## 0:00–0:15 — Hook
- "After FTX, every exchange publishes a Proof-of-Reserves. But every single one
  leaks customer balances — Merkle leaves, signed statements, the works."
- Hold up / show a redacted exchange balance table. "What if we could prove
  solvency without revealing any of these — and decide *who* gets to see the
  bottom line at all?"
- **Alt one-liner (pick one):** "Proof-of-Reserves where the exchange can't lie,
  customers can't be doxxed, and only a credentialed auditor ever sees the total."

## 0:15–0:40 — The idea + the composable-privacy hook
- "I built FHE Proof-of-Reserves on the Zama Protocol: an exchange proves its
  reserves exceed its liabilities while every customer balance stays fully
  encrypted on-chain — **denominated in real tokens** like cUSDC."
- One-line on FHE: "the contract can add and compare ciphertexts without ever
  decrypting them."
- **The Season-3 angle (land this):** "But here's the composition. Not everyone
  should see the reserve *total* — that's commercially sensitive. So I split
  decryption rights and gate them with an on-chain credential. The 1-bit
  solvency verdict is public. The actual reserve number is decryptable *only* by
  an auditor holding a soulbound ERC-721. That's composable privacy."
- "And it's a real product, not a single demo: any exchange can **onboard
  itself** via a factory contract — each gets its own isolated attestation
  contract, auditor registry, and reserve token."

## 0:40–1:40 — Live demo (screen recording, 4 panes)
1. **Onboard pane** — "First an exchange registers itself. One transaction
   deploys its own isolated contracts. The factory enforces the admin key and
   signing key are different — so a hot-key compromise can't forge attestations."
2. **Exchange pane** — "The exchange opens an epoch, **chooses its reserve token**
   (cUSDC), publishes its liabilities claim, and accredits an auditor — minting a
   non-transferable credential to a vetted address."
3. **Customer pane** — "A customer enters their balance. It's encrypted in their
   browser — this number never leaves their machine in plaintext. The exchange
   signs the ciphertext; the customer submits it."
   - Show 2 customers submitting. "The contract sums *ciphertexts*. Nobody —
     not even the contract deployer — can read any individual balance."
4. **Auditor pane** — "The window closes. Now the *auditor* — not anyone —
   triggers the reveal. The contract checks their credential on-chain, computes
   solvency via `FHE.ge`, marks the verdict public, and grants *that auditor
   alone* access to the encrypted total. The verdict lands on-chain: solvent.
   The total is never written on-chain — the auditor reads it off-chain."
4. **Fraud challenge** *(~20s — the most viscerally-FHE beat)* — "Now the
   exchange gets caught. It signed *two different* ciphertexts for the same
   customer. The customer submits both. The contract computes `FHE.ne` under
   encryption: do they differ? One bit decrypts — `true` — and the epoch is
   flagged fraudulent. **Neither balance was ever revealed**, not even during
   the fraud proof."

## 1:40–2:20 — The composable-privacy + trustless differentiator (the key slide)
- Show the README's ACL table. "Two things to see here. First, *composability*:
  the right to decrypt the total comes from `FHE.allow(total, auditor)`, and that
  call only happens after the contract verified `auditorCredential.balanceOf > 0`.
  Revoke the credential, the auditor loses all future access. The decryption
  right is derived from an on-chain identity primitive."
- "Second, *trustlessness*. There is **no operator** in the trust path. The
  contract decides solvency itself over ciphertexts. Each balance gets
  `allowThis` only — never `allow(operator)`. The only `FHE.allow` in the whole
  codebase is the one scoped to the auditor."

## 2:20–2:50 — Why this is *only* possible with FHE
- "Commit-reveal leaks at reveal. Merkle-sum leaks the tree. A trusted third
  party… isn't trustless. Only fully homomorphic encryption lets you prove a
  property of encrypted data without ever decrypting it."
- **The ZK objection, answered:** "Why not zero-knowledge proofs? Because ZK
  proves whatever the *prover* claims; the exchange picks the witness and could
  craft a false one. FHE *computes* the truth over ciphertexts the exchange
  already committed to and can't change. Trustless, not trust-the-prover."

## 2:50–3:00 — Close
- "FHE Proof-of-Reserves — composable confidential solvency. Open source, on
  Sepolia, 26 contract tests. Built for the Zama Developer Program, Season 3.
  Link below — thanks."

---

## Recording checklist
- [ ] 1080p screen capture, ~30fps, system audio off
- [ ] Pre-seed Sepolia: deploy both contracts, accredit yourself as auditor,
      open 1 epoch, fund 3 customer wallets
- [ ] Practice the Auditor-pane reveal once before recording (the public-decrypt
      + `fulfillVerdict` callback can take ~10–40s on Sepolia)
- [ ] Show the accreditation step clearly — it's the composable-privacy beat
- [ ] Real face/to-camera for the hook and close; screen recording for the demo
- [ ] No AI voiceover (would be disqualified)
