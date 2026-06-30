-- FIX: signup was failing with
--   23502: null value in column "user_id" of relation "profiles"
--
-- Cause: profiles_guard() ran on the auth.users -> profiles signup trigger
-- (SECURITY DEFINER, no JWT) where auth.uid() is null, and overwrote the
-- already-correct user_id with null. Only pin user_id to auth.uid() when an
-- authenticated end-user is the one inserting.
--
-- Safe to run anytime: it just redefines the function (CREATE OR REPLACE).

create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'owner';
    -- An authenticated end-user inserting via PostgREST is pinned to their own id.
    -- During signup the profile row is created by the auth.users trigger
    -- (SECURITY DEFINER, no JWT) where auth.uid() is null — keep the user_id it
    -- already set (= the new user's id) instead of overwriting it with null.
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    new.role := old.role;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;
