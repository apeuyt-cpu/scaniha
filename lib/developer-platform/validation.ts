/**
 * Developer Platform — Zod Validation Schemas
 * Validates all inputs for the API management system.
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

const uuid = z.string().uuid()
const nonEmptyStr = z.string().min(1).max(500)
const optionalStr = z.string().max(2000).optional().nullable()
const limitNum = z.number().int().min(-1)          // -1 = unlimited
const rateNum  = z.number().int().min(0)
const price    = z.number().min(0).optional().nullable()
const url      = z.string().url().optional().nullable()
const slug     = z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes').min(2).max(64)
const ipRegex  = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\/\d{1,2})?$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
const ipList   = z.array(z.string().regex(ipRegex, 'Invalid IP address or CIDR block')).default([])
const domainList = z.array(z.string().min(1).max(253)).default([])

// ─────────────────────────────────────────────────────────────────────────────
// API Product
// ─────────────────────────────────────────────────────────────────────────────

export const CreateApiProductSchema = z.object({
  name:        nonEmptyStr,
  slug,
  description: optionalStr,
  icon:        optionalStr,
  status:      z.enum(['active', 'beta', 'deprecated', 'hidden']).default('active'),
  version:     z.string().default('v1'),
  base_path:   z.string().min(1).startsWith('/'),
  docs_url:    url,
})

export const UpdateApiProductSchema = CreateApiProductSchema.partial()

export const CreateProductEndpointSchema = z.object({
  product_id:     uuid,
  method:         z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path:           z.string().min(1).startsWith('/'),
  name:           nonEmptyStr,
  description:    optionalStr,
  scope_required: optionalStr,
  deprecated:     z.boolean().default(false),
})

// ─────────────────────────────────────────────────────────────────────────────
// API Plan
// ─────────────────────────────────────────────────────────────────────────────

export const PlanFeaturesSchema = z.object({
  can_create: z.boolean().default(false),
  can_read:   z.boolean().default(true),
  can_update: z.boolean().default(false),
  can_delete: z.boolean().default(false),
  can_export: z.boolean().default(false),
  can_import: z.boolean().default(false),
  can_search: z.boolean().default(true),
  can_bulk:   z.boolean().default(false),
})

export const CreateApiPlanSchema = z.object({
  name:        nonEmptyStr,
  slug,
  description: optionalStr,
  // Pricing
  price_monthly:  price,
  price_yearly:   price,
  price_lifetime: price,
  // Type
  plan_type:    z.enum(['free', 'trial', 'paid', 'custom', 'lifetime']).default('paid'),
  trial_days:   z.number().int().min(0).max(365).optional().nullable(),
  // Expiration
  expiration_type:    z.enum(['never', 'date', 'days']).default('never'),
  expires_at:         z.string().optional().nullable(),
  expires_after_days: z.number().int().min(1).optional().nullable(),
  // Resource limits
  max_businesses:   limitNum.default(-1),
  max_restaurants:  limitNum.default(-1),
  max_users:        limitNum.default(-1),
  max_locations:    limitNum.default(-1),
  max_menus:        limitNum.default(-1),
  max_categories:   limitNum.default(-1),
  max_items:        limitNum.default(-1),
  max_customers:    limitNum.default(-1),
  max_coupons:      limitNum.default(-1),
  max_rewards:      limitNum.default(-1),
  max_games:        limitNum.default(-1),
  max_orders:       limitNum.default(-1),
  // Rate limits
  rate_limit_per_second:   rateNum.default(10),
  rate_limit_per_minute:   rateNum.default(100),
  rate_limit_per_hour:     rateNum.default(2000),
  rate_limit_per_day:      rateNum.default(10000),
  rate_limit_per_month:    rateNum.default(250000),
  max_concurrent_requests: rateNum.default(10),
  burst_limit:             rateNum.default(20),
  // Storage
  storage_limit_mb:      limitNum.default(-1),
  image_upload_limit_mb: limitNum.default(10),
  video_upload_limit_mb: limitNum.default(-1),
  // Limits
  webhook_limit:       limitNum.default(5),
  custom_domain_limit: limitNum.default(0),
  // Feature flags
  custom_branding:         z.boolean().default(false),
  white_label:             z.boolean().default(false),
  remove_branding:         z.boolean().default(false),
  priority_support:        z.boolean().default(false),
  dedicated_server:        z.boolean().default(false),
  custom_logo:             z.boolean().default(false),
  custom_theme:            z.boolean().default(false),
  access_ai_features:      z.boolean().default(false),
  access_premium_features: z.boolean().default(false),
  access_beta_features:    z.boolean().default(false),
  // Meta
  is_public:  z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  badge:       optionalStr,
  badge_color: optionalStr,
  // Feature permissions map
  features: z.record(z.string(), PlanFeaturesSchema).optional(),
})

export const UpdateApiPlanSchema = CreateApiPlanSchema.partial()

// ─────────────────────────────────────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────────────────────────────────────

export const CreateApiClientSchema = z.object({
  company_name:  nonEmptyStr,
  owner_name:    optionalStr,
  contact_name:  optionalStr,
  email:         z.string().email(),
  phone:         optionalStr,
  website:       url,
  logo_url:      url,
  environment:   z.enum(['production', 'sandbox']).default('production'),
  status:        z.enum(['active', 'suspended', 'pending', 'cancelled']).default('active'),
  notes:         optionalStr,
  tags:          z.array(z.string()).default([]),
  allowed_ips:   ipList,
  allowed_origins: domainList,
  allowed_domains: domainList,
  allowed_countries: z.array(z.string().length(2)).default([]),
  custom_rate_limit_per_minute: z.number().int().min(-1).optional().nullable(),
  custom_rate_limit_per_day:    z.number().int().min(-1).optional().nullable(),
  custom_rate_limit_per_month:  z.number().int().min(-1).optional().nullable(),
  custom_storage_limit_mb:      z.number().int().min(-1).optional().nullable(),
  timezone: z.string().default('UTC'),
  // Plan assignment on creation
  plan_id:       uuid.optional(),
  billing_cycle: z.enum(['monthly', 'yearly', 'lifetime', 'custom']).optional(),
})

export const UpdateApiClientSchema = CreateApiClientSchema.partial()

export const SuspendClientSchema = z.object({
  reason: z.string().min(1).max(500),
})

// ─────────────────────────────────────────────────────────────────────────────
// API Keys
// ─────────────────────────────────────────────────────────────────────────────

export const CreateApiKeySchema = z.object({
  client_id:   uuid,
  name:        nonEmptyStr,
  key_type:    z.enum(['public', 'secret', 'sandbox', 'production', 'temporary']).default('secret'),
  environment: z.enum(['production', 'sandbox', 'test']).default('production'),
  scopes:      z.array(z.string()).default([]),
  allowed_ips:          ipList,
  allowed_origins:      domainList,
  allowed_domains:      domainList,
  allowed_user_agents:  z.array(z.string()).default([]),
  allowed_environments: z.array(z.string()).default([]),
  expires_at:  z.string().datetime().optional().nullable(),
})

export const RevokeApiKeySchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────────────────────────────────────

export const CreateOAuthClientSchema = z.object({
  client_id_ref:  uuid.optional(),
  name:           nonEmptyStr,
  description:    optionalStr,
  logo_url:       url,
  redirect_uris:  z.array(z.string().url()).min(1),
  allowed_scopes: z.array(z.string()).default([]),
  grant_types:    z.array(z.enum(['authorization_code', 'client_credentials', 'refresh_token'])).default(['authorization_code']),
  pkce_required:  z.boolean().default(true),
  confidential:   z.boolean().default(true),
})

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks
// ─────────────────────────────────────────────────────────────────────────────

export const CreateWebhookSchema = z.object({
  client_id:   uuid,
  url:         z.string().url().startsWith('https://', 'Webhook URL must use HTTPS'),
  description: optionalStr,
  event_types: z.array(z.string()).default(['*']),
  retry_count:     z.number().int().min(0).max(10).default(3),
  timeout_seconds: z.number().int().min(5).max(60).default(30),
})

export const UpdateWebhookSchema = CreateWebhookSchema.partial().omit({ client_id: true })

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().max(200).optional(),
  sort:     z.string().max(50).optional(),
  order:    z.enum(['asc', 'desc']).default('desc'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Usage / Filter
// ─────────────────────────────────────────────────────────────────────────────

export const UsageQuerySchema = z.object({
  client_id: uuid.optional(),
  from:      z.string().datetime().optional(),
  to:        z.string().datetime().optional(),
  period:    z.enum(['1h', '24h', '7d', '30d', '90d']).default('7d'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Feature Permissions
// ─────────────────────────────────────────────────────────────────────────────

export const UpsertFeaturePermissionsSchema = z.object({
  permissions: z.array(z.object({
    feature:    z.string().min(1),
    can_create: z.boolean(),
    can_read:   z.boolean(),
    can_update: z.boolean(),
    can_delete: z.boolean(),
    can_export: z.boolean(),
    can_import: z.boolean(),
    can_search: z.boolean(),
    can_bulk:   z.boolean(),
  })),
})

// ─────────────────────────────────────────────────────────────────────────────
// SDK & API Version
// ─────────────────────────────────────────────────────────────────────────────

export const CreateSdkVersionSchema = z.object({
  language:     z.string().min(1),
  version:      z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver, e.g. 1.2.3'),
  status:       z.enum(['stable', 'beta', 'deprecated', 'yanked']).default('stable'),
  changelog:    optionalStr,
  download_url: url,
  npm_package:  optionalStr,
  github_url:   url,
  docs_url:     url,
  min_api_version: optionalStr,
})

export const CreateApiVersionSchema = z.object({
  version:             z.string().regex(/^v\d+$/, 'Must be like v1, v2, v3'),
  status:              z.enum(['active', 'deprecated', 'sunset']).default('active'),
  release_date:        z.string(),
  sunset_date:         z.string().optional().nullable(),
  deprecation_notice:  optionalStr,
  migration_guide:     optionalStr,
  changelog:           optionalStr,
  breaking_changes:    z.array(z.unknown()).default([]),
})

// ─────────────────────────────────────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  client_id:       uuid,
  subscription_id: uuid.optional().nullable(),
  status:          z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).default('draft'),
  subtotal:        z.number().min(0),
  tax:             z.number().min(0).default(0),
  discount:        z.number().min(0).default(0),
  currency:        z.string().length(3).default('USD'),
  period_start:    z.string().optional().nullable(),
  period_end:      z.string().optional().nullable(),
  due_date:        z.string().optional().nullable(),
  line_items:      z.array(z.object({
    description: z.string(),
    quantity:    z.number().int().min(1),
    unit_price:  z.number().min(0),
    total:       z.number().min(0),
  })).default([]),
  notes: optionalStr,
})

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  client_id:     uuid,
  plan_id:       uuid,
  status:        z.enum(['active', 'trialing', 'past_due', 'cancelled', 'expired']).default('active'),
  billing_cycle: z.enum(['monthly', 'yearly', 'lifetime', 'custom']).optional(),
  expires_at:    z.string().datetime().optional().nullable(),
  trial_ends_at: z.string().datetime().optional().nullable(),
})

// Type exports
export type CreateApiProductInput = z.infer<typeof CreateApiProductSchema>
export type CreateApiPlanInput    = z.infer<typeof CreateApiPlanSchema>
export type UpdateApiPlanInput    = z.infer<typeof UpdateApiPlanSchema>
export type CreateApiClientInput  = z.infer<typeof CreateApiClientSchema>
export type UpdateApiClientInput  = z.infer<typeof UpdateApiClientSchema>
export type CreateApiKeyInput     = z.infer<typeof CreateApiKeySchema>
export type CreateOAuthClientInput = z.infer<typeof CreateOAuthClientSchema>
export type CreateWebhookInput    = z.infer<typeof CreateWebhookSchema>
export type PaginationInput       = z.infer<typeof PaginationSchema>
export type UsageQueryInput       = z.infer<typeof UsageQuerySchema>
export type CreateInvoiceInput    = z.infer<typeof CreateInvoiceSchema>
