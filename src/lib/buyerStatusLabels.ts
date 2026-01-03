// Buyer-specific status labels - hides manufacturer terminology
// and reflects review-based workflow for buyers

import { OrderDetailedStatus } from './orderStateMachine';

/**
 * Buyer-friendly status labels
 * - Uses review-based workflow terminology
 * - Hides manufacturer-related terminology
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
 * Buyer-friendly status colors
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
  admin_approved_at?: string | null;
  payment_link?: string | null;
  payment_received_at?: string | null;
}): boolean {
  return !!order.admin_approved_at && !!order.payment_link && !order.payment_received_at;
}

/**
 * Check if payment has been received
 */
export function isPaymentReceived(order: {
  payment_received_at?: string | null;
}): boolean {
  return !!order.payment_received_at;
}

/**
 * Check if order is pending payment (admin has enabled payment but not paid yet)
 */
export function isPaymentPending(order: {
  admin_approved_at?: string | null;
  payment_link?: string | null;
  payment_received_at?: string | null;
}): boolean {
  return isApprovedForPayment(order);
}

/**
 * Check if order is awaiting review (before admin approval)
 */
export function isAwaitingReview(order: {
  detailed_status?: string | null;
  admin_approved_at?: string | null;
}): boolean {
  const status = order.detailed_status;
  return (status === 'submitted_to_manufacturer' || status === 'created') && !order.admin_approved_at;
}

/**
 * Get buyer-friendly display status with payment awareness
 */
export function getBuyerDisplayStatus(order: {
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
