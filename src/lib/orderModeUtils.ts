// Order Mode Utilities - Enforces QC rules based on order_mode
// ADD-ONLY: This file extends existing logic, does not replace anything

export type OrderMode = 'sample_only' | 'sample_then_bulk' | 'direct_bulk';

/**
 * Get order mode from order object, with fallback to order_intent
 * Provides backward compatibility with existing orders
 */
export function getOrderMode(order: {
  order_mode?: OrderMode | null;
  order_intent?: string | null;
  quantity?: number;
}): OrderMode {
  // Prefer explicit order_mode
  if (order.order_mode) {
    return order.order_mode;
  }
  
  // Fallback to order_intent for backward compatibility
  if (order.order_intent === 'sample_only' || order.order_intent === 'sample_then_bulk' || order.order_intent === 'direct_bulk') {
    return order.order_intent as OrderMode;
  }
  
  // Legacy fallback: use quantity-based logic
  if (order.quantity === 1) {
    return 'sample_only';
  }
  
  return 'sample_then_bulk';
}

/**
 * Get informational message for buyer based on order_mode
 */
export function getOrderModeMessage(mode: OrderMode): string {
  switch (mode) {
    case 'sample_only':
      return 'This is a sample-only order. Bulk production will not start.';
    case 'sample_then_bulk':
      return 'Bulk production will start after sample approval.';
    case 'direct_bulk':
      return 'Bulk production has already started. Sample will be delivered for reference only.';
    default:
      return '';
  }
}

/**
 * Check if sample QC is required for this order mode
 */
export function isSampleQCRequired(mode: OrderMode): boolean {
  switch (mode) {
    case 'sample_only':
      return true; // Required and only QC
    case 'sample_then_bulk':
      return true; // Required before bulk unlocks
    case 'direct_bulk':
      return false; // Optional, informational only
    default:
      return true;
  }
}

/**
 * Check if bulk QC is required for this order mode
 */
export function isBulkQCRequired(mode: OrderMode): boolean {
  switch (mode) {
    case 'sample_only':
      return false; // No bulk production
    case 'sample_then_bulk':
      return true; // Required after sample approval
    case 'direct_bulk':
      return true; // Mandatory for completion
    default:
      return true;
  }
}

/**
 * Check if sample approval blocks bulk production for this order mode
 */
export function doesSampleBlockBulk(mode: OrderMode): boolean {
  switch (mode) {
    case 'sample_only':
      return true; // N/A - no bulk
    case 'sample_then_bulk':
      return true; // Sample must be approved before bulk
    case 'direct_bulk':
      return false; // Sample does NOT block bulk
    default:
      return true;
  }
}

/**
 * Check if bulk production can start for this order
 */
export function canBulkProductionStart(order: {
  order_mode?: OrderMode | null;
  order_intent?: string | null;
  quantity?: number;
  sample_approved_at?: string | null;
  qc_uploaded_at?: string | null;
  qc_files?: string[] | null;
}): { allowed: boolean; reason?: string } {
  const mode = getOrderMode(order);
  
  if (mode === 'sample_only') {
    return { allowed: false, reason: 'This is a sample-only order. Bulk production is not available.' };
  }
  
  if (mode === 'direct_bulk') {
    // For direct_bulk, bulk production is already started
    // Sample QC does NOT block bulk
    return { allowed: true };
  }
  
  // sample_then_bulk: requires sample approval
  if (!order.sample_approved_at) {
    return { allowed: false, reason: 'Buyer must approve the sample before bulk production can start.' };
  }
  
  // Also check that sample QC was uploaded
  const hasQC = !!(order.qc_uploaded_at || (order.qc_files && order.qc_files.length > 0));
  if (!hasQC) {
    return { allowed: false, reason: 'Sample QC must be uploaded before bulk production can start.' };
  }
  
  return { allowed: true };
}

/**
 * Check if "Start Bulk Production" button should be shown for this order
 */
export function shouldShowStartBulkButton(order: {
  order_mode?: OrderMode | null;
  order_intent?: string | null;
  quantity?: number;
  detailed_status?: string;
}): boolean {
  const mode = getOrderMode(order);
  
  // Never show for sample_only
  if (mode === 'sample_only') {
    return false;
  }
  
  // For direct_bulk, bulk is already started - don't show button
  if (mode === 'direct_bulk') {
    return false;
  }
  
  // For sample_then_bulk, only show after sample approval
  return order.detailed_status === 'sample_approved_by_buyer';
}

/**
 * Get manufacturer QC upload type based on order mode and current status
 * Returns which type of QC upload is expected/allowed
 * 
 * UPDATED: Allow sample QC upload directly after PAYMENT_CONFIRMED
 * (no production start required)
 */
export function getManufacturerQCUploadType(order: {
  order_mode?: OrderMode | null;
  order_intent?: string | null;
  quantity?: number;
  detailed_status?: string;
  order_state?: string | null;
  sample_approved_at?: string | null;
  sample_qc_uploaded_at?: string | null;
}): 'sample' | 'bulk' | 'none' {
  const mode = getOrderMode(order);
  const status = order.detailed_status || 'created';
  const orderState = order.order_state || '';
  
  // NEW: Check order_state first for staged QC workflow
  // Allow sample QC upload directly after payment confirmation
  if (orderState === 'PAYMENT_CONFIRMED') {
    // After payment, manufacturer can upload sample QC
    return 'sample';
  }
  
  if (orderState === 'SAMPLE_IN_PROGRESS') {
    return 'sample';
  }
  
  if (orderState === 'BULK_IN_PRODUCTION') {
    return 'bulk';
  }
  
  // Legacy status-based checks for backward compatibility
  if (mode === 'sample_only') {
    // Sample-only: only upload sample QC
    if (status === 'sample_in_production' || orderState === 'PAYMENT_CONFIRMED') {
      return 'sample';
    }
    return 'none';
  }
  
  if (mode === 'sample_then_bulk') {
    // Sample then bulk: upload sample QC first, then bulk QC after approval
    if (status === 'sample_in_production') {
      return 'sample';
    }
    if (status === 'bulk_in_production' && order.sample_approved_at) {
      return 'bulk';
    }
    return 'none';
  }
  
  if (mode === 'direct_bulk') {
    // Direct bulk: sample QC is optional, bulk QC is mandatory
    // For direct_bulk, manufacturer can skip sample QC and upload bulk QC directly
    if (status === 'sample_in_production') {
      return 'sample'; // Optional but allowed
    }
    if (status === 'bulk_in_production') {
      return 'bulk';
    }
    return 'none';
  }
  
  return 'none';
}
