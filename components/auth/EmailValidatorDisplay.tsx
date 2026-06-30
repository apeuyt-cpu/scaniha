/**
 * Email Validator Display Component
 * Shows allowed domains to user in a professional way
 */

import { DEFAULT_VALIDATION_CONFIG, FREE_EMAIL_DOMAINS, CORPORATE_DOMAINS } from '@/lib/utils/email-domain-validator'

export function AllowedEmailDomainsInfo() {
  const config = DEFAULT_VALIDATION_CONFIG

  if (config.strategy === 'all') {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 border border-blue-200">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-xs text-blue-700">
          Tous les domaines d'email sont acceptés.
        </p>
      </div>
    )
  }

  if (config.strategy === 'corporate') {
    return (
      <div className="mt-3 rounded-lg bg-amber-50 p-3 border border-amber-200">
        <p className="text-xs font-medium text-amber-900 mb-2">Domaines acceptés:</p>
        <div className="flex flex-wrap gap-2">
          {CORPORATE_DOMAINS.map(domain => (
            <span key={domain} className="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
              @{domain}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (config.strategy === 'specific' && config.allowedDomains) {
    return (
      <div className="mt-3 rounded-lg bg-green-50 p-3 border border-green-200">
        <p className="text-xs font-medium text-green-900 mb-2">Domaines acceptés:</p>
        <div className="flex flex-wrap gap-2">
          {config.allowedDomains.map(domain => (
            <span key={domain} className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
              @{domain}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return null
}

/**
 * Email Validator Support Component
 * Shows helpful text about email requirements
 */
export function EmailValidatorSupport() {
  const config = DEFAULT_VALIDATION_CONFIG

  if (config.strategy === 'all') {
    return (
      <p className="text-xs text-zinc-600 mt-2">
        Utilisez votre adresse email personnelle ou professionnelle.
      </p>
    )
  }

  if (config.strategy === 'corporate') {
    return (
      <p className="text-xs text-zinc-600 mt-2">
        Veuillez utiliser une adresse email d'une entreprise reconnue.
      </p>
    )
  }

  if (config.strategy === 'specific') {
    return (
      <p className="text-xs text-zinc-600 mt-2">
        Seuls certains domaines d'email sont acceptés. Consultez la liste ci-dessus.
      </p>
    )
  }

  return null
}
