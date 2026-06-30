// Flat ESLint config for Next 16 (ESLint 9+).
// `next lint` was removed in Next 16, so we run ESLint directly via the
// "lint" script in package.json. This extends Next's core-web-vitals preset
// (which already bundles the React, React Hooks, JSX-a11y and Next.js plugins).
import next from 'eslint-config-next/core-web-vitals'

const config = [
  // Don't lint build output, deps, or the untracked staging dump.
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'TTT/**',
    ],
  },
  ...next,
]

export default config
