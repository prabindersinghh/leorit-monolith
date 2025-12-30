-- Fix qc-videos storage bucket security
-- Make qc-videos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'qc-videos';

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view QC videos" ON storage.objects;
DROP POLICY IF EXISTS "Manufacturers and buyers can view QC videos" ON storage.objects;

-- Allow buyers to view QC videos for their own orders
CREATE POLICY "Buyers can view QC videos for their orders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'qc-videos' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.buyer_id = auth.uid()
    AND (
      o.sample_qc_video_url LIKE '%' || name || '%'
      OR o.bulk_qc_video_url LIKE '%' || name || '%'
      OR o.qc_video_url LIKE '%' || name || '%'
      OR o.packaging_video_url LIKE '%' || name || '%'
    )
  )
);

-- Allow manufacturers to view QC videos for their assigned orders
CREATE POLICY "Manufacturers can view QC for assigned orders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'qc-videos' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.manufacturer_id = auth.uid()
    AND (
      o.sample_qc_video_url LIKE '%' || name || '%'
      OR o.bulk_qc_video_url LIKE '%' || name || '%'
      OR o.qc_video_url LIKE '%' || name || '%'
      OR o.packaging_video_url LIKE '%' || name || '%'
    )
  )
);

-- Allow manufacturers to view their own uploaded videos (folder-based)
CREATE POLICY "Manufacturers can view their own QC videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'qc-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all QC videos
CREATE POLICY "Admins can view all QC videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'qc-videos' AND
  has_role(auth.uid(), 'admin')
);