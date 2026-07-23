-- ═══════════════════════════════════════════════════════════════════════════
-- Scaniha Developer Platform — Complete Database Schema
-- Run once in the Supabase SQL editor. Fully idempotent (IF NOT EXISTS).
--
-- Tables:
--   dev_api_products         API product catalog (QR Menu API, Loyalty API…)
--   dev_product_endpoints    Endpoints per product
--   dev_api_plans            Configurable API plans with all limits
--   dev_plan_features        Feature-level permission matrix per plan
--   dev_clients              API client organizations (B2B tenants)
--   dev_client_subscriptions Client's active plan subscription
--   dev_feature_permissions  Per-client custom feature overrides
--   dev_api_keys             Secure API keys (public/secret/sandbox/prod)
--   dev_oauth_clients        OAuth 2.0 client registrations
--   dev_oauth_tokens         OAuth 2.0 access + refresh tokens
--   dev_usage_logs           Per-request API call log
--   dev_usage_hourly         Hourly aggregated rollup
--   dev_usage_daily          Daily aggregated rollup
--   dev_rate_limit_state     Sliding window counters per client+window
--   dev_quota_usage          Current quota consumption per client
--   dev_webhooks             Webhook endpoints registered by clients
--   dev_webhook_events       Webhook delivery history + retry state
--   dev_audit_logs           Immutable audit trail
--   dev_sdk_versions         Published SDK versions
--   dev_api_versions         API versioning + deprecation
--   dev_invoices             Billing invoices per client
-- ═══════════════════════════════════════════════════════════════════════════

-- Required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. API Products — the catalog of API products offered on the platform
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_api_products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                    -- e.g. "QR Menu API"
  slug          text not null unique,             -- e.g. "qr-menu"
  description   text,
  icon          text,                             -- emoji or icon name
  status        text not null default 'active' check (status in ('active','beta','deprecated','hidden')),
  version       text not null default 'v1',
  base_path     text not null,                    -- e.g. "/api/v1/menu"
  docs_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dev_api_products_slug_idx on public.dev_api_products(slug);
create index if not exists dev_api_products_status_idx on public.dev_api_products(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Product Endpoints — individual endpoints within each API product
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_product_endpoints (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.dev_api_products(id) on delete cascade,
  method        text not null check (method in ('GET','POST','PUT','PATCH','DELETE')),
  path          text not null,                    -- e.g. "/api/v1/menu/{id}"
  name          text not null,
  description   text,
  scope_required text,                            -- e.g. "menu:read"
  deprecated    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists dev_product_endpoints_product_idx on public.dev_product_endpoints(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. API Plans — fully configurable plans with all limits & features
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_api_plans (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  slug                     text not null unique,
  description              text,
  -- Pricing
  price_monthly            numeric(10,2),
  price_yearly             numeric(10,2),
  price_lifetime           numeric(10,2),
  -- Plan type
  plan_type                text not null default 'paid' check (plan_type in ('free','trial','paid','custom','lifetime')),
  trial_days               int,
  -- Expiration
  expiration_type          text not null default 'never' check (expiration_type in ('never','date','days')),
  expires_at               date,
  expires_after_days       int,
  -- Resource limits (-1 = unlimited)
  max_businesses           int not null default -1,
  max_restaurants          int not null default -1,
  max_users                int not null default -1,
  max_locations            int not null default -1,
  max_menus                int not null default -1,
  max_categories           int not null default -1,
  max_items                int not null default -1,
  max_customers            int not null default -1,
  max_coupons              int not null default -1,
  max_rewards              int not null default -1,
  max_games                int not null default -1,
  max_orders               int not null default -1,
  -- API rate limits
  rate_limit_per_second    int not null default 10,
  rate_limit_per_minute    int not null default 100,
  rate_limit_per_hour      int not null default 2000,
  rate_limit_per_day       int not null default 10000,
  rate_limit_per_month     int not null default 250000,
  max_concurrent_requests  int not null default 10,
  burst_limit              int not null default 20,
  -- Storage limits (MB, -1 = unlimited)
  storage_limit_mb         int not null default -1,
  image_upload_limit_mb    int not null default 10,
  video_upload_limit_mb    int not null default -1,
  -- Other limits
  webhook_limit            int not null default 5,
  custom_domain_limit      int not null default 0,
  -- Feature flags
  custom_branding          boolean not null default false,
  white_label              boolean not null default false,
  remove_branding          boolean not null default false,
  priority_support         boolean not null default false,
  dedicated_server         boolean not null default false,
  custom_logo              boolean not null default false,
  custom_theme             boolean not null default false,
  access_ai_features       boolean not null default false,
  access_premium_features  boolean not null default false,
  access_beta_features     boolean not null default false,
  -- Meta
  is_public                boolean not null default true,
  sort_order               int not null default 0,
  badge                    text,                  -- e.g. "Popular", "Best Value"
  badge_color              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists dev_api_plans_slug_idx on public.dev_api_plans(slug);
create index if not exists dev_api_plans_type_idx on public.dev_api_plans(plan_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Plan Features — feature permission matrix per plan
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_plan_features (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.dev_api_plans(id) on delete cascade,
  feature      text not null,   -- e.g. "menu", "loyalty", "analytics"
  can_create   boolean not null default false,
  can_read     boolean not null default true,
  can_update   boolean not null default false,
  can_delete   boolean not null default false,
  can_export   boolean not null default false,
  can_import   boolean not null default false,
  can_search   boolean not null default true,
  can_bulk     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique(plan_id, feature)
);

create index if not exists dev_plan_features_plan_idx on public.dev_plan_features(plan_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. API Clients — B2B tenant organizations
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_clients (
  id              uuid primary key default gen_random_uuid(),
  company_name    text not null,
  owner_name      text,
  email           text not null unique,
  phone           text,
  website         text,
  logo_url        text,
  status          text not null default 'active' check (status in ('active','suspended','pending','cancelled')),
  notes           text,
  tags            text[] not null default '{}',
  -- Access restrictions
  allowed_ips     text[] not null default '{}',
  allowed_origins text[] not null default '{}',
  allowed_domains text[] not null default '{}',
  allowed_countries text[] not null default '{}',
  -- Custom limits (overrides plan defaults, -1 = use plan default)
  custom_rate_limit_per_minute int,
  custom_rate_limit_per_day    int,
  custom_rate_limit_per_month  int,
  custom_storage_limit_mb      int,
  -- Meta
  timezone        text not null default 'UTC',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  suspended_at    timestamptz,
  suspension_reason text
);

create index if not exists dev_clients_email_idx on public.dev_clients(email);
create index if not exists dev_clients_status_idx on public.dev_clients(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Client Subscriptions — active plan for each client
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_client_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.dev_clients(id) on delete cascade,
  plan_id      uuid not null references public.dev_api_plans(id),
  status       text not null default 'active' check (status in ('active','trialing','past_due','cancelled','expired')),
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  -- Billing cycle
  billing_cycle text check (billing_cycle in ('monthly','yearly','lifetime','custom')),
  next_invoice_at timestamptz,
  -- External payment reference
  payment_provider     text,
  payment_subscription_id text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dev_client_subscriptions_client_idx on public.dev_client_subscriptions(client_id);
create index if not exists dev_client_subscriptions_status_idx on public.dev_client_subscriptions(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Feature Permissions — per-client overrides of plan feature permissions
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_feature_permissions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.dev_clients(id) on delete cascade,
  feature      text not null,
  can_create   boolean not null default false,
  can_read     boolean not null default true,
  can_update   boolean not null default false,
  can_delete   boolean not null default false,
  can_export   boolean not null default false,
  can_import   boolean not null default false,
  can_search   boolean not null default true,
  can_bulk     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(client_id, feature)
);

create index if not exists dev_feature_permissions_client_idx on public.dev_feature_permissions(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. API Keys — secure multi-type key pairs per client
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_api_keys (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  name            text not null,
  key_type        text not null default 'secret' check (key_type in ('public','secret','sandbox','production','temporary')),
  environment     text not null default 'production' check (environment in ('production','sandbox','test')),
  -- Key material — raw key is NEVER stored, only shown once at creation
  key_prefix      text not null,   -- e.g. "sk_live_a1b2c3d4" (visible in listings)
  key_hash        text not null unique, -- SHA-256 hex of the full raw key
  -- Scopes & restrictions
  scopes          text[] not null default '{}',
  allowed_ips     text[] not null default '{}',
  allowed_origins text[] not null default '{}',
  allowed_domains text[] not null default '{}',
  allowed_user_agents text[] not null default '{}',
  allowed_environments text[] not null default '{}',
  -- Lifecycle
  status          text not null default 'active' check (status in ('active','revoked','expired','rotating')),
  expires_at      timestamptz,
  last_used_at    timestamptz,
  last_used_ip    text,
  revoked_at      timestamptz,
  revoked_by      text,           -- super_admin user_id
  revocation_reason text,
  -- Rolling key support
  rolling_key_id  uuid,           -- new key replacing this one during rotation
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists dev_api_keys_client_idx on public.dev_api_keys(client_id);
create index if not exists dev_api_keys_hash_idx on public.dev_api_keys(key_hash);
create index if not exists dev_api_keys_prefix_idx on public.dev_api_keys(key_prefix);
create index if not exists dev_api_keys_status_idx on public.dev_api_keys(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. OAuth Clients — OAuth 2.0 registered applications
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_oauth_clients (
  id                  uuid primary key default gen_random_uuid(),
  client_id_str       text not null unique default ('oauth_' || substr(gen_random_uuid()::text, 1, 16)),
  client_secret_hash  text not null,
  client_id_ref       uuid references public.dev_clients(id) on delete cascade,
  name                text not null,
  description         text,
  logo_url            text,
  redirect_uris       text[] not null default '{}',
  allowed_scopes      text[] not null default '{}',
  grant_types         text[] not null default '{authorization_code}',
  -- Capabilities
  pkce_required       boolean not null default true,
  confidential        boolean not null default true,
  status              text not null default 'active' check (status in ('active','revoked')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists dev_oauth_clients_client_id_idx on public.dev_oauth_clients(client_id_str);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. OAuth Tokens — access + refresh tokens
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_oauth_tokens (
  id                uuid primary key default gen_random_uuid(),
  oauth_client_id   uuid not null references public.dev_oauth_clients(id) on delete cascade,
  client_id         uuid references public.dev_clients(id) on delete cascade,
  token_type        text not null default 'Bearer',
  access_token_hash text not null unique,
  refresh_token_hash text unique,
  scopes            text[] not null default '{}',
  expires_at        timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists dev_oauth_tokens_access_hash_idx on public.dev_oauth_tokens(access_token_hash);
create index if not exists dev_oauth_tokens_refresh_hash_idx on public.dev_oauth_tokens(refresh_token_hash);
create index if not exists dev_oauth_tokens_client_idx on public.dev_oauth_tokens(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Usage Logs — per-request API call log (append-only)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_usage_logs (
  id              bigint generated always as identity,
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  api_key_id      uuid references public.dev_api_keys(id) on delete set null,
  method          text not null,
  path            text not null,
  status_code     int not null,
  response_time_ms int not null,
  request_size_bytes  int,
  response_size_bytes int,
  ip_address      inet,
  user_agent      text,
  error_code      text,
  error_message   text,
  api_version     text,
  created_at      timestamptz not null default now(),
  primary key (id, created_at)           -- partition key MUST be part of PK
) partition by range (created_at);


-- Create partitions for current and next month
create table if not exists public.dev_usage_logs_2026_07 partition of public.dev_usage_logs
  for values from ('2026-07-01') to ('2026-08-01');
create table if not exists public.dev_usage_logs_2026_08 partition of public.dev_usage_logs
  for values from ('2026-08-01') to ('2026-09-01');
create table if not exists public.dev_usage_logs_2026_09 partition of public.dev_usage_logs
  for values from ('2026-09-01') to ('2026-10-01');
create table if not exists public.dev_usage_logs_2026_10 partition of public.dev_usage_logs
  for values from ('2026-10-01') to ('2026-11-01');
create table if not exists public.dev_usage_logs_2026_11 partition of public.dev_usage_logs
  for values from ('2026-11-01') to ('2026-12-01');
create table if not exists public.dev_usage_logs_2026_12 partition of public.dev_usage_logs
  for values from ('2026-12-01') to ('2027-01-01');

create index if not exists dev_usage_logs_client_created_idx on public.dev_usage_logs(client_id, created_at desc);
create index if not exists dev_usage_logs_created_idx on public.dev_usage_logs(created_at desc);
create index if not exists dev_usage_logs_status_idx on public.dev_usage_logs(status_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Usage Hourly — aggregated hourly rollups
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_usage_hourly (
  id              bigserial primary key,
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  hour            timestamptz not null,  -- truncated to hour
  total_requests  int not null default 0,
  success_requests int not null default 0,
  error_requests  int not null default 0,
  avg_response_ms int,
  p95_response_ms int,
  bandwidth_bytes bigint not null default 0,
  unique(client_id, hour)
);

create index if not exists dev_usage_hourly_client_hour_idx on public.dev_usage_hourly(client_id, hour desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Usage Daily — aggregated daily rollups
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_usage_daily (
  id              bigserial primary key,
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  day             date not null,
  total_requests  int not null default 0,
  success_requests int not null default 0,
  error_requests  int not null default 0,
  avg_response_ms int,
  bandwidth_bytes bigint not null default 0,
  unique(client_id, day)
);

create index if not exists dev_usage_daily_client_day_idx on public.dev_usage_daily(client_id, day desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Rate Limit State — sliding window counters (upserted per request)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_rate_limit_state (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.dev_clients(id) on delete cascade,
  window_type text not null check (window_type in ('second','minute','hour','day','month')),
  window_key  text not null,   -- e.g. "2026-07-22T16:00" for hourly
  count       int not null default 0,
  expires_at  timestamptz not null,
  unique(client_id, window_type, window_key)
);

create index if not exists dev_rate_limit_state_client_idx on public.dev_rate_limit_state(client_id, window_type);
create index if not exists dev_rate_limit_state_expires_idx on public.dev_rate_limit_state(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. Quota Usage — current quota consumption per client
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_quota_usage (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  quota_type      text not null,   -- e.g. "businesses", "storage_mb", "api_calls_month"
  used            bigint not null default 0,
  limit_value     bigint not null default -1,
  reset_at        timestamptz,     -- for time-based quotas
  updated_at      timestamptz not null default now(),
  unique(client_id, quota_type)
);

create index if not exists dev_quota_usage_client_idx on public.dev_quota_usage(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. Webhooks — client-registered webhook endpoints
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_webhooks (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  url             text not null,
  description     text,
  secret_hash     text not null,     -- HMAC signing secret (hashed)
  secret_prefix   text not null,     -- first 8 chars shown to user
  status          text not null default 'active' check (status in ('active','disabled','failing')),
  event_types     text[] not null default '{}',  -- '*' = all events
  -- Stats
  total_deliveries int not null default 0,
  failed_deliveries int not null default 0,
  last_triggered_at timestamptz,
  last_success_at   timestamptz,
  last_failure_at   timestamptz,
  -- Config
  retry_count     int not null default 3,
  timeout_seconds int not null default 30,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists dev_webhooks_client_idx on public.dev_webhooks(client_id);
create index if not exists dev_webhooks_status_idx on public.dev_webhooks(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. Webhook Events — delivery history + retry state
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_webhook_events (
  id              uuid primary key default gen_random_uuid(),
  webhook_id      uuid not null references public.dev_webhooks(id) on delete cascade,
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  event_type      text not null,
  payload         jsonb not null default '{}',
  status          text not null default 'pending' check (status in ('pending','delivered','failed','retrying')),
  -- Delivery details
  response_status int,
  response_body   text,
  response_time_ms int,
  attempt_count   int not null default 0,
  next_retry_at   timestamptz,
  delivered_at    timestamptz,
  failed_at       timestamptz,
  -- Signature
  signature       text not null,
  created_at      timestamptz not null default now()
);

create index if not exists dev_webhook_events_webhook_idx on public.dev_webhook_events(webhook_id, created_at desc);
create index if not exists dev_webhook_events_client_idx on public.dev_webhook_events(client_id, created_at desc);
create index if not exists dev_webhook_events_status_idx on public.dev_webhook_events(status);
create index if not exists dev_webhook_events_retry_idx on public.dev_webhook_events(next_retry_at) where status = 'retrying';

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. Audit Logs — immutable audit trail
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_audit_logs (
  id              bigserial primary key,
  actor_id        text,            -- super_admin user_id or client_id
  actor_type      text not null check (actor_type in ('super_admin','client','system')),
  action          text not null,   -- e.g. "key.created", "plan.updated", "client.suspended"
  resource_type   text not null,   -- e.g. "api_key", "client", "plan"
  resource_id     text,
  old_value       jsonb,
  new_value       jsonb,
  ip_address      inet,
  user_agent      text,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists dev_audit_logs_actor_idx on public.dev_audit_logs(actor_id, created_at desc);
create index if not exists dev_audit_logs_resource_idx on public.dev_audit_logs(resource_type, resource_id, created_at desc);
create index if not exists dev_audit_logs_action_idx on public.dev_audit_logs(action, created_at desc);
create index if not exists dev_audit_logs_created_idx on public.dev_audit_logs(created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. SDK Versions — versioned SDK releases
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_sdk_versions (
  id              uuid primary key default gen_random_uuid(),
  language        text not null,   -- e.g. "javascript", "python", "php"
  version         text not null,   -- semver, e.g. "1.2.3"
  status          text not null default 'stable' check (status in ('stable','beta','deprecated','yanked')),
  changelog       text,
  download_url    text,
  npm_package     text,
  github_url      text,
  docs_url        text,
  min_api_version text,
  published_at    timestamptz not null default now(),
  deprecated_at   timestamptz,
  unique(language, version)
);

create index if not exists dev_sdk_versions_language_idx on public.dev_sdk_versions(language, published_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. API Versions — API versioning + deprecation notices
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_api_versions (
  id              uuid primary key default gen_random_uuid(),
  version         text not null unique,  -- e.g. "v1", "v2", "v3"
  status          text not null default 'active' check (status in ('active','deprecated','sunset')),
  release_date    date not null,
  sunset_date     date,
  deprecation_notice text,
  migration_guide text,
  changelog       text,
  breaking_changes jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. Invoices — billing invoices per client
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dev_invoices (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.dev_clients(id) on delete cascade,
  subscription_id uuid references public.dev_client_subscriptions(id),
  invoice_number  text not null unique,
  status          text not null default 'draft' check (status in ('draft','open','paid','void','uncollectible')),
  -- Amounts
  subtotal        numeric(10,2) not null default 0,
  tax             numeric(10,2) not null default 0,
  discount        numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,
  currency        text not null default 'USD',
  -- Dates
  period_start    date,
  period_end      date,
  due_date        date,
  paid_at         timestamptz,
  -- Line items
  line_items      jsonb not null default '[]',
  -- Payment
  payment_provider text,
  payment_intent_id text,
  -- Meta
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists dev_invoices_client_idx on public.dev_invoices(client_id, created_at desc);
create index if not exists dev_invoices_status_idx on public.dev_invoices(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security — NOBODY but service_role.
-- All management happens through server-side routes using service_role client.
-- ═══════════════════════════════════════════════════════════════════════════
do $$ declare
  t text;
begin
  foreach t in array array[
    'dev_api_products','dev_product_endpoints','dev_api_plans','dev_plan_features',
    'dev_clients','dev_client_subscriptions','dev_feature_permissions','dev_api_keys',
    'dev_oauth_clients','dev_oauth_tokens','dev_usage_logs','dev_usage_hourly',
    'dev_usage_daily','dev_rate_limit_state','dev_quota_usage','dev_webhooks',
    'dev_webhook_events','dev_audit_logs','dev_sdk_versions','dev_api_versions',
    'dev_invoices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
-- service_role bypasses RLS entirely — no policies needed.

-- ═══════════════════════════════════════════════════════════════════════════
-- Updated_at trigger function (shared)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.dev_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare
  t text;
begin
  foreach t in array array[
    'dev_api_products','dev_api_plans','dev_clients','dev_client_subscriptions',
    'dev_feature_permissions','dev_api_keys','dev_oauth_clients','dev_webhooks',
    'dev_api_versions','dev_invoices'
  ] loop
    execute format('drop trigger if exists %I on public.%I;', t || '_updated_at_trg', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.dev_set_updated_at()',
      t || '_updated_at_trg', t
    );
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data — API Versions
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.dev_api_versions (version, status, release_date, changelog)
values
  ('v1', 'active', '2024-01-01', 'Initial release — Loyalty, Menu, Orders, Games'),
  ('v2', 'active', '2025-06-01', 'Added Analytics, Webhooks, OAuth 2.0')
on conflict (version) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data — API Products
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.dev_api_products (name, slug, description, icon, base_path, version)
values
  ('QR Menu API',     'qr-menu',   'Build and manage digital menus programmatically', '🍽️', '/api/v1/menu', 'v1'),
  ('Loyalty API',     'loyalty',   'Points, rewards, and customer loyalty programs',  '⭐', '/api/v1/loyalty', 'v1'),
  ('Orders API',      'orders',    'Order management and processing',                 '🛒', '/api/v1/orders', 'v1'),
  ('Customers API',   'customers', 'Customer profiles and engagement data',           '👥', '/api/v1/customers', 'v1'),
  ('Analytics API',   'analytics', 'Usage metrics, views, and engagement analytics', '📊', '/api/v1/analytics', 'v1'),
  ('Games API',       'games',     'Spin wheel, scratch cards, and lucky draw',       '🎮', '/api/v1/games', 'v1'),
  ('Coupons API',     'coupons',   'Coupon creation, distribution, and redemption',   '🎟️', '/api/v1/coupons', 'v1'),
  ('Everything API',  'everything','Full access to all Scaniha API endpoints',        '🚀', '/api/v1', 'v1')
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data — Default Product Endpoints
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.dev_product_endpoints (product_id, path, method, name, description)
select id, '/api/v1/menu', 'GET', 'Get Menu', 'List all digital menu categories & items' from public.dev_api_products where slug = 'qr-menu'
union all
select id, '/api/v1/menu/items', 'POST', 'Create Menu Item', 'Create or update menu item' from public.dev_api_products where slug = 'qr-menu'
union all
select id, '/api/v1/loyalty', 'GET', 'List Rewards', 'List active loyalty rewards' from public.dev_api_products where slug = 'loyalty'
union all
select id, '/api/v1/orders', 'GET', 'List Orders', 'List recent restaurant orders' from public.dev_api_products where slug = 'orders'
union all
select id, '/api/v1/orders', 'POST', 'Create Order', 'Create new order (triggers order.created webhook)' from public.dev_api_products where slug = 'orders'
union all
select id, '/api/v1/customers', 'GET', 'List Customers', 'List customer profiles' from public.dev_api_products where slug = 'customers'
union all
select id, '/api/v1/analytics', 'GET', 'Get Analytics', 'Get traffic views and order metrics' from public.dev_api_products where slug = 'analytics'
union all
select id, '/api/v1/games', 'GET', 'List Games', 'List available interactive games' from public.dev_api_products where slug = 'games'
union all
select id, '/api/v1/coupons', 'GET', 'List Coupons', 'List active coupon codes' from public.dev_api_products where slug = 'coupons';

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed data — Default Plans
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.dev_api_plans (name, slug, description, plan_type, price_monthly, price_yearly, is_public, sort_order, badge, badge_color,
  rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day, rate_limit_per_month,
  max_businesses, max_customers, max_orders, webhook_limit)
values
  ('Free',       'free',       'Get started with Scaniha API for free', 'free', 0, 0, true, 0, null, null,
   60, 1000, 5000, 50000, 1, 500, 100, 1),
  ('Starter',    'starter',    'For small apps and prototypes',         'paid', 29, 290, true, 1, null, null,
   300, 10000, 50000, 500000, 5, 5000, 1000, 5),
  ('Growth',     'growth',     'Scale your integration with confidence', 'paid', 99, 990, true, 2, 'Popular', '#f47b20',
   1000, 30000, 250000, 2500000, 25, 50000, 10000, 20),
  ('Enterprise', 'enterprise', 'Unlimited scale with dedicated support', 'custom', null, null, true, 3, 'Best Value', '#6366f1',
   -1, -1, -1, -1, -1, -1, -1, -1)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper function: check rate limit (atomic, sliding window)
-- Returns: (allowed boolean, count int, limit int, remaining int)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.dev_check_rate_limit(
  p_client_id   uuid,
  p_window_type text,
  p_window_key  text,
  p_limit       int,
  p_window_ttl  interval
)
returns table(allowed boolean, curr_count int, limit_val int, remaining int)
language plpgsql as $$
declare
  v_count int;
begin
  if p_limit = -1 then
    return query select true, 0, -1, -1;
    return;
  end if;

  insert into public.dev_rate_limit_state (client_id, window_type, window_key, count, expires_at)
  values (p_client_id, p_window_type, p_window_key, 1, now() + p_window_ttl)
  on conflict (client_id, window_type, window_key)
  do update set count = dev_rate_limit_state.count + 1
  returning count into v_count;

  return query select
    v_count <= p_limit,
    v_count,
    p_limit,
    greatest(0, p_limit - v_count);
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Cleanup stale rate limit windows (call periodically)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.dev_cleanup_rate_limits()
returns void language plpgsql as $$
begin
  delete from public.dev_rate_limit_state where expires_at < now();
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Invoice number generator
-- ═══════════════════════════════════════════════════════════════════════════
create sequence if not exists public.dev_invoice_seq start 1000;

create or replace function public.dev_next_invoice_number()
returns text language plpgsql as $$
begin
  return 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.dev_invoice_seq')::text, 6, '0');
end;
$$;
