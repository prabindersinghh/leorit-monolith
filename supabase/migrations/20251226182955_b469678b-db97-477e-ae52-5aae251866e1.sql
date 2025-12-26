-- Create function to enforce sample QC workflow rules
CREATE OR REPLACE FUNCTION public.enforce_sample_qc_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RULE 1: Transitioning to SAMPLE_QC_UPLOADED requires QC video
  IF NEW.order_state = 'SAMPLE_QC_UPLOADED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'SAMPLE_QC_UPLOADED') THEN
    -- Must have at least one QC video uploaded
    IF NEW.qc_video_url IS NULL AND NEW.sample_qc_video_url IS NULL AND (NEW.qc_files IS NULL OR array_length(NEW.qc_files, 1) IS NULL) THEN
      RAISE EXCEPTION 'Sample QC video is required before marking QC as uploaded';
    END IF;
    
    -- Set timestamp if not already set
    IF NEW.sample_qc_uploaded_at IS NULL THEN
      NEW.sample_qc_uploaded_at := now();
    END IF;
  END IF;
  
  -- RULE 2: Transitioning to SAMPLE_APPROVED requires QC to have been uploaded
  IF NEW.order_state = 'SAMPLE_APPROVED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'SAMPLE_APPROVED') THEN
    -- Must have QC video
    IF OLD.qc_video_url IS NULL AND OLD.sample_qc_video_url IS NULL AND (OLD.qc_files IS NULL OR array_length(OLD.qc_files, 1) IS NULL) THEN
      RAISE EXCEPTION 'Cannot approve sample: No QC video has been uploaded';
    END IF;
    
    -- Set approval timestamp
    IF NEW.sample_approved_at IS NULL THEN
      NEW.sample_approved_at := now();
    END IF;
    
    IF NEW.sample_qc_approved_at IS NULL THEN
      NEW.sample_qc_approved_at := now();
    END IF;
  END IF;
  
  -- RULE 3: BULK_UNLOCKED requires SAMPLE_APPROVED (enforced by state machine, but double-check)
  IF NEW.order_state = 'BULK_UNLOCKED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'BULK_UNLOCKED') THEN
    -- Sample must be approved first
    IF OLD.sample_approved_at IS NULL AND NEW.sample_approved_at IS NULL THEN
      RAISE EXCEPTION 'Bulk production cannot be unlocked: Sample must be approved first';
    END IF;
  END IF;
  
  -- RULE 4: Rejection reason is mandatory when rejecting (transitioning back from SAMPLE_QC_UPLOADED)
  -- This is tracked via rejection_reason field - we log it but don't block at DB level
  -- since the rejection happens via status update, not state change
  
  RETURN NEW;
END;
$$;

-- Create trigger for sample QC workflow enforcement
CREATE TRIGGER enforce_sample_qc_workflow_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sample_qc_workflow();

-- Create function to log sample QC events automatically
CREATE OR REPLACE FUNCTION public.log_sample_qc_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log SAMPLE_QC_UPLOADED transition
  IF NEW.order_state = 'SAMPLE_QC_UPLOADED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'SAMPLE_QC_UPLOADED') THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'sample_qc_uploaded', now(), jsonb_build_object(
      'order_mode', NEW.order_mode,
      'order_intent', NEW.order_intent,
      'qc_video_url', COALESCE(NEW.sample_qc_video_url, NEW.qc_video_url)
    ));
  END IF;
  
  -- Log SAMPLE_APPROVED transition
  IF NEW.order_state = 'SAMPLE_APPROVED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'SAMPLE_APPROVED') THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'sample_approved', now(), jsonb_build_object(
      'order_mode', NEW.order_mode,
      'order_intent', NEW.order_intent,
      'approved_at', NEW.sample_approved_at
    ));
  END IF;
  
  -- Log BULK_UNLOCKED transition
  IF NEW.order_state = 'BULK_UNLOCKED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'BULK_UNLOCKED') THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'bulk_unlocked', now(), jsonb_build_object(
      'order_mode', NEW.order_mode,
      'order_intent', NEW.order_intent,
      'sample_approved_at', NEW.sample_approved_at
    ));
  END IF;
  
  -- Log rejection (when rejection_reason changes)
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason AND NEW.rejection_reason IS NOT NULL THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'sample_rejected', now(), jsonb_build_object(
      'rejection_reason', NEW.rejection_reason,
      'order_state', NEW.order_state
    ));
  END IF;
  
  -- Log revision request (when concern_notes changes and state goes back to SAMPLE_IN_PROGRESS)
  IF NEW.concern_notes IS DISTINCT FROM OLD.concern_notes AND NEW.concern_notes IS NOT NULL 
     AND NEW.order_state = 'SAMPLE_IN_PROGRESS' AND OLD.order_state = 'SAMPLE_QC_UPLOADED' THEN
    INSERT INTO public.order_events (order_id, event_type, event_timestamp, metadata)
    VALUES (NEW.id, 'sample_revision_requested', now(), jsonb_build_object(
      'revision_reason', NEW.concern_notes,
      'from_state', OLD.order_state,
      'to_state', NEW.order_state
    ));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging sample QC events
CREATE TRIGGER log_sample_qc_events_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sample_qc_events();