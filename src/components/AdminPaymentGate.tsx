/**
 * Admin Payment Gate Component
 * 
 * Allows admin to:
 * - Request payment from buyer (after manufacturer assigned)
 * - View payment status
 * - Mark payment as confirmed
 * 
 * Enforces: MANUFACTURER_ASSIGNED → PAYMENT_REQUESTED → PAYMENT_CONFIRMED
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreditCard, Clock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { logStateChange, validateStateTransition } from "@/lib/stateChangeLogger";
import { format } from "date-fns";

interface AdminPaymentGateProps {
  order: {
    id: string;
    order_state: string | null;
    payment_state: string | null;
    payment_link: string | null;
    payment_received_at: string | null;
    manufacturer_id: string | null;
    total_order_value: number | null;
    admin_approved_at: string | null;
  };
  onUpdate: () => void;
}

const AdminPaymentGate = ({ order, onUpdate }: AdminPaymentGateProps) => {
  const [paymentLink, setPaymentLink] = useState(order.payment_link || "");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const orderState = order.order_state || '';
  
  /**
   * STRICT STATE MACHINE:
   * - Payment link can ONLY be added when order_state === 'MANUFACTURER_ASSIGNED'
   * - Payment can ONLY be confirmed when order_state === 'PAYMENT_REQUESTED'
   * 
   * This is the SINGLE SOURCE OF TRUTH for payment flow gating.
   */
  const isManufacturerAssigned = orderState === 'MANUFACTURER_ASSIGNED';
  const isPaymentRequested = orderState === 'PAYMENT_REQUESTED';
  const isPaymentConfirmed = orderState === 'PAYMENT_CONFIRMED';
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

  // STRICT: Can request payment ONLY when order_state === 'MANUFACTURER_ASSIGNED'
  const canRequestPayment = isManufacturerAssigned && !!order.manufacturer_id;
  
  // STRICT: Can confirm payment ONLY when order_state === 'PAYMENT_REQUESTED'
  const canConfirmPayment = isPaymentRequested;

  const handleRequestPayment = async () => {
    if (!paymentLink.trim()) {
      toast.error("Please enter a payment link");
      return;
    }

    if (!order.manufacturer_id) {
      toast.error("Cannot request payment: No manufacturer assigned");
      return;
    }

    // STRICT VALIDATION: Can only request payment from MANUFACTURER_ASSIGNED state
    if (orderState !== 'MANUFACTURER_ASSIGNED') {
      toast.error(`Cannot request payment: Order must be in MANUFACTURER_ASSIGNED state. Current: ${orderState}`);
      return;
    }

    // Validate state transition
    const validationError = validateStateTransition(orderState, 'PAYMENT_REQUESTED');
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsRequesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // CRITICAL FIX: Use .select() to verify update happened
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_state: 'PAYMENT_REQUESTED',
          payment_link: paymentLink.trim(),
          payment_state: 'PAYMENT_INITIATED',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id)
        .select('order_state, payment_link')
        .single();

      if (error) {
        console.error('[AdminPaymentGate] Request payment error:', error);
        throw error;
      }

      // Verify the update actually happened
      if (!data || data.order_state !== 'PAYMENT_REQUESTED') {
        console.error('[AdminPaymentGate] State did not update:', data);
        throw new Error('Payment request failed - please refresh and try again');
      }

      console.log('[AdminPaymentGate] Successfully updated to PAYMENT_REQUESTED:', data);

      // Log state change (use valid actor_role)
      await logStateChange(order.id, 'MANUFACTURER_ASSIGNED', 'PAYMENT_REQUESTED', user?.id || 'admin', 'admin');

      await logOrderEvent(order.id, 'payment_requested', {
        payment_link: paymentLink.trim(),
        requested_by: 'admin',
        previous_state: 'MANUFACTURER_ASSIGNED',
        new_state: 'PAYMENT_REQUESTED',
        total_value: order.total_order_value,
        timestamp: now,
      });

      toast.success("Payment requested → Buyer can now see payment link");
      onUpdate();
    } catch (error: any) {
      console.error('Error requesting payment:', error);
      toast.error(error.message || "Failed to request payment");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleConfirmPayment = async () => {
    // STRICT VALIDATION: Can only confirm payment from PAYMENT_REQUESTED state
    if (orderState !== 'PAYMENT_REQUESTED') {
      toast.error(`Cannot confirm payment: Order must be in PAYMENT_REQUESTED state. Current: ${orderState}`);
      return;
    }

    // Validate state transition
    const validationError = validateStateTransition(orderState, 'PAYMENT_CONFIRMED');
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // CRITICAL FIX: Use .select() to verify update happened
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_state: 'PAYMENT_CONFIRMED',
          payment_state: 'PAYMENT_HELD',
          payment_received_at: now,
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id)
        .select('order_state, payment_received_at')
        .single();

      if (error) {
        console.error('[AdminPaymentGate] Confirm payment error:', error);
        throw error;
      }

      // Verify the update actually happened
      if (!data || data.order_state !== 'PAYMENT_CONFIRMED') {
        console.error('[AdminPaymentGate] State did not update:', data);
        throw new Error('Payment confirmation failed - please refresh and try again');
      }

      console.log('[AdminPaymentGate] Successfully updated to PAYMENT_CONFIRMED:', data);

      // Log state change (use valid actor_role)
      await logStateChange(order.id, 'PAYMENT_REQUESTED', 'PAYMENT_CONFIRMED', user?.id || 'admin', 'admin');

      await logOrderEvent(order.id, 'payment_confirmed', {
        confirmed_by: 'admin',
        previous_state: 'PAYMENT_REQUESTED',
        new_state: 'PAYMENT_CONFIRMED',
        payment_state: 'PAYMENT_HELD',
        timestamp: now,
      });

      toast.success("Payment confirmed → Manufacturer can now start production");
      onUpdate();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast.error(error.message || "Failed to confirm payment");
    } finally {
      setIsConfirming(false);
    }
  };

  // Get status color
  const getStatusBadge = () => {
    if (isPaymentConfirmed || isPastPaymentConfirmed) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Payment Confirmed</Badge>;
    }
    if (isPaymentRequested) {
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Awaiting Payment</Badge>;
    }
    if (isManufacturerAssigned) {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Ready to Request Payment</Badge>;
    }
    return <Badge variant="outline">Assign Manufacturer First</Badge>;
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-yellow-600" />
            Payment Gate
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pre-requisites check */}
        {!order.manufacturer_id && (
          <Alert className="border-gray-200 bg-gray-50">
            <AlertTriangle className="h-4 w-4 text-gray-500" />
            <AlertDescription className="text-gray-600 text-sm">
              Assign a manufacturer before requesting payment.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment amount display */}
        {order.total_order_value && (
          <div className="p-3 bg-background rounded-lg border">
            <p className="text-xs text-muted-foreground">Total Order Value</p>
            <p className="text-xl font-bold">₹{order.total_order_value.toLocaleString()}</p>
          </div>
        )}

        {/* Request Payment Section */}
        {canRequestPayment && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Payment Link (manual)</Label>
              <Input
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://razorpay.com/pay/..."
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Generate payment link in Razorpay/Stripe and paste here
              </p>
            </div>
            <Button
              size="sm"
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              onClick={handleRequestPayment}
              disabled={!paymentLink.trim() || isRequesting}
            >
              {isRequesting ? "Requesting..." : "Request Payment"}
            </Button>
          </div>
        )}

        {/* Payment Requested - Awaiting Confirmation */}
        {canConfirmPayment && (
          <div className="space-y-3">
            <Alert className="border-yellow-200 bg-yellow-100/50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-sm">
                Payment has been requested. Waiting for buyer to complete payment.
              </AlertDescription>
            </Alert>

            {order.payment_link && (
              <div className="p-2 bg-background rounded border">
                <p className="text-xs text-muted-foreground">Payment Link</p>
                <a 
                  href={order.payment_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Payment Link
                </a>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Payment Received
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Payment Received</AlertDialogTitle>
                  <AlertDialogDescription>
                    By confirming, you're verifying that payment of ₹{order.total_order_value?.toLocaleString() || '—'} has been received.
                    <br /><br />
                    <strong>This will:</strong>
                    <ul className="list-disc list-inside mt-2">
                      <li>Update order state to PAYMENT_CONFIRMED</li>
                      <li>Set payment_state to PAYMENT_HELD</li>
                      <li>Enable manufacturer to start production</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleConfirmPayment}
                    disabled={isConfirming}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isConfirming ? "Confirming..." : "Confirm Payment"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Payment Confirmed */}
        {(isPaymentConfirmed || isPastPaymentConfirmed) && (
          <div className="space-y-2">
            <Alert className="border-green-200 bg-green-100/50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 text-sm">
                <strong>Payment Confirmed</strong>
                {order.payment_received_at && (
                  <span className="block text-xs mt-1">
                    at {format(new Date(order.payment_received_at), "dd MMM yyyy, HH:mm")}
                  </span>
                )}
              </AlertDescription>
            </Alert>
            <p className="text-xs text-muted-foreground">
              Manufacturer can now start production.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPaymentGate;
