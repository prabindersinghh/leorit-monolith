/**
 * Manufacturer Payment Gate Component
 * 
 * Shows payment status to manufacturer and blocks production until payment confirmed.
 * 
 * STRICT STATE MACHINE:
 * - Manufacturer can SEE order after MANUFACTURER_ASSIGNED
 * - Manufacturer can ACCEPT/REJECT order after MANUFACTURER_ASSIGNED
 * - Manufacturer CANNOT START PRODUCTION until order_state === 'PAYMENT_CONFIRMED'
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle2, CreditCard, Lock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ManufacturerPaymentGateProps {
  order: {
    order_state: string | null;
    payment_state: string | null;
    payment_received_at: string | null;
    manufacturer_id: string | null;
    specs_locked?: boolean | null;
  };
}

const ManufacturerPaymentGate = ({ order }: ManufacturerPaymentGateProps) => {
  const orderState = order.order_state || '';
  
  /**
   * STRICT STATE MACHINE:
   * Production is ONLY enabled when order_state === 'PAYMENT_CONFIRMED' or later states.
   * 
   * States where production is enabled:
   * - PAYMENT_CONFIRMED (just unlocked)
   * - SAMPLE_IN_PROGRESS, SAMPLE_QC_UPLOADED, SAMPLE_APPROVED
   * - BULK_UNLOCKED, BULK_IN_PRODUCTION, BULK_QC_UPLOADED
   * - READY_FOR_DISPATCH, DISPATCHED, DELIVERED, COMPLETED
   */
  const productionEnabledStates = [
    'PAYMENT_CONFIRMED',
    'SAMPLE_IN_PROGRESS', 
    'SAMPLE_QC_UPLOADED', 
    'SAMPLE_APPROVED', 
    'BULK_UNLOCKED', 
    'BULK_IN_PRODUCTION', 
    'BULK_QC_UPLOADED', 
    'READY_FOR_DISPATCH', 
    'DISPATCHED', 
    'DELIVERED', 
    'COMPLETED'
  ];

  const isProductionEnabled = productionEnabledStates.includes(orderState);
  const isPaymentConfirmed = orderState === 'PAYMENT_CONFIRMED';
  const isPaymentRequested = orderState === 'PAYMENT_REQUESTED';
  const isManufacturerAssigned = orderState === 'MANUFACTURER_ASSIGNED';

  // If production is enabled (past payment confirmation), show success at PAYMENT_CONFIRMED only
  if (isProductionEnabled) {
    if (isPaymentConfirmed) {
      return (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Payment Confirmed – Production Enabled</strong>
            <p className="text-sm mt-1">
              Payment has been received. You can now start production.
            </p>
            {!order.specs_locked && (
              <p className="text-sm mt-2 text-amber-600">
                ⚠️ Note: Specs must be locked by admin before starting production.
              </p>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    // For later states, don't show the gate
    return null;
  }

  // Show waiting for payment message for PAYMENT_REQUESTED state
  if (isPaymentRequested) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>Awaiting Buyer Payment</strong>
          <p className="text-sm mt-1">
            Payment has been requested from the buyer. Production will be enabled once payment is confirmed.
          </p>
          <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded flex items-center gap-2">
            <Lock className="h-4 w-4 text-yellow-700" />
            <span className="text-sm font-medium">Production actions are locked</span>
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-yellow-700 border-yellow-300">
              Current State: PAYMENT_REQUESTED
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show manufacturer assigned but payment not yet requested
  if (isManufacturerAssigned) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Order Assigned – Awaiting Payment Process</strong>
          <p className="text-sm mt-1">
            You can review the order details and accept/reject the order. Admin will request payment from buyer.
          </p>
          <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-medium">Production actions will be enabled after payment confirmation</span>
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              Current State: MANUFACTURER_ASSIGNED
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ManufacturerPaymentGate;

/**
 * CRITICAL: Check if manufacturer can start production
 * Production is BLOCKED until order_state === 'PAYMENT_CONFIRMED' (or later production states)
 * This is the SINGLE SOURCE OF TRUTH for production enablement.
 */
export const canManufacturerStartProduction = (order: {
  order_state: string | null;
  payment_state: string | null;
  payment_received_at: string | null;
  specs_locked?: boolean | null;
}): { allowed: boolean; reason?: string } => {
  const orderState = order.order_state || '';
  
  /**
   * STRICT STATE MACHINE:
   * Manufacturer can ONLY start production when order_state is in production-enabled states.
   * 
   * Production-enabled states:
   * - PAYMENT_CONFIRMED (just unlocked, can start)
   * - SAMPLE_IN_PROGRESS through COMPLETED (already in production flow)
   */
  const productionEnabledStates = [
    'PAYMENT_CONFIRMED',
    'SAMPLE_IN_PROGRESS', 
    'SAMPLE_QC_UPLOADED', 
    'SAMPLE_APPROVED', 
    'BULK_UNLOCKED', 
    'BULK_IN_PRODUCTION', 
    'BULK_QC_UPLOADED', 
    'READY_FOR_DISPATCH', 
    'DISPATCHED', 
    'DELIVERED', 
    'COMPLETED'
  ];

  const isProductionEnabled = productionEnabledStates.includes(orderState);

  if (!isProductionEnabled) {
    // Provide specific message based on current state
    if (orderState === 'PAYMENT_REQUESTED') {
      return { 
        allowed: false, 
        reason: "Awaiting buyer payment. Production will be enabled once payment is confirmed." 
      };
    }
    if (orderState === 'MANUFACTURER_ASSIGNED') {
      return { 
        allowed: false, 
        reason: "Awaiting payment request. Admin needs to send payment link to buyer first." 
      };
    }
    if (orderState === 'ADMIN_APPROVED') {
      return { 
        allowed: false, 
        reason: "Order approved but not yet assigned to manufacturer." 
      };
    }
    if (orderState === 'SUBMITTED') {
      return { 
        allowed: false, 
        reason: "Order is awaiting admin approval." 
      };
    }
    return { 
      allowed: false, 
      reason: `Production is locked. Order must be in PAYMENT_CONFIRMED state. Current: ${orderState || 'UNKNOWN'}` 
    };
  }

  return { allowed: true };
};
