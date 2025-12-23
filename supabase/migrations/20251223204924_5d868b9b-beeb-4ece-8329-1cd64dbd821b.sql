-- Add order_mode enum type (separate from order_intent for explicit enforcement)
CREATE TYPE public.order_mode AS ENUM (
  'sample_only',
  'sample_then_bulk', 
  'direct_bulk'
);

-- Add order_mode column to orders table
-- This field explicitly defines the order flow and QC requirements
-- Default to 'sample_then_bulk' for backward compatibility with existing orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_mode public.order_mode DEFAULT 'sample_then_bulk';

-- Add sample_qc_video_url column for sample-specific QC (separate from bulk QC)
-- This allows tracking of sample and bulk QC videos separately
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sample_qc_video_url text;

-- Add bulk_qc_video_url column for bulk-specific QC
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS bulk_qc_video_url text;

-- Add bulk_qc_uploaded_at timestamp for bulk QC tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS bulk_qc_uploaded_at timestamp with time zone;

-- Add bulk_qc_approved_at timestamp for bulk approval tracking  
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS bulk_qc_approved_at timestamp with time zone;

-- Add comment explaining the order_mode field
COMMENT ON COLUMN public.orders.order_mode IS 'Explicitly defines the order flow: sample_only (ends after sample), sample_then_bulk (bulk after sample approval), direct_bulk (bulk starts immediately, sample is informational)';