/**
 * Delivery State Machine
 * 
 * Delivery States:
 * - PACKED: Manufacturer marks order as packed, uploads packaging video
 * - PICKUP_SCHEDULED: Admin assigns courier and schedules pickup
 * - IN_TRANSIT: Order is in transit with carrier
 * - DELIVERED: Order delivered to buyer
 * 
 * Rules:
 * - Manufacturer can ONLY mark PACKED & upload packaging video
 * - Admin assigns courier + tracking ID (PICKUP_SCHEDULED, IN_TRANSIT)
 * - Buyer sees tracking INSIDE Leorit only
 * - No direct buyer-manufacturer delivery coordination
 * 
 * This is ADD-ONLY enforcement logic. No external integrations.
 */

export type DeliveryState = 
  | 'NOT_STARTED'
  | 'PACKED'
  | 'PICKUP_SCHEDULED'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export type ActorRole = 'manufacturer' | 'admin' | 'buyer' | 'system';

export interface DeliveryOrder {
  id: string;
  delivery_status?: string | null;
  order_state?: string | null;
  packed_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  tracking_id?: string | null;
  packaging_video_url?: string | null;
  courier_name?: string | null;
  pickup_scheduled_at?: string | null;
  in_transit_at?: string | null;
}

export interface DeliveryTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Valid delivery state transitions
 */
const VALID_TRANSITIONS: Record<DeliveryState, DeliveryState[]> = {
  'NOT_STARTED': ['PACKED'],
  'PACKED': ['PICKUP_SCHEDULED'],
  'PICKUP_SCHEDULED': ['IN_TRANSIT'],
  'IN_TRANSIT': ['DELIVERED'],
  'DELIVERED': [], // Terminal state
};

/**
 * Who can perform each transition
 */
const TRANSITION_PERMISSIONS: Record<string, ActorRole[]> = {
  'NOT_STARTED->PACKED': ['manufacturer'],
  'PACKED->PICKUP_SCHEDULED': ['admin'],
  'PICKUP_SCHEDULED->IN_TRANSIT': ['admin', 'system'],
  'IN_TRANSIT->DELIVERED': ['admin', 'system'],
};

/**
 * Check if a delivery state transition is valid
 */
export function canTransitionDelivery(
  currentState: DeliveryState,
  targetState: DeliveryState
): boolean {
  const validTargets = VALID_TRANSITIONS[currentState] || [];
  return validTargets.includes(targetState);
}

/**
 * Check if an actor can perform a specific delivery transition
 */
export function canActorPerformTransition(
  currentState: DeliveryState,
  targetState: DeliveryState,
  actor: ActorRole
): DeliveryTransitionResult {
  // First check if transition is valid
  if (!canTransitionDelivery(currentState, targetState)) {
    return {
      allowed: false,
      reason: `Invalid transition: ${currentState} → ${targetState}. Allowed: ${VALID_TRANSITIONS[currentState]?.join(', ') || 'none'}`,
    };
  }

  // Check actor permissions
  const transitionKey = `${currentState}->${targetState}`;
  const allowedActors = TRANSITION_PERMISSIONS[transitionKey] || [];
  
  if (!allowedActors.includes(actor)) {
    return {
      allowed: false,
      reason: `${actor} cannot perform transition ${currentState} → ${targetState}. Only ${allowedActors.join(', ')} can.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if manufacturer can mark order as PACKED
 * Requires: order_state must be READY_FOR_DISPATCH or BULK_QC_UPLOADED
 */
export function canManufacturerMarkPacked(order: DeliveryOrder): DeliveryTransitionResult {
  const currentDeliveryState = (order.delivery_status as DeliveryState) || 'NOT_STARTED';
  
  // Check order state - must be ready for dispatch
  const allowedOrderStates = ['READY_FOR_DISPATCH', 'BULK_QC_UPLOADED'];
  if (order.order_state && !allowedOrderStates.includes(order.order_state)) {
    return {
      allowed: false,
      reason: `Order must be in READY_FOR_DISPATCH state to mark as packed. Current: ${order.order_state}`,
    };
  }

  // Check delivery state transition
  return canActorPerformTransition(currentDeliveryState, 'PACKED', 'manufacturer');
}

/**
 * Validate packaging video is uploaded before allowing PACKED state
 */
export function validatePackagingVideoUploaded(
  order: DeliveryOrder, 
  newVideoUrl?: string
): DeliveryTransitionResult {
  const hasExistingVideo = !!order.packaging_video_url;
  
  if (!hasExistingVideo && !newVideoUrl) {
    return {
      allowed: false,
      reason: 'Packaging video is required. Please upload a video showing sealed cartons with quantity visible.',
    };
  }
  
  return { allowed: true };
}

/**
 * Check if admin can schedule pickup
 * Requires: courier name and tracking ID
 */
export function canAdminSchedulePickup(
  order: DeliveryOrder,
  courierName?: string,
  trackingId?: string
): DeliveryTransitionResult {
  const currentDeliveryState = (order.delivery_status as DeliveryState) || 'NOT_STARTED';
  
  // Must be in PACKED state
  if (currentDeliveryState !== 'PACKED') {
    return {
      allowed: false,
      reason: `Order must be PACKED before scheduling pickup. Current: ${currentDeliveryState}`,
    };
  }

  // Courier name required
  if (!courierName && !order.courier_name) {
    return {
      allowed: false,
      reason: 'Courier name is required to schedule pickup.',
    };
  }

  // Tracking ID required
  if (!trackingId && !order.tracking_id) {
    return {
      allowed: false,
      reason: 'Tracking ID is required to schedule pickup.',
    };
  }

  return canActorPerformTransition(currentDeliveryState, 'PICKUP_SCHEDULED', 'admin');
}

/**
 * Check if admin can mark order as IN_TRANSIT
 */
export function canAdminMarkInTransit(order: DeliveryOrder): DeliveryTransitionResult {
  const currentDeliveryState = (order.delivery_status as DeliveryState) || 'NOT_STARTED';
  
  // Must be in PICKUP_SCHEDULED state
  if (currentDeliveryState !== 'PICKUP_SCHEDULED') {
    return {
      allowed: false,
      reason: `Order must have pickup scheduled before marking in transit. Current: ${currentDeliveryState}`,
    };
  }

  // Must have tracking ID
  if (!order.tracking_id) {
    return {
      allowed: false,
      reason: 'Tracking ID is required before marking in transit.',
    };
  }

  return canActorPerformTransition(currentDeliveryState, 'IN_TRANSIT', 'admin');
}

/**
 * Check if admin can mark order as DELIVERED
 */
export function canAdminMarkDelivered(order: DeliveryOrder): DeliveryTransitionResult {
  const currentDeliveryState = (order.delivery_status as DeliveryState) || 'NOT_STARTED';
  
  // Must be in IN_TRANSIT state
  if (currentDeliveryState !== 'IN_TRANSIT') {
    return {
      allowed: false,
      reason: `Order must be in transit before marking delivered. Current: ${currentDeliveryState}`,
    };
  }

  return canActorPerformTransition(currentDeliveryState, 'DELIVERED', 'admin');
}

/**
 * Get human-readable label for delivery state
 */
export function getDeliveryStateLabel(state: DeliveryState): string {
  const labels: Record<DeliveryState, string> = {
    'NOT_STARTED': 'Awaiting Packaging',
    'PACKED': 'Packed & Ready',
    'PICKUP_SCHEDULED': 'Pickup Scheduled',
    'IN_TRANSIT': 'In Transit',
    'DELIVERED': 'Delivered',
  };
  return labels[state] || state;
}

/**
 * Get delivery state color class for badges
 */
export function getDeliveryStateColor(state: DeliveryState): string {
  const colors: Record<DeliveryState, string> = {
    'NOT_STARTED': 'bg-gray-100 text-gray-700',
    'PACKED': 'bg-blue-100 text-blue-700',
    'PICKUP_SCHEDULED': 'bg-purple-100 text-purple-700',
    'IN_TRANSIT': 'bg-orange-100 text-orange-700',
    'DELIVERED': 'bg-green-100 text-green-700',
  };
  return colors[state] || 'bg-gray-100 text-gray-700';
}

/**
 * Create timestamp for delivery action
 */
export function createDeliveryTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Delivery action types for logging
 */
export type DeliveryActionType = 
  | 'order_packed'
  | 'packaging_video_uploaded'
  | 'pickup_scheduled'
  | 'courier_assigned'
  | 'in_transit'
  | 'delivered';

/**
 * Create metadata for delivery action logging
 */
export function createDeliveryActionMetadata(
  actionType: DeliveryActionType,
  order: DeliveryOrder,
  actor: ActorRole,
  additionalData?: Record<string, any>
): Record<string, any> {
  return {
    action: actionType,
    actor,
    delivery_status: order.delivery_status,
    tracking_id: order.tracking_id,
    timestamp: createDeliveryTimestamp(),
    ...additionalData,
  };
}

/**
 * Get next available delivery state based on current state and actor
 */
export function getNextDeliveryState(
  currentState: DeliveryState,
  actor: ActorRole
): DeliveryState | null {
  const possibleTargets = VALID_TRANSITIONS[currentState] || [];
  
  for (const target of possibleTargets) {
    const transitionKey = `${currentState}->${target}`;
    const allowedActors = TRANSITION_PERMISSIONS[transitionKey] || [];
    if (allowedActors.includes(actor)) {
      return target;
    }
  }
  
  return null;
}

/**
 * Check what the buyer can see for tracking
 * Buyers see tracking INSIDE Leorit only - no external links
 */
export function getBuyerVisibleTrackingInfo(order: DeliveryOrder): {
  canSeeTracking: boolean;
  status: DeliveryState;
  statusLabel: string;
  trackingId: string | null;
  courierName: string | null;
  estimatedDelivery: string | null;
  timestamps: {
    packed?: string;
    pickupScheduled?: string;
    inTransit?: string;
    delivered?: string;
  };
} {
  const status = (order.delivery_status as DeliveryState) || 'NOT_STARTED';
  
  // Buyer can see tracking once order is at least PACKED
  const canSeeTracking = status !== 'NOT_STARTED';
  
  return {
    canSeeTracking,
    status,
    statusLabel: getDeliveryStateLabel(status),
    // Only show tracking ID once pickup is scheduled (admin has assigned it)
    trackingId: ['PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].includes(status) 
      ? order.tracking_id || null 
      : null,
    courierName: ['PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].includes(status)
      ? order.courier_name || null
      : null,
    estimatedDelivery: null, // Can be calculated based on dispatched_at + 3 days
    timestamps: {
      packed: order.packed_at || undefined,
      pickupScheduled: order.pickup_scheduled_at || undefined,
      inTransit: order.in_transit_at || undefined,
      delivered: order.delivered_at || undefined,
    },
  };
}
