// Buyer-specific status labels - hides manufacturer terminology
// and reflects review-based workflow for buyers

import { OrderDetailedStatus } from './orderStateMachine';

/**
 * Buyer-friendly status labels
 * - Replaces "Submitted to Manufacturer" with "Submitted for Review"
 * - Hides manufacturer-related terminology
 */
export const buyerStatusLabels: Record<OrderDetailedStatus, string> = {
  created: 'Draft',
  submitted_to_manufacturer: 'Submitted for Review',
  accepted_by_manufacturer: 'Order Accepted',
  rejected_by_manufacturer: 'Order Declined',
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
 * Check if order is pending payment (admin has enabled payment but not paid yet)
 */
export function isPaymentPending(order: {
  escrow_status?: string | null;
  fake_payment_timestamp?: string | null;
  escrow_locked_timestamp?: string | null;
}): boolean {
  // Payment is pending when escrow is in pending state and no payment has been made
  return order.escrow_status === 'pending' && !order.fake_payment_timestamp;
}

/**
 * Check if order is awaiting review (before admin approval)
 */
export function isAwaitingReview(order: {
  detailed_status?: string | null;
  manufacturer_id?: string | null;
}): boolean {
  const status = order.detailed_status;
  return status === 'submitted_to_manufacturer' && !order.manufacturer_id;
}

/**
 * Get buyer-friendly display status with payment awareness
 */
export function getBuyerDisplayStatus(order: {
  detailed_status?: string | null;
  escrow_status?: string | null;
  fake_payment_timestamp?: string | null;
  escrow_locked_timestamp?: string | null;
  manufacturer_id?: string | null;
}): {
  label: string;
  color: string;
  showPaymentPending: boolean;
} {
  const status = (order.detailed_status || 'created') as OrderDetailedStatus;
  
  // Check if payment is pending (admin enabled payment but buyer hasn't paid)
  if (isPaymentPending(order) && order.manufacturer_id) {
    return {
      label: 'Payment Pending',
      color: 'bg-orange-100 text-orange-700',
      showPaymentPending: true,
    };
  }
  
  return {
    label: buyerStatusLabels[status] || status,
    color: buyerStatusColors[status] || 'bg-gray-100 text-gray-700',
    showPaymentPending: false,
  };
}
