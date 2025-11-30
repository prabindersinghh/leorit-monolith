-- Add columns to manufacturer_verifications table for soft onboarding
ALTER TABLE public.manufacturer_verifications 
ADD COLUMN IF NOT EXISTS soft_onboarded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'India',
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Update RLS policies to allow admins to insert soft-onboarded manufacturers
CREATE POLICY "Admins can insert manufacturers"
ON public.manufacturer_verifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));