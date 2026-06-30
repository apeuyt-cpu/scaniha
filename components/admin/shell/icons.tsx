/**
 * Admin v2 shell icon set — one stroked 24px family, sized by the caller via
 * width/height. Shared by the sidebar, bottom-nav, dashboard, and page headers
 * so every surface speaks the same visual language.
 */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconDashboard = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
)
export const IconMenu = (p: P) => <svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
export const IconReceipt = (p: P) => (
  <svg {...base(p)}><path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
)
export const IconScan = (p: P) => (
  <svg {...base(p)}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" /></svg>
)
export const IconWheel = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>
)
export const IconGift = (p: P) => (
  <svg {...base(p)}><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7S10.5 3 8.5 3 6 5 6 5s1 2 2.5 2M12 7s1.5-4 3.5-4S18 5 18 5s-1 2-2.5 2" /></svg>
)
export const IconBrush = (p: P) => (
  <svg {...base(p)}><path d="M9.5 14.5 4 20M14 4l6 6M14.5 9.5 7 17a3 3 0 0 1-3 0 3 3 0 0 1 0-3l7.5-7.5" /><circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" /></svg>
)
export const IconMegaphone = (p: P) => (
  <svg {...base(p)}><path d="M3 10v4a1 1 0 0 0 1 1h3l7 4V5L7 9H4a1 1 0 0 0-1 1Z" /><path d="M17 8a4 4 0 0 1 0 8" /><path d="M7 15v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.5" /></svg>
)
export const IconShare = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3M20 14v3M14 20h3M20 20h.01M17 17h.01" /></svg>
)
export const IconChart = (p: P) => <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
export const IconCounter = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="10" r="6" /><path d="M12 4v6l3 2M5 22h14" /></svg>
)
export const IconGear = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)
export const IconMore = (p: P) => <svg {...base(p)}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>
export const IconLogout = (p: P) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
)
export const IconExternal = (p: P) => (
  <svg {...base(p)}><path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg>
)
export const IconChevron = (p: P) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
export const IconEye = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
)
export const IconUsers = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h2A4.5 4.5 0 0 1 14.5 19v1" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.6a4.5 4.5 0 0 1 3 4.4v1" /></svg>
)
export const IconRegister = (p: P) => (
  <svg {...base(p)}><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M6 9V5a2 2 0 0 1 2-2h5l3 3v3" /><path d="M7 13h2M7 16h2M13 13h4M13 16h4" /></svg>
)
