-- Create order_files table for structured file storage tracking
CREATE TABLE IF NOT EXISTS public.order_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    file_type text NOT NULL CHECK (file_type IN ('spec', 'qc_sample', 'qc_bulk', 'delivery')),
    file_url text NOT NULL,
    file_name text NOT NULL,
    uploaded_by text NOT NULL CHECK (uploaded_by IN ('admin', 'manufacturer', 'system', 'buyer')),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for faster lookups by order_id
CREATE INDEX idx_order_files_order_id ON public.order_files(order_id);
CREATE INDEX idx_order_files_file_type ON public.order_files(file_type);

-- Enable RLS
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

-- Admins can view all order files
CREATE POLICY "Admins can view all order files"
ON public.order_files FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert order files
CREATE POLICY "Admins can insert order files"
ON public.order_files FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Buyers can view files for their orders
CREATE POLICY "Buyers can view files for their orders"
ON public.order_files FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_files.order_id 
    AND orders.buyer_id = auth.uid()
));

-- Buyers can insert spec files for their orders
CREATE POLICY "Buyers can insert files for their orders"
ON public.order_files FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_files.order_id 
    AND orders.buyer_id = auth.uid()
));

-- Manufacturers can view files for assigned orders
CREATE POLICY "Manufacturers can view files for assigned orders"
ON public.order_files FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_files.order_id 
    AND orders.manufacturer_id = auth.uid()
));

-- Manufacturers can insert QC/delivery files for assigned orders
CREATE POLICY "Manufacturers can insert files for assigned orders"
ON public.order_files FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_files.order_id 
    AND orders.manufacturer_id = auth.uid()
));

-- Create the orders storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for the orders bucket

-- Admins have full access to all order files
CREATE POLICY "Admins have full access to order files"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'orders' AND
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    bucket_id = 'orders' AND
    public.has_role(auth.uid(), 'admin')
);

-- Buyers can upload to their order's specs folder
CREATE POLICY "Buyers can upload to order specs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'orders' AND
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.buyer_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
        AND (storage.foldername(name))[2] = 'specs'
    )
);

-- Buyers can view files for their orders
CREATE POLICY "Buyers can view their order files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'orders' AND
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.buyer_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
    )
);

-- Manufacturers can upload to qc_sample, qc_bulk, and delivery folders for assigned orders
CREATE POLICY "Manufacturers can upload QC and delivery files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'orders' AND
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.manufacturer_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
        AND (storage.foldername(name))[2] IN ('qc_sample', 'qc_bulk', 'delivery')
    )
);

-- Manufacturers can view files for assigned orders
CREATE POLICY "Manufacturers can view assigned order files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'orders' AND
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.manufacturer_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
    )
);