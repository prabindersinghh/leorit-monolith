-- Create function to enforce buyer_purpose validation at submission
CREATE OR REPLACE FUNCTION public.enforce_buyer_purpose_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only validate when transitioning TO SUBMITTED state
  IF NEW.order_state = 'SUBMITTED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'SUBMITTED') THEN
    
    -- MERCH_BULK validation
    IF NEW.buyer_purpose = 'merch_bulk' THEN
      -- Design files REQUIRED
      IF NEW.design_file_url IS NULL THEN
        RAISE EXCEPTION 'Design file is required for merch/bulk orders';
      END IF;
      
      -- CSV REQUIRED
      IF NEW.corrected_csv_url IS NULL THEN
        RAISE EXCEPTION 'Size distribution CSV is required for merch/bulk orders';
      END IF;
      
      -- Fabric REQUIRED
      IF NEW.fabric_type IS NULL THEN
        RAISE EXCEPTION 'Fabric selection is required for merch/bulk orders';
      END IF;
      
      -- Quantity REQUIRED (must be > 0)
      IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Valid quantity is required for merch/bulk orders';
      END IF;
    
    -- BLANK_APPAREL validation
    ELSIF NEW.buyer_purpose = 'blank_apparel' THEN
      -- Design files MUST be NULL
      IF NEW.design_file_url IS NOT NULL THEN
        RAISE EXCEPTION 'Design files are not allowed for blank apparel orders';
      END IF;
      
      -- Fabric REQUIRED
      IF NEW.fabric_type IS NULL THEN
        RAISE EXCEPTION 'Fabric selection is required for blank apparel orders';
      END IF;
      
      -- Color REQUIRED
      IF NEW.selected_color IS NULL THEN
        RAISE EXCEPTION 'Color selection is required for blank apparel orders';
      END IF;
      
      -- Quantity REQUIRED
      IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Valid quantity is required for blank apparel orders';
      END IF;
    
    -- FABRIC_ONLY validation
    ELSIF NEW.buyer_purpose = 'fabric_only' THEN
      -- Design files MUST be NULL
      IF NEW.design_file_url IS NOT NULL THEN
        RAISE EXCEPTION 'Design files are not allowed for fabric-only orders';
      END IF;
      
      -- CSV MUST be NULL
      IF NEW.corrected_csv_url IS NOT NULL THEN
        RAISE EXCEPTION 'Size distribution CSV is not allowed for fabric-only orders';
      END IF;
      
      -- Fabric/GSM REQUIRED
      IF NEW.fabric_type IS NULL THEN
        RAISE EXCEPTION 'Fabric/GSM selection is required for fabric-only orders';
      END IF;
      
      -- Color REQUIRED
      IF NEW.selected_color IS NULL THEN
        RAISE EXCEPTION 'Color selection is required for fabric-only orders';
      END IF;
      
      -- Quantity REQUIRED
      IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Valid quantity is required for fabric-only orders';
      END IF;
    
    ELSE
      -- Unknown buyer_purpose - block submission
      RAISE EXCEPTION 'Invalid or missing buyer_purpose. Must be merch_bulk, blank_apparel, or fabric_only';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for submission validation
CREATE TRIGGER enforce_buyer_purpose_on_submission
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_buyer_purpose_validation();