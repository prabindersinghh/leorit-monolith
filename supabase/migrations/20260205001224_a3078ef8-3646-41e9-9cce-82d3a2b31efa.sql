-- Add RLS policies to enable manufacturer email whitelist check and auto-linking
-- These policies are ADDITIVE and do not modify existing policies

-- Policy 1: Allow unauthenticated/authenticated users to check if email is in whitelist
-- Only exposes records where user_id IS NULL (not yet linked)
-- This is required for signup validation
CREATE POLICY "Allow manufacturer email whitelist check"
ON manufacturer_verifications
FOR SELECT
USING (user_id IS NULL);

-- Policy 2: Allow authenticated users to read manufacturer record by their own email
-- This enables the auto-linking flow on dashboard
CREATE POLICY "Users can read manufacturer profile by their email"
ON manufacturer_verifications
FOR SELECT
USING (email = auth.jwt()->>'email');

-- Policy 3: Allow authenticated users to link their manufacturer account
-- Only if the email matches AND user_id is currently NULL
CREATE POLICY "Users can link their own manufacturer account"
ON manufacturer_verifications
FOR UPDATE
USING (email = auth.jwt()->>'email' AND user_id IS NULL)
WITH CHECK (user_id = auth.uid());