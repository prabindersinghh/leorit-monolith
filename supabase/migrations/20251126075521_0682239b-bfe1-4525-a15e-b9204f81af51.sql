-- Add escrow simulation timestamp fields for sample order money flow
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS fake_payment_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escrow_locked_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escrow_released_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sample_production_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sample_approved_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.orders.fake_payment_timestamp IS 'Timestamp when fake payment was transferred to escrow (for MVP demo)';
COMMENT ON COLUMN public.orders.escrow_locked_timestamp IS 'Timestamp when escrow was locked after manufacturer acceptance';
COMMENT ON COLUMN public.orders.escrow_released_timestamp IS 'Timestamp when escrow was released to manufacturer after sample approval';
COMMENT ON COLUMN public.orders.sample_production_started_at IS 'Timestamp when sample production started';
COMMENT ON COLUMN public.orders.sample_approved_at IS 'Timestamp when buyer approved the sample';