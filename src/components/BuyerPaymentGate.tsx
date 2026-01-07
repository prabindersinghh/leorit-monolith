/**
 * Buyer Payment Gate Component
 * 
 * Shows payment request status to buyer
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface BuyerPaymentGateProps {
  order: {
    order_state: string | null;
    payment_state: string | null;
    payment_link: string | null;
    payment_received_at: string | null;
    total_order_value: number | null;
  };
}

const BuyerPaymentGate = ({ order }: BuyerPaymentGateProps) => {
  const isPaymentRequested = order.order_state === 'PAYMENT_REQUESTED';
  const isPaymentConfirmed = order.order_state === 'PAYMENT_CONFIRMED' || order.payment_state === 'PAYMENT_HELD' || !!order.payment_received_at;
  const isPastPaymentConfirmed = ['SAMPLE_IN_PROGRESS', 'SAMPLE_QC_UPLOADED', 'SAMPLE_APPROVED', 'BULK_UNLOCKED', 'BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.order_state || '');

  // Payment requested - show pay now
  if (isPaymentRequested && order.payment_link) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <CreditCard className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Payment requested by Leorit.ai</strong>
              {order.total_order_value && (
                <p className="text-sm mt-1">Amount: ₹{order.total_order_value.toLocaleString()}</p>
              )}
            </div>
            <Button
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={() => window.open(order.payment_link!, '_blank')}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Payment confirmed
  if (isPaymentConfirmed || isPastPaymentConfirmed) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Payment Received!</strong>
          {order.payment_received_at && (
            <span className="text-sm ml-2">
              on {format(new Date(order.payment_received_at), "dd MMM yyyy")}
            </span>
          )}
          <p className="text-sm mt-1">Your order is now being processed.</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Waiting for payment to be requested (manufacturer assigned but no payment yet)
  if (order.order_state === 'MANUFACTURER_ASSIGNED') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Manufacturer Assigned</strong>
          <p className="text-sm mt-1">
            A manufacturer has been assigned to your order. Payment details will be shared soon.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default BuyerPaymentGate;
