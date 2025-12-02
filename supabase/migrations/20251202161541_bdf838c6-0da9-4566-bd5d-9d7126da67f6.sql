-- Create order_events table for analytics logging
CREATE TABLE public.order_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX idx_order_events_event_type ON public.order_events(event_type);
CREATE INDEX idx_order_events_timestamp ON public.order_events(event_timestamp);

-- RLS policies
CREATE POLICY "Users can insert order events for their orders"
ON public.order_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_events.order_id
    AND (orders.buyer_id = auth.uid() OR orders.manufacturer_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view order events for their orders"
ON public.order_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_events.order_id
    AND (orders.buyer_id = auth.uid() OR orders.manufacturer_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);