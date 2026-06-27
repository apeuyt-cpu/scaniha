'use client'

import { useRef, useState } from 'react'

// Public café-onboarding lead form. Replaces self-signup as the intake point:
// the prospect describes their café, the row lands in the super-admin "Demandes"
// queue, and the team provisions the account + relays credentials manually.

const PRODUCTS: { value: string; label: string }[] = [
  { value: 'menu', label: 'Menu QR' },
  { value: 'fidelite', label: 'Programme de fidélité' },
  { value: 'both', label: 'Menu + Fidélité' },
  { value: 'ordering', label: 'Commande à table' },
  { value: 'autre', label: 'Autre / je ne sais pas encore' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function BusinessRequestForm({ plan, source }: { plan?: string; source?: string }) {
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [product, setProduct] = useState(plan ? 'both' : 'menu')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const fieldOrder = ['businessName', 'contactName', 'phone', 'email'] as const
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const focusFirstError = (errs: Record<string, string>) => {
    const first = fieldOrder.find((f) => errs[f])
    if (first) inputRefs.current[first]?.focus()
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!businessName.trim()) errs.businessName = "Indiquez le nom de votre établissement."
    if (!contactName.trim()) errs.contactName = 'Indiquez votre nom.'
    if (!phone.trim()) errs.phone = 'Indiquez un numéro de téléphone.'
    else if ((phone.match(/\d/g) || []).length < 6) errs.phone = 'Numéro de téléphone invalide.'
    if (email.trim() && !EMAIL_RE.test(email.trim())) errs.email = 'Adresse e-mail invalide.'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); focusFirstError(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/business-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          contact_name: contactName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          product,
          plan: plan || undefined,
          message: message.trim() || undefined,
          source: source || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Une erreur est survenue. Réessayez.')
        setLoading(false)
        return
      }
      setDone(true)
    } catch {
      setError('Problème de connexion. Vérifiez votre connexion internet et réessayez.')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 className="text-lg font-extrabold text-zinc-900">Demande envoyée&nbsp;!</h2>
        <p className="mt-1.5 text-sm text-zinc-600">
          Merci&nbsp;! Notre équipe vous contacte très vite au numéro indiqué pour configurer votre établissement.
        </p>
      </div>
    )
  }

  const inputBase =
    'w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FEFEFE] text-zinc-900 placeholder-zinc-400'
  const cls = (f: string) => `${inputBase} ${fieldErrors[f] ? 'border-red-400' : 'border-zinc-300'}`

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="br-business" className="block text-sm font-medium text-zinc-700 mb-2">Nom de l’établissement</label>
        <input id="br-business" ref={(el) => { inputRefs.current.businessName = el }} className={cls('businessName')} placeholder="Ex. Café Saveurs"
          value={businessName} onChange={(e) => { setBusinessName(e.target.value); if (fieldErrors.businessName) setFieldErrors((p) => ({ ...p, businessName: '' })) }}
          aria-invalid={!!fieldErrors.businessName} aria-describedby={fieldErrors.businessName ? 'br-business-err' : undefined} />
        {fieldErrors.businessName && <p id="br-business-err" className="mt-1.5 text-sm text-red-600">{fieldErrors.businessName}</p>}
      </div>

      <div>
        <label htmlFor="br-name" className="block text-sm font-medium text-zinc-700 mb-2">Votre nom</label>
        <input id="br-name" ref={(el) => { inputRefs.current.contactName = el }} className={cls('contactName')} placeholder="Prénom et nom"
          value={contactName} onChange={(e) => { setContactName(e.target.value); if (fieldErrors.contactName) setFieldErrors((p) => ({ ...p, contactName: '' })) }}
          aria-invalid={!!fieldErrors.contactName} aria-describedby={fieldErrors.contactName ? 'br-name-err' : undefined} />
        {fieldErrors.contactName && <p id="br-name-err" className="mt-1.5 text-sm text-red-600">{fieldErrors.contactName}</p>}
      </div>

      <div>
        <label htmlFor="br-phone" className="block text-sm font-medium text-zinc-700 mb-2">Téléphone</label>
        <input id="br-phone" type="tel" inputMode="tel" dir="ltr" ref={(el) => { inputRefs.current.phone = el }} className={cls('phone')} placeholder="+216 ..."
          value={phone} onChange={(e) => { setPhone(e.target.value); if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' })) }}
          aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'br-phone-err' : undefined} />
        {fieldErrors.phone && <p id="br-phone-err" className="mt-1.5 text-sm text-red-600">{fieldErrors.phone}</p>}
      </div>

      <div>
        <label htmlFor="br-email" className="block text-sm font-medium text-zinc-700 mb-2">E-mail <span className="font-normal text-zinc-400">(optionnel)</span></label>
        <input id="br-email" type="email" inputMode="email" dir="ltr" ref={(el) => { inputRefs.current.email = el }} className={cls('email')} placeholder="vous@exemple.com"
          value={email} onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' })) }}
          aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'br-email-err' : undefined} />
        {fieldErrors.email && <p id="br-email-err" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="br-city" className="block text-sm font-medium text-zinc-700 mb-2">Ville <span className="font-normal text-zinc-400">(optionnel)</span></label>
        <input id="br-city" className={inputBase + ' border-zinc-300'} placeholder="Ex. Tunis" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      <div>
        <label htmlFor="br-product" className="block text-sm font-medium text-zinc-700 mb-2">Ce qui vous intéresse</label>
        <select id="br-product" className={inputBase + ' border-zinc-300'} value={product} onChange={(e) => setProduct(e.target.value)}>
          {PRODUCTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="br-message" className="block text-sm font-medium text-zinc-700 mb-2">Message <span className="font-normal text-zinc-400">(optionnel)</span></label>
        <textarea id="br-message" rows={3} className={inputBase + ' border-zinc-300 resize-none'} placeholder="Parlez-nous de votre établissement…" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">{error}</div>
      )}

      <button type="submit" disabled={loading}
        className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 transition-colors">
        {loading ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
      <p className="text-center text-xs text-zinc-400">Aucun paiement requis. Nous vous recontactons pour finaliser.</p>
    </form>
  )
}
