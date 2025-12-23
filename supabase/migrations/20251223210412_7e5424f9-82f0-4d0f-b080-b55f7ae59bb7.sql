-- Add buyer_type enum (if not exists) and buyer_purpose column to orders table
-- This is ADD-ONLY: No migration of existing data, just new fields

-- Create buyer_purpose enum type
DO $$ BEGIN
  CREATE TYPE buyer_purpose AS ENUM ('merch_bulk', 'blank_apparel', 'fabric_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add buyer_purpose column to orders table (defaults to merch_bulk for existing orders)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS buyer_purpose buyer_purpose DEFAULT 'merch_bulk';

-- Add buyer_notes column for manufacturing instructions
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS buyer_notes TEXT DEFAULT NULL;

-- Add color selection column for blank apparel orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS selected_color TEXT DEFAULT NULL;