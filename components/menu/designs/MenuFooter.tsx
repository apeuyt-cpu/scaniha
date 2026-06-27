import type { DesignSettings } from '@/lib/design-settings'

/** Contact / hours + social-links footer, shown when contactEnabled. */
export default function MenuFooter({
  business,
  settings,
  accent,
}: {
  business: any
  settings: DesignSettings
  accent: string
}) {
  if (!settings.contactEnabled) return null

  const wa = (business?.whatsapp_number || '').replace(/[^\d]/g, '')
  const socials = [
    { url: business?.facebook_url, label: 'Facebook' },
    { url: business?.instagram_url, label: 'Instagram' },
    { url: business?.twitter_url, label: 'X' },
    { url: wa ? `https://wa.me/${wa}` : null, label: 'WhatsApp' },
    { url: business?.website_url, label: 'Site web' },
  ].filter((s) => s.url)

  const hasContact = settings.phone || settings.address || settings.hours
  if (!hasContact && socials.length === 0) return null

  return (
    <footer className="mt-10 border-t border-black/10 px-5 pb-6 pt-8">
      {hasContact && (
        <div className="space-y-2 text-sm text-zinc-600">
          {settings.phone && (
            <p className="flex items-center gap-2">
              <span aria-hidden="true">☎️</span>
              <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="hover:underline">{settings.phone}</a>
            </p>
          )}
          {settings.address && (
            <p className="flex items-center gap-2">
              <span aria-hidden="true">📍</span>
              <span>{settings.address}</span>
            </p>
          )}
          {settings.hours && (
            <p className="flex items-center gap-2">
              <span aria-hidden="true">🕒</span>
              <span>{settings.hours}</span>
            </p>
          )}
        </div>
      )}

      {socials.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95"
              style={{ backgroundColor: accent }}
            >
              {s.label}
            </a>
          ))}
        </div>
      )}

      {business?.name && (
        <p className="mt-6 text-center text-xs text-zinc-400">
          © {business.name}
        </p>
      )}
    </footer>
  )
}
