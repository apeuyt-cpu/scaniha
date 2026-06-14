'use client'

// Shared interactive pieces used by the more playful templates:
//  - InteractiveStyles : global keyframes (prefix `sx-`)
//  - CenteredItemModal : clean centered detail popup with a floating ✕
//  - SpecialReveal     : slot-machine reveal of a random meal (single pool)
//  - SurpriseFlow      : chooser (whole menu / by category / hidden packages) → reveal
// Themeable via a CSS gradient + ink/muted colors so each design keeps its look.

import { useEffect, useId, useRef, useState } from 'react'

export type SxItem = {
  id: string | number
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  available?: boolean
}
export type SxCategory = { id: string | number; name: string; items: SxItem[] }

function fmt(p: number | null): string {
  return p == null || isNaN(Number(p)) ? '—' : `${Number(p).toFixed(2)} TND`
}

export function InteractiveStyles() {
  return (
    <style jsx global>{`
      @keyframes sx-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes sx-pop { 0% { opacity: 0; transform: scale(.9) translateY(10px) } 55% { opacity: 1; transform: scale(1.02) translateY(0) } 100% { transform: scale(1) } }
      @keyframes sx-reveal { 0% { opacity: 0; transform: scale(.55) } 55% { opacity: 1; transform: scale(1.07) } 75% { transform: scale(.97) } 100% { transform: scale(1) } }
      @keyframes sx-reel { from { opacity: .2; transform: translateY(-18px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes sx-spark { 0% { opacity: 0; transform: translate(0,0) scale(0) } 30% { opacity: 1 } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.3) } }
      @keyframes sx-stagger { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      .sx-backdrop { animation: sx-fade .22s ease forwards }
      .sx-modal { animation: sx-pop .32s cubic-bezier(.34,1.56,.64,1) forwards }
      .sx-reveal { animation: sx-reveal .5s cubic-bezier(.34,1.56,.64,1) forwards }
      .sx-reel { animation: sx-reel .11s ease-out }
      .sx-spark { animation: sx-spark .8s ease-out forwards }
      .sx-stagger { opacity: 0; animation: sx-stagger .3s cubic-bezier(.22,1,.36,1) forwards }
      @media (prefers-reduced-motion: reduce) {
        .sx-backdrop,.sx-modal,.sx-reveal,.sx-reel,.sx-spark,.sx-stagger { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  )
}

interface Theme {
  gradient: string
  ink?: string
  muted?: string
  softBg?: string
  softText?: string
  font?: string
}

/**
 * Close on Escape + lock body scroll + manage focus while an overlay is open.
 *
 * When a `dialogRef` is given the hook also:
 *  - moves focus into the dialog on open (so SR/keyboard users land inside),
 *  - traps Tab/Shift+Tab within the dialog (no tabbing to content behind the
 *    backdrop),
 *  - restores focus to the previously-focused element on close.
 */
export function useOverlayDismiss(
  open: boolean,
  onClose: () => void,
  dialogRef?: React.RefObject<HTMLElement | null>
) {
  const cb = useRef(onClose)
  cb.current = onClose
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef?.current ?? null
    const prevFocused = (document.activeElement as HTMLElement | null) ?? null

    const focusables = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        : []

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cb.current()
        return
      }
      if (e.key === 'Tab' && dialog) {
        const els = focusables()
        if (els.length === 0) {
          e.preventDefault()
          dialog.focus()
          return
        }
        const first = els[0]
        const last = els[els.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog (first focusable, else the dialog itself).
    if (dialog) {
      const els = focusables()
      ;(els[0] ?? dialog).focus()
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      if (prevFocused && typeof prevFocused.focus === 'function') prevFocused.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

/** Clean centered detail modal with a floating ✕. */
export function CenteredItemModal({ item, onClose, gradient, ink = '#171210', muted = '#857C72', font }: { item: SxItem | null; onClose: () => void } & Theme) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  useOverlayDismiss(!!item, onClose, dialogRef)
  if (!item) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ fontFamily: font }}>
      <div className="sx-backdrop absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="sx-modal relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] outline-none">
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow backdrop-blur transition hover:bg-white active:scale-90">
          <CloseIcon />
        </button>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-56 w-full object-cover" />
        ) : (
          <div className="h-56 w-full" style={{ backgroundImage: gradient }} />
        )}
        <div className="px-6 pb-7 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 id={titleId} className="text-[22px] font-bold leading-tight" style={{ color: ink }}>{item.name}</h3>
            <span className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-white" style={{ backgroundImage: gradient }}>{fmt(item.price)}</span>
          </div>
          {item.description && <p className="mt-3 text-[14px] leading-relaxed" style={{ color: muted }}>{item.description}</p>}
          <button type="button" onClick={onClose} className="mt-6 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]" style={{ backgroundImage: gradient }}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

/** The slot-machine reel itself (spins a given pool, lands, offers re-roll). */
function Reel({ pool, label, onView, gradient, ink = '#171210', muted = '#857C72', softBg = '#FDF1E7', softText = '#DD7A2A' }: { pool: SxItem[]; label?: string; onView: (it: SxItem) => void } & Theme) {
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<'spin' | 'done'>('spin')
  const [idx, setIdx] = useState(0)
  const n = pool.length

  // Depend on pool.length (stable primitive) so a re-created pool array can't restart the reel.
  useEffect(() => {
    if (n === 0) return
    // Few items → no fake slot machine; reveal the pick straight away.
    if (n <= 1) {
      setIdx(0)
      setPhase('done')
      return
    }
    setPhase('spin')
    const target = Math.floor(Math.random() * n)
    // Lively, consistent reel regardless of item count (even 2 items feel like a real spin).
    const cycles = 14 + (target % n)
    let step = 0
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const finish = () => {
      if (cancelled) return
      cancelled = true
      setIdx(target)
      setPhase('done')
    }
    const run = () => {
      if (cancelled) return
      if (step > cycles) return finish()
      setIdx(step % n)
      step++
      const remaining = cycles - step
      const delay = remaining > 6 ? 38 : 38 + (7 - Math.max(remaining, 0)) * 30 // decelerate near the end
      timers.push(setTimeout(run, delay))
    }
    timers.push(setTimeout(run, 38))
    timers.push(setTimeout(finish, 2600)) // guaranteed landing
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, round])

  const current = pool[idx]
  if (!current) return <p className="py-10 text-center text-sm text-white/80">Aucun plat disponible.</p>
  const spinning = phase === 'spin'

  return (
    <>
      <p className="mb-3 text-center text-[13px] font-semibold uppercase tracking-[0.25em] text-white/70">
        {spinning ? 'On choisit pour vous…' : `✦ ${label || 'Votre plat surprise'}`}
      </p>
      <div className={`relative mx-auto overflow-hidden rounded-[28px] bg-white shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)] ${phase === 'done' ? 'sx-reveal' : ''}`}>
        {phase === 'done' && <Sparkles />}
        <div key={`${round}-${idx}`} className={spinning ? 'sx-reel' : ''}>
          {current.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.image_url} alt={current.name} className="h-52 w-full object-cover" />
          ) : (
            // No photo → brand band SAME height as a photo (uniform card size, no text → no duplication).
            <div className="h-52 w-full" style={{ backgroundImage: gradient }} />
          )}
        </div>
        <div className="px-6 pb-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[22px] font-bold leading-tight" style={{ color: ink }}>{current.name}</h3>
            <span className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-white" style={{ backgroundImage: gradient }}>{fmt(current.price)}</span>
          </div>
          {current.description && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed" style={{ color: muted }}>{current.description}</p>}
          <div className={`mt-5 transition ${spinning ? 'pointer-events-none opacity-40' : 'opacity-100'} ${n > 1 ? 'grid grid-cols-2 gap-2.5' : ''}`}>
            {n > 1 && (
              <button type="button" onClick={() => setRound((r) => r + 1)} className="flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold transition active:scale-[0.96]" style={{ backgroundColor: softBg, color: softText }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/dice.png" alt="" className="h-5 w-5 rounded-md" /> Encore
              </button>
            )}
            <button type="button" onClick={() => onView(current)} className="w-full rounded-2xl py-3 text-sm font-bold text-white transition active:scale-[0.96]" style={{ backgroundImage: gradient }}>Voir le plat</button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Simple single-pool reveal (used where there's no chooser). */
export function SpecialReveal({ pool, onClose, onView, gradient, ink, muted, softBg, softText, font }: { pool: SxItem[]; onClose: () => void; onView: (it: SxItem) => void } & Theme) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useOverlayDismiss(true, onClose, dialogRef)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ fontFamily: font }}>
      <div className="sx-backdrop absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Votre plat surprise" tabIndex={-1} className="relative w-full max-w-sm outline-none">
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-90"><CloseIcon size={20} /></button>
        <Reel pool={pool} onView={onView} gradient={gradient} ink={ink} muted={muted} softBg={softBg} softText={softText} />
      </div>
    </div>
  )
}

/** Chooser → reveal: whole menu / by category / hidden packages. */
export function SurpriseFlow({
  allItems,
  categories,
  packages = [],
  onClose,
  onView,
  gradient,
  ink = '#171210',
  muted = '#857C72',
  softBg = '#FDF1E7',
  softText = '#DD7A2A',
  font,
}: {
  allItems: SxItem[]
  categories: SxCategory[]
  packages?: SxItem[]
  onClose: () => void
  onView: (it: SxItem) => void
} & Theme) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useOverlayDismiss(true, onClose, dialogRef)
  const [step, setStep] = useState<'choose' | 'category' | 'reveal'>('choose')
  const [pool, setPool] = useState<SxItem[]>([])
  const [label, setLabel] = useState('Surprise')

  const goReveal = (p: SxItem[], l: string) => {
    setPool(p)
    setLabel(l)
    setStep('reveal')
  }

  const theme = { gradient, ink, muted, softBg, softText }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" style={{ fontFamily: font }}>
      <div className="sx-backdrop absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Tentez votre chance" tabIndex={-1} className="relative w-full max-w-sm outline-none">
        {/* controls */}
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
          {step !== 'choose' ? (
            <button type="button" onClick={() => setStep('choose')} aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-90">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : <span />}
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-90"><CloseIcon size={20} /></button>
        </div>

        {step === 'choose' && (
          <div className="sx-modal rounded-[28px] bg-white p-5 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)]">
            <h3 className="flex items-center justify-center gap-2 text-center text-[20px] font-extrabold" style={{ color: ink }}>
              Tentez votre chance
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/dice.png" alt="" className="h-7 w-7 rounded-lg" />
            </h3>
            <p className="mb-4 mt-1 text-center text-[13px]" style={{ color: muted }}>Comment voulez-vous être surpris&nbsp;?</p>
            <div className="space-y-2.5">
              <ChooserOption icon="/icons/dice.png" title="Surprise totale" sub="Un plat au hasard dans toute la carte" ink={ink} muted={muted} delay={0} onClick={() => goReveal(allItems, 'Surprise totale')} />
              <ChooserOption icon="/icons/plate.png" title="Par catégorie" sub="Choisissez d'abord une catégorie" ink={ink} muted={muted} delay={60} onClick={() => setStep('category')} />
              {packages.length > 0 && (
                <ChooserOption icon="/icons/gift.png" title="Offres cachées" sub="Nos formules surprises du moment" ink={ink} muted={muted} delay={120} onClick={() => goReveal(packages, 'Offre cachée')} />
              )}
            </div>
          </div>
        )}

        {step === 'category' && (
          <div className="sx-modal rounded-[28px] bg-white p-5 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)]">
            <h3 className="mb-4 text-center text-[18px] font-extrabold" style={{ color: ink }}>Choisissez une catégorie</h3>
            <div className="no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto">
              {categories.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goReveal(c.items, c.name)}
                  className="sx-stagger flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  style={{ minHeight: 60, animationDelay: `${Math.min(i * 45, 300)}ms` }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold" style={{ color: ink }}>{c.name}</span>
                    <span className="block text-[12px] font-semibold" style={{ color: softText }}>{c.items.length} plat{c.items.length > 1 ? 's' : ''}</span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDC6BB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'reveal' && <Reel pool={pool} label={label} onView={onView} {...theme} />}
      </div>
    </div>
  )
}

function ChooserOption({ icon, title, sub, onClick, ink, muted, delay = 0 }: { icon: string; title: string; sub: string; onClick: () => void; ink?: string; muted?: string; delay?: number }) {
  return (
    <button type="button" onClick={onClick} className="sx-stagger flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]" style={{ animationDelay: `${delay}ms` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold" style={{ color: ink }}>{title}</span>
        <span className="block truncate text-[12px]" style={{ color: muted }}>{sub}</span>
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDC6BB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  )
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function Sparkles() {
  const spots = [
    { left: '8%', top: '12%', dx: '-26px', dy: '-26px', d: '0ms' },
    { left: '92%', top: '10%', dx: '26px', dy: '-22px', d: '50ms' },
    { left: '50%', top: '4%', dx: '0px', dy: '-30px', d: '100ms' },
    { left: '14%', top: '60%', dx: '-28px', dy: '14px', d: '70ms' },
    { left: '88%', top: '58%', dx: '28px', dy: '16px', d: '25ms' },
    { left: '50%', top: '70%', dx: '0px', dy: '30px', d: '120ms' },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {spots.map((s, i) => (
        <span key={i} className="sx-spark absolute h-2.5 w-2.5 rounded-full" style={{ left: s.left, top: s.top, ['--dx' as string]: s.dx, ['--dy' as string]: s.dy, animationDelay: s.d, background: i % 2 ? '#F5B82E' : '#F47B20' }} />
      ))}
    </div>
  )
}
