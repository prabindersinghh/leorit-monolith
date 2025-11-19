-- Add escrow_status column to orders table
DO $$ BEGIN
  CREATE TYPE public.escrow_status AS ENUM (
    'pending',
    'fake_paid',
    'fake_released'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS escrow_status public.escrow_status DEFAULT 'pending';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders(escrow_status);

COMMENT ON COLUMN public.orders.escrow_status IS 'Fake escrow status for demonstration - pending, fake_paid, fake_released';