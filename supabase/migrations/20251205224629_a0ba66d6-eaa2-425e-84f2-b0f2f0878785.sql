-- Add expected_deadline column for bulk orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_deadline TIMESTAMP WITH TIME ZONE;