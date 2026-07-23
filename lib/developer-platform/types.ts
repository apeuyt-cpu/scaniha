/**
 * Developer Platform — TypeScript Types & DTOs
 * All interfaces used across the platform.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enums & Literals
// ─────────────────────────────────────────────────────────────────────────────

export type ApiKeyType = 'public' | 'secret' | 'sandbox' | 'production' | 'temporary'
export type ApiKeyStatus = 'active' | 'revoked' | 'expired' | 'rotating'
export type ApiKeyEnvironment = 'production' | 'sandbox' | 'test'

export type ClientStatus = 'active' | 'suspended' | 'pending' | 'cancelled'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired'
export type PlanType = 'free' | 'trial' | 'paid' | 'custom' | 'lifetime'

export type ProductStatus = 'active' | 'beta' | 'deprecated' | 'hidden'
export type WebhookStatus = 'active' | 'disabled' | 'failing'
export type WebhookEventStatus = 'pending' | 'delivered' | 'failed' | 'retrying'

export type OAuthGrantType = 'authorization_code' | 'client_credentials' | 'refresh_token'
export type AuditActorType = 'super_admin' | 'client' | 'system'

export type SdkStatus = 'stable' | 'beta' | 'deprecated' | 'yanked'
export type ApiVersionStatus = 'active' | 'deprecated' | 'sunset'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export type ExpirationPolicy = 'never' | 'date' | 'days'
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime' | 'custom'

export const ALL_FEATURES = [
  'menu', 'categories', 'items', 'customers', 'orders', 'rewards', 'coupons',
  'spin_wheel', 'scratch_card', 'lucky_draw', 'loyalty', 'analytics', 'reports',
  'notifications', 'media', 'storage', 'invoices', 'payments', 'integrations',
  'pos', 'reservations', 'campaigns', 'marketing',
] as const

export type FeatureName = typeof ALL_FEATURES[number]

// ─────────────────────────────────────────────────────────────────────────────
// Core Domain Models
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  status: ProductStatus
  version: string
  base_path: string
  docs_url: string | null
  created_at: string
  updated_at: string
  endpoints?: ProductEndpoint[]
}

export interface ProductEndpoint {
  id: string
  product_id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  name: string
  description: string | null
  scope_required: string | null
  deprecated: boolean
  created_at: string
}

export interface ApiPlan {
  id: string
  name: string
  slug: string
  description: string | null
  // Pricing
  price_monthly: number | null
  price_yearly: number | null
  price_lifetime: number | null
  // Type
  plan_type: PlanType
  trial_days: number | null
  // Expiration
  expiration_type: ExpirationPolicy
  expires_at: string | null
  expires_after_days: number | null
  // Resource limits
  max_businesses: number
  max_restaurants: number
  max_users: number
  max_locations: number
  max_menus: number
  max_categories: number
  max_items: number
  max_customers: number
  max_coupons: number
  max_rewards: number
  max_games: number
  max_orders: number
  // Rate limits
  rate_limit_per_second: number
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  rate_limit_per_day: number
  rate_limit_per_month: number
  max_concurrent_requests: number
  burst_limit: number
  // Storage
  storage_limit_mb: number
  image_upload_limit_mb: number
  video_upload_limit_mb: number
  // Other limits
  webhook_limit: number
  custom_domain_limit: number
  // Features
  custom_branding: boolean
  white_label: boolean
  remove_branding: boolean
  priority_support: boolean
  dedicated_server: boolean
  custom_logo: boolean
  custom_theme: boolean
  access_ai_features: boolean
  access_premium_features: boolean
  access_beta_features: boolean
  // Meta
  is_public: boolean
  sort_order: number
  badge: string | null
  badge_color: string | null
  created_at: string
  updated_at: string
  // Relations
  features?: PlanFeature[]
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
  can_export: boolean
  can_import: boolean
  can_search: boolean
  can_bulk: boolean
  created_at: string
}

export interface ApiClient {
  id: string
  company_name: string
  owner_name: string | null
  contact_name: string | null
  email: string
  phone: string | null
  website: string | null
  logo_url: string | null
  environment: 'production' | 'sandbox'
  status: ClientStatus
  notes: string | null
  tags: string[]
  allowed_ips: string[]
  allowed_origins: string[]
  allowed_domains: string[]
  allowed_countries: string[]
  custom_rate_limit_per_minute: number | null
  custom_rate_limit_per_day: number | null
  custom_rate_limit_per_month: number | null
  custom_storage_limit_mb: number | null
  timezone: string
  created_at: string
  updated_at: string
  suspended_at: string | null
  suspension_reason: string | null
  // Relations (joined)
  subscription?: ClientSubscription & { plan?: ApiPlan }
  api_keys?: ApiKey[]
  _count?: { api_keys: number; webhooks: number; usage_logs: number }
}

export interface ClientSubscription {
  id: string
  client_id: string
  plan_id: string
  status: SubscriptionStatus
  started_at: string
  expires_at: string | null
  trial_ends_at: string | null
  cancelled_at: string | null
  billing_cycle: BillingCycle | null
  next_invoice_at: string | null
  payment_provider: string | null
  payment_subscription_id: string | null
  created_at: string
  updated_at: string
  plan?: ApiPlan
}

export interface ApiKey {
  id: string
  client_id: string
  name: string
  key_type: ApiKeyType
  environment: ApiKeyEnvironment
  key_prefix: string
  key_hash: string
  scopes: string[]
  allowed_ips: string[]
  allowed_origins: string[]
  allowed_domains: string[]
  allowed_user_agents: string[]
  allowed_environments: string[]
  status: ApiKeyStatus
  expires_at: string | null
  last_used_at: string | null
  last_used_ip: string | null
  revoked_at: string | null
  revoked_by: string | null
  revocation_reason: string | null
  rolling_key_id: string | null
  created_at: string
  updated_at: string
  // Ephemeral — only returned on creation, never stored
  raw_key?: string
}

export interface OAuthClient {
  id: string
  client_id_str: string
  client_id_ref: string | null
  name: string
  description: string | null
  logo_url: string | null
  redirect_uris: string[]
  allowed_scopes: string[]
  grant_types: OAuthGrantType[]
  pkce_required: boolean
  confidential: boolean
  status: 'active' | 'revoked'
  created_at: string
  updated_at: string
  // Ephemeral — only returned on creation
  raw_secret?: string
}

export interface UsageLog {
  id: number
  client_id: string
  api_key_id: string | null
  method: string
  path: string
  status_code: number
  response_time_ms: number
  request_size_bytes: number | null
  response_size_bytes: number | null
  ip_address: string | null
  user_agent: string | null
  error_code: string | null
  error_message: string | null
  api_version: string | null
  created_at: string
}

export interface UsageSummary {
  total_requests: number
  success_requests: number
  error_requests: number
  avg_response_ms: number
  bandwidth_bytes: number
  error_rate: number
  period: string
}

export interface UsageDaily {
  day: string
  total_requests: number
  success_requests: number
  error_requests: number
  avg_response_ms: number | null
  bandwidth_bytes: number
}

export interface DeveloperWebhook {
  id: string
  client_id: string
  url: string
  description: string | null
  secret_prefix: string
  status: WebhookStatus
  event_types: string[]
  total_deliveries: number
  failed_deliveries: number
  last_triggered_at: string | null
  last_success_at: string | null
  last_failure_at: string | null
  retry_count: number
  timeout_seconds: number
  created_at: string
  updated_at: string
  // Ephemeral
  raw_secret?: string
}

export interface WebhookEvent {
  id: string
  webhook_id: string
  client_id: string
  event_type: string
  payload: Record<string, unknown>
  status: WebhookEventStatus
  response_status: number | null
  response_body: string | null
  response_time_ms: number | null
  attempt_count: number
  next_retry_at: string | null
  delivered_at: string | null
  failed_at: string | null
  signature: string
  created_at: string
}

export interface AuditLog {
  id: number
  actor_id: string | null
  actor_type: AuditActorType
  action: string
  resource_type: string
  resource_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface SdkVersion {
  id: string
  language: string
  version: string
  status: SdkStatus
  changelog: string | null
  download_url: string | null
  npm_package: string | null
  github_url: string | null
  docs_url: string | null
  min_api_version: string | null
  published_at: string
  deprecated_at: string | null
}

export interface ApiVersion {
  id: string
  version: string
  status: ApiVersionStatus
  release_date: string
  sunset_date: string | null
  deprecation_notice: string | null
  migration_guide: string | null
  changelog: string | null
  breaking_changes: unknown[]
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  client_id: string
  subscription_id: string | null
  invoice_number: string
  status: InvoiceStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  currency: string
  period_start: string | null
  period_end: string | null
  due_date: string | null
  paid_at: string | null
  line_items: InvoiceLineItem[]
  payment_provider: string | null
  payment_intent_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: Pick<ApiClient, 'company_name' | 'email'>
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Stats
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  total_clients: number
  active_clients: number
  total_api_keys: number
  active_api_keys: number
  total_requests_today: number
  total_requests_month: number
  avg_response_ms: number
  error_rate_percent: number
  revenue_month: number
  active_subscriptions: number
  webhooks_total: number
  rate_limit_hits_today: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Check Result
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset_at: string
  window_type: string
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response wrapper
// ─────────────────────────────────────────────────────────────────────────────

export interface DevApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page?: number
    per_page?: number
    total?: number
    has_more?: boolean
  }
}

export interface PaginationParams {
  page?: number
  per_page?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}
