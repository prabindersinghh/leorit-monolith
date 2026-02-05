-- Fix RLS policy for manufacturers to use proper relational lookup
-- The manufacturer_id in orders stores auth.user.id (legacy), so we match against that

-- Drop existing manufacturer policies on orders
DROP POLICY IF EXISTS "Manufacturers can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Manufacturers can update assigned orders" ON public.orders;

-- Create new policies that match manufacturer_id against auth.uid() directly
-- This works because orders.manufacturer_id was populated with auth.user.id values
CREATE POLICY "Manufacturers can view assigned orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = manufacturer_id
  OR EXISTS (
    SELECT 1 FROM public.approved_manufacturers am 
    WHERE am.id = orders.manufacturer_id 
    AND am.linked_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.manufacturer_verifications mv 
    WHERE mv.id = orders.manufacturer_id 
    AND mv.user_id = auth.uid()
  )
);

CREATE POLICY "Manufacturers can update assigned orders" 
ON public.orders 
FOR UPDATE 
USING (
  auth.uid() = manufacturer_id
  OR EXISTS (
    SELECT 1 FROM public.approved_manufacturers am 
    WHERE am.id = orders.manufacturer_id 
    AND am.linked_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.manufacturer_verifications mv 
    WHERE mv.id = orders.manufacturer_id 
    AND mv.user_id = auth.uid()
  )
);