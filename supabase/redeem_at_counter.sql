-- ════════════════════════════════════════════════════════════════════
-- Scaniha — counter redemption: the cashier redeems a reward for a present
-- customer in one step (no app-side pending code). Same atomic balance-check +
-- debit as redeem_reward, but it does NOT create a loyalty_redemptions row —
-- the reward is handed over on the spot, so the ledger debit is the record
-- (shows in the customer's history as "Récompense échangée").
-- business_id is already owner-authorized by the caisse route.
--   node scripts/apply-sql-api.mjs supabase/redeem_at_counter.sql
-- ════════════════════════════════════════════════════════════════════
create or replace function public.redeem_at_counter(p_business uuid, p_phone text, p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_program public.loyalty_programs;
  v_reward public.loyalty_rewards;
  v_balance int;
begin
  select * into v_program from public.loyalty_programs
    where business_id = p_business and active = true limit 1;
  if v_program.business_id is null then return jsonb_build_object('ok', false, 'error', 'no_program'); end if;

  select * into v_reward from public.loyalty_rewards
    where id = p_reward_id and business_id = p_business and active = true limit 1;
  if v_reward.id is null then return jsonb_build_object('ok', false, 'error', 'no_reward'); end if;

  -- Serialize per (business, phone) so a concurrent credit/redeem can't double-spend.
  perform pg_advisory_xact_lock(hashtext(p_business::text || '|' || p_phone));

  select coalesce(sum(delta), 0) into v_balance from public.points_ledger
    where business_id = p_business and customer_phone = p_phone;
  if v_balance < v_reward.points_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'missing', v_reward.points_cost - v_balance, 'balance', v_balance);
  end if;

  insert into public.points_ledger (business_id, customer_phone, delta, reason, note)
    values (p_business, p_phone, -v_reward.points_cost, 'redeem', v_reward.label);

  return jsonb_build_object('ok', true, 'rewardLabel', v_reward.label,
    'pointsCost', v_reward.points_cost, 'balance', v_balance - v_reward.points_cost);
end; $$;

grant execute on function public.redeem_at_counter(uuid, text, uuid) to service_role;
