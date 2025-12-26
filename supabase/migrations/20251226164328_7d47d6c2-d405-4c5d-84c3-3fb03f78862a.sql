-- Add payment_state column for Payment State Machine
-- Payment States: PAYMENT_INITIATED, PAYMENT_HELD, PAYMENT_RELEASABLE, PAYMENT_RELEASED, PAYMENT_REFUNDED

-- Create payment_state enum type
DO $$ BEGIN
  CREATE TYPE public.payment_state AS ENUM (
    'PAYMENT_INITIATED',
    'PAYMENT_HELD',
    'PAYMENT_RELEASABLE',
    'PAYMENT_RELEASED',
    'PAYMENT_REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add payment_state column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_state TEXT DEFAULT 'PAYMENT_INITIATED';

-- Add refund related columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refunded_by UUID;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.payment_state IS 'Payment state machine: PAYMENT_INITIATED, PAYMENT_HELD, PAYMENT_RELEASABLE, PAYMENT_RELEASED, PAYMENT_REFUNDED';
COMMENT ON COLUMN public.orders.refund_reason IS 'Reason for refund (admin only)';
COMMENT ON COLUMN public.orders.refunded_at IS 'Timestamp when refund was issued';
COMMENT ON COLUMN public.orders.refunded_by IS 'Admin user ID who issued the refund';