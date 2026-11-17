/** Reference implementation of the Evermo claim rules. The netlist is synthesized from this. */

export const INPUT_NAMES = ["dur0", "dur1", "dur2", "eligible", "size0", "size1"] as const;
export const OUTPUT_NAMES = ["tier0", "tier1", "tier2", "tier3", "allowed"] as const;

export const NUM_INPUTS = INPUT_NAMES.length;
export const NUM_OUTPUTS = OUTPUT_NAMES.length;

/** Minimum duration bucket required to claim (bucket 1 = at least one bucket held). */
export const MIN_BUCKET = 1;

export interface Decoded {
  bucket: number;
  eligible: boolean;
  size: number;
}

export function decodeInputs(bits: number[]): Decoded {
  return {
    bucket: bits[0] | (bits[1] << 1) | (bits[2] << 2),
    eligible: bits[3] === 1,
    size: bits[4] | (bits[5] << 1),
  };
}

/** Rule: claim needs eligibility and a minimum holding time; the rate tier (0-15) grows with
 *  holding time and position size and saturates at 15. */
export function reference(bits: number[]): number[] {
  const { bucket, eligible, size } = decodeInputs(bits);
  const allowed = eligible && bucket >= MIN_BUCKET;
  const tier = allowed ? Math.min(15, 6 + bucket + 2 * size) : 0;
  return [tier & 1, (tier >> 1) & 1, (tier >> 2) & 1, (tier >> 3) & 1, allowed ? 1 : 0];
}

export function toBits(value: number, width = NUM_INPUTS): number[] {
  return Array.from({ length: width }, (_, i) => (value >> i) & 1);
}
