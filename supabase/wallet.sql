-- ════════════════════════════════════════════════════════════════════
-- Scaniha — diner WALLET listing (the multi-business loyalty portefeuille)
-- Run ONCE (re-runnable / idempotent). Pairs with GLOBAL identity (accounts_global.sql).
--
-- diner_wallet(p_phone) returns one row per café the phone has a relationship with
-- — AUTO-SURFACED from any loyalty activity (points / wins / plays), per the owner's
-- choice. Each entry carries the café's branding + its OWN per-café balance + mode,
-- so the wallet UI can render cards that drill into each café's existing hub.
--
-- SECURITY: SECURITY DEFINER, service_role only. The caller (GET /api/wallet) derives
-- p_phone from the session token server-side and NEVER trusts a client-supplied phone,
-- so a diner can only ever list their OWN cafés. Only fidelity-LIVE cafés are returned
-- (mirrors isFidelityLive: design_settings.products / loyaltyEnabled) so cards never
-- dead-end on the /[slug]/fidelite redirect.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.diner_wallet(p_phone text)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.balance desc, x.name), '[]'::jsonb)
  from (
    select
      b.slug,
      b.name,
      b.logo_url,
      coalesce(nullif(b.primary_color, ''), '#F47B20')                          as accent,
      exists(select 1 from public.games g
             where g.business_id = b.id and g.active)                           as has_roulette,
      exists(select 1 from public.loyalty_programs lp
             where lp.business_id = b.id and lp.active)                         as has_loyalty,
      -- Points balance ONLY when the café runs an active points program — mirrors
      -- the café hub (loadLoyalty returns a null summary → 0 when no active program),
      -- so a roulette-only café reads 0 here too instead of a dormant ledger sum.
      case when exists(select 1 from public.loyalty_programs lp
                       where lp.business_id = b.id and lp.active)
           then coalesce((select sum(pl.delta)::int from public.points_ledger pl
                          where pl.business_id = b.id and pl.customer_phone = p_phone), 0)
           else 0 end                                                            as balance,
      (select count(*)::int from public.wins w
        where w.business_id = b.id and w.customer_phone = p_phone
          and w.status = 'pending' and w.expires_at > now())                    as active_wins
    from public.businesses b
    where b.status = 'active'
      -- fidelity must be LIVE (mirror isFidelityLive in lib/design-settings.ts)
      and case
            when (b.design_settings->>'products') = 'fidelity' then true
            when (b.design_settings->>'products') = 'menu' then false
            else coalesce((b.design_settings->>'loyaltyEnabled') <> 'false', true)
          end
      -- relationship: any loyalty activity for this phone at this café
      and (
        exists(select 1 from public.points_ledger pl where pl.business_id = b.id and pl.customer_phone = p_phone)
        or exists(select 1 from public.wins w  where w.business_id = b.id and w.customer_phone = p_phone)
        or exists(select 1 from public.plays p where p.business_id = b.id and p.customer_phone = p_phone)
      )
  ) x;
$$;

revoke all on function public.diner_wallet(text) from public, anon, authenticated;
grant execute on function public.diner_wallet(text) to service_role;
