-- Add new fields to orders table (ADD-ONLY, no modifications to existing columns)

-- Create enum for buyer_type
DO $$ BEGIN
  CREATE TYPE public.buyer_type AS ENUM ('campus', 'brand', 'fabric');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS buyer_type public.buyer_type,
ADD COLUMN IF NOT EXISTS product_category text,
ADD COLUMN IF NOT EXISTS sample_required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS bulk_status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS qc_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS packed_at timestamp with time zone;