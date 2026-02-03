/**
 * State Change Logger
 * 
 * Logs all order state transitions for debugging and audit purposes.
 * This is a silent logger - it does not affect the UI.
 */

import { supabase } from "@/integrations/supabase/client";

export interface StateChangeLog {
  order_id: string;
  old_state: string | null;
  new_state: string;
  actor_id: string;
  actor_type: string;
  timestamp: string;
}

/**
 * Log a state change to the system_logs table
 * @param orderId - The order ID
 * @param oldState - The previous state (can be null for new orders)
 * @param newState - The new state
 * @param actorId - The user ID who triggered the change
 * @param actorType - The type of actor (admin, buyer, manufacturer, system)
 */
export async function logStateChange(
  orderId: string,
  oldState: string | null,
  newState: string,
  actorId: string,
  actorType: 'admin_approval' | 'manufacturer_assignment' | 'payment_request' | 'payment_confirm' | 'production_start' | 'qc_upload' | 'qc_approval' | 'dispatch' | 'delivery' | 'system'
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('system_logs')
      .insert({
        actor_id: actorId,
        actor_role: actorType,
        event_type: 'order_state_change',
        entity_type: 'order',
        entity_id: orderId,
        metadata: {
          old_state: oldState,
          new_state: newState,
          timestamp: now,
          transition: `${oldState || 'NULL'} → ${newState}`
        }
      });

    if (error) {
      console.error('Failed to log state change:', error);
    } else {
      console.log(`[STATE CHANGE] Order ${orderId.slice(0, 8)}: ${oldState || 'NULL'} → ${newState}`);
    }
  } catch (err) {
    // Silent fail - logging should not break main functionality
    console.error('Error logging state change:', err);
  }
}

/**
 * Validate that a state transition is allowed
 * Returns an error message if invalid, null if valid
 */
export function validateStateTransition(
  currentState: string | null,
  targetState: string
): string | null {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    'DRAFT': ['SUBMITTED'],
    'SUBMITTED': ['ADMIN_APPROVED'],
    'ADMIN_APPROVED': ['MANUFACTURER_ASSIGNED'],
    'MANUFACTURER_ASSIGNED': ['PAYMENT_REQUESTED'],
    'PAYMENT_REQUESTED': ['PAYMENT_CONFIRMED'],
    'PAYMENT_CONFIRMED': ['SAMPLE_IN_PROGRESS', 'BULK_IN_PRODUCTION'],
    'SAMPLE_IN_PROGRESS': ['SAMPLE_QC_UPLOADED'],
    'SAMPLE_QC_UPLOADED': ['SAMPLE_APPROVED', 'SAMPLE_IN_PROGRESS'],
    'SAMPLE_APPROVED': ['BULK_UNLOCKED', 'COMPLETED'],
    'BULK_UNLOCKED': ['BULK_IN_PRODUCTION'],
    'BULK_IN_PRODUCTION': ['BULK_QC_UPLOADED'],
    'BULK_QC_UPLOADED': ['READY_FOR_DISPATCH', 'BULK_IN_PRODUCTION'],
    'READY_FOR_DISPATCH': ['DISPATCHED'],
    'DISPATCHED': ['DELIVERED'],
    'DELIVERED': ['COMPLETED'],
    'COMPLETED': [],
  };

  // If no current state, only DRAFT or SUBMITTED allowed
  if (!currentState) {
    if (targetState === 'DRAFT' || targetState === 'SUBMITTED') {
      return null;
    }
    return `Orders must start in DRAFT or SUBMITTED state, not ${targetState}`;
  }

  const allowedTransitions = VALID_TRANSITIONS[currentState];
  if (!allowedTransitions) {
    return `Unknown current state: ${currentState}`;
  }

  if (!allowedTransitions.includes(targetState)) {
    return `Invalid transition: ${currentState} → ${targetState}. Allowed: ${allowedTransitions.join(', ') || 'none'}`;
  }

  return null;
}

/**
 * Get the next allowed states from current state
 */
export function getNextAllowedStates(currentState: string | null): string[] {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    'DRAFT': ['SUBMITTED'],
    'SUBMITTED': ['ADMIN_APPROVED'],
    'ADMIN_APPROVED': ['MANUFACTURER_ASSIGNED'],
    'MANUFACTURER_ASSIGNED': ['PAYMENT_REQUESTED'],
    'PAYMENT_REQUESTED': ['PAYMENT_CONFIRMED'],
    'PAYMENT_CONFIRMED': ['SAMPLE_IN_PROGRESS', 'BULK_IN_PRODUCTION'],
    'SAMPLE_IN_PROGRESS': ['SAMPLE_QC_UPLOADED'],
    'SAMPLE_QC_UPLOADED': ['SAMPLE_APPROVED', 'SAMPLE_IN_PROGRESS'],
    'SAMPLE_APPROVED': ['BULK_UNLOCKED', 'COMPLETED'],
    'BULK_UNLOCKED': ['BULK_IN_PRODUCTION'],
    'BULK_IN_PRODUCTION': ['BULK_QC_UPLOADED'],
    'BULK_QC_UPLOADED': ['READY_FOR_DISPATCH', 'BULK_IN_PRODUCTION'],
    'READY_FOR_DISPATCH': ['DISPATCHED'],
    'DISPATCHED': ['DELIVERED'],
    'DELIVERED': ['COMPLETED'],
    'COMPLETED': [],
  };

  if (!currentState) return ['DRAFT', 'SUBMITTED'];
  return VALID_TRANSITIONS[currentState] || [];
}
