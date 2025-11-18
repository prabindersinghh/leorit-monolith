-- Create orders table for tracking buyer orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manufacturer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL,
  design_size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2),
  escrow_amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  sample_status TEXT DEFAULT 'not_started',
  qc_video_url TEXT,
  qc_feedback TEXT,
  rejection_reason TEXT,
  concern_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own orders
CREATE POLICY "Buyers can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = buyer_id);

-- Buyers can create their own orders
CREATE POLICY "Buyers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their own orders
CREATE POLICY "Buyers can update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = buyer_id);

-- Manufacturers can view orders assigned to them
CREATE POLICY "Manufacturers can view assigned orders"
ON public.orders
FOR SELECT
USING (auth.uid() = manufacturer_id);

-- Manufacturers can update orders assigned to them
CREATE POLICY "Manufacturers can update assigned orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = manufacturer_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create platform_metrics table for admin dashboard
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_orders INTEGER DEFAULT 0,
  total_buyers INTEGER DEFAULT 0,
  total_manufacturers INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  pending_qc INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  rejected_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

-- Enable RLS
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform metrics
CREATE POLICY "Admins can view platform metrics"
ON public.platform_metrics
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can update platform metrics
CREATE POLICY "Admins can update platform metrics"
ON public.platform_metrics
FOR ALL
USING (has_role(auth.uid(), 'admin'));