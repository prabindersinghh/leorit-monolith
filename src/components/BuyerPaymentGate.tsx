/**
 * Buyer Payment Gate Component
 * 
 * Shows payment request status to buyer with clear messages at each stage.
 * CRITICAL: This component ensures buyer can see payment link when PAYMENT_REQUESTED
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle2, FileCheck, Package, Truck } from "lucide-react";
import { format } from "date-fns";

interface BuyerPaymentGateProps {
  order: {
    order_state: string | null;
    payment_state: string | null;
    payment_link: string | null;
    payment_received_at: string | null;
    total_order_value: number | null;
    admin_approved_at: string | null;
    manufacturer_id: string | null;
    escrow_amount?: number | null;
    total_amount?: number | null;
  };
}

/**
 * Buyer Status Messages - Clear communication at each stage
 */
const ORDER_STATE_MESSAGES: Record<string, { title: string; description: string; icon: 'clock' | 'credit' | 'check' | 'file' | 'package' | 'truck' }> = {
  SUBMITTED: {
    title: "Order Submitted for Review",
    description: "Your order is being reviewed by our team. We'll notify you once it's approved.",
    icon: 'clock',
  },
  ADMIN_APPROVED: {
    title: "Order Approved",
    description: "Your order has been approved. Payment details will be shared shortly.",
    icon: 'file',
  },
  MANUFACTURER_ASSIGNED: {
    title: "Manufacturer Assigned",
    description: "A manufacturer has been assigned to your order. Payment details will be shared soon.",
    icon: 'clock',
  },
  PAYMENT_REQUESTED: {
    title: "Payment Required",
    description: "Payment is required to start production. Click below to complete payment.",
    icon: 'credit',
  },
  PAYMENT_CONFIRMED: {
    title: "Payment Received",
    description: "Your payment has been confirmed. Production will begin shortly.",
    icon: 'check',
  },
  SAMPLE_IN_PROGRESS: {
    title: "Sample in Production",
    description: "Your sample is being produced. We'll notify you when it's ready for review.",
    icon: 'package',
  },
  SAMPLE_QC_UPLOADED: {
    title: "Quality Check Ready",
    description: "Your sample quality check is ready for review.",
    icon: 'file',
  },
  SAMPLE_APPROVED: {
    title: "Sample Approved",
    description: "Your sample has been approved. Bulk production can now begin.",
    icon: 'check',
  },
  BULK_IN_PRODUCTION: {
    title: "Bulk Production in Progress",
    description: "Your bulk order is being produced.",
    icon: 'package',
  },
  BULK_QC_UPLOADED: {
    title: "Bulk Quality Check Ready",
    description: "Your bulk order quality check is ready for review.",
    icon: 'file',
  },
  READY_FOR_DISPATCH: {
    title: "Ready for Dispatch",
    description: "Your order is packed and ready for shipping.",
    icon: 'package',
  },
  DISPATCHED: {
    title: "Order Shipped",
    description: "Your order is on its way!",
    icon: 'truck',
  },
  DELIVERED: {
    title: "Order Delivered",
    description: "Your order has been delivered.",
    icon: 'check',
  },
  COMPLETED: {
    title: "Order Completed",
    description: "Thank you for your order!",
    icon: 'check',
  },
};

const BuyerPaymentGate = ({ order }: BuyerPaymentGateProps) => {
  const orderState = order.order_state || '';
  
  /**
   * STRICT RULE: Show payment section ONLY when:
   * 1. order_state === 'PAYMENT_REQUESTED'
   * 2. payment_link is present
   * 
   * This is the single source of truth for buyer payment visibility.
   */
  const isPaymentRequested = orderState === 'PAYMENT_REQUESTED';
  const hasPaymentLink = !!order.payment_link;
  
  // Show payment section ONLY in PAYMENT_REQUESTED state with a valid link
  const shouldShowPaymentSection = isPaymentRequested && hasPaymentLink;
  
  // Check if payment is confirmed
  const isPaymentConfirmed = orderState === 'PAYMENT_CONFIRMED';
  
  // Check if we're past payment (production has started)
  const isPastPaymentStage = [
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

  // CASE 1: Payment Requested - Show prominent payment button
  // STRICT: Only show when order_state === PAYMENT_REQUESTED
  if (shouldShowPaymentSection) {
    const displayAmount = order.total_order_value || order.escrow_amount || order.total_amount;
    return (
      <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 shadow-md">
        <CreditCard className="h-5 w-5 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <div className="flex flex-col gap-3">
            <div>
              <strong className="text-lg">Payment Required to Start Production</strong>
              <p className="text-sm mt-1">
                Payment requested by Leorit.ai to proceed with production.
              </p>
              {displayAmount && (
                <p className="text-base font-semibold mt-2">
                  Amount: ₹{displayAmount.toLocaleString()}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto"
              onClick={() => window.open(order.payment_link!, '_blank')}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Pay Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // CASE 2: Payment Confirmed - Show success message
  if (isPaymentConfirmed || isPastPaymentStage) {
    // Only show payment confirmation for first time
    if (orderState === 'PAYMENT_CONFIRMED') {
      return (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Payment Received!</strong>
            {order.payment_received_at && (
              <span className="text-sm ml-2">
                on {format(new Date(order.payment_received_at), "dd MMM yyyy")}
              </span>
            )}
            <p className="text-sm mt-1">
              Your payment has been confirmed. Production will begin shortly.
            </p>
          </AlertDescription>
        </Alert>
      );
    }
    
    // For production stages, show the stage-specific message
    const stageInfo = ORDER_STATE_MESSAGES[orderState];
    if (stageInfo) {
      const IconComponent = stageInfo.icon === 'package' ? Package : 
                           stageInfo.icon === 'truck' ? Truck : 
                           stageInfo.icon === 'check' ? CheckCircle2 : 
                           stageInfo.icon === 'file' ? FileCheck : Clock;
      
      return (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <IconComponent className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>{stageInfo.title}</strong>
            <p className="text-sm mt-1">{stageInfo.description}</p>
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // CASE 3: Waiting for approval or manufacturer assignment
  if (orderState === 'SUBMITTED') {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Order Submitted for Review</strong>
          <p className="text-sm mt-1">
            Your order is being reviewed by our team. Payment will be enabled after approval.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // CASE 3: Admin Approved - Waiting for manufacturer assignment
  if (orderState === 'ADMIN_APPROVED') {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Order Approved</strong>
          <p className="text-sm mt-1">
            Your order has been approved. Waiting for manufacturer assignment.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // CASE 4: Manufacturer Assigned - Waiting for payment link
  if (orderState === 'MANUFACTURER_ASSIGNED') {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Manufacturer Assigned</strong>
          <p className="text-sm mt-1">
            A manufacturer has been assigned. Payment details will be shared soon.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default BuyerPaymentGate;
