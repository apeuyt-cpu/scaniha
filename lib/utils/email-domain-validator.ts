/**
 * Email Domain Validator
 * 
 * Validates email domains with multiple strategies:
 * - Specific domains (whitelist)
 * - All domains (allow all)
 * - Global corporate domains
 * - International domain support
 */

export type EmailValidationStrategy = 'specific' | 'all' | 'corporate'

export interface EmailValidationConfig {
  strategy: EmailValidationStrategy
  allowedDomains?: string[]
  blockedDomains?: string[]
  allowInternationalDomains?: boolean
}

// Common free email providers (for reference)
export const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.fr',
  'yahoo.co.uk',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.ca',
  'hotmail.com',
  'outlook.com',
  'protonmail.com',
  'tutanota.com',
  'fastmail.com',
  'mailbox.org',
  'aol.com',
  'mail.com',
  'icloud.com',
  'yandex.com',
]

// Common corporate domains (for reference)
export const CORPORATE_DOMAINS = [
  'microsoft.com',
  'google.com',
  'amazon.com',
  'apple.com',
  'meta.com',
  'amazon.co.uk',
]

/**
 * Validates if an email domain is allowed
 * 
 * @param email - The email address to validate
 * @param config - Validation configuration
 * @returns Object with validation result and error message if any
 */
export function validateEmailDomain(
  email: string,
  config: EmailValidationConfig
): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email invalide.',
    }
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Basic email format check
  if (!trimmedEmail.includes('@')) {
    return {
      valid: false,
      error: 'Format d\'email invalide.',
    }
  }

  const [, domain] = trimmedEmail.split('@')

  if (!domain) {
    return {
      valid: false,
      error: 'Domaine d\'email invalide.',
    }
  }

  // Strategy: Allow all domains
  if (config.strategy === 'all') {
    // Optional: Check for international domain support
    if (config.allowInternationalDomains !== false) {
      return { valid: true }
    }
  }

  // Strategy: Specific domains only
  if (config.strategy === 'specific' && config.allowedDomains) {
    const isAllowed = config.allowedDomains.some(
      (allowedDomain) => domain === allowedDomain.toLowerCase()
    )

    if (!isAllowed) {
      const domainsText = config.allowedDomains
        .map((d) => `@${d}`)
        .join(', ')
      return {
        valid: false,
        error: `Seuls les domaines suivants sont acceptés: ${domainsText}`,
      }
    }

    return { valid: true }
  }

  // Strategy: Corporate domains only
  if (config.strategy === 'corporate') {
    const isAllowed = CORPORATE_DOMAINS.some(
      (corporateDomain) => domain === corporateDomain.toLowerCase()
    )

    if (!isAllowed) {
      return {
        valid: false,
        error: 'Veuillez utiliser une adresse email professionnelle reconnue.',
      }
    }

    return { valid: true }
  }

  return { valid: true }
}

/**
 * Checks if an email domain is a free/personal provider
 */
export function isFreeEmailDomain(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return FREE_EMAIL_DOMAINS.includes(domain)
}

/**
 * Gets the email domain from an email address
 */
export function getEmailDomain(email: string): string | null {
  const [, domain] = email.trim().toLowerCase().split('@')
  return domain || null
}

/**
 * Default config: Allow Gmail, Yahoo, and all international domains
 */
export const DEFAULT_VALIDATION_CONFIG: EmailValidationConfig = {
  strategy: 'specific',
  allowedDomains: [
    'gmail.com',
    'yahoo.com',
    'yahoo.fr',
    'yahoo.co.uk',
    'yahoo.de',
    'yahoo.es',
    'yahoo.it',
    'yahoo.ca',
    'hotmail.com',
    'outlook.com',
  ],
  allowInternationalDomains: true,
}

/**
 * Config: Allow all domains
 */
export const ALLOW_ALL_CONFIG: EmailValidationConfig = {
  strategy: 'all',
  allowInternationalDomains: true,
}

/**
 * Config: Allow corporate domains only
 */
export const CORPORATE_ONLY_CONFIG: EmailValidationConfig = {
  strategy: 'corporate',
}
