/**
 * Reveals + fulfills the verdict for a factory-registered exchange's epoch.
 *   1. accredits the deployer as auditor (if not already)
 *   2. requestReveal (auditor-gated; grants the total to the auditor)
 *   3. publicDecrypt + fulfillVerdict (the 1-bit verdict)
 *
 * Run: FACTORY_EXCHANGE_ID=0 pnpm exec hardhat run scripts/reveal-factory.ts --network sepolia
 */

import { ethers, fhevm, network } from "hardhat";
import { ProofOfReservesFactory__factory, ProofOfReserves__factory, AuditorCredential__factory } from "../types";

async function main() {
  const [signer] = await ethers.getSigners();
  const factoryAddr = process.env.FACTORY_ADDRESS;
  const exchangeId = BigInt(process.env.FACTORY_EXCHANGE_ID ?? "0");
  const epochId = BigInt(process.env.EPOCH_ID ?? "0");
  if (!factoryAddr) throw new Error("Set FACTORY_ADDRESS env.");

  const factory = ProofOfReservesFactory__factory.connect(factoryAddr, signer);
  const ex = await factory.getExchange(exchangeId);
  const por = ProofOfReserves__factory.connect(ex.por, signer);
  const cred = AuditorCredential__factory.connect(ex.auditorCredential, signer);

  console.log(`\n🔓 Revealing epoch ${epochId} for factory exchange #${exchangeId} on ${network.name}\n`);

  console.log("   initializing fhevm…");
  await fhevm.initializeCLIApi();

  const isAuditor = await cred.isAuditor(signer.address);
  if (!isAuditor) {
    console.log("   accrediting signer as auditor…");
    const registrar = await cred.registrar();
    if (registrar.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`${signer.address} is not the registrar (${registrar}).`);
    }
    const atx = await cred.accredit(signer.address);
    await atx.wait();
    console.log("   ✓ accredited.");
  }

  const epoch = await por.getEpoch(epochId);
  if (epoch.fulfilled) {
    console.log("   already fulfilled — nothing to do.");
    return;
  }
  if (!epoch.revealed) {
    console.log("   requestReveal()…");
    const tx = await por.requestReveal(epochId);
    await tx.wait();
    console.log("   ✓ revealed.");
  }

  const solventHandle = await por.getEncryptedSolvent(epochId);
  const solventRaw = ethers.dataSlice(solventHandle.toString(), 0, 32);
  console.log("   publicDecrypt + fulfillVerdict()…");
  const result = await fhevm.publicDecrypt([solventRaw as `0x${string}`]);
  const tx = await por.fulfillVerdict(
    epochId,
    [solventRaw as `0x${string}`],
    result.abiEncodedClearValues,
    result.decryptionProof,
  );
  await tx.wait();

  const final = await por.getEpoch(epochId);
  console.log(`\n✅ Verdict on-chain: solvent = ${final.solvent}\n`);
}

main().catch((e) => {
  console.error("\n❌ Reveal failed:", e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
