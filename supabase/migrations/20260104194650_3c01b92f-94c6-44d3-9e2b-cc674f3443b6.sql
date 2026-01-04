-- Analytics Events Table (for general platform analytics)
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID,
  user_role TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all analytics
CREATE POLICY "Admins can view all analytics"
ON public.analytics_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert analytics (for anonymous homepage visits)
CREATE POLICY "Anyone can insert analytics"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Order Evidence Table (structured evidence storage)
CREATE TABLE public.order_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  manufacturer_id UUID,
  evidence_type TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('sample', 'bulk', 'delivery', 'specification')),
  file_url TEXT,
  file_name TEXT,
  description TEXT,
  uploader_role TEXT NOT NULL CHECK (uploader_role IN ('buyer', 'manufacturer', 'admin')),
  uploader_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_evidence ENABLE ROW LEVEL SECURITY;

-- Users can view evidence for their orders
CREATE POLICY "Buyers can view evidence for their orders"
ON public.order_evidence
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_evidence.order_id AND orders.buyer_id = auth.uid()
));

CREATE POLICY "Manufacturers can view evidence for their orders"
ON public.order_evidence
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_evidence.order_id AND orders.manufacturer_id = auth.uid()
));

CREATE POLICY "Admins can view all evidence"
ON public.order_evidence
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert evidence for their orders
CREATE POLICY "Buyers can insert evidence for their orders"
ON public.order_evidence
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_evidence.order_id AND orders.buyer_id = auth.uid()
));

CREATE POLICY "Manufacturers can insert evidence for their orders"
ON public.order_evidence
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_evidence.order_id AND orders.manufacturer_id = auth.uid()
));

CREATE POLICY "Admins can insert evidence"
ON public.order_evidence
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add structured QC feedback field to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS qc_feedback_structured TEXT;

-- Create indexes for performance
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_order_id ON public.analytics_events(order_id);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_order_evidence_order_id ON public.order_evidence(order_id);
CREATE INDEX idx_order_evidence_stage ON public.order_evidence(stage);