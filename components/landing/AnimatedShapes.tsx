// Subtle, clean animated background shapes (thin drifting outlines).
// Decorative only — sits behind content (pointer-events-none).
export default function AnimatedShapes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="anim-shape absolute left-[6%] top-[12%] h-72 w-72 rounded-full border border-zinc-900/[0.05] animate-[drift1_22s_ease-in-out_infinite]" />
      <div className="anim-shape absolute right-[9%] top-[24%] h-56 w-56 rounded-full border border-orange-500/[0.18] animate-[drift2_28s_ease-in-out_infinite]" />
      <div className="anim-shape absolute bottom-[10%] left-[26%] h-40 w-40 rounded-3xl border border-zinc-900/[0.04] animate-[drift3_26s_ease-in-out_infinite]" />
      <div className="anim-shape absolute bottom-[18%] right-[20%] h-24 w-24 rounded-full border border-zinc-900/[0.05] animate-[drift1_20s_ease-in-out_infinite]" />
    </div>
  )
}
