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
  | 'delivered'
  | 'mockup_generated'
  | 'back_mockup_generated'
  | 'sample_completed'                // Sample-only order completed
  | 'bulk_unlocked'                   // Bulk production unlocked after sample approval
  | 'sample_approved_bulk_unlocked'   // Sample approved, bulk production unlocked (sample_then_bulk flow)
  | 'direct_bulk_sample_approved'     // Sample approved in direct_bulk flow (informational only)
  | 'upfront_payment_locked'          // 55% upfront payment locked in escrow
  | 'upfront_payment_released'        // 55% released after sample approval (sample-only) or partial release
  | 'remaining_payment_released'      // 45% released after bulk QC + delivery confirmed
  | 'full_payment_released'           // Full payment released (order completed)
  | 'bulk_qc_uploaded'                // Bulk QC video uploaded by manufacturer
  | 'bulk_qc_approved'                // Bulk QC approved by buyer
  | 'bulk_qc_rejected'                // Bulk QC rejected by buyer (reason required)
  // Delivery state machine events
  | 'order_packed'                    // Manufacturer marked order as packed
  | 'packaging_video_uploaded'        // Manufacturer uploaded packaging video
  | 'pickup_scheduled'                // Admin scheduled pickup with courier
  | 'courier_assigned'                // Admin assigned courier + tracking ID
  | 'in_transit'                      // Order is in transit
  | 'order_delivered'                 // Order delivered to buyer
  // Payment state machine events
  | 'payment_initiated'               // Payment process started
  | 'payment_held'                    // Payment captured and held in escrow
  | 'payment_releasable'              // All conditions met for release
  | 'payment_released'                // Payment released to manufacturer
  | 'payment_refunded'                // Payment refunded to buyer (admin only)
  // CSV validation events
  | 'csv_uploaded'                    // CSV file uploaded by buyer
  | 'csv_validation_passed'           // CSV validation gate passed for bulk transition
  | 'csv_validation_blocked'          // Bulk transition blocked due to missing CSV
  // Admin approval flow events
  | 'order_submitted_for_review'      // Order submitted by buyer for admin review
  | 'admin_approved'                  // Order approved by admin with payment link
  | 'changes_requested'               // Admin requested changes from buyer
  | 'payment_received'                // Payment marked as received by admin
  // Payment gate events
  | 'payment_requested'               // Admin requested payment from buyer
  | 'payment_confirmed'               // Admin confirmed payment received
  // Spec locking events
  | 'specs_locked'                    // Admin locked specs before production
  // Admin QC decision events
  | 'admin_qc_approved'               // Admin approved QC
  | 'admin_qc_rejected'               // Admin rejected QC
  // State machine transition events
  | 'state_transition';               // Generic state transition event

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
