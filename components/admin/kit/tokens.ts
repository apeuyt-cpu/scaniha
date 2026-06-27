/**
 * Admin v2 kit — shared class tokens.
 *
 * Single source for the premium-light look so every primitive and re-homed
 * section reads from the same vocabulary. Scoped under `.admin-shell` (see
 * globals.css) — these are plain Tailwind strings, safe to compose.
 */

/** White hairline card surface with soft elevation. */
export const cardClass =
  'rounded-2xl border border-[var(--line)] bg-white shadow-soft'

/** Page section padding rhythm. */
export const padClass = 'p-5 sm:p-6'

/** Brand-tinted chip (status / counts). */
export const chipClass =
  'inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-600)]'

/** Muted secondary text. */
export const mutedClass = 'text-[var(--muted)]'

/** Primary heading ink. */
export const inkClass = 'text-[var(--ink)]'
