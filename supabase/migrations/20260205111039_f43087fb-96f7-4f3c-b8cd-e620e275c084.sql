-- Create approved_manufacturers table as the single source of truth
CREATE TABLE IF NOT EXISTS public.approved_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  capacity TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approved_manufacturers ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all records
CREATE POLICY "Admins can manage approved manufacturers"
ON public.approved_manufacturers
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS: Allow unauthenticated email check for signup (only unlinked records)
CREATE POLICY "Allow email whitelist check during signup"
ON public.approved_manufacturers
FOR SELECT
USING (linked_user_id IS NULL AND verified = true);

-- RLS: Users can read their own linked record
CREATE POLICY "Users can view their linked manufacturer record"
ON public.approved_manufacturers
FOR SELECT
USING (linked_user_id = auth.uid());

-- RLS: Users can link their own account by email
CREATE POLICY "Users can link their manufacturer account"
ON public.approved_manufacturers
FOR UPDATE
USING (email = (auth.jwt() ->> 'email') AND linked_user_id IS NULL)
WITH CHECK (linked_user_id = auth.uid());

-- Migrate existing manufacturer_verifications data (without invalid user_ids)
INSERT INTO public.approved_manufacturers (email, company_name, verified, linked_user_id, city, state, country, capacity, notes, created_at)
SELECT 
  mv.email, 
  mv.company_name, 
  COALESCE(mv.verified, false),
  CASE WHEN au.id IS NOT NULL THEN mv.user_id ELSE NULL END,
  mv.city,
  mv.state,
  mv.country,
  mv.capacity,
  mv.notes,
  mv.submitted_at
FROM public.manufacturer_verifications mv
LEFT JOIN auth.users au ON mv.user_id = au.id
WHERE mv.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;