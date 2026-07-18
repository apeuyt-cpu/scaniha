-- Migration to add country and currency to the businesses table
-- Run this in your Supabase SQL editor

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Tunisia',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TND';

-- Update existing records to have a default value if they are null
UPDATE public.businesses
SET country = 'Tunisia'
WHERE country IS NULL;

UPDATE public.businesses
SET currency = 'TND'
WHERE currency IS NULL;
