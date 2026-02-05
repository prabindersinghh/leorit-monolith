-- Fix order_qc table for staged QC workflow
-- Allow decision to be NULL when manufacturer first submits QC proof

-- 1. Drop any existing CHECK constraint on decision
DO $$ 
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'order_qc' AND constraint_name = 'order_qc_decision_check'
  ) THEN
    ALTER TABLE public.order_qc DROP CONSTRAINT order_qc_decision_check;
  END IF;
END $$;

-- 2. Make decision column nullable for staged workflow
ALTER TABLE public.order_qc ALTER COLUMN decision DROP NOT NULL;

-- 3. Add a comment to clarify the workflow
COMMENT ON COLUMN public.order_qc.decision IS 'QC decision: NULL when manufacturer submits, set by buyer on review (approved/rejected)';