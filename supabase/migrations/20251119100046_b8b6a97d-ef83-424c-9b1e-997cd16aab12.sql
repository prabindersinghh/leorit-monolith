-- Make qc-videos bucket public for easy video playback
UPDATE storage.buckets 
SET public = true 
WHERE id = 'qc-videos';

-- Add RLS policy to allow authenticated users to read QC videos
CREATE POLICY "Authenticated users can view QC videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'qc-videos');