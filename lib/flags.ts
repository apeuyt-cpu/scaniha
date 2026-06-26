// Runtime feature flags. NEXT_PUBLIC_ so both server and client can read them.

/**
 * Public owner self-signup. v2 routes demand through /business-request and has
 * the super-admin create accounts, so this is OFF by default. Set
 * NEXT_PUBLIC_SELF_SIGNUP=on to re-open /signup (e.g. for a demo).
 */
export const SELF_SIGNUP_ENABLED = process.env.NEXT_PUBLIC_SELF_SIGNUP === 'on'
