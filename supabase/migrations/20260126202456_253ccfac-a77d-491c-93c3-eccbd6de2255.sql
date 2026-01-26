-- Create order_specs table for spec locking
CREATE TABLE IF NOT EXISTS public.order_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
    fabric_type TEXT NOT NULL,
    gsm NUMERIC NOT NULL,
    color TEXT NOT NULL,
    print_type TEXT NOT NULL CHECK (print_type IN ('DTG', 'Screen', 'Embroidery', 'None')),
    print_position TEXT NOT NULL CHECK (print_position IN ('Front', 'Back', 'Both', 'None')),
    print_size TEXT NOT NULL,
    tolerance_mm NUMERIC NOT NULL,
    approved_sample_url TEXT,
    locked_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order_qc table for structured QC data collection
CREATE TABLE IF NOT EXISTS public.order_qc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('sample', 'bulk', 'final')),
    defect_type TEXT CHECK (defect_type IN ('print_defect', 'stitching_defect', 'size_mismatch', 'color_mismatch', 'fabric_issue', 'packaging_issue', 'other', 'none')),
    defect_severity INTEGER CHECK (defect_severity BETWEEN 1 AND 5),
    decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'pending')),
    reason_code TEXT,
    reviewer TEXT NOT NULL,
    reviewer_id UUID,
    notes TEXT,
    file_urls TEXT[] DEFAULT '{}',
    admin_decision TEXT CHECK (admin_decision IN ('approved', 'rejected', 'pending')),
    admin_decision_by UUID,
    admin_decision_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_specs_order_id ON public.order_specs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_qc_order_id ON public.order_qc(order_id);
CREATE INDEX IF NOT EXISTS idx_order_qc_stage ON public.order_qc(stage);

-- Enable RLS on order_specs
ALTER TABLE public.order_specs ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_specs
CREATE POLICY "Admins can manage all specs"
ON public.order_specs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers can view specs for their orders"
ON public.order_specs
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_specs.order_id
    AND orders.buyer_id = auth.uid()
));

CREATE POLICY "Manufacturers can view specs for assigned orders"
ON public.order_specs
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_specs.order_id
    AND orders.manufacturer_id = auth.uid()
));

-- Enable RLS on order_qc
ALTER TABLE public.order_qc ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_qc
CREATE POLICY "Admins can manage all QC records"
ON public.order_qc
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers can view QC for their orders"
ON public.order_qc
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_qc.order_id
    AND orders.buyer_id = auth.uid()
));

CREATE POLICY "Manufacturers can manage QC for assigned orders"
ON public.order_qc
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_qc.order_id
    AND orders.manufacturer_id = auth.uid()
));

-- Add specs_locked column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS specs_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS specs_locked_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS specs_locked_by UUID;

-- Add admin QC approval columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_qc_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_qc_approved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_qc_approved_by UUID;