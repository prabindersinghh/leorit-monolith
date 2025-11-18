-- Create storage buckets for QC videos and design files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('qc-videos', 'qc-videos', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('design-files', 'design-files', false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'image/svg+xml']);

-- RLS policies for qc-videos bucket
CREATE POLICY "Manufacturers can upload QC videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qc-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Manufacturers can update their QC videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'qc-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Manufacturers and buyers can view QC videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'qc-videos');

CREATE POLICY "Manufacturers can delete their QC videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'qc-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for design-files bucket
CREATE POLICY "Buyers can upload design files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Buyers can update their design files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'design-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can view design files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'design-files');

CREATE POLICY "Buyers can delete their design files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add design_file_url to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS design_file_url text;

-- Create notifications table for email notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create manufacturer verification requests table
CREATE TABLE IF NOT EXISTS manufacturer_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  location text NOT NULL,
  capacity text NOT NULL,
  status text DEFAULT 'pending',
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

ALTER TABLE manufacturer_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all verifications"
ON manufacturer_verifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update verifications"
ON manufacturer_verifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own verification"
ON manufacturer_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert verification requests"
ON manufacturer_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  raised_by uuid NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open',
  resolution text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all disputes"
ON disputes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update disputes"
ON disputes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view disputes for their orders"
ON disputes
FOR SELECT
TO authenticated
USING (
  auth.uid() = raised_by OR
  auth.uid() IN (
    SELECT buyer_id FROM orders WHERE id = order_id
    UNION
    SELECT manufacturer_id FROM orders WHERE id = order_id
  )
);

CREATE POLICY "Users can create disputes for their orders"
ON disputes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT buyer_id FROM orders WHERE id = order_id
    UNION
    SELECT manufacturer_id FROM orders WHERE id = order_id
  )
);