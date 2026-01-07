/**
 * Manufacturer Payment Gate Component
 * 
 * Shows payment status to manufacturer and blocks production until payment confirmed.
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, CreditCard, AlertTriangle } from "lucide-react";

interface ManufacturerPaymentGateProps {
  order: {
    order_state: string | null;
    payment_state: string | null;
    payment_received_at: string | null;
    manufacturer_id: string | null;
  };
}

const ManufacturerPaymentGate = ({ order }: ManufacturerPaymentGateProps) => {
  // Check payment status
  const isPaymentConfirmed = order.payment_state === 'PAYMENT_HELD' || !!order.payment_received_at;
  const isPastPaymentConfirmed = ['SAMPLE_IN_PROGRESS', 'SAMPLE_QC_UPLOADED', 'SAMPLE_APPROVED', 'BULK_UNLOCKED', 'BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.order_state || '');
  const isPaymentRequested = order.order_state === 'PAYMENT_REQUESTED';
  const isManufacturerAssigned = order.order_state === 'MANUFACTURER_ASSIGNED';
  const isPaymentState = order.order_state === 'PAYMENT_CONFIRMED';

  // If payment is already confirmed or we're past that stage, don't show the gate
  if (isPaymentConfirmed || isPastPaymentConfirmed || isPaymentState) {
    return null;
  }

  // Show waiting for payment message
  if (isPaymentRequested) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Waiting for payment confirmation</strong>
          <p className="text-sm mt-1">
            Payment has been requested from the buyer. Production will be enabled once payment is confirmed by Leorit.ai.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Show manufacturer assigned but payment not yet requested
  if (isManufacturerAssigned) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Order assigned - Awaiting payment process</strong>
          <p className="text-sm mt-1">
            You can review the order details. Production actions will be available after payment is confirmed.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ManufacturerPaymentGate;

/**
 * Helper to check if manufacturer can start production
 */
export const canManufacturerStartProduction = (order: {
  order_state: string | null;
  payment_state: string | null;
  payment_received_at: string | null;
}): { allowed: boolean; reason?: string } => {
  // Check if payment is confirmed
  const isPaymentConfirmed = 
    order.payment_state === 'PAYMENT_HELD' || 
    order.order_state === 'PAYMENT_CONFIRMED' ||
    !!order.payment_received_at;

  // Or if we're past payment confirmation state
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
  ].includes(order.order_state || '');

  if (isPaymentConfirmed || isPastPaymentState) {
    return { allowed: true };
  }

  return { 
    allowed: false, 
    reason: "Payment has not been confirmed. Please wait for Leorit.ai to confirm payment before starting production." 
  };
};
