import { Shell } from "@/components/Shell";
import { Reveal } from "@/components/Reveal";
import { CheckIcon, XIcon, LockIcon, KeyIcon } from "@/components/icons";
import {
  PROOF_OF_RESERVES_ADDRESS,
  AUDITOR_CREDENTIAL_ADDRESS,
  FACTORY_ADDRESS,
} from "@/lib/contract";

const SEPOLIA_BASE = "https://sepolia.etherscan.io/address";

export default function JudgesPage() {
  return (
    <Shell>
      <Reveal>
        <header className="mb-10">
          <h1 className="text-3xl font-bold">For Judges</h1>
          <p className="mt-2 max-w-2xl text-muted">
            A guided walkthrough of Seal — what it does, why FHE matters here,
            and how to verify every claim on-chain. No wallet needed to read
            this page.
          </p>
        </header>
      </Reveal>

      {/* ── What is Seal? ── */}
      <Reveal delay={50}>
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">What is Seal?</h2>
          <div className="card">
            <p className="text-sm text-muted leading-relaxed">
              Seal is a <strong className="text-foreground">confidential Proof-of-Reserves protocol</strong> on
              the Zama Protocol. It lets crypto exchanges prove they are solvent
              (assets ≥ liabilities) without revealing any individual customer
              balance.
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Every customer balance is encrypted <em>client-side</em> before
              submission. The contract sums ciphertexts{" "}
              <strong className="text-foreground">homomorphically</strong> — no
              plaintext is ever touched. Only two things are ever decrypted: a{" "}
              <strong className="text-foreground">1-bit solvency verdict</strong>{" "}
              (public) and the{" "}
              <strong className="text-foreground">aggregate total</strong>{" "}
              (auditor-gated via soulbound ERC-721 credential).
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── Why FHE? ── */}
      <Reveal delay={100}>
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Why FHE?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card">
              <div className="mb-2 flex items-center gap-2">
                <LockIcon className="text-accent" aria-hidden />
                <span className="text-sm font-semibold">Without FHE</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted">
                <li className="flex gap-2"><XIcon className="mt-0.5 h-3 w-3 shrink-0 text-danger" aria-hidden /> Customer balances visible to the contract operator</li>
                <li className="flex gap-2"><XIcon className="mt-0.5 h-3 w-3 shrink-0 text-danger" aria-hidden /> Reserves can be inflated with fake accounts</li>
                <li className="flex gap-2"><XIcon className="mt-0.5 h-3 w-3 shrink-0 text-danger" aria-hidden /> Privacy requires trusting a central party</li>
              </ul>
            </div>
            <div className="card rail-cyan">
              <div className="mb-2 flex items-center gap-2">
                <LockIcon className="text-cyan" aria-hidden />
                <span className="text-sm font-semibold">With FHE (Seal)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted">
                <li className="flex gap-2"><CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-cyan" aria-hidden /> Balances encrypted client-side, never decryptable by anyone</li>
                <li className="flex gap-2"><CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-cyan" aria-hidden /> Reserve total computed under encryption — no inflation possible</li>
                <li className="flex gap-2"><CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-cyan" aria-hidden /> Only the 1-bit verdict is public — zero privacy leakage</li>
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── The ACL guarantee ── */}
      <Reveal delay={150}>
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">The ACL guarantee</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 pr-4 font-semibold text-foreground">Ciphertext</th>
                  <th className="pb-2 pr-4 font-semibold text-foreground">ACL</th>
                  <th className="pb-2 font-semibold text-foreground">Why</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-line/50">
                  <td className="py-2 pr-4 font-mono">customer balance</td>
                  <td className="py-2 pr-4"><code className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">allowThis</code> only</td>
                  <td className="py-2">Contract can FHE.add it. Nobody else can read it — ever.</td>
                </tr>
                <tr className="border-b border-line/50">
                  <td className="py-2 pr-4 font-mono">encryptedTotal</td>
                  <td className="py-2 pr-4"><code className="rounded bg-cyan/10 px-1.5 py-0.5 text-cyan">allowPublic</code> after deadline</td>
                  <td className="py-2">Only after the attestation window closes. Auditors decrypt the real number.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">encryptedSolvent</td>
                  <td className="py-2 pr-4"><code className="rounded bg-cyan/10 px-1.5 py-0.5 text-cyan">allowPublic</code> after deadline</td>
                  <td className="py-2">1-bit verdict. Anyone can read it. Public good.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </Reveal>

      {/* ── How to verify on-chain ── */}
      <Reveal delay={200}>
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">How to verify on-chain</h2>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Deployed contracts",
                desc: "Three verified contracts on Sepolia — Factory, ProofOfReserves, AuditorCredential.",
                links: [
                  { label: "Factory", address: FACTORY_ADDRESS },
                  { label: "ProofOfReserves (Exchange #0)", address: PROOF_OF_RESERVES_ADDRESS },
                  { label: "AuditorCredential", address: AUDITOR_CREDENTIAL_ADDRESS },
                ],
              },
              {
                step: "2",
                title: "Check the test suite",
                desc: "35 tests covering every path: deployment, access control, token denomination, happy path, insolvent case, composable-privacy gate, fraud challenge, multi-epoch, cross-copy hash sync.",
                links: [],
              },
              {
                step: "3",
                title: "Read the ACL audit",
                desc: "The README contains a full ACL audit table mapping every claim to lines of code in ProofOfReserves.sol.",
                links: [],
              },
            ].map((item) => (
              <div key={item.step} className="card">
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {item.step}
                  </span>
                  <span className="text-sm font-semibold">{item.title}</span>
                </div>
                <p className="text-xs text-muted">{item.desc}</p>
                {item.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.links.map((l) => (
                      <a
                        key={l.address}
                        href={`${SEPOLIA_BASE}/${l.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-line bg-black/20 px-2 py-1 font-mono text-[10px] text-muted transition hover:border-accent/40 hover:text-foreground"
                      >
                        {l.label}: {l.address.slice(0, 6)}…{l.address.slice(-4)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── The flow ── */}
      <Reveal delay={250}>
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">The end-to-end flow</h2>
          <div className="card">
            <div className="space-y-4">
              {[
                { icon: <KeyIcon className="text-accent" aria-hidden />, label: "Exchange signs attestation", desc: "Off-chain, EIP-191. Binds (epochId, token, customer, ciphertext, deadline)." },
                { icon: <LockIcon className="text-accent" aria-hidden />, label: "Customer encrypts balance", desc: "Client-side FHE encryption. Balance never leaves the browser as plaintext." },
                { icon: <span className="text-lg text-accent font-mono" aria-hidden>Σ</span>, label: "Contract sums ciphertexts", desc: "FHE.add accumulates encrypted balances. No decryption at any point." },
                { icon: <CheckIcon className="text-cyan" aria-hidden />, label: "1-bit verdict goes public", desc: "After the deadline, FHE.ge(total, liabilities) → true/false. Anyone can read." },
                { icon: <KeyIcon className="text-accent" aria-hidden />, label: "Auditor decrypts total", desc: "Soulbound ERC-721 credential holder decrypts the aggregate reserve number." },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-black/20">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Key design decisions ── */}
      <Reveal delay={300}>
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Key design decisions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card">
              <p className="mb-1 text-sm font-semibold">No operator in the trust path</p>
              <p className="text-xs text-muted">The contract computes the public result. There is no onlyOwner function that accepts plaintext derived from server-side decryption.</p>
            </div>
            <div className="card">
              <p className="mb-1 text-sm font-semibold">Fraud challenges via FHE.ne</p>
              <p className="text-xs text-muted">A customer can prove the exchange signed conflicting attestations — revealing only a 1-bit &ldquo;they differ&rdquo; flag. Neither balance leaks.</p>
            </div>
            <div className="card">
              <p className="mb-1 text-sm font-semibold">Auditor-gated aggregate total</p>
              <p className="text-xs text-muted">The reserve number is commercially sensitive. Only a soulbound ERC-721 credential holder can decrypt it. Revoke = instant loss of access.</p>
            </div>
            <div className="card">
              <p className="mb-1 text-sm font-semibold">Token denomination with 3-copy hash sync</p>
              <p className="text-xs text-muted">Attestations bind to a specific token (cUSDC, cUSDT, etc.). A cUSDC attestation cannot be replayed as cUSDT. Frontend, CLI, and contract hash functions are kept in sync via a cross-copy test.</p>
            </div>
          </div>
        </section>
      </Reveal>
    </Shell>
  );
}
