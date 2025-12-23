// Order State Machine - Clean state transitions
export type OrderDetailedStatus =
  | 'created'
  | 'submitted_to_manufacturer'
  | 'accepted_by_manufacturer'
  | 'rejected_by_manufacturer'
  | 'sample_in_production'
  | 'qc_uploaded'
  | 'sample_approved_by_buyer'
  | 'sample_rejected_by_buyer'
  | 'sample_completed'
  | 'bulk_in_production'
  | 'dispatched'
  | 'delivered'
  | 'completed';

// Helper to determine if order is sample-only (quantity === 1)
export function isSampleOrder(quantity: number): boolean {
  return quantity === 1;
}

// Define valid state transitions
const stateTransitions: Record<OrderDetailedStatus, OrderDetailedStatus[]> = {
  created: ['submitted_to_manufacturer'],
  submitted_to_manufacturer: ['accepted_by_manufacturer', 'rejected_by_manufacturer'],
  accepted_by_manufacturer: ['sample_in_production'],
  rejected_by_manufacturer: [], // Terminal state
  sample_in_production: ['qc_uploaded'],
  qc_uploaded: ['sample_approved_by_buyer', 'sample_rejected_by_buyer'],
  sample_approved_by_buyer: ['sample_completed', 'bulk_in_production'], // Can complete or continue to bulk
  sample_rejected_by_buyer: ['sample_in_production'], // Can retry
  sample_completed: [], // Terminal state for sample-only orders
  bulk_in_production: ['dispatched'],
  dispatched: ['delivered'],
  delivered: ['completed'],
  completed: [], // Terminal state
};

// Human-readable status labels
export const statusLabels: Record<OrderDetailedStatus, string> = {
  created: 'Created',
  submitted_to_manufacturer: 'Submitted to Manufacturer',
  accepted_by_manufacturer: 'Accepted by Manufacturer',
  rejected_by_manufacturer: 'Rejected by Manufacturer',
  sample_in_production: 'Sample in Production',
  qc_uploaded: 'QC Uploaded',
  sample_approved_by_buyer: 'Sample Approved',
  sample_rejected_by_buyer: 'Sample Rejected',
  sample_completed: 'Sample Completed',
  bulk_in_production: 'Bulk Production',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  completed: 'Completed',
};

// Status colors for UI
export const statusColors: Record<OrderDetailedStatus, string> = {
  created: 'bg-gray-100 text-gray-700',
  submitted_to_manufacturer: 'bg-blue-100 text-blue-700',
  accepted_by_manufacturer: 'bg-green-100 text-green-700',
  rejected_by_manufacturer: 'bg-red-100 text-red-700',
  sample_in_production: 'bg-purple-100 text-purple-700',
  qc_uploaded: 'bg-yellow-100 text-yellow-700',
  sample_approved_by_buyer: 'bg-green-100 text-green-700',
  sample_rejected_by_buyer: 'bg-red-100 text-red-700',
  sample_completed: 'bg-green-100 text-green-700',
  bulk_in_production: 'bg-indigo-100 text-indigo-700',
  dispatched: 'bg-blue-100 text-blue-700',
  delivered: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
};

/**
 * Validate if a state transition is allowed
 */
export function canTransitionTo(
  currentStatus: OrderDetailedStatus,
  newStatus: OrderDetailedStatus
): boolean {
  const allowedTransitions = stateTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get all valid next states for a given status
 */
export function getValidNextStates(
  currentStatus: OrderDetailedStatus
): OrderDetailedStatus[] {
  return stateTransitions[currentStatus] || [];
}

/**
 * Check if a status is terminal (no further transitions)
 */
export function isTerminalStatus(status: OrderDetailedStatus): boolean {
  return stateTransitions[status].length === 0;
}

/**
 * BULK PRODUCTION INVARIANT ENFORCEMENT
 * Bulk production can NEVER start unless:
 * 1. Sample QC video is uploaded (qc_uploaded_at is set OR qc_files has content)
 * 2. Buyer explicitly approves the sample (sample_approved_at is set)
 * 
 * This applies to ALL order intents including "direct_bulk"
 */
export function canStartBulkProduction(order: {
  detailed_status?: string;
  qc_uploaded_at?: string | null;
  qc_files?: string[] | null;
  sample_approved_at?: string | null;
  order_intent?: string | null;
}): { allowed: boolean; reason?: string } {
  // Check 1: Current status must allow transition to bulk_in_production
  const currentStatus = order.detailed_status as OrderDetailedStatus;
  if (!canTransitionTo(currentStatus, 'bulk_in_production')) {
    return { 
      allowed: false, 
      reason: `Cannot transition from ${currentStatus} to bulk production` 
    };
  }

  // Check 2: QC video must be uploaded
  const hasQCUploaded = !!(order.qc_uploaded_at || (order.qc_files && order.qc_files.length > 0));
  if (!hasQCUploaded) {
    return { 
      allowed: false, 
      reason: 'Sample QC video must be uploaded before bulk production can start' 
    };
  }

  // Check 3: Buyer must have explicitly approved the sample
  if (!order.sample_approved_at) {
    return { 
      allowed: false, 
      reason: 'Buyer must approve the sample before bulk production can start' 
    };
  }

  return { allowed: true };
}

/**
 * Get the appropriate action label for transitioning to a state
 */
export function getActionLabel(targetStatus: OrderDetailedStatus): string {
  const actionLabels: Record<OrderDetailedStatus, string> = {
    created: 'Create Order',
    submitted_to_manufacturer: 'Submit to Manufacturer',
    accepted_by_manufacturer: 'Accept Order',
    rejected_by_manufacturer: 'Reject Order',
    sample_in_production: 'Start Sample Production',
    qc_uploaded: 'Upload QC',
    sample_approved_by_buyer: 'Approve Sample',
    sample_rejected_by_buyer: 'Reject Sample',
    sample_completed: 'Complete Sample',
    bulk_in_production: 'Start Bulk Production',
    dispatched: 'Dispatch Order',
    delivered: 'Mark as Delivered',
    completed: 'Complete Order',
  };
  return actionLabels[targetStatus] || targetStatus;
}
