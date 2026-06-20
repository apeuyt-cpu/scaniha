-- Cloudinary removal — run once in Supabase → SQL Editor.
-- The `images` table only ever held the Cloudinary → Supabase sync mirror that
-- fed the operator-only /gallery page. Both are removed from the app, so this
-- table is now orphaned. Live menu images live in Storage (menu-images bucket)
-- + the businesses/categories/items columns — they are NOT affected.

drop table if exists public.images cascade;

notify pgrst, 'reload schema';
