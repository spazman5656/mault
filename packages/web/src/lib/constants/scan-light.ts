// Scan-area light brightness tiers. The firmware does not cap brightness, this
// gate is UI only. Percentages map to the strip's draw (about 3.6 A at 100%).
// Thresholds assume the strip's factory lead and connector hold about 2.5 A and
// are meant to be tuned after measuring, so they live here and nowhere else.
export const SCAN_LIGHT_FREE_MAX_PERCENT = 50;
export const SCAN_LIGHT_CAUTION_MAX_PERCENT = 70;
export const SCAN_LIGHT_DEFAULT_PERCENT = 25;
export const SCAN_LIGHT_UNLOCK_WORD = "FULLPOWER";
export const SCAN_LIGHT_COMMIT_DEBOUNCE_MS = 150;

export type ScanLightTier = "free" | "caution" | "locked";

export function percentToLevel(percent: number): number {
  return Math.round((percent / 100) * 255);
}

export function scanLightTier(percent: number): ScanLightTier {
  if (percent <= SCAN_LIGHT_FREE_MAX_PERCENT) return "free";
  if (percent <= SCAN_LIGHT_CAUTION_MAX_PERCENT) return "caution";
  return "locked";
}
