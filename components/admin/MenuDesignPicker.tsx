'use client'

import { getTheme } from '@/lib/themes'

// Modern design templates + classic themes. Previews are lightweight CSS
// sketches (NOT live iframes) so the picker is instant and one-tap.
//
// This component is CONTROLLED: the active id + saving state live in the parent
// (DesignStudio), which performs the DB write. That's essential — selecting a
// design remounts the keyed workspace, so if the picker owned its own active
// state it would reset to the stale saved value and the first click would look
// ignored (the old "click twice" bug).
export const DESIGNS = [
  { id: 'design1', n: '1', name: 'Spécial du Jour', kind: 'd1' as const },
  { id: 'design6', n: '6', name: 'Liste Élégante', kind: 'd6' as const },
  { id: 'design11', n: '11', name: 'Vitrine Immersive', kind: 'd11' as const },
  { id: 'design12', n: '12', name: 'Terroir', kind: 'd12' as const },
] as const

const LEGACY = [
  { id: 'classic', n: '13', name: 'Classique', kind: 'classic' as const },
  { id: 'minimal', n: '14', name: 'Minimal', kind: 'minimal' as const },
  { id: 'dark', n: '15', name: 'Sombre', kind: 'dark' as const },
] as const

type ThumbKind = (typeof DESIGNS)[number]['kind'] | (typeof LEGACY)[number]['kind']

export interface ThemeCtrl {
  /** The live, currently-selected theme id (controlled by the parent). */
  activeId: string
  /** Called on tap — the parent updates activeId optimistically AND saves. */
  onSelect: (id: string) => void
  savingId?: string | null
  savedId?: string | null
  error?: string | null
}

interface MenuDesignPickerProps {
  themeCtrl: ThemeCtrl
  /** When set, the "Aperçu" link opens this menu's real data. */
  slug?: string
  /** Resolved brand accent + gradient so the thumbnails preview in the owner's colour. */
  accent?: string
  gradient?: string
}

export default function MenuDesignPicker({ themeCtrl, slug, accent = '#F47B20', gradient }: MenuDesignPickerProps) {
  const { activeId, onSelect, savingId, savedId, error } = themeCtrl
  const grad = gradient || `linear-gradient(135deg, ${accent}, ${accent})`
  const q = slug ? `?slug=${encodeURIComponent(slug)}` : ''

  function Card({ id, name, kind, n }: { id: string; name: string; kind: ThumbKind; n: string }) {
    const isActive = activeId === id
    const isSaving = savingId === id
    const isSaved = savedId === id

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-white transition ${
          isActive ? 'shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
        }`}
        style={isActive ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}55` } : undefined}
      >
        <button
          type="button"
          onClick={() => { if (!isSaving && id !== activeId) onSelect(id) }}
          aria-pressed={isActive}
          aria-label={`Choisir le design ${name}`}
          className="block w-full text-left"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Thumb kind={kind} accent={accent} gradient={grad} />

            {isActive && (
              <span
                className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                {isSaved ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    Enregistré
                  </>
                ) : (
                  'Actif'
                )}
              </span>
            )}

            {isSaving && (
              <span className="absolute inset-0 z-20 flex items-center justify-center bg-white/50">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300" style={{ borderTopColor: accent }} />
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1.5 px-2.5 py-2">
            <span className="truncate text-[13px] font-semibold text-zinc-900">{name}</span>
            {isActive ? (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>✓</span>
            ) : (
              <span className="shrink-0 text-[11px] font-semibold text-zinc-400 transition group-hover:text-zinc-600">Choisir</span>
            )}
          </div>
        </button>

        <a
          href={`/menu-designs/${n}${q}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm transition hover:bg-black/75"
        >
          Aperçu
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
        </a>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-zinc-400">Designs modernes</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {DESIGNS.map((d) => (
          <Card key={d.id} id={d.id} name={d.name} kind={d.kind} n={d.n} />
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wide text-zinc-400">Thèmes classiques</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {LEGACY.map((t) => (
          <Card key={t.id} id={t.id} name={t.name} kind={t.kind} n={t.n} />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Lightweight CSS thumbnails — instant, no iframe. Each one captures the
   essence of its layout and previews in the owner's accent/gradient.
   ───────────────────────────────────────────────────────────────────────── */

function Line({ w = '100%', c = '#d4d4d8', h = 4 }: { w?: string; c?: string; h?: number }) {
  return <span className="block rounded-full" style={{ width: w, height: h, backgroundColor: c }} />
}

export function Thumb({ kind, accent, gradient }: { kind: ThumbKind; accent: string; gradient: string }) {
  if (kind === 'd1') {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2.5" style={{ backgroundColor: '#F6F4F0' }}>
        <div className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-md" style={{ backgroundImage: gradient }} />
          <span className="space-y-1"><Line w="20px" h={3} /><Line w="34px" h={5} c="#a1a1aa" /></span>
        </div>
        <span className="h-3 w-full rounded-md bg-white ring-1 ring-zinc-200" />
        <span className="flex h-3 w-full items-center justify-center rounded-md bg-white ring-1 ring-zinc-200"><Line w="30px" h={3} /></span>
        <span className="h-8 w-full rounded-lg" style={{ backgroundImage: gradient }} />
        {[0, 1].map((i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-lg bg-white p-1 ring-1 ring-zinc-100">
            <span className="h-5 w-5 rounded-md bg-zinc-200" />
            <span className="flex-1 space-y-1"><Line w="66%" h={3} /><Line w="33%" h={3} c="#e4e4e7" /></span>
            <span className="h-1.5 w-3.5 rounded-full" style={{ backgroundColor: accent }} />
          </span>
        ))}
      </div>
    )
  }

  if (kind === 'd6') {
    return (
      <div className="flex h-full flex-col items-center gap-1.5 p-2.5" style={{ backgroundColor: '#FFFDFB' }}>
        <span className="h-5 w-5 rounded-full bg-zinc-200 ring-1 ring-zinc-300" />
        <Line w="22px" h={3} />
        <span className="h-2 w-16 rounded-full bg-zinc-700" />
        <span className="flex items-center gap-1"><span className="h-px w-3 bg-zinc-300" /><span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} /><span className="h-px w-3 bg-zinc-300" /></span>
        <span className="mt-1 w-full space-y-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center gap-1">
              <Line w="40px" h={3} />
              <span className="flex-1 self-end border-b border-dotted border-zinc-300" />
              <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: accent }} />
            </span>
          ))}
        </span>
      </div>
    )
  }

  if (kind === 'd11') {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: '#FBF8F4' }}>
        <span className="relative block h-[42%] w-full" style={{ backgroundImage: gradient }}>
          <span className="absolute inset-x-2 bottom-1.5 space-y-1">
            <Line w="20px" h={3} c="rgba(255,255,255,0.7)" />
            <Line w="46px" h={5} c="rgba(255,255,255,0.92)" />
          </span>
        </span>
        <span className="-mt-2 flex-1 space-y-1.5 rounded-t-xl bg-white p-2 ring-1 ring-zinc-100">
          <span className="block h-2.5 w-full rounded-md bg-zinc-100" />
          <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-6 rounded-full" style={i === 0 ? { backgroundImage: gradient } : { backgroundColor: '#ececec' }} />)}</span>
          {[0, 1].map((i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="flex-1 space-y-1"><Line w="66%" h={3} /><span className="block h-1.5 w-3.5 rounded-full" style={{ backgroundColor: accent }} /></span>
              <span className="h-6 w-6 rounded-lg bg-zinc-200" />
            </span>
          ))}
        </span>
      </div>
    )
  }

  if (kind === 'd12') {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: '#F6F1E9' }}>
        <span className="block h-1 w-full" style={{ backgroundImage: gradient }} />
        <span className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="h-4 w-4 rounded-full bg-zinc-200 ring-1 ring-zinc-300" />
          <span className="space-y-1"><span className="block h-1.5 w-12 rounded-full bg-zinc-700" /><span className="block h-1 w-6 rounded-full" style={{ backgroundColor: accent }} /></span>
        </span>
        <span className="flex gap-1.5 px-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-6 w-6 rounded-full bg-zinc-200" style={i === 0 ? { outline: `1.5px solid ${accent}`, outlineOffset: 1 } : undefined} />
          ))}
        </span>
        <span className="mt-1.5 space-y-1.5 px-2">
          {[0, 1].map((i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-xl bg-white p-1 ring-1 ring-zinc-100">
              <span className="h-5 w-5 rounded-full bg-zinc-200" />
              <span className="flex-1 space-y-1"><Line w="66%" h={3} /><span className="block h-1.5 w-1/3 rounded-full" style={{ backgroundColor: accent }} /></span>
            </span>
          ))}
        </span>
      </div>
    )
  }

  // ── Classic themes: previewed in their OWN fixed palette (not the owner's
  //    colour) so each reads true to its identity. ──
  if (kind === 'classic') {
    const c = getTheme('classic').colors
    return (
      <div className="flex h-full flex-col gap-1.5 p-2.5" style={{ backgroundColor: c.background }}>
        {/* warm header band, centred title */}
        <span className="flex h-7 w-full items-center justify-center rounded-md" style={{ backgroundColor: c.primary }}>
          <span className="h-1.5 w-10 rounded-full bg-white/85" />
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-md p-1.5" style={{ backgroundColor: c.secondary, boxShadow: `inset 0 0 0 1px ${c.border}` }}>
            <span className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: c.primary, opacity: 0.14 }} />
            <span className="flex-1 space-y-1">
              <span className="block h-1.5 w-2/3 rounded-full" style={{ backgroundColor: c.text, opacity: 0.8 }} />
              <span className="block h-1 w-1/3 rounded-full" style={{ backgroundColor: c.muted }} />
            </span>
            <span className="h-2 w-5 rounded-full" style={{ backgroundColor: c.accent }} />
          </span>
        ))}
      </div>
    )
  }

  if (kind === 'minimal') {
    const c = getTheme('minimal').colors
    const w = ['44%', '38%', '50%', '40%']
    return (
      <div className="flex h-full flex-col gap-2 p-3" style={{ backgroundColor: c.background }}>
        {/* sparse, elegant — centred title + dotted-leader list */}
        <span className="mx-auto h-1.5 w-1/2 rounded-full" style={{ backgroundColor: c.text, opacity: 0.85 }} />
        <span className="mx-auto flex items-center gap-1">
          <span className="h-px w-4" style={{ backgroundColor: c.border }} />
          <span className="h-1 w-1 rotate-45" style={{ backgroundColor: c.primary }} />
          <span className="h-px w-4" style={{ backgroundColor: c.border }} />
        </span>
        <span className="mt-0.5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="h-1.5 rounded-full" style={{ width: w[i], backgroundColor: c.text, opacity: 0.55 }} />
              <span className="flex-1 self-end border-b border-dotted" style={{ borderColor: c.border }} />
              <span className="h-1.5 w-3.5 rounded-full" style={{ backgroundColor: c.primary }} />
            </span>
          ))}
        </span>
      </div>
    )
  }

  // dark — Sombre: gold on black
  const c = getTheme('dark').colors
  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5" style={{ backgroundColor: c.background }}>
      <span className="flex flex-col items-center gap-1 pb-0.5 pt-0.5">
        <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: c.primary }} />
        <span className="h-px w-5" style={{ backgroundColor: c.primary, opacity: 0.5 }} />
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center gap-1.5 rounded-md p-1.5" style={{ backgroundColor: c.secondary, boxShadow: `inset 0 0 0 1px ${c.border}` }}>
          <span className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: c.primary, opacity: 0.22 }} />
          <span className="flex-1 space-y-1">
            <span className="block h-1.5 w-2/3 rounded-full" style={{ backgroundColor: c.text, opacity: 0.75 }} />
            <span className="block h-1 w-1/3 rounded-full" style={{ backgroundColor: c.muted, opacity: 0.6 }} />
          </span>
          <span className="h-2 w-5 rounded-full" style={{ backgroundColor: c.primary }} />
        </span>
      ))}
    </div>
  )
}
