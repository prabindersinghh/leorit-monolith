-- Create function to enforce CSV validation rules based on buyer_purpose and order_state
CREATE OR REPLACE FUNCTION public.enforce_csv_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RULE C: For fabric_only orders, CSV must NOT exist
  IF NEW.buyer_purpose = 'fabric_only' AND NEW.corrected_csv_url IS NOT NULL THEN
    RAISE EXCEPTION 'CSV is not allowed for fabric-only orders';
  END IF;
  
  -- RULE B: For bulk orders transitioning to BULK_UNLOCKED or BULK_IN_PRODUCTION
  -- CSV is mandatory for merch_bulk orders
  IF NEW.buyer_purpose = 'merch_bulk' THEN
    -- Check if transitioning TO BULK_UNLOCKED
    IF NEW.order_state = 'BULK_UNLOCKED' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'BULK_UNLOCKED') THEN
      IF NEW.corrected_csv_url IS NULL THEN
        RAISE EXCEPTION 'CSV is required for bulk production orders';
      END IF;
    END IF;
    
    -- Check if transitioning TO BULK_IN_PRODUCTION
    IF NEW.order_state = 'BULK_IN_PRODUCTION' AND (OLD IS NULL OR OLD.order_state IS DISTINCT FROM 'BULK_IN_PRODUCTION') THEN
      IF NEW.corrected_csv_url IS NULL THEN
        RAISE EXCEPTION 'CSV is required for bulk production orders';
      END IF;
    END IF;
  END IF;
  
  -- RULE A: Sample-only orders - CSV is optional, no enforcement needed
  -- blank_apparel orders - CSV is optional, no enforcement needed
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT operations
CREATE TRIGGER enforce_csv_validation_on_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_csv_validation();

-- Create trigger for UPDATE operations
CREATE TRIGGER enforce_csv_validation_on_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_csv_validation();