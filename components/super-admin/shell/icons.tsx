/** Super-admin v2 shell icons — stroked 24px family, sized by the caller. */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
})

export const IconDashboard = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
)
export const IconStore = (p: P) => (
  <svg {...base(p)}><path d="M4 9.5 5.2 5a1 1 0 0 1 1-.8h11.6a1 1 0 0 1 1 .8L20 9.5" /><path d="M4 9.5h16v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-4 0Z" /><path d="M5 12.5V20h14v-7.5" /><path d="M10 20v-4h4v4" /></svg>
)
export const IconInbox = (p: P) => (
  <svg {...base(p)}><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg>
)
export const IconCard = (p: P) => (
  <svg {...base(p)}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 14.5h4" /></svg>
)
export const IconFile = (p: P) => (
  <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
)
export const IconActivity = (p: P) => <svg {...base(p)}><path d="M3 12h4l2.5-7 5 14L17 12h4" /></svg>
export const IconEye = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
)
export const IconChart = (p: P) => <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
export const IconMore = (p: P) => <svg {...base(p)}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>
export const IconLogout = (p: P) => <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>

// ── Developer Platform Icons ─────────────────────────────────────────────────
export const IconCode = (p: P) => (
  <svg {...base(p)}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
)
export const IconKey = (p: P) => (
  <svg {...base(p)}><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></svg>
)
export const IconWebhook = (p: P) => (
  <svg {...base(p)}><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" /><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" /><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" /></svg>
)
export const IconLayers = (p: P) => (
  <svg {...base(p)}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
)
export const IconTerminal = (p: P) => (
  <svg {...base(p)}><polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" /></svg>
)
export const IconShield = (p: P) => (
  <svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
export const IconPlugin = (p: P) => (
  <svg {...base(p)}><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" /><line x1="16" x2="2" y1="8" y2="22" /><line x1="17.5" x2="9" y1="15" y2="15" /></svg>
)
export const IconGlobe = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
)
export const IconZap = (p: P) => (
  <svg {...base(p)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
)
export const IconBook = (p: P) => (
  <svg {...base(p)}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
)
export const IconUsers = (p: P) => (
  <svg {...base(p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)
export const IconBilling = (p: P) => (
  <svg {...base(p)}><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
)
export const IconEdit = (p: P) => (
  <svg {...base(p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
)
export const IconPlus = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
export const IconTrash = (p: P) => (
  <svg {...base(p)}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
export const IconCheck = (p: P) => (
  <svg {...base(p)}><polyline points="20 6 9 17 4 12" /></svg>
)
export const IconLock = (p: P) => (
  <svg {...base(p)}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
export const IconRefresh = (p: P) => (
  <svg {...base(p)}><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
)
export const IconCalendar = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)
export const IconBox = (p: P) => (
  <svg {...base(p)}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
)
export const IconStar = (p: P) => (
  <svg {...base(p)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
)
export const IconCart = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
)
export const IconTicket = (p: P) => (
  <svg {...base(p)}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" /></svg>
)
export const IconRocket = (p: P) => (
  <svg {...base(p)}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81l-1.98-1.98s-1.1.08-1.81.79z" /><path d="M15 8s-4 4-6 6l-2-2c2-2 6-6 6-6s.5-3.5 3-6c2.5-2.5 6-3 6-3s-.5 3.5-3 6c-2.5 2.5-4 5-4 5z" /></svg>
)
export const IconUtensils = (p: P) => (
  <svg {...base(p)}><path d="M18 2v20M18 2a4 4 0 0 0-4 4v4h8V6a4 4 0 0 0-4-4zM6 2v10M2 2v6a4 4 0 0 0 4 4v10" /></svg>
)

