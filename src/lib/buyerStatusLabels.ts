/**
 * Buyer-specific status labels and helpers
 * Maps order_state enum values to buyer-friendly labels
 * Hides manufacturer terminology and reflects review-based workflow
 */

import { OrderDetailedStatus } from './orderStateMachine';

/**
 * ORDER_STATE based labels (new v2 state machine)
 * These map the order_state enum to buyer-friendly labels
 */
export const orderStateLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted for Review',
  ADMIN_APPROVED: 'Approved – Awaiting Payment Details',
  MANUFACTURER_ASSIGNED: 'Approved – Manufacturer Assigned',
  PAYMENT_REQUESTED: 'Payment Required',
  PAYMENT_CONFIRMED: 'Payment Received – Production Starting',
  SAMPLE_IN_PROGRESS: 'Sample in Production',
  SAMPLE_QC_UPLOADED: 'Sample Ready for Review',
  SAMPLE_APPROVED: 'Sample Approved',
  BULK_UNLOCKED: 'Bulk Production Unlocked',
  BULK_IN_PRODUCTION: 'Bulk Production in Progress',
  BULK_QC_UPLOADED: 'Bulk Quality Check Ready',
  READY_FOR_DISPATCH: 'Ready for Shipping',
  DISPATCHED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

/**
 * ORDER_STATE based colors
 */
export const orderStateColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  ADMIN_APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  MANUFACTURER_ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  PAYMENT_REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  PAYMENT_CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  SAMPLE_IN_PROGRESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  SAMPLE_QC_UPLOADED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  SAMPLE_APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  BULK_UNLOCKED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  BULK_IN_PRODUCTION: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  BULK_QC_UPLOADED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  READY_FOR_DISPATCH: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  DISPATCHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  DELIVERED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
};

/**
 * Legacy detailed_status labels (for backward compatibility)
 */
export const buyerStatusLabels: Record<OrderDetailedStatus, string> = {
  created: 'Draft',
  submitted_to_manufacturer: 'Submitted for Review',
  accepted_by_manufacturer: 'Approved – Payment Pending',
  rejected_by_manufacturer: 'Changes Requested',
  sample_in_production: 'In Production',
  qc_uploaded: 'Quality Check Ready',
  sample_approved_by_buyer: 'Sample Approved',
  sample_rejected_by_buyer: 'Sample Rejected',
  sample_completed: 'Sample Completed',
  bulk_in_production: 'Bulk Production',
  dispatched: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
};

/**
 * Legacy detailed_status colors
 */
export const buyerStatusColors: Record<OrderDetailedStatus, string> = {
  created: 'bg-gray-100 text-gray-700',
  submitted_to_manufacturer: 'bg-amber-100 text-amber-700',
  accepted_by_manufacturer: 'bg-blue-100 text-blue-700',
  rejected_by_manufacturer: 'bg-orange-100 text-orange-700',
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
 * Check if order has payment link set and is approved for payment
 */
export function isApprovedForPayment(order: {
  order_state?: string | null;
  admin_approved_at?: string | null;
  payment_link?: string | null;
  payment_received_at?: string | null;
}): boolean {
  // Use order_state if available (v2 state machine)
  if (order.order_state === 'PAYMENT_REQUESTED' && order.payment_link) {
    return true;
  }
  // Fallback for legacy
  return !!order.admin_approved_at && !!order.payment_link && !order.payment_received_at;
}

/**
 * Check if payment has been received
 */
export function isPaymentReceived(order: {
  order_state?: string | null;
  payment_received_at?: string | null;
}): boolean {
  // Use order_state if available (v2 state machine)
  if (order.order_state === 'PAYMENT_CONFIRMED') {
    return true;
  }
  // Check production stages (payment already received)
  const productionStages = [
    'SAMPLE_IN_PROGRESS', 'SAMPLE_QC_UPLOADED', 'SAMPLE_APPROVED',
    'BULK_UNLOCKED', 'BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED',
    'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'
  ];
  if (order.order_state && productionStages.includes(order.order_state)) {
    return true;
  }
  return !!order.payment_received_at;
}

/**
 * Check if order is pending payment (admin has enabled payment but not paid yet)
 */
export function isPaymentPending(order: {
  order_state?: string | null;
  admin_approved_at?: string | null;
  payment_link?: string | null;
  payment_received_at?: string | null;
}): boolean {
  return order.order_state === 'PAYMENT_REQUESTED';
}

/**
 * Check if order is awaiting review (before admin approval)
 */
export function isAwaitingReview(order: {
  order_state?: string | null;
  detailed_status?: string | null;
  admin_approved_at?: string | null;
}): boolean {
  // Check order_state first (v2)
  if (order.order_state === 'SUBMITTED' || order.order_state === 'DRAFT') {
    return true;
  }
  // Legacy fallback
  const status = order.detailed_status;
  return (status === 'submitted_to_manufacturer' || status === 'created') && !order.admin_approved_at;
}

/**
 * Get buyer-friendly display status with payment awareness
 * Uses order_state (v2) as primary, with fallback to detailed_status (v1)
 */
export function getBuyerDisplayStatus(order: {
  order_state?: string | null;
  detailed_status?: string | null;
  admin_approved_at?: string | null;
  payment_link?: string | null;
  payment_received_at?: string | null;
  manufacturer_id?: string | null;
  admin_notes?: string | null;
}): {
  label: string;
  color: string;
  showPaymentPending: boolean;
  showPayNow: boolean;
} {
  const orderState = order.order_state || '';
  
  // CRITICAL FIX: PAYMENT_REQUESTED state ALWAYS shows payment button if link exists
  if (orderState === 'PAYMENT_REQUESTED') {
    return {
      label: orderStateLabels[orderState] || 'Payment Required',
      color: orderStateColors[orderState] || 'bg-yellow-100 text-yellow-700',
      showPaymentPending: true,
      showPayNow: !!order.payment_link,
    };
  }
  
  // CRITICAL FIX: If payment_link exists, admin has approved, and payment not received
  // FORCE show payment button regardless of order_state (fallback for state machine issues)
  if (order.payment_link && order.admin_approved_at && !order.payment_received_at) {
    return {
      label: 'Payment Required',
      color: 'bg-yellow-100 text-yellow-700',
      showPaymentPending: true,
      showPayNow: true,
    };
  }
  
  // Use order_state (v2 state machine) if available
  if (orderState && orderStateLabels[orderState]) {
    return {
      label: orderStateLabels[orderState],
      color: orderStateColors[orderState] || 'bg-gray-100 text-gray-700',
      showPaymentPending: false,
      showPayNow: false,
    };
  }
  
  // Legacy fallback using detailed_status
  const status = (order.detailed_status || 'created') as OrderDetailedStatus;
  
  // Check if payment has been received
  if (isPaymentReceived(order)) {
    // After payment, show actual production status
    if (status === 'submitted_to_manufacturer' || status === 'accepted_by_manufacturer') {
      return {
        label: 'Payment Received',
        color: 'bg-green-100 text-green-700',
        showPaymentPending: false,
        showPayNow: false,
      };
    }
  }
  
  // Check if approved and awaiting payment
  if (isApprovedForPayment(order)) {
    return {
      label: 'Approved – Payment Pending',
      color: 'bg-blue-100 text-blue-700',
      showPaymentPending: true,
      showPayNow: true,
    };
  }
  
  // Check if changes have been requested
  if (order.admin_notes && !order.admin_approved_at) {
    return {
      label: 'Changes Requested',
      color: 'bg-orange-100 text-orange-700',
      showPaymentPending: false,
      showPayNow: false,
    };
  }
  
  // Check if awaiting review
  if (isAwaitingReview(order)) {
    return {
      label: 'Submitted for Review',
      color: 'bg-amber-100 text-amber-700',
      showPaymentPending: false,
      showPayNow: false,
    };
  }
  
  return {
    label: buyerStatusLabels[status] || status,
    color: buyerStatusColors[status] || 'bg-gray-100 text-gray-700',
    showPaymentPending: false,
    showPayNow: false,
  };
}
