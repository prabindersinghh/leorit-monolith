-- Add qc_files array column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS qc_files text[] DEFAULT '{}';