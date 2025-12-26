-- Create function to enforce bulk QC and packaging workflow rules
CREATE OR REPLACE FUNCTION public.enforce_bulk_qc_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RULE 1: Transitioning to BULK_QC_UPLOADED requires bulk QC video
  IF NEW.order_state = 'BULK_QC_UPLOADED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'BULK_QC_UPLOADED') THEN
    -- Must have bulk QC video uploaded
    IF NEW.bulk_qc_video_url IS NULL THEN
      RAISE EXCEPTION 'Bulk QC video is required before marking bulk QC as uploaded';
    END IF;
    
    -- Set timestamp if not already set
    IF NEW.bulk_qc_uploaded_at IS NULL THEN
      NEW.bulk_qc_uploaded_at := now();
    END IF;
  END IF;
  
  -- RULE 2: Transitioning to READY_FOR_DISPATCH requires bulk QC approval AND packaging video
  IF NEW.order_state = 'READY_FOR_DISPATCH' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'READY_FOR_DISPATCH') THEN
    -- Must have bulk QC video uploaded
    IF OLD.bulk_qc_video_url IS NULL AND NEW.bulk_qc_video_url IS NULL THEN
      RAISE EXCEPTION 'Cannot proceed to dispatch: Bulk QC video has not been uploaded';
    END IF;
    
    -- Must have bulk QC approved
    IF OLD.bulk_qc_approved_at IS NULL AND NEW.bulk_qc_approved_at IS NULL THEN
      RAISE EXCEPTION 'Cannot proceed to dispatch: Bulk QC must be approved by buyer first';
    END IF;
    
    -- Must have packaging video uploaded
    IF OLD.packaging_video_url IS NULL AND NEW.packaging_video_url IS NULL THEN
      RAISE EXCEPTION 'Cannot proceed to dispatch: Packaging proof video is required';
    END IF;
  END IF;
  
  -- RULE 3: Set bulk QC approval timestamp when transitioning to READY_FOR_DISPATCH
  IF NEW.order_state = 'READY_FOR_DISPATCH' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'READY_FOR_DISPATCH') THEN
    IF NEW.bulk_qc_approved_at IS NULL AND OLD.bulk_qc_approved_at IS NOT NULL THEN
      NEW.bulk_qc_approved_at := OLD.bulk_qc_approved_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for bulk QC workflow enforcement
CREATE TRIGGER enforce_bulk_qc_workflow_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bulk_qc_workflow();

-- Create function to log bulk QC and packaging events automatically
CREATE OR REPLACE FUNCTION public.log_bulk_qc_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log BULK_QC_UPLOADED transition
  IF NEW.order_state = 'BULK_QC_UPLOADED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'BULK_QC_UPLOADED') THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'bulk_qc_uploaded', now(), jsonb_build_object(
      'order_mode', NEW.order_mode,
      'order_intent', NEW.order_intent,
      'bulk_qc_video_url', NEW.bulk_qc_video_url,
      'quantity', NEW.quantity
    ));
  END IF;
  
  -- Log bulk QC approval (when bulk_qc_approved_at changes from NULL)
  IF NEW.bulk_qc_approved_at IS NOT NULL AND OLD.bulk_qc_approved_at IS NULL THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'bulk_qc_approved', now(), jsonb_build_object(
      'order_mode', NEW.order_mode,
      'order_intent', NEW.order_intent,
      'approved_at', NEW.bulk_qc_approved_at
    ));
  END IF;
  
  -- Log bulk QC rejection (when qc_feedback changes and indicates rejection)
  IF NEW.qc_feedback IS DISTINCT FROM OLD.qc_feedback AND NEW.qc_feedback IS NOT NULL 
     AND NEW.order_state = 'BULK_IN_PRODUCTION' AND OLD.order_state = 'BULK_QC_UPLOADED' THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'bulk_qc_rejected', now(), jsonb_build_object(
      'rejection_reason', NEW.qc_feedback,
      'from_state', OLD.order_state,
      'to_state', NEW.order_state
    ));
  END IF;
  
  -- Log packaging proof uploaded (when packaging_video_url changes from NULL)
  IF NEW.packaging_video_url IS NOT NULL AND OLD.packaging_video_url IS NULL THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'packaging_proof_uploaded', now(), jsonb_build_object(
      'packaging_video_url', NEW.packaging_video_url,
      'order_state', NEW.order_state
    ));
  END IF;
  
  -- Log READY_FOR_DISPATCH transition
  IF NEW.order_state = 'READY_FOR_DISPATCH' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'READY_FOR_DISPATCH') THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'ready_for_dispatch', now(), jsonb_build_object(
      'order_mode', NEW.order_mode,
      'bulk_qc_approved_at', NEW.bulk_qc_approved_at,
      'packaging_video_url', NEW.packaging_video_url
    ));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging bulk QC events
CREATE TRIGGER log_bulk_qc_events_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_bulk_qc_events();