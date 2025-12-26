-- Create function to enforce field locks based on order state
CREATE OR REPLACE FUNCTION public.enforce_order_field_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  state_order TEXT[] := ARRAY['DRAFT', 'SUBMITTED', 'MANUFACTURER_ASSIGNED', 'SAMPLE_IN_PROGRESS', 'SAMPLE_QC_UPLOADED', 'SAMPLE_APPROVED', 'BULK_UNLOCKED', 'BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'];
  old_state_index INT;
  submitted_index INT := 2; -- SUBMITTED is index 2 (1-based)
  sample_approved_index INT := 6; -- SAMPLE_APPROVED is index 6
  bulk_unlocked_index INT := 7; -- BULK_UNLOCKED is index 7
BEGIN
  -- Get the index of the OLD order_state
  old_state_index := array_position(state_order, OLD.order_state::text);
  
  -- If no valid old state, allow the update
  IF old_state_index IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- LOCK LEVEL 1: After SUBMITTED (index >= 2)
  -- Lock: buyer_notes, quantity, buyer_purpose, product_category
  IF old_state_index >= submitted_index THEN
    IF OLD.buyer_notes IS DISTINCT FROM NEW.buyer_notes THEN
      RAISE EXCEPTION 'Field ''buyer_notes'' cannot be modified after SUBMITTED';
    END IF;
    
    IF OLD.buyer_purpose IS DISTINCT FROM NEW.buyer_purpose THEN
      RAISE EXCEPTION 'Field ''buyer_purpose'' cannot be modified after SUBMITTED';
    END IF;
    
    IF OLD.product_category IS DISTINCT FROM NEW.product_category THEN
      RAISE EXCEPTION 'Field ''product_category'' cannot be modified after SUBMITTED';
    END IF;
    
    -- Quantity locked after SUBMITTED, but checked again at BULK_UNLOCKED for emphasis
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      RAISE EXCEPTION 'Field ''quantity'' cannot be modified after SUBMITTED';
    END IF;
  END IF;
  
  -- LOCK LEVEL 2: After SAMPLE_APPROVED (index >= 6)
  -- Lock: fabric_type, selected_color, corrected_csv_url (size distribution)
  IF old_state_index >= sample_approved_index THEN
    IF OLD.fabric_type IS DISTINCT FROM NEW.fabric_type THEN
      RAISE EXCEPTION 'Field ''fabric_type'' cannot be modified after SAMPLE_APPROVED';
    END IF;
    
    IF OLD.selected_color IS DISTINCT FROM NEW.selected_color THEN
      RAISE EXCEPTION 'Field ''selected_color'' cannot be modified after SAMPLE_APPROVED';
    END IF;
    
    IF OLD.corrected_csv_url IS DISTINCT FROM NEW.corrected_csv_url THEN
      RAISE EXCEPTION 'Field ''size_distribution_csv'' cannot be modified after SAMPLE_APPROVED';
    END IF;
  END IF;
  
  -- LOCK LEVEL 3: After BULK_UNLOCKED (index >= 7) - quantity is absolutely immutable
  -- This is redundant with level 1 but provides explicit enforcement
  IF old_state_index >= bulk_unlocked_index THEN
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      RAISE EXCEPTION 'Field ''quantity'' cannot be modified after BULK_UNLOCKED - quantity is permanently locked';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (runs BEFORE the state transition trigger)
CREATE TRIGGER enforce_field_locks_on_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_field_locks();