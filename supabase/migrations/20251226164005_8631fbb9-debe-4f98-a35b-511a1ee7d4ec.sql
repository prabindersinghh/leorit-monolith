-- Add columns for Delivery State Machine
-- Delivery States: NOT_STARTED, PACKED, PICKUP_SCHEDULED, IN_TRANSIT, DELIVERED

-- Create delivery_state enum type
DO $$ BEGIN
  CREATE TYPE public.delivery_state AS ENUM (
    'NOT_STARTED',
    'PACKED',
    'PICKUP_SCHEDULED',
    'IN_TRANSIT',
    'DELIVERED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to orders table for delivery state machine
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS packaging_video_url TEXT,
ADD COLUMN IF NOT EXISTS courier_name TEXT,
ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP WITH TIME ZONE;

-- Update delivery_status column to use the new values (keeping as text for flexibility)
-- Default value for new orders
COMMENT ON COLUMN public.orders.delivery_status IS 'Delivery state machine: NOT_STARTED, PACKED, PICKUP_SCHEDULED, IN_TRANSIT, DELIVERED';
COMMENT ON COLUMN public.orders.packaging_video_url IS 'URL of packaging video uploaded by manufacturer';
COMMENT ON COLUMN public.orders.courier_name IS 'Name of courier/shipping company assigned by admin';
COMMENT ON COLUMN public.orders.pickup_scheduled_at IS 'Timestamp when admin scheduled pickup';
COMMENT ON COLUMN public.orders.in_transit_at IS 'Timestamp when order entered IN_TRANSIT state';