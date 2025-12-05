-- Add columns for storing mockup images and CSV URL for manufacturer access
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS back_design_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mockup_image TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS back_mockup_image TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS generated_preview TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS corrected_csv_url TEXT;