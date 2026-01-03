-- Create manufacturer onboarding requests table
CREATE TABLE public.manufacturer_onboarding_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  capacity TEXT NOT NULL,
  years_active TEXT,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.manufacturer_onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit (public insert)
CREATE POLICY "Anyone can submit onboarding requests"
ON public.manufacturer_onboarding_requests
FOR INSERT
WITH CHECK (true);

-- Policy: Only admins can view requests
CREATE POLICY "Admins can view onboarding requests"
ON public.manufacturer_onboarding_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Only admins can update requests
CREATE POLICY "Admins can update onboarding requests"
ON public.manufacturer_onboarding_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));