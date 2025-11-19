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
  | 'bulk_in_production'
  | 'dispatched'
  | 'delivered'
  | 'completed';

// Define valid state transitions
const stateTransitions: Record<OrderDetailedStatus, OrderDetailedStatus[]> = {
  created: ['submitted_to_manufacturer'],
  submitted_to_manufacturer: ['accepted_by_manufacturer', 'rejected_by_manufacturer'],
  accepted_by_manufacturer: ['sample_in_production'],
  rejected_by_manufacturer: [], // Terminal state
  sample_in_production: ['qc_uploaded'],
  qc_uploaded: ['sample_approved_by_buyer', 'sample_rejected_by_buyer'],
  sample_approved_by_buyer: ['bulk_in_production'],
  sample_rejected_by_buyer: ['sample_in_production'], // Can retry
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
    bulk_in_production: 'Start Bulk Production',
    dispatched: 'Dispatch Order',
    delivered: 'Mark as Delivered',
    completed: 'Complete Order',
  };
  return actionLabels[targetStatus] || targetStatus;
}
