-- Add pause functionality to manufacturer_verifications
ALTER TABLE public.manufacturer_verifications
ADD COLUMN IF NOT EXISTS paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paused_by uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pause_reason text DEFAULT NULL;

-- Add delay flag columns to orders for admin visibility
-- These store computed delays at key milestones for easier querying
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS acceptance_delay_hours numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sample_qc_delay_hours numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bulk_qc_delay_hours numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_delay_hours numeric DEFAULT NULL;

-- Create a function to compute and store acceptance delay when manufacturer accepts
CREATE OR REPLACE FUNCTION public.compute_acceptance_delay()
RETURNS TRIGGER AS $$
BEGIN
  -- Compute acceptance delay when manufacturer_accept_time is set
  IF NEW.manufacturer_accept_time IS NOT NULL AND OLD.manufacturer_accept_time IS NULL THEN
    IF NEW.assigned_at IS NOT NULL THEN
      NEW.acceptance_delay_hours := EXTRACT(EPOCH FROM (NEW.manufacturer_accept_time - NEW.assigned_at)) / 3600;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to compute sample QC delay
CREATE OR REPLACE FUNCTION public.compute_sample_qc_delay()
RETURNS TRIGGER AS $$
BEGIN
  -- Compute sample QC delay when sample_qc_uploaded_at is set
  IF NEW.sample_qc_uploaded_at IS NOT NULL AND OLD.sample_qc_uploaded_at IS NULL THEN
    IF NEW.sample_production_started_at IS NOT NULL THEN
      NEW.sample_qc_delay_hours := EXTRACT(EPOCH FROM (NEW.sample_qc_uploaded_at - NEW.sample_production_started_at)) / 3600;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to compute bulk QC delay
CREATE OR REPLACE FUNCTION public.compute_bulk_qc_delay()
RETURNS TRIGGER AS $$
BEGIN
  -- Compute bulk QC delay when bulk_qc_uploaded_at is set
  IF NEW.bulk_qc_uploaded_at IS NOT NULL AND OLD.bulk_qc_uploaded_at IS NULL THEN
    -- Bulk QC delay is from bulk_unlocked (sample_approved_at for sample_then_bulk) to bulk_qc_uploaded_at
    IF NEW.sample_approved_at IS NOT NULL THEN
      NEW.bulk_qc_delay_hours := EXTRACT(EPOCH FROM (NEW.bulk_qc_uploaded_at - NEW.sample_approved_at)) / 3600;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to compute delivery delay
CREATE OR REPLACE FUNCTION public.compute_delivery_delay()
RETURNS TRIGGER AS $$
BEGIN
  -- Compute delivery delay when delivered_at is set
  IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
    IF NEW.dispatched_at IS NOT NULL THEN
      NEW.delivery_delay_hours := EXTRACT(EPOCH FROM (NEW.delivered_at - NEW.dispatched_at)) / 3600;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for delay computation
CREATE TRIGGER compute_acceptance_delay_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_acceptance_delay();

CREATE TRIGGER compute_sample_qc_delay_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_sample_qc_delay();

CREATE TRIGGER compute_bulk_qc_delay_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_bulk_qc_delay();

CREATE TRIGGER compute_delivery_delay_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_delivery_delay();

-- Add index for paused manufacturers query
CREATE INDEX IF NOT EXISTS idx_manufacturer_verifications_paused 
ON public.manufacturer_verifications(paused) WHERE paused = true;