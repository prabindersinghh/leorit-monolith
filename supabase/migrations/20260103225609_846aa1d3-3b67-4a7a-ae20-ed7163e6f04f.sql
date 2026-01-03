-- Add payment_link column for admin-pasted Razorpay links
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- Add admin_notes column for change requests
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add admin_approved_at timestamp
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE;

-- Add admin_approved_by column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_approved_by UUID;

-- Add design_explanation for mandatory order explanation
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS design_explanation TEXT;

-- Add google_drive_link for design files
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Add payment_received_at timestamp
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE;