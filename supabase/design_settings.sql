-- Run this once in the Supabase dashboard → SQL Editor.
-- Adds per-design settings storage (auto-slider, showcase source, titles, toggles…).
-- Keyed by design id: { "design1": {...}, "design2": {...}, ... }

alter table public.businesses
  add column if not exists design_settings jsonb not null default '{}'::jsonb;
