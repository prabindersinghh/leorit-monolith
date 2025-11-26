-- Add qc_uploaded_at timestamp field for better tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS qc_uploaded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.orders.qc_uploaded_at IS 'Timestamp when QC video was uploaded by manufacturer';