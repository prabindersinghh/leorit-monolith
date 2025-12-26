/**
 * Payment State Machine
 * 
 * Payment States:
 * - PAYMENT_INITIATED: Payment process started (order created)
 * - PAYMENT_HELD: Payment captured and held in escrow
 * - PAYMENT_RELEASABLE: All conditions met for release (QC approved + delivered)
 * - PAYMENT_RELEASED: Payment released to manufacturer
 * - PAYMENT_REFUNDED: Payment refunded to buyer (admin only)
 * 
 * Rules:
 * - Sample payment required before SAMPLE_IN_PROGRESS
 * - Bulk payment required before BULK_IN_PRODUCTION
 * - PAYMENT_RELEASED only after:
 *   - BULK_QC_APPROVED
 *   - DELIVERY = DELIVERED
 * - Admin override allowed ONLY for refunds
 * 
 * This is ADD-ONLY enforcement logic. NO payment gateway integration.
 */

export type PaymentState = 
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_HELD'
  | 'PAYMENT_RELEASABLE'
  | 'PAYMENT_RELEASED'
  | 'PAYMENT_REFUNDED';

export type PaymentActorRole = 'system' | 'admin' | 'buyer' | 'manufacturer';

export interface PaymentOrder {
  id: string;
  payment_state?: string | null;
  payment_status?: string | null;
  order_state?: string | null;
  escrow_status?: string | null;
  // Payment amounts
  total_order_value?: number | null;
  upfront_payable_amount?: number | null;
  escrow_amount?: number | null;
  total_amount?: number | null;
  // Timestamps
  fake_payment_timestamp?: string | null;
  escrow_locked_timestamp?: string | null;
  escrow_released_timestamp?: string | null;
  // QC approval
  sample_approved_at?: string | null;
  bulk_qc_approved_at?: string | null;
  // Delivery
  delivery_status?: string | null;
  delivered_at?: string | null;
  // Order mode
  order_mode?: string | null;
  order_intent?: string | null;
  quantity?: number;
}

export interface PaymentTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Valid payment state transitions
 */
const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  'PAYMENT_INITIATED': ['PAYMENT_HELD', 'PAYMENT_REFUNDED'],
  'PAYMENT_HELD': ['PAYMENT_RELEASABLE', 'PAYMENT_REFUNDED'],
  'PAYMENT_RELEASABLE': ['PAYMENT_RELEASED', 'PAYMENT_REFUNDED'],
  'PAYMENT_RELEASED': [], // Terminal state (no refund after release)
  'PAYMENT_REFUNDED': [], // Terminal state
};

/**
 * Who can perform each transition
 */
const TRANSITION_PERMISSIONS: Record<string, PaymentActorRole[]> = {
  'PAYMENT_INITIATED->PAYMENT_HELD': ['system', 'buyer'],
  'PAYMENT_HELD->PAYMENT_RELEASABLE': ['system'],
  'PAYMENT_RELEASABLE->PAYMENT_RELEASED': ['system', 'admin'],
  // Refunds - ADMIN ONLY
  'PAYMENT_INITIATED->PAYMENT_REFUNDED': ['admin'],
  'PAYMENT_HELD->PAYMENT_REFUNDED': ['admin'],
  'PAYMENT_RELEASABLE->PAYMENT_REFUNDED': ['admin'],
};

/**
 * Check if a payment state transition is valid
 */
export function canTransitionPayment(
  currentState: PaymentState,
  targetState: PaymentState
): boolean {
  const validTargets = VALID_TRANSITIONS[currentState] || [];
  return validTargets.includes(targetState);
}

/**
 * Check if an actor can perform a specific payment transition
 */
export function canActorPerformPaymentTransition(
  currentState: PaymentState,
  targetState: PaymentState,
  actor: PaymentActorRole
): PaymentTransitionResult {
  // First check if transition is valid
  if (!canTransitionPayment(currentState, targetState)) {
    return {
      allowed: false,
      reason: `Invalid payment transition: ${currentState} → ${targetState}. Allowed: ${VALID_TRANSITIONS[currentState]?.join(', ') || 'none'}`,
    };
  }

  // Check actor permissions
  const transitionKey = `${currentState}->${targetState}`;
  const allowedActors = TRANSITION_PERMISSIONS[transitionKey] || [];
  
  if (!allowedActors.includes(actor)) {
    return {
      allowed: false,
      reason: `${actor} cannot perform payment transition ${currentState} → ${targetState}. Only ${allowedActors.join(', ')} can.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if sample payment is complete before allowing SAMPLE_IN_PROGRESS
 * RULE: Sample payment required before SAMPLE_IN_PROGRESS
 */
export function canStartSampleProduction(order: PaymentOrder): PaymentTransitionResult {
  const paymentState = (order.payment_state as PaymentState) || 'PAYMENT_INITIATED';
  
  // Payment must be at least HELD before production can start
  if (paymentState === 'PAYMENT_INITIATED') {
    return {
      allowed: false,
      reason: 'Sample payment must be completed before production can start. Payment is still in INITIATED state.',
    };
  }

  // Check for refunded state
  if (paymentState === 'PAYMENT_REFUNDED') {
    return {
      allowed: false,
      reason: 'Cannot start production: Payment has been refunded.',
    };
  }

  // Must have escrow locked timestamp (indicates payment held)
  if (!order.escrow_locked_timestamp && !order.fake_payment_timestamp) {
    return {
      allowed: false,
      reason: 'Payment must be held in escrow before sample production can start.',
    };
  }

  return { allowed: true };
}

/**
 * Check if bulk payment is complete before allowing BULK_IN_PRODUCTION
 * RULE: Bulk payment required before BULK_IN_PRODUCTION
 */
export function canStartBulkProductionPayment(order: PaymentOrder): PaymentTransitionResult {
  const paymentState = (order.payment_state as PaymentState) || 'PAYMENT_INITIATED';
  
  // Payment must be at least HELD
  if (paymentState === 'PAYMENT_INITIATED') {
    return {
      allowed: false,
      reason: 'Bulk payment must be completed before bulk production can start.',
    };
  }

  // Check for refunded state
  if (paymentState === 'PAYMENT_REFUNDED') {
    return {
      allowed: false,
      reason: 'Cannot start bulk production: Payment has been refunded.',
    };
  }

  // For sample_then_bulk, sample must be approved first
  if (order.order_mode === 'sample_then_bulk' || order.order_intent === 'sample_then_bulk') {
    if (!order.sample_approved_at) {
      return {
        allowed: false,
        reason: 'Sample must be approved before bulk production payment can proceed.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if payment can transition to RELEASABLE
 * RULE: PAYMENT_RELEASABLE only after BULK_QC_APPROVED AND DELIVERY = DELIVERED
 */
export function canMarkPaymentReleasable(order: PaymentOrder): PaymentTransitionResult {
  const paymentState = (order.payment_state as PaymentState) || 'PAYMENT_INITIATED';
  
  // Must be in HELD state
  if (paymentState !== 'PAYMENT_HELD') {
    return {
      allowed: false,
      reason: `Payment must be in HELD state to become releasable. Current: ${paymentState}`,
    };
  }

  // For sample_only orders, check sample approval
  if (order.order_mode === 'sample_only' || order.order_intent === 'sample_only') {
    if (!order.sample_approved_at) {
      return {
        allowed: false,
        reason: 'Sample must be approved before payment can be released.',
      };
    }
    // Sample-only orders don't require bulk QC or delivery
    return { allowed: true };
  }

  // RULE: BULK_QC_APPROVED required
  if (!order.bulk_qc_approved_at) {
    return {
      allowed: false,
      reason: 'Bulk QC must be approved before payment can be released.',
    };
  }

  // RULE: DELIVERY = DELIVERED required
  const deliveredStates = ['DELIVERED', 'delivered'];
  if (!deliveredStates.includes(order.delivery_status || '')) {
    return {
      allowed: false,
      reason: 'Order must be delivered before payment can be released.',
    };
  }

  if (!order.delivered_at) {
    return {
      allowed: false,
      reason: 'Delivery confirmation timestamp is required before payment release.',
    };
  }

  return { allowed: true };
}

/**
 * Check if payment can be released
 * RULE: PAYMENT_RELEASED only after BULK_QC_APPROVED AND DELIVERY = DELIVERED
 */
export function canReleasePayment(order: PaymentOrder): PaymentTransitionResult {
  const paymentState = (order.payment_state as PaymentState) || 'PAYMENT_INITIATED';
  
  // Must be in RELEASABLE state
  if (paymentState !== 'PAYMENT_RELEASABLE') {
    // Check if we can skip to released from HELD (if conditions are met)
    if (paymentState === 'PAYMENT_HELD') {
      const releasableCheck = canMarkPaymentReleasable(order);
      if (!releasableCheck.allowed) {
        return releasableCheck;
      }
      // Conditions met, can proceed
      return { allowed: true };
    }
    
    return {
      allowed: false,
      reason: `Payment must be in RELEASABLE state before release. Current: ${paymentState}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if admin can issue refund
 * RULE: Admin override allowed ONLY for refunds
 */
export function canAdminRefund(order: PaymentOrder): PaymentTransitionResult {
  const paymentState = (order.payment_state as PaymentState) || 'PAYMENT_INITIATED';
  
  // Cannot refund if already released
  if (paymentState === 'PAYMENT_RELEASED') {
    return {
      allowed: false,
      reason: 'Cannot refund: Payment has already been released to manufacturer.',
    };
  }

  // Cannot refund if already refunded
  if (paymentState === 'PAYMENT_REFUNDED') {
    return {
      allowed: false,
      reason: 'Payment has already been refunded.',
    };
  }

  // Admin can refund from any non-terminal state
  return { allowed: true };
}

/**
 * Get human-readable label for payment state
 */
export function getPaymentStateLabel(state: PaymentState): string {
  const labels: Record<PaymentState, string> = {
    'PAYMENT_INITIATED': 'Payment Pending',
    'PAYMENT_HELD': 'In Escrow',
    'PAYMENT_RELEASABLE': 'Ready for Release',
    'PAYMENT_RELEASED': 'Released',
    'PAYMENT_REFUNDED': 'Refunded',
  };
  return labels[state] || state;
}

/**
 * Get payment state color class for badges
 */
export function getPaymentStateColor(state: PaymentState): string {
  const colors: Record<PaymentState, string> = {
    'PAYMENT_INITIATED': 'bg-yellow-100 text-yellow-700',
    'PAYMENT_HELD': 'bg-blue-100 text-blue-700',
    'PAYMENT_RELEASABLE': 'bg-purple-100 text-purple-700',
    'PAYMENT_RELEASED': 'bg-green-100 text-green-700',
    'PAYMENT_REFUNDED': 'bg-red-100 text-red-700',
  };
  return colors[state] || 'bg-gray-100 text-gray-700';
}

/**
 * Create timestamp for payment action
 */
export function createPaymentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Payment action types for logging
 */
export type PaymentActionType = 
  | 'payment_initiated'
  | 'payment_held'
  | 'payment_releasable'
  | 'payment_released'
  | 'payment_refunded'
  | 'upfront_payment_captured'
  | 'remaining_payment_captured';

/**
 * Create metadata for payment action logging
 */
export function createPaymentActionMetadata(
  actionType: PaymentActionType,
  order: PaymentOrder,
  actor: PaymentActorRole,
  additionalData?: Record<string, any>
): Record<string, any> {
  return {
    action: actionType,
    actor,
    payment_state: order.payment_state,
    escrow_amount: order.escrow_amount,
    total_amount: order.total_amount,
    upfront_amount: order.upfront_payable_amount,
    timestamp: createPaymentTimestamp(),
    ...additionalData,
  };
}

/**
 * Calculate payment amounts based on order value
 */
export function calculatePaymentSplit(totalOrderValue: number): {
  upfrontAmount: number;
  remainingAmount: number;
  upfrontPercentage: number;
  remainingPercentage: number;
} {
  const upfrontPercentage = 55;
  const remainingPercentage = 45;
  
  const upfrontAmount = Math.round((totalOrderValue * upfrontPercentage) / 100);
  const remainingAmount = totalOrderValue - upfrontAmount;
  
  return {
    upfrontAmount,
    remainingAmount,
    upfrontPercentage,
    remainingPercentage,
  };
}

/**
 * Get payment release conditions status
 */
export function getPaymentReleaseConditions(order: PaymentOrder): {
  allConditionsMet: boolean;
  conditions: {
    label: string;
    met: boolean;
    required: boolean;
  }[];
} {
  const isSampleOnly = order.order_mode === 'sample_only' || order.order_intent === 'sample_only';
  
  const conditions = [];
  
  // Sample approval (always required)
  conditions.push({
    label: 'Sample QC Approved',
    met: !!order.sample_approved_at,
    required: true,
  });
  
  if (!isSampleOnly) {
    // Bulk QC approval (required for bulk orders)
    conditions.push({
      label: 'Bulk QC Approved',
      met: !!order.bulk_qc_approved_at,
      required: true,
    });
    
    // Delivery confirmed (required for bulk orders)
    conditions.push({
      label: 'Order Delivered',
      met: !!order.delivered_at || order.delivery_status === 'DELIVERED',
      required: true,
    });
  }
  
  const allConditionsMet = conditions
    .filter(c => c.required)
    .every(c => c.met);
  
  return {
    allConditionsMet,
    conditions,
  };
}

/**
 * Determine next payment state based on current state and order conditions
 */
export function determineNextPaymentState(order: PaymentOrder): PaymentState | null {
  const currentState = (order.payment_state as PaymentState) || 'PAYMENT_INITIATED';
  
  switch (currentState) {
    case 'PAYMENT_INITIATED':
      // Can move to HELD if payment is captured
      if (order.escrow_locked_timestamp || order.fake_payment_timestamp) {
        return 'PAYMENT_HELD';
      }
      return null;
      
    case 'PAYMENT_HELD':
      // Can move to RELEASABLE if all conditions met
      const releaseCheck = canMarkPaymentReleasable(order);
      if (releaseCheck.allowed) {
        return 'PAYMENT_RELEASABLE';
      }
      return null;
      
    case 'PAYMENT_RELEASABLE':
      // Can move to RELEASED
      return 'PAYMENT_RELEASED';
      
    case 'PAYMENT_RELEASED':
    case 'PAYMENT_REFUNDED':
      // Terminal states
      return null;
      
    default:
      return null;
  }
}
