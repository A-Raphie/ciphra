"use client";

import { useId, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Shell } from "@/components/Shell";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TxLink } from "@/components/TxLink";
import { ErrorText } from "@/components/ErrorText";
import { CheckIcon, ShieldIcon } from "@/components/icons";
import { UndeployedBanner } from "@/components/UndeployedBanner";
import { proofOfReservesABI, auditorCredentialABI } from "@/lib/abi";
import {
  PROOF_OF_RESERVES_ADDRESS,
  AUDITOR_CREDENTIAL_ADDRESS,
  IS_UNDEPLOYED,
} from "@/lib/contract";
import { friendlyError } from "@/lib/errors";
import { isValidUint } from "@/lib/parse";

export default function ExchangePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [liabilities, setLiabilities] = useState("");
  const [windowSeconds, setWindowSeconds] = useState("3600");
  const [auditorAddr, setAuditorAddr] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [accreditTx, setAccreditTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liabId = useId();
  const windowId = useId();
  const auditorInputId = useId();

  const { data: nextEpochId } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "nextEpochId",
  });

  const { data: admin } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "exchangeAdmin",
  });

  const { data: signer } = useReadContract({
    address: PROOF_OF_RESERVES_ADDRESS,
    abi: proofOfReservesABI,
    functionName: "exchangeSigner",
  });

  const isAdmin = !!address && admin === address;

  // Composable-privacy registrar: the AuditorCredential's registrar (expected to
  // be the admin) accredits auditors. Only a registrar may accredit/revoke.
  const { data: registrar } = useReadContract({
    address: AUDITOR_CREDENTIAL_ADDRESS,
    abi: auditorCredentialABI,
    functionName: "registrar",
  });
  const isRegistrar = !!address && registrar === address;

  // Live validation — disables submit instead of throwing on bad input.
  const liabValid = isValidUint(liabilities);
  const windowValid = isValidUint(windowSeconds);
  const canSubmit = liabValid && windowValid && !isPending;
  const auditorAddrValid = /^0x[a-fA-F0-9]{40}$/.test(auditorAddr);
  const canAccredit = auditorAddrValid && !isPending;

  async function handleCreate() {
    if (!liabValid || !windowValid) return;
    setError(null);
    setTxHash(null);
    try {
      const hash = await writeContractAsync({
        address: PROOF_OF_RESERVES_ADDRESS,
        abi: proofOfReservesABI,
        functionName: "createEpoch",
        args: [BigInt(liabilities), BigInt(windowSeconds)],
      });
      setTxHash(hash);
      setLiabilities("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function handleAccredit() {
    if (!auditorAddrValid) return;
    setError(null);
    setAccreditTx(null);
    try {
      const hash = await writeContractAsync({
        address: AUDITOR_CREDENTIAL_ADDRESS,
        abi: auditorCredentialABI,
        functionName: "accredit",
        args: [auditorAddr as `0x${string}`],
      });
      setAccreditTx(hash);
      setAuditorAddr("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">Exchange back-office</h1>
      <p className="mb-6 text-muted">
        Open an attestation epoch and publish the liabilities claim.
      </p>

      {IS_UNDEPLOYED && <UndeployedBanner />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Contract state</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Next epoch id</dt>
              <dd className="font-mono">{nextEpochId?.toString() ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Contract</dt>
              <dd>
                <TxLink value={PROOF_OF_RESERVES_ADDRESS} type="address" />
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Exchange admin</dt>
              <dd className="font-mono text-xs">
                {admin ? <TxLink value={admin} type="address" /> : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Exchange signer</dt>
              <dd className="font-mono text-xs">
                {signer ? <TxLink value={signer} type="address" /> : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Your role</dt>
              <dd className="inline-flex items-center gap-1">
                {isAdmin ? (
                  <>
                    <CheckIcon className="text-success" aria-label="Admin" /> admin
                  </>
                ) : (
                  "read-only"
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Open new epoch</h2>
          <NetworkGuard>
            {!isConnected ? (
              <p className="text-sm text-muted">Connect your wallet first.</p>
            ) : !isAdmin ? (
              <p className="text-sm text-warning">
                Only the exchange admin can create epochs. Connect the admin
                wallet (the one set at deployment).
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label" htmlFor={liabId}>
                    Claimed liabilities (units)
                  </label>
                  <input
                    id={liabId}
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 1000000"
                    value={liabilities}
                    onChange={(e) => setLiabilities(e.target.value)}
                    aria-invalid={liabilities.length > 0 && !liabValid}
                    aria-describedby={liabilities.length > 0 && !liabValid ? "liab-err" : undefined}
                  />
                  {liabilities.length > 0 && !liabValid && (
                    <p id="liab-err" className="mt-1 text-xs text-danger">
                      Enter a whole, non-negative number.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor={windowId}>
                    Attestation window (seconds)
                  </label>
                  <input
                    id={windowId}
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="3600"
                    value={windowSeconds}
                    onChange={(e) => setWindowSeconds(e.target.value)}
                    aria-invalid={windowSeconds.length > 0 && !windowValid}
                  />
                </div>
                <button
                  className="btn-primary w-full"
                  disabled={!canSubmit}
                  onClick={handleCreate}
                >
                  {isPending ? "Opening…" : "Open epoch"}
                </button>
                {txHash && (
                  <p className="text-xs text-success" aria-live="polite">
                    Epoch opened: <TxLink value={txHash} type="tx" /> — see the
                    Auditor tab.
                  </p>
                )}
                <ErrorText error={error} />
              </div>
            )}
          </NetworkGuard>
        </div>
      </div>

      {/* Composable-privacy registrar: accredit auditors (ERC-721 credential). */}
      <div className="mt-4 card">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <ShieldIcon aria-label="Auditor credential" /> Auditor accreditation
        </h2>
        <p className="mb-3 text-sm text-muted">
          The registrar accredits auditors with a soulbound ERC-721 credential.
          Only a credential holder can drive an epoch&rsquo;s reveal and decrypt
          the aggregate reserve total off-chain.
        </p>
        <NetworkGuard>
          {!isConnected ? (
            <p className="text-sm text-muted">Connect your wallet first.</p>
          ) : !isRegistrar ? (
            <p className="text-sm text-warning">
              Only the registrar ({registrar ? `${registrar.slice(0, 8)}…` : "—"}) can
              accredit auditors. The registrar is set at deployment (defaults to the
              exchange admin).
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor={auditorInputId}>
                  Auditor address to accredit
                </label>
                <input
                  id={auditorInputId}
                  className="input"
                  type="text"
                  placeholder="0x…"
                  value={auditorAddr}
                  onChange={(e) => setAuditorAddr(e.target.value)}
                  aria-invalid={auditorAddr.length > 0 && !auditorAddrValid}
                />
                {auditorAddr.length > 0 && !auditorAddrValid && (
                  <p className="mt-1 text-xs text-danger">Enter a valid 0x address.</p>
                )}
              </div>
              <button
                className="btn-primary"
                disabled={!canAccredit}
                onClick={handleAccredit}
              >
                {isPending ? "Accrediting…" : "Accredit auditor"}
              </button>
              {accreditTx && (
                <p className="text-xs text-success" aria-live="polite">
                  Accredited: <TxLink value={accreditTx} type="tx" />
                </p>
              )}
            </div>
          )}
        </NetworkGuard>
      </div>

      <p className="mt-6 text-xs text-muted">
        Note: &ldquo;liabilities&rdquo; here is denominated in plain balance
        units. In production this would be a token amount.
      </p>
    </Shell>
  );
}
