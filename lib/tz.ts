// Tunisia is UTC+1 year-round (Africa/Tunis — no daylight saving). Bucket dates
// and expiries by the café's LOCAL day so "chiffre d'affaires par jour" and promo
// expiry match the owner's calendar instead of UTC (which shifts late-night
// orders to the wrong day and ends promos ~1h into the next local day).

export const TN_OFFSET_MS = 3_600_000 // +01:00
export const TN_OFFSET = '+01:00'

/** YYYY-MM-DD in Tunisia local time for a UTC epoch (ms). */
export function tnLocalDate(ms: number): string {
  return new Date(ms + TN_OFFSET_MS).toISOString().slice(0, 10)
}
