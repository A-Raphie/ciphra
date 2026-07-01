/**
 * Seeds the factory-registered exchange #0 with a real-token epoch:
 *   1. accredits the deployer as auditor (on the exchange's own credential)
 *   2. creates a cUSDC-denominated epoch
 *   3. submits 3 attestations (400k + 350k + 300k cUSDC = 1.05M, solvent)
 *
 * Run: pnpm exec hardhat run scripts/seed-factory.ts --network sepolia
 *
 * Reads addresses from the factory (exchange #0) rather than the standalone
 * deployment artifacts — the factory is the source of truth for onboarded
 * exchanges.
 */

import { ethers, fhevm, network } from "hardhat";
import { ProofOfReservesFactory__factory, ProofOfReserves__factory, AuditorCredential__factory } from "../types";

// cUSDC on Sepolia (from the fhevm-cookbook token registry).
const CUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const CUSDC_DECIMALS = 6;

async function main() {
  const [deployer] = await ethers.getSigners();
  const factoryAddr = process.env.FACTORY_ADDRESS;
  if (!factoryAddr) throw new Error("Set FACTORY_ADDRESS env (the deployed ProofOfReservesFactory).");

  const factory = ProofOfReservesFactory__factory.connect(factoryAddr, deployer);
  const ex = await factory.getExchange(0n);
  console.log(`\n🌾 Seeding factory exchange #0 on ${network.name}`);
  console.log(`   PoR:        ${ex.por}`);
  console.log(`   credential: ${ex.auditorCredential}\n`);

  const por = ProofOfReserves__factory.connect(ex.por, deployer);
  const cred = AuditorCredential__factory.connect(ex.auditorCredential, deployer);

  console.log("   initializing fhevm…");
  await fhevm.initializeCLIApi();

  // 1. Accredit the deployer as auditor (registrar is the admin = deployer here).
  const already = await cred.isAuditor(deployer.address);
  if (!already) {
    console.log("   accrediting deployer as auditor…");
    const atx = await cred.accredit(deployer.address);
    await atx.wait();
    console.log("   ✓ accredited.");
  } else {
    console.log("   already accredited.");
  }

  // 2. Create a cUSDC-denominated epoch (liabilities 1,000,000 cUSDC base units, 1h window).
  console.log("   creating cUSDC epoch (liabilities 1,000,000)…");
  const ctx = await por.createEpoch(CUSDC, CUSDC_DECIMALS, 1_000_000n, 3600);
  const rcpt = await ctx.wait();
  const event = rcpt!.logs.map((l) => por.interface.parseLog(l)).find((p) => p && p.name === "EpochCreated");
  const epochId = event!.args.epochId;
  const deadline = event!.args.deadline;
  console.log(`   ✓ epoch ${epochId} created. deadline ${new Date(Number(deadline) * 1000).toISOString()}`);

  // 3. Submit 3 attestations. The exchangeSigner for exchange #0 is the persisted key.
  const exchangeSigner = process.env.EXCHANGE_SIGNER_PRIVATE_KEY;
  if (!exchangeSigner) throw new Error("EXCHANGE_SIGNER_PRIVATE_KEY not set.");
  const signerWallet = new ethers.Wallet(exchangeSigner, deployer.provider);

  // Fund 3 throwaway customer wallets so they can submit (they pay gas).
  const customers = [];
  for (let i = 0; i < 3; i++) customers.push(ethers.Wallet.createRandom().connect(deployer.provider));
  console.log("   funding 3 customer wallets…");
  for (const c of customers) {
    const tx = await deployer.sendTransaction({ to: c.address, value: ethers.parseEther("0.05") });
    await tx.wait();
  }

  const balances = [400_000n, 350_000n, 300_000n];
  for (let i = 0; i < 3; i++) {
    const c = customers[i];
    const balance = balances[i];
    // Encrypt as the customer.
    const porAsCustomer = por.connect(c);
    const enc = await fhevm.createEncryptedInput(await porAsCustomer.getAddress(), c.address).add64(balance).encrypt();
    const handle = enc.handles[0];
    // Sign as the exchange.
    const packed = ethers.solidityPacked(
      ["uint256", "address", "address", "bytes32", "uint64"],
      [epochId, CUSDC, c.address, ethers.hexlify(handle), deadline],
    );
    const rawHash = ethers.keccak256(packed);
    const signature = await signerWallet.signMessage(ethers.getBytes(rawHash));
    console.log(`   attestation ${i + 1}/3: ${balance} cUSDC (customer ${c.address.slice(0, 8)}…)…`);
    const tx = await porAsCustomer.registerAttestation(epochId, handle, ethers.hexlify(enc.inputProof), signature);
    await tx.wait();
    console.log(`   ✓ attested.`);
  }

  console.log(`\n✅ Exchange #0 seeded: epoch ${epochId}, 3 cUSDC attestations (1.05M reserves ≥ 1M liabilities).`);
  console.log(`   Reveal after ${new Date(Number(deadline) * 1000).toLocaleString()} via scripts/reveal.ts (POR address = ${ex.por}).\n`);
}

main().catch((e) => {
  console.error("\n❌ Seed failed:", e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
