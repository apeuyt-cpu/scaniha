import React from 'react'

/* Shared kit for the loyalty marketing posters (/d-p1 … /d-pN).
   Each poster is a fixed 1080×1440 (3:4) artboard with id="poster" so the
   screenshot script can grab it at the exact aspect ratio. Colours are fixed
   hex on purpose — these are print artboards, not themable UI. */

export const BRAND = {
  orange: '#F47B20',
  orangeDark: '#E8590C',
  amber: '#F5B82E',
  cream: '#FBEED9',
  cream2: '#FFF7EC',
  ink: '#1C1917',
  inkSoft: '#4A433D',
  muted: '#8A8178',
  line: 'rgba(28,23,17,0.12)',
}

const FONT = "'DM Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
const FONT_AR = "'Cairo', 'Segoe UI', Tahoma, sans-serif"

export function PosterFrame({ bg = '#FFFFFF', pad = 84, dir = 'ltr', w = 1080, h = 1440, color = BRAND.ink, children }:
  { bg?: string; pad?: number; dir?: 'ltr' | 'rtl'; w?: number; h?: number; color?: string; children: React.ReactNode }) {
  const rtl = dir === 'rtl'
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9e7e2', padding: 24 }}>
      {rtl && <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />}
      <div
        id="poster"
        dir={dir}
        style={{
          width: w, height: h, background: bg, position: 'relative', overflow: 'hidden',
          fontFamily: rtl ? FONT_AR : FONT, padding: pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          color, direction: dir,
        }}
      >
        {children}
      </div>
    </main>
  )
}

/* The Machewi Mahmoud Becha customer logo (white wordmark → needs a dark bg). */
export function MachewiLogo({ height = 130, dark = false }: { height?: number; dark?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dark ? '/poster-assets/machewi-logo-dark.webp' : '/poster-assets/machewi-logo.webp'} alt="Machewi Mahmoud Becha" style={{ height, width: 'auto', display: 'block' }} />
}

/* QR in a white rounded card — reads on dark poster backgrounds. Placeholder
   FauxQR; the real café QR is dropped in at print time. */
export function QrCard({ size = 260, label, sub, color = '#FFF3E6', subColor = 'rgba(255,243,230,0.7)' }:
  { size?: number; label?: string; sub?: string; color?: string; subColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 18px 50px rgba(0,0,0,0.35)' }}>
        <FauxQR size={size} />
      </div>
      {(label || sub) && (
        <div>
          {label && <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1.15 }}>{label}</div>}
          {sub && <div style={{ fontSize: 23, color: subColor, marginTop: 8 }}>{sub}</div>}
        </div>
      )}
    </div>
  )
}

export function Wheel({ size = 380, a = BRAND.orange, b = '#FFFFFF', hub = '#FFFFFF', pointer = BRAND.ink, ringOpacity = 0.16 }:
  { size?: number; a?: string; b?: string; hub?: string; pointer?: string; ringOpacity?: number }) {
  const c = size / 2
  const r = size * 0.46
  const P = (deg: number) => [c + r * Math.sin((deg * Math.PI) / 180), c - r * Math.cos((deg * Math.PI) / 180)]
  const paths = Array.from({ length: 6 }, (_, i) => {
    const [x0, y0] = P(i * 60)
    const [x1, y1] = P((i + 1) * 60)
    return { d: `M${c},${c} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z`, fill: i % 2 ? b : a }
  })
  return (
    <svg viewBox={`0 0 ${size} ${size + 6}`} width={size} height={size + 6} role="img" aria-label="Roue de la chance" style={{ display: 'block' }}>
      <circle cx={c} cy={c} r={r + 8} fill={a} opacity={ringOpacity} />
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.fill} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />)}
      <circle cx={c} cy={c} r={size * 0.115} fill={hub} />
      <circle cx={c} cy={c} r={size * 0.046} fill={a} />
      <path d={`M${c - 16},${c - r - 14} L${c + 16},${c - r - 14} L${c},${c - r + 14} Z`} fill={pointer} />
    </svg>
  )
}

/* Deterministic faux QR (no Math.random → SSR-safe). Real code is dropped in per
   café at print time; this just reads as a QR in the poster. */
export function FauxQR({ size = 240, fg = BRAND.ink, bg = '#FFFFFF', radius = 18 }:
  { size?: number; fg?: string; bg?: string; radius?: number }) {
  const N = 25
  const m = (size - 24) / N
  const off = 12
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
  const cells: React.ReactNode[] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue
      if (((x * 7 + y * 13 + x * y * 3) % 5) < 2)
        cells.push(<rect key={`${x}-${y}`} x={off + x * m} y={off + y * m} width={m * 0.92} height={m * 0.92} rx={m * 0.18} fill={fg} />)
    }
  }
  const finder = (gx: number, gy: number) => (
    <g key={`f${gx}-${gy}`}>
      <rect x={off + gx * m} y={off + gy * m} width={m * 7} height={m * 7} rx={m * 1.4} fill={fg} />
      <rect x={off + (gx + 1) * m} y={off + (gy + 1) * m} width={m * 5} height={m * 5} rx={m} fill={bg} />
      <rect x={off + (gx + 2) * m} y={off + (gy + 2) * m} width={m * 3} height={m * 3} rx={m * 0.8} fill={fg} />
    </g>
  )
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="QR code" style={{ display: 'block' }}>
      <rect x="0" y="0" width={size} height={size} rx={radius} fill={bg} />
      {cells}
      {finder(0, 0)}{finder(N - 7, 0)}{finder(0, N - 7)}
    </svg>
  )
}

export function Pill({ children, bg = BRAND.cream, color = '#7A3E06' }: { children: React.ReactNode; bg?: string; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: bg, color, fontSize: 26, fontWeight: 600, padding: '14px 28px', borderRadius: 999 }}>
      {children}
    </span>
  )
}

export function Steps({ color = BRAND.ink, accent = BRAND.orange }: { color?: string; accent?: string }) {
  const steps = [['1', 'Scannez'], ['2', 'Tournez la roue'], ['3', 'Gagnez & cumulez']]
  return (
    <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
      {steps.map(([n, t]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 999, background: accent, color: '#fff', fontWeight: 700, fontSize: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
          <span style={{ fontSize: 22, fontWeight: 600, color }}>{t}</span>
        </div>
      ))}
    </div>
  )
}

export function ScanRow({ label = 'Scannez pour jouer', sub = 'Sans application · 10 secondes', fg = BRAND.ink, qrBg = '#FFFFFF', textColor = BRAND.ink, subColor = BRAND.muted }:
  { label?: string; sub?: string; fg?: string; qrBg?: string; textColor?: string; subColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <FauxQR size={240} fg={fg} bg={qrBg} />
      <div>
        <div style={{ fontSize: 38, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>{label}</div>
        <div style={{ fontSize: 24, color: subColor, marginTop: 8 }}>{sub}</div>
      </div>
    </div>
  )
}

export function LogoChip({ color = BRAND.ink, sub = BRAND.muted, label = 'Votre établissement' }: { color?: string; sub?: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 54, height: 54, borderRadius: 14, border: `2px dashed ${sub}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: sub, textAlign: 'center', lineHeight: 1 }}>Logo</span>
      <span style={{ fontSize: 24, fontWeight: 600, color }}>{label}</span>
    </div>
  )
}

export function PoweredBy({ color = BRAND.muted }: { color?: string }) {
  return <div style={{ fontSize: 20, color, letterSpacing: 0.3 }}>Propulsé par <span style={{ fontWeight: 700 }}>Scaniha</span></div>
}

/* The real Scaniha logo (public/logo2.webp) dropped straight into the artboard. */
export function BrandLogo({ height = 80 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo2.webp" alt="Scaniha" style={{ height, width: 'auto', display: 'block' }} />
}

/* Machewi (white wordmark) on a dark charcoal plate — lets the customer logo
   sit on a light/cream poster while staying perfectly readable. */
export function LogoPlate({ height = 92, pad = '20px 38px' }: { height?: number; pad?: string }) {
  return (
    <div style={{ background: '#1C1917', borderRadius: 26, padding: pad, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 36px rgba(28,23,17,0.20)' }}>
      <MachewiLogo height={height} />
    </div>
  )
}

/* "Propulsé par <Scaniha logo>" credit — the real brand logo, small. */
export function ScanihaCredit({ color = BRAND.muted, height = 26 }: { color?: string; height?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 19, color }}>Propulsé par</span>
      <BrandLogo height={height} />
    </div>
  )
}

/* Premium branded header — a full-width dark panel with an ember glow behind a
   big Machewi logo + a gold tagline rule. Replaces the cramped LogoPlate look. */
export function MachewiHeader({ logoHeight = 150, tagline = 'Grillades' }:
  { logoHeight?: number; tagline?: string }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <MachewiLogo dark height={logoHeight} />
      {tagline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 46, height: 2, background: 'rgba(180,83,9,0.40)' }} />
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 5, color: '#B45309', textTransform: 'uppercase' }}>{tagline}</span>
          <span style={{ width: 46, height: 2, background: 'rgba(180,83,9,0.40)' }} />
        </div>
      )}
    </div>
  )
}

/* A stylised phone showing the loyalty program (points card / wheel / both) —
   the "nice image of the program" without needing a real screenshot. */
export function PhoneMock({ variant = 'points', width = 320 }: { variant?: 'points' | 'roue' | 'mix' | 'menu'; width?: number }) {
  const H = Math.round(width * 2.0)
  const headerLabel = variant === 'menu' ? 'Menu' : 'Fidélité'
  const screen = (children: React.ReactNode) => (
    <div style={{ background: '#1C1917', borderRadius: width * 0.135, padding: width * 0.045, width, height: H, boxShadow: '0 26px 60px rgba(28,23,17,0.30)', boxSizing: 'border-box' }}>
      <div style={{ background: 'linear-gradient(180deg,#FFFFFF 0%,#FFF4E4 100%)', borderRadius: width * 0.10, width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: BRAND.orange, color: '#fff', padding: `${width * 0.05}px ${width * 0.06}px`, fontSize: width * 0.058, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: width * 0.05 }}>🔥</span> Machewi · {headerLabel}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: width * 0.045, padding: width * 0.06, textAlign: 'center', color: BRAND.ink }}>
          {children}
        </div>
      </div>
    </div>
  )
  const bar = (
    <div style={{ width: '78%', height: width * 0.05, borderRadius: 999, background: 'rgba(28,23,17,0.10)', overflow: 'hidden' }}>
      <div style={{ width: '70%', height: '100%', background: BRAND.orange }} />
    </div>
  )
  const pointsBlock = (
    <>
      <div style={{ fontSize: width * 0.052, color: BRAND.muted, fontWeight: 700 }}>Mes points</div>
      <div style={{ fontSize: width * 0.2, fontWeight: 800, color: BRAND.orange, lineHeight: 1 }}>120</div>
      {bar}
      <div style={{ fontSize: width * 0.046, color: BRAND.inkSoft }}>Plus que 30 pts → Café offert 🎁</div>
    </>
  )
  if (variant === 'roue') {
    return screen(
      <>
        <div style={{ fontSize: width * 0.058, fontWeight: 800 }}>Roue de la chance</div>
        <Wheel size={width * 0.62} />
        <div style={{ fontSize: width * 0.05, fontWeight: 700, color: BRAND.orange }}>Tournez & gagnez 🎁</div>
      </>,
    )
  }
  if (variant === 'mix') {
    return screen(
      <>
        <div style={{ fontSize: width * 0.16, fontWeight: 800, color: BRAND.orange, lineHeight: 1 }}>120<span style={{ fontSize: width * 0.05, color: BRAND.muted }}> pts</span></div>
        <Wheel size={width * 0.5} />
        <div style={{ fontSize: width * 0.046, fontWeight: 700, color: BRAND.inkSoft }}>Points + Roue · tout le monde gagne</div>
      </>,
    )
  }
  if (variant === 'menu') {
    const items: [string, string][] = [['Grillades mixtes', '24'], ['Chich taouk', '14'], ["Côtelettes d'agneau", '18'], ['Salade Machewi', '6']]
    return screen(
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: width * 0.036 }}>
        {items.map(([name, price]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: width * 0.04 }}>
            <span style={{ width: width * 0.13, height: width * 0.13, borderRadius: width * 0.035, background: 'rgba(244,123,32,0.14)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: width * 0.05, fontWeight: 700, textAlign: 'left', color: BRAND.ink, lineHeight: 1.05 }}>{name}</span>
            <span style={{ fontSize: width * 0.05, fontWeight: 800, color: BRAND.orange, whiteSpace: 'nowrap' }}>{price}</span>
          </div>
        ))}
      </div>,
    )
  }

  return screen(pointsBlock)
}
