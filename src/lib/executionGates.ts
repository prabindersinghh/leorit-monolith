/**
 * Execution Gates
 * 
 * Enforces strict workflow rules:
 * - No production without specs locked
 * - No delivery without QC uploaded
 * - No payment release without admin QC approval
 */

import { supabase } from "@/integrations/supabase/client";

export interface OrderGateContext {
  id: string;
  order_state: string | null;
  specs_locked: boolean | null;
  admin_qc_approved: boolean | null;
  sample_qc_uploaded_at: string | null;
  bulk_qc_uploaded_at: string | null;
  sample_approved_at: string | null;
  bulk_qc_approved_at: string | null;
  order_mode: string | null;
}

export interface GateCheckResult {
  allowed: boolean;
  reason?: string;
  gate?: string;
}

/**
 * Check if production can start
 * Production is blocked if specs are not locked
 */
export function canStartProduction(order: OrderGateContext): GateCheckResult {
  if (!order.specs_locked) {
    return {
      allowed: false,
      reason: "Specs must be locked by admin before production can start.",
      gate: 'specs_locked',
    };
  }

  return { allowed: true };
}

/**
 * Check if delivery can proceed
 * Delivery is blocked if:
 * - QC is not uploaded
 * - Admin has not approved QC
 */
export function canProceedToDelivery(order: OrderGateContext): GateCheckResult {
  // Check if QC is uploaded based on order mode
  const isBulkStage = ['BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED', 'READY_FOR_DISPATCH'].includes(order.order_state || '');
  
  if (isBulkStage) {
    if (!order.bulk_qc_uploaded_at) {
      return {
        allowed: false,
        reason: "Bulk QC must be uploaded before delivery can proceed.",
        gate: 'bulk_qc_uploaded',
      };
    }
  } else {
    if (!order.sample_qc_uploaded_at) {
      return {
        allowed: false,
        reason: "Sample QC must be uploaded before delivery can proceed.",
        gate: 'sample_qc_uploaded',
      };
    }
  }

  // Check admin QC approval
  if (!order.admin_qc_approved) {
    return {
      allowed: false,
      reason: "Admin must approve QC before delivery can proceed.",
      gate: 'admin_qc_approved',
    };
  }

  return { allowed: true };
}

/**
 * Check if payment can be released
 * Payment release is blocked if:
 * - Admin has not approved QC
 * - Order is not delivered/completed
 */
export function canReleasePayment(order: OrderGateContext): GateCheckResult {
  if (!order.admin_qc_approved) {
    return {
      allowed: false,
      reason: "Admin must approve QC before payment can be released.",
      gate: 'admin_qc_approved',
    };
  }

  // Check if order is in deliverable state
  const deliverableStates = ['READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'];
  if (!deliverableStates.includes(order.order_state || '')) {
    return {
      allowed: false,
      reason: "Order must be in a deliverable state before payment can be released.",
      gate: 'order_state',
    };
  }

  return { allowed: true };
}

/**
 * Check all gates for an order
 */
export function checkAllGates(order: OrderGateContext): {
  production: GateCheckResult;
  delivery: GateCheckResult;
  payment: GateCheckResult;
} {
  return {
    production: canStartProduction(order),
    delivery: canProceedToDelivery(order),
    payment: canReleasePayment(order),
  };
}

/**
 * Fetch order with gate-relevant fields
 */
export async function fetchOrderForGateCheck(orderId: string): Promise<OrderGateContext | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_state,
      specs_locked,
      admin_qc_approved,
      sample_qc_uploaded_at,
      bulk_qc_uploaded_at,
      sample_approved_at,
      bulk_qc_approved_at,
      order_mode
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching order for gate check:', error);
    return null;
  }

  return data;
}

/**
 * Get human-readable gate status
 */
export function getGateStatusLabel(gate: string, passed: boolean): string {
  const labels: Record<string, { pass: string; fail: string }> = {
    specs_locked: {
      pass: 'Specs Locked ✓',
      fail: 'Specs Not Locked ✗',
    },
    sample_qc_uploaded: {
      pass: 'Sample QC Uploaded ✓',
      fail: 'Sample QC Not Uploaded ✗',
    },
    bulk_qc_uploaded: {
      pass: 'Bulk QC Uploaded ✓',
      fail: 'Bulk QC Not Uploaded ✗',
    },
    admin_qc_approved: {
      pass: 'Admin QC Approved ✓',
      fail: 'Admin QC Pending ✗',
    },
    order_state: {
      pass: 'Order State Valid ✓',
      fail: 'Order State Invalid ✗',
    },
  };

  return labels[gate]?.[passed ? 'pass' : 'fail'] || gate;
}

/**
 * Get gate icon color class
 */
export function getGateColorClass(passed: boolean): string {
  return passed ? 'text-green-600' : 'text-amber-600';
}
