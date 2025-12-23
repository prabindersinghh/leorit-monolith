/**
 * Centralized constants for order status values.
 * Use these constants instead of hardcoded strings to prevent inconsistent state values.
 */

// ============================================
// Order Intent Constants
// ============================================
// Defines the buyer's intent when placing an order.
// - sample_only: Order ends after sample confirmation
// - sample_then_bulk: Bulk unlocked ONLY after sample approval
// - direct_bulk: Sample is mandatory but bulk intent is already set

export const ORDER_INTENT = {
  SAMPLE_ONLY: 'sample_only',
  SAMPLE_THEN_BULK: 'sample_then_bulk',
  DIRECT_BULK: 'direct_bulk',
} as const;

export type OrderIntent = typeof ORDER_INTENT[keyof typeof ORDER_INTENT];

// ============================================
// Payment Constants
// ============================================
// Defines payment split ratios for order lifecycle
// upfront_payable_amount = UPFRONT_PAYMENT_RATIO * total_order_value
// remaining = (1 - UPFRONT_PAYMENT_RATIO) * total_order_value (released later)

export const PAYMENT_CONSTANTS = {
  UPFRONT_PAYMENT_RATIO: 0.55, // 55% paid upfront
  REMAINING_PAYMENT_RATIO: 0.45, // 45% released after delivery
} as const;

// Sample Status Values
export const SAMPLE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PRODUCTION: 'in_production',
  QC_UPLOADED: 'qc_uploaded',
  QC_SUBMITTED: 'qc_submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELIVERED: 'delivered',
} as const;

export type SampleStatus = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];

// Bulk Status Values
export const BULK_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PRODUCTION: 'in_production',
  QC_PENDING: 'qc_pending',
  QC_APPROVED: 'qc_approved',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  COMPLETED: 'completed',
} as const;

export type BulkStatus = typeof BULK_STATUS[keyof typeof BULK_STATUS];

// QC Status Values
export const QC_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RESUBMIT_REQUIRED: 'resubmit_required',
} as const;

export type QcStatus = typeof QC_STATUS[keyof typeof QC_STATUS];

// Delivery Status Values
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const;

export type DeliveryStatus = typeof DELIVERY_STATUS[keyof typeof DELIVERY_STATUS];

// Payment Status Values
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  ESCROW_LOCKED: 'escrow_locked',
  PARTIAL_RELEASED: 'partial_released',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Order Status (existing legacy status field)
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IN_PRODUCTION: 'in_production',
  QC_UPLOADED: 'qc_uploaded',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// Buyer Type Values
export const BUYER_TYPE = {
  CAMPUS: 'campus',
  BRAND: 'brand',
  FABRIC: 'fabric',
} as const;

export type BuyerType = typeof BUYER_TYPE[keyof typeof BUYER_TYPE];

// Helper function to get display label for status values
export const getStatusLabel = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Status color mappings for UI consistency
export const STATUS_COLORS = {
  // Green variants (success/completed states)
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  released: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  
  // Yellow variants (in-progress states)
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_production: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  
  // Blue variants (info/upload states)
  qc_uploaded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  uploaded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  dispatched: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  escrow_locked: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  
  // Red variants (rejected/failed states)
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  
  // Gray variants (not started/default)
  not_started: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
} as const;

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.not_started;
};
