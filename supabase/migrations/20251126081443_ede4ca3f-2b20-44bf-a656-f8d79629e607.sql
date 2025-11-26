-- Add sample_completed to the order_detailed_status enum
ALTER TYPE order_detailed_status ADD VALUE IF NOT EXISTS 'sample_completed';

COMMENT ON TYPE order_detailed_status IS 'Detailed status enum for orders - includes sample_completed for sample-only orders';