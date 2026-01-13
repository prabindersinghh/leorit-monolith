-- Add storage policies for design-files bucket to allow buyer uploads
-- First drop any conflicting policies if they exist
DROP POLICY IF EXISTS "Buyers can upload design files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own design files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all design files" ON storage.objects;

-- Policy: Buyers can upload their own design files
CREATE POLICY "Buyers can upload design files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'design-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own design files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'design-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all design files
CREATE POLICY "Admins can view all design files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'design-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);