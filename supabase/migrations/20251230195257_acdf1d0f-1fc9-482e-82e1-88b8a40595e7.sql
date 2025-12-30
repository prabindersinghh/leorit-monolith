-- Fix overly permissive design-files storage bucket policy
-- Drop the overly permissive SELECT policy that allows any authenticated user to view all files
DROP POLICY IF EXISTS "Authenticated users can view design files" ON storage.objects;

-- 1. Buyers can view their own design files (files in their user-id folder)
CREATE POLICY "Buyers can view their own design files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'design-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Buyers can view design files referenced in their own orders
CREATE POLICY "Buyers can view their order design files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'design-files' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.buyer_id = auth.uid()
    AND (
      o.design_file_url LIKE '%' || name || '%'
      OR o.mockup_image LIKE '%' || name || '%'
      OR o.back_mockup_image LIKE '%' || name || '%'
      OR o.size_chart_url LIKE '%' || name || '%'
      OR o.back_design_url LIKE '%' || name || '%'
    )
  )
);

-- 3. Manufacturers can view design files for their assigned orders
CREATE POLICY "Manufacturers can view assigned order designs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'design-files' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.manufacturer_id = auth.uid()
    AND (
      o.design_file_url LIKE '%' || name || '%'
      OR o.mockup_image LIKE '%' || name || '%'
      OR o.back_mockup_image LIKE '%' || name || '%'
      OR o.size_chart_url LIKE '%' || name || '%'
      OR o.back_design_url LIKE '%' || name || '%'
    )
  )
);

-- 4. Admins can view all design files
CREATE POLICY "Admins can view all design files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'design-files' AND
  has_role(auth.uid(), 'admin')
);

-- Ensure the bucket is explicitly private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'design-files';