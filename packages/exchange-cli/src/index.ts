#!/usr/bin/env tsx
//
// Exchange back-office CLI for FHE Proof-of-Reserves.
//
//   exchange-cli sign <epochId> <customer> <handleBytes32> <deadline>
//     -> prints the exchange's EIP-191 signature over the attestation hash
//        (the same hash ProofOfReserves._hashAttestation computes on-chain).
//
//   exchange-cli create-epoch <claimedLiabilities> <windowSeconds>
//     -> sends createEpoch() as the exchange admin and prints the new epoch id.
//
// Configure via env (see .env.example):
//   EXCHANGE_PRIVATE_KEY  — used both for signing and for the admin tx
//   SEPOLIA_RPC_URL       — Sepolia RPC endpoint
//   POR_ADDRESS           — deployed ProofOfReserves address
//
// The browser demo obtains signatures through /api/exchange/sign instead, but
// this CLI is the "real" exchange tool: it never ships the key to a browser,
// and it owns epoch creation.

import { ethers, type Log, type LogDescription } from "ethers";
import { readFileSync } from "node:fs";

const ABI = [
  "event EpochCreated(uint256 indexed epochId, uint64 claimedLiabilities, uint64 deadline)",
  "function createEpoch(uint64 claimedLiabilities, uint64 windowSeconds) external returns (uint256)",
  "function exchangeAdmin() view returns (address)",
  "function exchangeSigner() view returns (address)",
];

function hashAttestation(epochId: bigint, customer: string, handle: string, deadline: bigint): string {
  const packed = ethers.solidityPacked(
    ["uint256", "address", "bytes32", "uint64"],
    [epochId, customer, handle, deadline],
  );
  return ethers.keccak256(packed);
}

function env(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing env: ${key}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const [, , cmd, ...args] = process.argv;
  const rpc = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
  const por = env("POR_ADDRESS");
  const key = env("EXCHANGE_PRIVATE_KEY");
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(key, provider);
  const contract = new ethers.Contract(por, ABI, wallet);

  if (cmd === "sign") {
    const [epochId, customer, handle, deadline] = args;
    if (!epochId || !customer || !handle || !deadline) {
      console.error("usage: sign <epochId> <customer> <handleBytes32> <deadline>");
      process.exit(1);
    }
    const rawHash = hashAttestation(BigInt(epochId), customer, handle, BigInt(deadline));
    const sig = await wallet.signMessage(ethers.getBytes(rawHash));
    console.log(sig);
    return;
  }

  if (cmd === "create-epoch") {
    const [liabilities, windowSeconds] = args;
    if (!liabilities || !windowSeconds) {
      console.error("usage: create-epoch <claimedLiabilities> <windowSeconds>");
      process.exit(1);
    }
    const admin = await contract.exchangeAdmin();
    const signer = await contract.exchangeSigner();
    console.error(`contract:   ${por}`);
    console.error(`admin:      ${admin}  (signing wallet: ${wallet.address})`);
    console.error(`signer:     ${signer}`);
    if (wallet.address.toLowerCase() !== admin.toLowerCase()) {
      console.error("⚠ wallet is not the exchange admin — createEpoch will revert.");
    }
    const tx = await contract.createEpoch(BigInt(liabilities), BigInt(windowSeconds));
    const receipt = await tx.wait();
    const eventLog = receipt?.logs
      .map((l: Log): LogDescription | null => {
        try {
          return contract.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p: LogDescription | null): p is LogDescription => p !== null && p.name === "EpochCreated");
    console.log(eventLog ? `epoch ${eventLog.args.epochId} created` : `tx ${tx.hash}`);
    return;
  }

  console.error("commands: sign | create-epoch");
  process.exit(1);
}

// If a .env file is present next to the working dir, load it (zero-dep).
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  // no .env — rely on real env
}

main().catch((e) => {
  console.error(e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
