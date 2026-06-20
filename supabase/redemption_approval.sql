-- ════════════════════════════════════════════════════════════════════
-- Scaniha — caisse can DECLINE a pending reward request (with refund).
-- Run once in the Supabase SQL editor (idempotent) or via
--   node scripts/apply-sql-api.mjs supabase/redemption_approval.sql
--
-- Today a boutique redemption debits the points immediately and creates a
-- 'pending' loyalty_redemptions row; the cashier can only "collect" (approve)
-- it. This adds the DECLINE path: cancel the request AND refund the points the
-- customer spent. Approve stays the existing validate_code(redeem=true).
-- Atomic + idempotent: only ever acts on a still-'pending' row.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.decline_redemption(p_business uuid, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_red public.loyalty_redemptions;
  v_balance int;
begin
  if length(v_norm) < 4 then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select * into v_red from public.loyalty_redemptions
    where business_id = p_business and upper(replace(code, '-', '')) = v_norm limit 1;
  if v_red.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_red.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending', 'status', v_red.status);
  end if;

  -- Serialize per (business, phone) so the refund can't race a concurrent op.
  perform pg_advisory_xact_lock(hashtext(p_business::text || '|' || v_red.customer_phone));

  update public.loyalty_redemptions set status = 'cancelled' where id = v_red.id and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;

  -- Refund the points that were debited when the customer redeemed.
  insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
    values (p_business, v_red.customer_phone, v_red.points_cost, 'adjust', 'Récompense refusée — remboursement');

  select coalesce(sum(delta), 0) into v_balance from public.points_ledger
    where business_id = p_business and customer_phone = v_red.customer_phone;

  return jsonb_build_object('ok', true, 'rewardLabel', v_red.reward_label,
    'customerPhone', v_red.customer_phone, 'refunded', v_red.points_cost, 'balance', v_balance);
end; $$;

revoke all on function public.decline_redemption(uuid, text) from public, anon, authenticated;
grant execute on function public.decline_redemption(uuid, text) to service_role;
