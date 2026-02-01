/**
 * Manufacturer Payment Gate Component
 * 
 * Shows payment status to manufacturer and blocks production until payment confirmed.
 * CRITICAL: Manufacturer can SEE order after MANUFACTURER_ASSIGNED but
 * CANNOT START PRODUCTION until PAYMENT_CONFIRMED
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle2, CreditCard, Lock, AlertTriangle } from "lucide-react";

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
  
  // Check if payment is confirmed (production can start)
  const isPaymentConfirmed = 
    orderState === 'PAYMENT_CONFIRMED' ||
    order.payment_state === 'PAYMENT_HELD' || 
    !!order.payment_received_at;

  // Check if we're in a production-enabled state
  const isPastPaymentConfirmed = [
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
  ].includes(orderState);

  // If payment confirmed or past that stage, show success or nothing
  if (isPaymentConfirmed || isPastPaymentConfirmed) {
    // Only show message at PAYMENT_CONFIRMED stage
    if (orderState === 'PAYMENT_CONFIRMED') {
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
    return null;
  }

  // Show waiting for payment message for PAYMENT_REQUESTED state
  if (orderState === 'PAYMENT_REQUESTED') {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>Awaiting Buyer Payment</strong>
          <p className="text-sm mt-1">
            Payment has been requested from the buyer. Production will be enabled once payment is confirmed by Leorit.ai.
          </p>
          <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded flex items-center gap-2">
            <Lock className="h-4 w-4 text-yellow-700" />
            <span className="text-sm font-medium">Production actions are locked</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show manufacturer assigned but payment not yet requested
  if (orderState === 'MANUFACTURER_ASSIGNED') {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Order Assigned – Awaiting Payment Process</strong>
          <p className="text-sm mt-1">
            You can review the order details. Admin will request payment from buyer.
          </p>
          <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-700" />
            <span className="text-sm font-medium">Production actions will be enabled after payment confirmation</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ManufacturerPaymentGate;

/**
 * Helper to check if manufacturer can start production
 * CRITICAL: Production is BLOCKED until PAYMENT_CONFIRMED
 */
export const canManufacturerStartProduction = (order: {
  order_state: string | null;
  payment_state: string | null;
  payment_received_at: string | null;
  specs_locked?: boolean | null;
}): { allowed: boolean; reason?: string } => {
  const orderState = order.order_state || '';
  
  // Must have payment confirmed
  const isPaymentConfirmed = 
    orderState === 'PAYMENT_CONFIRMED' ||
    order.payment_state === 'PAYMENT_HELD' || 
    !!order.payment_received_at;

  // Or be past payment confirmation state
  const isPastPaymentState = [
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
  ].includes(orderState);

  if (!isPaymentConfirmed && !isPastPaymentState) {
    return { 
      allowed: false, 
      reason: "Payment has not been confirmed. Please wait for Leorit.ai to confirm payment before starting production." 
    };
  }

  // Check if specs are locked (production gate)
  if (order.specs_locked === false) {
    return {
      allowed: false,
      reason: "Specs must be locked by admin before production can start. Please wait for admin to lock specifications."
    };
  }

  return { allowed: true };
};
