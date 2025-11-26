-- Add shipping info table
CREATE TABLE public.order_shipping_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  pincode TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id)
);

-- Add tracking and delivery fields to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC,
ADD COLUMN IF NOT EXISTS size_chart_url TEXT;

-- Add performance metrics to manufacturer profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS on_time_deliveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qc_pass_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_disputes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0;

-- Create messages table for order chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.order_shipping_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_shipping_info
CREATE POLICY "Buyers can insert shipping info for their orders"
ON public.order_shipping_info FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_shipping_info.order_id
    AND orders.buyer_id = auth.uid()
  )
);

CREATE POLICY "Buyers can view their order shipping info"
ON public.order_shipping_info FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_shipping_info.order_id
    AND orders.buyer_id = auth.uid()
  )
);

CREATE POLICY "Manufacturers can view assigned order shipping info"
ON public.order_shipping_info FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_shipping_info.order_id
    AND orders.manufacturer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all shipping info"
ON public.order_shipping_info FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for messages
CREATE POLICY "Users can insert messages for their orders"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = messages.order_id
    AND (orders.buyer_id = auth.uid() OR orders.manufacturer_id = auth.uid())
  )
);

CREATE POLICY "Users can view messages for their orders"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = messages.order_id
    AND (orders.buyer_id = auth.uid() OR orders.manufacturer_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_order_shipping_info_order_id ON public.order_shipping_info(order_id);
CREATE INDEX idx_messages_order_id ON public.messages(order_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);