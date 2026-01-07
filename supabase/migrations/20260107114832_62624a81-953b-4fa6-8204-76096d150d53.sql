-- Add new order states for admin-controlled payment flow
ALTER TYPE public.order_state ADD VALUE IF NOT EXISTS 'ADMIN_APPROVED' AFTER 'SUBMITTED';
ALTER TYPE public.order_state ADD VALUE IF NOT EXISTS 'PAYMENT_REQUESTED' AFTER 'MANUFACTURER_ASSIGNED';
ALTER TYPE public.order_state ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMED' AFTER 'PAYMENT_REQUESTED';

-- Update the validate_order_state_transition function to include new states
CREATE OR REPLACE FUNCTION public.validate_order_state_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "DRAFT": ["SUBMITTED"],
    "SUBMITTED": ["ADMIN_APPROVED"],
    "ADMIN_APPROVED": ["MANUFACTURER_ASSIGNED"],
    "MANUFACTURER_ASSIGNED": ["PAYMENT_REQUESTED"],
    "PAYMENT_REQUESTED": ["PAYMENT_CONFIRMED"],
    "PAYMENT_CONFIRMED": ["SAMPLE_IN_PROGRESS", "BULK_IN_PRODUCTION"],
    "SAMPLE_IN_PROGRESS": ["SAMPLE_QC_UPLOADED"],
    "SAMPLE_QC_UPLOADED": ["SAMPLE_APPROVED", "SAMPLE_IN_PROGRESS"],
    "SAMPLE_APPROVED": ["BULK_UNLOCKED", "COMPLETED"],
    "BULK_UNLOCKED": ["BULK_IN_PRODUCTION"],
    "BULK_IN_PRODUCTION": ["BULK_QC_UPLOADED"],
    "BULK_QC_UPLOADED": ["READY_FOR_DISPATCH", "BULK_IN_PRODUCTION"],
    "READY_FOR_DISPATCH": ["DISPATCHED"],
    "DISPATCHED": ["DELIVERED"],
    "DELIVERED": ["COMPLETED"],
    "COMPLETED": []
  }'::jsonb;
  allowed_states jsonb;
BEGIN
  -- If order_state is not changing, allow the update
  IF OLD.order_state IS NOT DISTINCT FROM NEW.order_state THEN
    RETURN NEW;
  END IF;
  
  -- If old state is NULL, only allow transition to DRAFT or SUBMITTED
  IF OLD.order_state IS NULL THEN
    IF NEW.order_state IN ('DRAFT', 'SUBMITTED') THEN
      NEW.state_updated_at := now();
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: NULL -> %. Orders must start in DRAFT or SUBMITTED state.', NEW.order_state;
    END IF;
  END IF;
  
  -- Get allowed transitions for current state
  allowed_states := valid_transitions->OLD.order_state::text;
  
  -- Check if new state is in allowed transitions
  IF allowed_states IS NULL OR NOT (allowed_states ? NEW.order_state::text) THEN
    RAISE EXCEPTION 'Invalid state transition: % -> %. This transition is not allowed.', OLD.order_state, NEW.order_state;
  END IF;
  
  -- Update timestamp
  NEW.state_updated_at := now();
  
  RETURN NEW;
END;
$function$;