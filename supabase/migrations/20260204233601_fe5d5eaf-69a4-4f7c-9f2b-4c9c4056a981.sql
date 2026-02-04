-- Add email column to manufacturer_verifications
ALTER TABLE public.manufacturer_verifications 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add unique constraint on email to prevent duplicates
ALTER TABLE public.manufacturer_verifications 
ADD CONSTRAINT manufacturer_verifications_email_unique UNIQUE (email);

-- Add comment for documentation
COMMENT ON COLUMN public.manufacturer_verifications.email IS 'Login email for manufacturer identity mapping. Must be unique. Used to link auth.user.email to manufacturer profile.';