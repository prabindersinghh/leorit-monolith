-- Add missing RLS policy for admins to update orders
CREATE POLICY "Admins can update all orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';