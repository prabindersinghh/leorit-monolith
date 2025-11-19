-- Add dispatch and delivery tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_dispatched_at ON public.orders(dispatched_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at);

-- Add comments
COMMENT ON COLUMN public.orders.dispatched_at IS 'Timestamp when the order was dispatched by manufacturer';
COMMENT ON COLUMN public.orders.estimated_delivery_date IS 'Estimated delivery date (dispatched_at + 3 days)';
COMMENT ON COLUMN public.orders.delivered_at IS 'Timestamp when the buyer confirmed delivery';