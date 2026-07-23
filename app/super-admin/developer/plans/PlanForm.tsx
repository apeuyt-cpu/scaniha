'use client'

/**
 * Developer Platform — Create / Edit Plan
 * /super-admin/developer/plans/new
 * /super-admin/developer/plans/[id]
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PlanForm {
  name: string; slug: string; description: string; plan_type: string
  price_monthly: string; price_yearly: string; price_lifetime: string
  trial_days: string; expiration_type: string; expires_after_days: string
  // Resource limits
  max_businesses: string; max_restaurants: string; max_users: string
  max_locations: string; max_menus: string; max_categories: string; max_items: string
  max_customers: string; max_coupons: string; max_rewards: string; max_games: string; max_orders: string
  // Rate limits
  rate_limit_per_second: string; rate_limit_per_minute: string; rate_limit_per_hour: string
  rate_limit_per_day: string; rate_limit_per_month: string
  max_concurrent_requests: string; burst_limit: string
  // Storage
  storage_limit_mb: string; image_upload_limit_mb: string; video_upload_limit_mb: string
  webhook_limit: string; custom_domain_limit: string
  // Booleans
  custom_branding: boolean; white_label: boolean; remove_branding: boolean
  priority_support: boolean; dedicated_server: boolean; custom_logo: boolean
  custom_theme: boolean; access_ai_features: boolean; access_premium_features: boolean; access_beta_features: boolean
  is_public: boolean; badge: string; badge_color: string; sort_order: string
}

const DEFAULTS: PlanForm = {
  name: '', slug: '', description: '', plan_type: 'paid',
  price_monthly: '', price_yearly: '', price_lifetime: '',
  trial_days: '', expiration_type: 'never', expires_after_days: '',
  max_businesses: '-1', max_restaurants: '-1', max_users: '-1',
  max_locations: '-1', max_menus: '-1', max_categories: '-1', max_items: '-1',
  max_customers: '-1', max_coupons: '-1', max_rewards: '-1', max_games: '-1', max_orders: '-1',
  rate_limit_per_second: '10', rate_limit_per_minute: '100',
  rate_limit_per_hour: '2000', rate_limit_per_day: '10000', rate_limit_per_month: '250000',
  max_concurrent_requests: '10', burst_limit: '20',
  storage_limit_mb: '-1', image_upload_limit_mb: '10', video_upload_limit_mb: '-1',
  webhook_limit: '5', custom_domain_limit: '0',
  custom_branding: false, white_label: false, remove_branding: false,
  priority_support: false, dedicated_server: false, custom_logo: false,
  custom_theme: false, access_ai_features: false, access_premium_features: false, access_beta_features: false,
  is_public: true, badge: '', badge_color: '#6366f1', sort_order: '0',
}

interface Props { planId?: string }

export default function PlanFormPage({ planId }: Props) {
  const router = useRouter()
  const isEdit = !!planId
  const [form, setForm] = useState<PlanForm>(DEFAULTS)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!planId) return
    fetch(`/api/developer/plans/${planId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const p = json.data
          setForm({
            name: p.name, slug: p.slug, description: p.description ?? '', plan_type: p.plan_type,
            price_monthly: p.price_monthly ?? '', price_yearly: p.price_yearly ?? '', price_lifetime: p.price_lifetime ?? '',
            trial_days: p.trial_days ?? '', expiration_type: p.expiration_type, expires_after_days: p.expires_after_days ?? '',
            max_businesses: String(p.max_businesses), max_restaurants: String(p.max_restaurants), max_users: String(p.max_users),
            max_locations: String(p.max_locations), max_menus: String(p.max_menus), max_categories: String(p.max_categories),
            max_items: String(p.max_items), max_customers: String(p.max_customers), max_coupons: String(p.max_coupons),
            max_rewards: String(p.max_rewards), max_games: String(p.max_games), max_orders: String(p.max_orders),
            rate_limit_per_second: String(p.rate_limit_per_second), rate_limit_per_minute: String(p.rate_limit_per_minute),
            rate_limit_per_hour: String(p.rate_limit_per_hour), rate_limit_per_day: String(p.rate_limit_per_day),
            rate_limit_per_month: String(p.rate_limit_per_month),
            max_concurrent_requests: String(p.max_concurrent_requests), burst_limit: String(p.burst_limit),
            storage_limit_mb: String(p.storage_limit_mb), image_upload_limit_mb: String(p.image_upload_limit_mb),
            video_upload_limit_mb: String(p.video_upload_limit_mb), webhook_limit: String(p.webhook_limit),
            custom_domain_limit: String(p.custom_domain_limit),
            custom_branding: p.custom_branding, white_label: p.white_label, remove_branding: p.remove_branding,
            priority_support: p.priority_support, dedicated_server: p.dedicated_server, custom_logo: p.custom_logo,
            custom_theme: p.custom_theme, access_ai_features: p.access_ai_features,
            access_premium_features: p.access_premium_features, access_beta_features: p.access_beta_features,
            is_public: p.is_public, badge: p.badge ?? '', badge_color: p.badge_color ?? '#6366f1',
            sort_order: String(p.sort_order),
          })
        }
      })
      .finally(() => setLoading(false))
  }, [planId])

  function setText(key: keyof PlanForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }
  function setCheck(key: keyof PlanForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.checked }))
  }
  function autoSlug(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setForm(f => ({
      ...f, name,
      slug: f.slug && f.slug !== slugify(f.name) ? f.slug : slugify(name),
    }))
  }

  function numVal(v: string): number | null {
    const n = Number(v)
    return isNaN(n) ? null : n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        name: form.name, slug: form.slug, description: form.description || null,
        plan_type: form.plan_type,
        price_monthly:  numVal(form.price_monthly),
        price_yearly:   numVal(form.price_yearly),
        price_lifetime: numVal(form.price_lifetime),
        trial_days:         numVal(form.trial_days),
        expiration_type:    form.expiration_type,
        expires_after_days: numVal(form.expires_after_days),
        max_businesses:   numVal(form.max_businesses) ?? -1,
        max_restaurants:  numVal(form.max_restaurants) ?? -1,
        max_users:        numVal(form.max_users) ?? -1,
        max_locations:    numVal(form.max_locations) ?? -1,
        max_menus:        numVal(form.max_menus) ?? -1,
        max_categories:   numVal(form.max_categories) ?? -1,
        max_items:        numVal(form.max_items) ?? -1,
        max_customers:    numVal(form.max_customers) ?? -1,
        max_coupons:      numVal(form.max_coupons) ?? -1,
        max_rewards:      numVal(form.max_rewards) ?? -1,
        max_games:        numVal(form.max_games) ?? -1,
        max_orders:       numVal(form.max_orders) ?? -1,
        rate_limit_per_second:   numVal(form.rate_limit_per_second) ?? 10,
        rate_limit_per_minute:   numVal(form.rate_limit_per_minute) ?? 100,
        rate_limit_per_hour:     numVal(form.rate_limit_per_hour) ?? 2000,
        rate_limit_per_day:      numVal(form.rate_limit_per_day) ?? 10000,
        rate_limit_per_month:    numVal(form.rate_limit_per_month) ?? 250000,
        max_concurrent_requests: numVal(form.max_concurrent_requests) ?? 10,
        burst_limit:             numVal(form.burst_limit) ?? 20,
        storage_limit_mb:        numVal(form.storage_limit_mb) ?? -1,
        image_upload_limit_mb:   numVal(form.image_upload_limit_mb) ?? 10,
        video_upload_limit_mb:   numVal(form.video_upload_limit_mb) ?? -1,
        webhook_limit:           numVal(form.webhook_limit) ?? 5,
        custom_domain_limit:     numVal(form.custom_domain_limit) ?? 0,
        custom_branding: form.custom_branding, white_label: form.white_label,
        remove_branding: form.remove_branding, priority_support: form.priority_support,
        dedicated_server: form.dedicated_server, custom_logo: form.custom_logo,
        custom_theme: form.custom_theme, access_ai_features: form.access_ai_features,
        access_premium_features: form.access_premium_features, access_beta_features: form.access_beta_features,
        is_public: form.is_public, sort_order: numVal(form.sort_order) ?? 0,
        badge: form.badge || null, badge_color: form.badge_color || null,
      }

      const url = isEdit ? `/api/developer/plans/${planId}` : '/api/developer/plans'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned status ${res.status}. Ensure database migration is applied.`)
      }
      const json = await res.json()

      if (json.success) {
        router.push('/super-admin/developer/plans')
      } else {
        setError(json.error?.message ?? 'Failed to save plan')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent"/>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin/developer/plans" className="text-[var(--muted)] hover:text-[var(--ink)] transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">{isEdit ? 'Edit Plan' : 'New API Plan'}</h1>
          <p className="text-sm text-[var(--muted)]">Configure pricing, limits, and feature access</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Section title="Plan Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan Name *"><input value={form.name} onChange={autoSlug} required placeholder="Growth" className="dev-input"/></Field>
            <Field label="Slug *"><input value={form.slug} onChange={setText('slug')} required placeholder="growth" className="dev-input font-mono text-xs"/></Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea value={form.description} onChange={setText('description')} rows={2} placeholder="Brief plan description..." className="dev-input resize-none"/>
            </Field>
            <Field label="Plan Type">
              <select value={form.plan_type} onChange={setText('plan_type')} className="dev-input">
                <option value="free">Free</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
                <option value="custom">Custom / Enterprise</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </Field>
            <Field label="Sort Order">
              <input value={form.sort_order} onChange={setText('sort_order')} type="number" min="0" className="dev-input"/>
            </Field>
          </div>
        </Section>

        {/* Pricing */}
        <Section title="💰 Pricing">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Monthly Price ($)"><input value={form.price_monthly} onChange={setText('price_monthly')} type="number" min="0" step="0.01" placeholder="29.00" className="dev-input"/></Field>
            <Field label="Yearly Price ($)"><input value={form.price_yearly} onChange={setText('price_yearly')} type="number" min="0" step="0.01" placeholder="290.00" className="dev-input"/></Field>
            <Field label="Lifetime Price ($)"><input value={form.price_lifetime} onChange={setText('price_lifetime')} type="number" min="0" step="0.01" placeholder="999.00" className="dev-input"/></Field>
          </div>
          {form.plan_type === 'trial' && (
            <Field label="Trial Days">
              <input value={form.trial_days} onChange={setText('trial_days')} type="number" min="1" max="365" placeholder="14" className="dev-input"/>
            </Field>
          )}
        </Section>

        {/* Badge */}
        <Section title="🏷️ Badge (optional)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Badge Text"><input value={form.badge} onChange={setText('badge')} placeholder="Popular" className="dev-input"/></Field>
            <Field label="Badge Color"><input value={form.badge_color} onChange={setText('badge_color')} type="color" className="dev-input h-10 p-1"/></Field>
          </div>
        </Section>

        {/* Resource Limits */}
        <Section title="📊 Resource Limits (-1 = unlimited)">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              ['Businesses',  'max_businesses'], ['Restaurants', 'max_restaurants'],
              ['Users',       'max_users'],       ['Locations',   'max_locations'],
              ['Menus',       'max_menus'],        ['Categories',  'max_categories'],
              ['Items',       'max_items'],        ['Customers',   'max_customers'],
              ['Coupons',     'max_coupons'],      ['Rewards',     'max_rewards'],
              ['Games',       'max_games'],        ['Orders',      'max_orders'],
            ].map(([label, key]) => (
              <Field key={key} label={label}>
                <input value={(form as any)[key]} onChange={setText(key as keyof PlanForm)} type="number" min="-1" className="dev-input font-mono"/>
              </Field>
            ))}
          </div>
        </Section>

        {/* Rate Limits */}
        <Section title="⚡ Rate Limits">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Per Second',         'rate_limit_per_second'],
              ['Per Minute',         'rate_limit_per_minute'],
              ['Per Hour',           'rate_limit_per_hour'],
              ['Per Day',            'rate_limit_per_day'],
              ['Per Month',          'rate_limit_per_month'],
              ['Max Concurrent',     'max_concurrent_requests'],
              ['Burst Limit',        'burst_limit'],
              ['Webhooks',           'webhook_limit'],
              ['Custom Domains',     'custom_domain_limit'],
            ].map(([label, key]) => (
              <Field key={key} label={label}>
                <input value={(form as any)[key]} onChange={setText(key as keyof PlanForm)} type="number" min="-1" className="dev-input font-mono"/>
              </Field>
            ))}
          </div>
        </Section>

        {/* Storage */}
        <Section title="💾 Storage Limits (MB, -1 = unlimited)">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Total Storage', 'storage_limit_mb'],
              ['Image Upload',  'image_upload_limit_mb'],
              ['Video Upload',  'video_upload_limit_mb'],
            ].map(([label, key]) => (
              <Field key={key} label={label}>
                <input value={(form as any)[key]} onChange={setText(key as keyof PlanForm)} type="number" min="-1" className="dev-input font-mono"/>
              </Field>
            ))}
          </div>
        </Section>

        {/* Feature Flags */}
        <Section title="🚀 Feature Flags">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Custom Branding',    'custom_branding'],
              ['White Label',        'white_label'],
              ['Remove Branding',    'remove_branding'],
              ['Priority Support',   'priority_support'],
              ['Dedicated Server',   'dedicated_server'],
              ['Custom Logo',        'custom_logo'],
              ['Custom Theme',       'custom_theme'],
              ['AI Features',        'access_ai_features'],
              ['Premium Features',   'access_premium_features'],
              ['Beta Features',      'access_beta_features'],
              ['Public Plan',        'is_public'],
            ] as [string, keyof PlanForm][]).map(([label, key]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 hover:bg-zinc-50 transition">
                <input type="checkbox" checked={form[key] as boolean} onChange={setCheck(key)} className="h-4 w-4 accent-[var(--brand)] rounded"/>
                <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pb-4">
          <Link href="/super-admin/developer/plans"
            className="rounded-xl border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-600)] disabled:opacity-60 transition">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .dev-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--line);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dev-input:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(244, 123, 32, 0.1);
        }
      `}</style>
    </div>
  )
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft space-y-4">
      <h2 className="text-sm font-bold text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-600">{label}</label>
      {children}
    </div>
  )
}
