-- Add order_intent enum type
CREATE TYPE public.order_intent AS ENUM ('sample_only', 'sample_then_bulk', 'direct_bulk');

-- Add order_intent column to orders table
ALTER TABLE public.orders 
ADD COLUMN order_intent public.order_intent DEFAULT NULL;