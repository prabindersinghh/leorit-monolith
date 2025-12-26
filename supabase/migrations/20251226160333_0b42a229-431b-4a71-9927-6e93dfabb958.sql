-- Create new order_state enum with strict linear states
CREATE TYPE public.order_state AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'MANUFACTURER_ASSIGNED',
  'SAMPLE_IN_PROGRESS',
  'SAMPLE_QC_UPLOADED',
  'SAMPLE_APPROVED',
  'BULK_UNLOCKED',
  'BULK_IN_PRODUCTION',
  'BULK_QC_UPLOADED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED'
);

-- Add order_state column to orders table (default DRAFT for new orders)
ALTER TABLE public.orders 
ADD COLUMN order_state public.order_state DEFAULT 'DRAFT'::public.order_state;

-- Add state_updated_at timestamp for tracking
ALTER TABLE public.orders 
ADD COLUMN state_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to validate state transitions
CREATE OR REPLACE FUNCTION public.validate_order_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  valid_transitions jsonb := '{
    "DRAFT": ["SUBMITTED"],
    "SUBMITTED": ["MANUFACTURER_ASSIGNED"],
    "MANUFACTURER_ASSIGNED": ["SAMPLE_IN_PROGRESS"],
    "SAMPLE_IN_PROGRESS": ["SAMPLE_QC_UPLOADED"],
    "SAMPLE_QC_UPLOADED": ["SAMPLE_APPROVED"],
    "SAMPLE_APPROVED": ["BULK_UNLOCKED", "COMPLETED"],
    "BULK_UNLOCKED": ["BULK_IN_PRODUCTION"],
    "BULK_IN_PRODUCTION": ["BULK_QC_UPLOADED"],
    "BULK_QC_UPLOADED": ["READY_FOR_DISPATCH"],
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
  
  -- If old state is NULL, only allow transition to DRAFT
  IF OLD.order_state IS NULL THEN
    IF NEW.order_state = 'DRAFT' THEN
      NEW.state_updated_at := now();
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: NULL -> %. Orders must start in DRAFT state.', NEW.order_state;
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
$$;

-- Create trigger to enforce state transitions
CREATE TRIGGER enforce_order_state_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_state_transition();

-- Create function to log state transitions (calls existing event logging)
CREATE OR REPLACE FUNCTION public.log_order_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if state actually changed
  IF OLD.order_state IS DISTINCT FROM NEW.order_state THEN
    INSERT INTO public.order_events (
      order_id,
      event_type,
      event_timestamp,
      metadata
    ) VALUES (
      NEW.id,
      'state_transition',
      now(),
      jsonb_build_object(
        'from_state', OLD.order_state::text,
        'to_state', NEW.order_state::text,
        'triggered_by', auth.uid()::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to log state changes
CREATE TRIGGER log_order_state_changes
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_state_change();