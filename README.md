# FHE Proof-of-Reserves — Confidential solvency proofs on Zama Protocol

> An exchange proves it holds more than it owes — without revealing a single
> customer balance.

Built for the [Zama Developer Program — Builder Track](https://forms.zama.org/developer-program-mainnet-season3-builder-track).

## Demo
- Live site: `<deploy URL>` _(TODO: Vercel URL)_
- 3-min pitch: `<video URL>` _(TODO)_
- X thread: `<thread URL>` _(TODO)_

## The problem
After FTX, exchanges publish "Proof-of-Reserves" — but every approach in
production today leaks customer data:

| Approach | What leaks |
|----------|-----------|
| Binance-style Merkle tree | tree structure + leaf values |
| Kraken-style signed balances | every customer's exact balance |
| Commit-reveal aggregate | every balance at reveal time |

## The FHE solution
_(TODO: 3-pane diagram; the trustless flow; why FHE is *required*, not
nice-to-have. Anchor to the post-FTX narrative.)_

## Why FHE? (verified against the ACL graph)
_(TODO: every claim below will map to specific lines in `ProofOfReserves.sol`.
This table IS the contract's ACL audit.)_

| Claim | Enforced by |
|-------|------------|
| `<claim 1>` | `<file:line>` |
| `<claim 2>` | `<file:line>` |

## Architecture
_(TODO: 3-pane diagram — Customer / Exchange CLI / Contract / Auditor)_

## Smart contracts
_(TODO: ProofOfReserves.sol overview, key functions, Etherscan link)_

## Getting started
_(TODO: install, env, deploy, dev)_

## License
BSD-3-Clause-Clear
