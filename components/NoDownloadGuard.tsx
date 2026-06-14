'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Deters casual image saving — but ONLY on the pages where the team actually
 * wants it (the public menu and the admin/owner dashboards). It is intentionally
 * NOT active on the marketing/funnel pages: prospects must keep their normal
 * browser tools (open in new tab, copy, right-click) so we don't hurt conversion.
 *
 *  - blocks the right-click context menu
 *  - blocks image drag-and-drop (drag-to-desktop saving)
 *  - CSS (globals.css) blocks selection, iOS long-press save, and native drag
 *
 * Note: this is a deterrent, not DRM — anything rendered in a browser can
 * ultimately be captured. It stops the 99% (right-click → Save image as).
 */

// Known marketing / public-funnel routes where the guard must NOT run.
const MARKETING_PREFIXES = [
  '/about',
  '/features',
  '/pricing',
  '/security',
  '/contact',
  '/resources',
  '/gallery',
  '/blog',
  '/compare',
  '/login',
  '/signup',
  '/free-qr-menu',
  '/qr-menu-for-restaurants',
  '/digital-menu-builder',
  '/online-menu-for-restaurants',
  '/restaurant-qr-code-menu',
  '/cafe-digital-menu',
]

function isGuardedPath(pathname: string | null): boolean {
  if (!pathname) return false
  // Never guard the homepage or any marketing/funnel page.
  if (pathname === '/') return false
  if (MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return false
  }
  // Guard the admin/owner dashboards and the public menu (the /[slug] pages).
  return true
}

export default function NoDownloadGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isGuardedPath(pathname)) return

    const onContext = (e: MouseEvent) => {
      // Allow right-click inside inputs/textareas so users keep paste/spellcheck.
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
      e.preventDefault()
    }
    const onDragStart = (e: DragEvent) => {
      const el = e.target as HTMLElement | null
      if (el && el.tagName === 'IMG') e.preventDefault()
    }
    document.addEventListener('contextmenu', onContext)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContext)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [pathname])

  return null
}
