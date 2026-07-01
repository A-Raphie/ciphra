/**
 * Safe integer parsing for form inputs. Returns `null` on anything that isn't a
 * non-negative base-10 integer, instead of throwing like `BigInt()` does.
 *
 * Used everywhere we previously wrote `BigInt(someUserInput)` — a non-numeric
 * value would otherwise throw and surface as a raw JS error in the UI.
 */
export function parseUint(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

/** True if `input` is a non-negative integer string (for live input validation). */
export function isValidUint(input: string): boolean {
  return /^\d+$/.test(input.trim());
}

/**
 * Parse a human-readable token amount (e.g. "1.5" USDC) into base units
 * (e.g. 1500000 for 6 decimals). Returns `null` on invalid input.
 *
 * - Accepts up to `decimals` fractional digits (rejects more — would lose precision).
 * - Handles whole numbers, decimals, and the zero cases.
 */
export function parseTokenAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  // Optional whole part, optional decimal part (1-`decimals` digits).
  const re = new RegExp(`^\\d+(?:\\.(\\d{1,${decimals}}))?$`);
  const m = re.exec(trimmed);
  if (!m) return null;
  const whole = BigInt(trimmed.split(".")[0] || "0");
  const fracStr = m[1] ?? "";
  const frac = BigInt(fracStr) * BigInt(10) ** BigInt(decimals - fracStr.length);
  return whole * BigInt(10) ** BigInt(decimals) + frac;
}

/** Format a base-unit amount back to a human-readable string (e.g. 1500000 -> "1.5"). */
export function formatTokenAmount(baseUnits: bigint, decimals: number): string {
  const negative = baseUnits < 0n;
  const abs = negative ? -baseUnits : baseUnits;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  const out = fracStr ? `${whole}.${fracStr}` : whole.toString();
  return negative ? `-${out}` : out;
}

/** True if `input` is a valid human-readable token amount for the given decimals. */
export function isValidTokenAmount(input: string, decimals: number): boolean {
  return parseTokenAmount(input, decimals) !== null;
}
