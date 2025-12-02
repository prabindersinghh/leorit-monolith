import { supabase } from "@/integrations/supabase/client";

export type OrderEventType =
  | 'sample_created'
  | 'bulk_created'
  | 'manufacturer_assigned'
  | 'manufacturer_accepted'
  | 'manufacturer_rejected'
  | 'sample_production_started'
  | 'qc_uploaded'
  | 'qc_approved'
  | 'qc_rejected'
  | 'concern_raised'
  | 'bulk_production_started'
  | 'dispatched'
  | 'delivered';

/**
 * Logs an order event to the order_events table for analytics.
 * This is add-only instrumentation and does not affect existing functionality.
 */
export async function logOrderEvent(
  orderId: string,
  eventType: OrderEventType,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('order_events')
      .insert({
        order_id: orderId,
        event_type: eventType,
        event_timestamp: new Date().toISOString(),
        metadata: metadata || null
      });

    if (error) {
      console.error('Failed to log order event:', error);
    }
  } catch (err) {
    // Silent fail - analytics logging should not break main functionality
    console.error('Error logging order event:', err);
  }
}
