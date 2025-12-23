-- Add payment breakdown columns to orders table
-- total_order_value: Full order cost (sample + bulk + delivery)
-- upfront_payable_amount: 55% of total_order_value (what buyer pays initially)

ALTER TABLE public.orders 
ADD COLUMN total_order_value numeric DEFAULT NULL,
ADD COLUMN upfront_payable_amount numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.total_order_value IS 'Full order cost including sample, bulk, and delivery';
COMMENT ON COLUMN public.orders.upfront_payable_amount IS '55% of total_order_value - initial payment by buyer';