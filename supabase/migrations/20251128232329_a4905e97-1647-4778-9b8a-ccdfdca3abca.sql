-- Add fabric tracking fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS fabric_type TEXT,
ADD COLUMN IF NOT EXISTS fabric_unit_price NUMERIC;