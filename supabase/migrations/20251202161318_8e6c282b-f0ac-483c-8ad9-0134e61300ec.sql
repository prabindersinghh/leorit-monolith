-- Add analytics timestamp fields to orders table
ALTER TABLE public.orders
ADD COLUMN sample_order_placed_at timestamp with time zone,
ADD COLUMN sample_qc_uploaded_at timestamp with time zone,
ADD COLUMN sample_qc_approved_at timestamp with time zone,
ADD COLUMN bulk_order_confirmed_at timestamp with time zone,
ADD COLUMN manufacturer_accept_time timestamp with time zone,
ADD COLUMN sample_to_bulk_conversion boolean DEFAULT false;