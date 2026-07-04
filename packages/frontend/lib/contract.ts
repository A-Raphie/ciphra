/**
 * Deployed contract addresses on Sepolia. Env vars take precedence (for
 * re-deploys to different addresses); the hardcoded fallbacks are the current
 * live Sepolia deploy so the app works even if env injection fails (Vercel
 * `encrypted` NEXT_PUBLIC vars can be flaky).
 */
export const PROOF_OF_RESERVES_ADDRESS = (process.env.NEXT_PUBLIC_POR_ADDRESS ??
  "0x9182cEF09299906bDb9Af5bD705135d06675018F") as `0x${string}`;

export const AUDITOR_CREDENTIAL_ADDRESS = (process.env.NEXT_PUBLIC_AUDITOR_CREDENTIAL_ADDRESS ??
  "0x56e66a35925aEf86D48C85D9222A1cD6dDa3B25b") as `0x${string}`;

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x95fd86974bbbDBf7a69c5b269f17Eb1a0BdA0690") as `0x${string}`;

// Always deployed (hardcoded Sepolia fallbacks); the banner is kept for safety
// but will never show with the current fallback addresses.
export const IS_UNDEPLOYED = PROOF_OF_RESERVES_ADDRESS === "0x0000000000000000000000000000000000000000";

/** Sepolia chain id (wagmi chain config + NetworkGuard). */
export const SEPOLIA_CHAIN_ID = 11155111;

/** Sepolia RPC URL (used by the standalone fhevm instance in config.ts). */
export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

/**
 * Known confidential tokens on Sepolia (from the fhevm-cookbook token registry).
 * Used to populate the token selector in createEpoch / onboarding.
 *
 * NOTE: addresses verified from
 * https://raw.githubusercontent.com/z-korp/fhevm-cookbook/main/skills/fhevm-token-registry/tokens.json
 */
export type TokenInfo = { address: `0x${string}`; symbol: string; decimals: number };

export const SEPOLIA_TOKENS: readonly TokenInfo[] = [
  { address: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639", symbol: "cUSDC", decimals: 6 },
  { address: "0x4E7B06D78965594eB5EF5414c357ca21E1554491", symbol: "cUSDT", decimals: 6 },
  { address: "0x46208622DA27d91db4f0393733C8BA082ed83158", symbol: "cWETH", decimals: 6 },
  { address: "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB", symbol: "cZAMA", decimals: 6 },
  { address: "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7", symbol: "cXAUt", decimals: 6 },
] as const;

/** Look up a token's info by address. Returns cUSDC as a fallback for unknowns. */
export function tokenInfo(address: string): TokenInfo {
  return (
    SEPOLIA_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? {
      address: address as `0x${string}`,
      symbol: "UNKNOWN",
      decimals: 6,
    }
  );
}
