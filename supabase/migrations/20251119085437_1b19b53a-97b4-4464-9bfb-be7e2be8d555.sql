-- Add detailed_status column to orders table with all workflow states
DO $$ BEGIN
  CREATE TYPE public.order_detailed_status AS ENUM (
    'created',
    'submitted_to_manufacturer',
    'accepted_by_manufacturer',
    'rejected_by_manufacturer',
    'sample_in_production',
    'qc_uploaded',
    'sample_approved_by_buyer',
    'sample_rejected_by_buyer',
    'bulk_in_production',
    'dispatched',
    'delivered',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add the new detailed_status column (default to 'created' for new orders)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS detailed_status public.order_detailed_status DEFAULT 'created';

-- Update existing orders to map from old status to new detailed_status
UPDATE public.orders
SET detailed_status = CASE
  WHEN status = 'pending' AND sample_status = 'not_started' THEN 'submitted_to_manufacturer'::public.order_detailed_status
  WHEN status = 'accepted' AND sample_status = 'in_production' THEN 'sample_in_production'::public.order_detailed_status
  WHEN status = 'accepted' AND sample_status = 'qc_uploaded' THEN 'qc_uploaded'::public.order_detailed_status
  WHEN status = 'accepted' AND sample_status = 'approved' THEN 'sample_approved_by_buyer'::public.order_detailed_status
  WHEN status = 'rejected' THEN 'rejected_by_manufacturer'::public.order_detailed_status
  WHEN status = 'dispatched' THEN 'dispatched'::public.order_detailed_status
  WHEN status = 'completed' THEN 'completed'::public.order_detailed_status
  ELSE 'created'::public.order_detailed_status
END
WHERE detailed_status = 'created';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_detailed_status ON public.orders(detailed_status);

COMMENT ON COLUMN public.orders.detailed_status IS 'Detailed order workflow status tracking the complete lifecycle from creation to completion';