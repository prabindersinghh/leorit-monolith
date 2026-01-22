import { supabase } from "@/integrations/supabase/client";

export type ActorRole = 'buyer' | 'manufacturer' | 'admin' | 'system';

export type EntityType = 'order' | 'payment' | 'qc' | 'user' | 'dispute' | 'auth' | 'system';

export type SystemEventType =
  // Auth events
  | 'login'
  | 'signup'
  | 'logout'
  | 'login_blocked'
  // Order events
  | 'order_created'
  | 'order_submitted'
  | 'admin_approved'
  | 'admin_rejected'
  | 'changes_requested'
  | 'manufacturer_assigned'
  | 'manufacturer_accepted'
  | 'manufacturer_rejected'
  // Payment events
  | 'payment_requested'
  | 'payment_completed'
  | 'payment_released'
  | 'payment_refunded'
  // QC events
  | 'qc_uploaded'
  | 'qc_approved'
  | 'qc_rejected'
  | 'sample_qc_uploaded'
  | 'bulk_qc_uploaded'
  // Production events
  | 'sample_production_started'
  | 'bulk_production_started'
  | 'order_packed'
  | 'order_dispatched'
  | 'order_delivered'
  | 'order_completed'
  // Dispute events
  | 'dispute_created'
  | 'dispute_resolved'
  // System events
  | 'system_error'
  | 'onboarding_completed';

interface LogEventOptions {
  actorRole: ActorRole;
  actorId?: string;
  eventType: SystemEventType;
  entityType: EntityType;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs a system event to the system_logs table.
 * Silent fail on error - logging should not break main functionality.
 */
export async function logSystemEvent(options: LogEventOptions): Promise<void> {
  try {
    const { error } = await supabase
      .from('system_logs')
      .insert({
        actor_role: options.actorRole,
        actor_id: options.actorId || null,
        event_type: options.eventType,
        entity_type: options.entityType,
        entity_id: options.entityId || null,
        metadata: options.metadata || {},
      });

    if (error) {
      console.error('[SystemLogger] Failed to log event:', error);
    }
  } catch (err) {
    // Silent fail - logging should not break main functionality
    console.error('[SystemLogger] Error logging event:', err);
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  eventType: 'login' | 'signup' | 'logout' | 'login_blocked',
  userId: string | undefined,
  role: ActorRole,
  metadata?: Record<string, any>
): Promise<void> {
  await logSystemEvent({
    actorRole: role,
    actorId: userId,
    eventType,
    entityType: 'auth',
    entityId: userId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log order lifecycle events
 */
export async function logOrderLifecycleEvent(
  eventType: SystemEventType,
  orderId: string,
  actorId: string | undefined,
  actorRole: ActorRole,
  metadata?: Record<string, any>
): Promise<void> {
  await logSystemEvent({
    actorRole,
    actorId,
    eventType,
    entityType: 'order',
    entityId: orderId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log payment events
 */
export async function logPaymentEvent(
  eventType: 'payment_requested' | 'payment_completed' | 'payment_released' | 'payment_refunded',
  orderId: string,
  actorId: string | undefined,
  actorRole: ActorRole,
  metadata?: Record<string, any>
): Promise<void> {
  await logSystemEvent({
    actorRole,
    actorId,
    eventType,
    entityType: 'payment',
    entityId: orderId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log QC events
 */
export async function logQCEvent(
  eventType: 'qc_uploaded' | 'qc_approved' | 'qc_rejected' | 'sample_qc_uploaded' | 'bulk_qc_uploaded',
  orderId: string,
  actorId: string | undefined,
  actorRole: ActorRole,
  metadata?: Record<string, any>
): Promise<void> {
  await logSystemEvent({
    actorRole,
    actorId,
    eventType,
    entityType: 'qc',
    entityId: orderId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log dispute events
 */
export async function logDisputeEvent(
  eventType: 'dispute_created' | 'dispute_resolved',
  disputeId: string,
  actorId: string | undefined,
  actorRole: ActorRole,
  metadata?: Record<string, any>
): Promise<void> {
  await logSystemEvent({
    actorRole,
    actorId,
    eventType,
    entityType: 'dispute',
    entityId: disputeId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log system errors
 */
export async function logSystemError(
  error: Error | string,
  context: string,
  actorId?: string,
  actorRole: ActorRole = 'system'
): Promise<void> {
  await logSystemEvent({
    actorRole,
    actorId,
    eventType: 'system_error',
    entityType: 'system',
    metadata: {
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
    },
  });
}
