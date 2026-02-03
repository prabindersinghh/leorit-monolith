-- Drop the foreign key constraint on orders.manufacturer_id
-- This allows assigning manufacturers from manufacturer_verifications
-- even if they don't have an auth.users account (soft-onboarded manufacturers)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_manufacturer_id_fkey;

-- Add a comment explaining why there's no FK constraint
COMMENT ON COLUMN public.orders.manufacturer_id IS 'References manufacturer_verifications.user_id. No FK constraint as manufacturers may be soft-onboarded without auth.users accounts.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';