-- Make user_id nullable to allow pending manufacturer accounts
-- This enables the email whitelist signup flow to work correctly
ALTER TABLE manufacturer_verifications ALTER COLUMN user_id DROP NOT NULL;