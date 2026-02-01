/**
 * Admin Order Approval Panel
 * 
 * Provides controls for:
 * - Approving orders with payment link
 * - Requesting changes with notes
 * - Marking payment as received
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle, XCircle, CreditCard, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";

interface AdminOrderApprovalProps {
  order: any;
  onUpdate: () => void;
}

const AdminOrderApproval = ({ order, onUpdate }: AdminOrderApprovalProps) => {
  const [paymentLink, setPaymentLink] = useState(order.payment_link || "");
  const [changeRequestNotes, setChangeRequestNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const isAwaitingReview = !order.admin_approved_at && !order.admin_notes;
  const isApprovedPendingPayment = order.admin_approved_at && order.payment_link && !order.payment_received_at;
  const isPaymentReceived = !!order.payment_received_at;
  const hasChangesRequested = order.admin_notes && !order.admin_approved_at;

  const handleApproveOrder = async () => {
    if (!paymentLink.trim()) {
      toast.error("Please paste a payment link before approving");
      return;
    }

    // Basic URL validation
    try {
      new URL(paymentLink.trim());
    } catch {
      toast.error("Please enter a valid payment URL");
      return;
    }

    setIsApproving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update({
          admin_approved_at: now,
          admin_approved_by: user?.id,
          payment_link: paymentLink.trim(),
          admin_notes: null, // Clear any previous change request notes
          order_state: 'PAYMENT_REQUESTED', // Critical: Set state so buyer sees payment link
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'admin_approved', {
        approved_by: user?.id,
        payment_link: paymentLink.trim(),
        timestamp: now,
      });

      toast.success("Order approved! Buyer can now proceed to payment.");
      onUpdate();
    } catch (error: any) {
      console.error('Error approving order:', error);
      toast.error(error.message || "Failed to approve order");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestNotes.trim() || changeRequestNotes.trim().length < 10) {
      toast.error("Please provide detailed notes about required changes (min 10 characters)");
      return;
    }

    setIsRequestingChanges(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update({
          admin_notes: changeRequestNotes.trim(),
          admin_approved_at: null, // Clear approval
          payment_link: null, // Clear payment link
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'changes_requested', {
        requested_by: user?.id,
        notes: changeRequestNotes.trim(),
        timestamp: now,
      });

      toast.success("Change request sent to buyer");
      setChangeRequestNotes("");
      onUpdate();
    } catch (error: any) {
      console.error('Error requesting changes:', error);
      toast.error(error.message || "Failed to request changes");
    } finally {
      setIsRequestingChanges(false);
    }
  };

  const handleMarkPaymentReceived = async () => {
    setIsMarkingPaid(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update({
          payment_received_at: now,
          payment_status: 'paid',
          payment_state: 'PAYMENT_HELD',
          escrow_status: 'fake_paid',
          fake_payment_timestamp: now,
          escrow_locked_timestamp: now,
          order_state: 'PAYMENT_CONFIRMED', // Critical: Enables manufacturer production
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'payment_received', {
        marked_by: user?.id,
        timestamp: now,
        payment_link: order.payment_link,
      });

      toast.success("Payment marked as received! Order can now be routed to manufacturer.");
      onUpdate();
    } catch (error: any) {
      console.error('Error marking payment received:', error);
      toast.error(error.message || "Failed to mark payment received");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-5 w-5" />
          Order Approval
          {isAwaitingReview && (
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
              Awaiting Review
            </Badge>
          )}
          {isApprovedPendingPayment && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
              Approved – Payment Pending
            </Badge>
          )}
          {isPaymentReceived && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
              Payment Received
            </Badge>
          )}
          {hasChangesRequested && (
            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
              Changes Requested
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Already Received */}
        {isPaymentReceived && (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              Payment Received
            </div>
            <p className="text-sm text-green-600 dark:text-green-300 mt-1">
              Received at: {new Date(order.payment_received_at).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Order can now be routed to manufacturer for production.
            </p>
          </div>
        )}

        {/* Approved - Pending Payment */}
        {isApprovedPendingPayment && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
                <Clock className="w-5 h-5" />
                Waiting for Buyer Payment
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                Approved at: {new Date(order.admin_approved_at).toLocaleString()}
              </p>
              {order.payment_link && (
                <a 
                  href={order.payment_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Payment Link
                </a>
              )}
            </div>

            <Button 
              onClick={handleMarkPaymentReceived}
              disabled={isMarkingPaid}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isMarkingPaid ? "Processing..." : "Mark Payment as Received"}
            </Button>
          </div>
        )}

        {/* Changes Requested - Show what was requested */}
        {hasChangesRequested && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium">
              <AlertTriangle className="w-5 h-5" />
              Changes Requested
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-2 whitespace-pre-wrap">
              {order.admin_notes}
            </p>
          </div>
        )}

        {/* Awaiting Review - Show approval controls */}
        {(isAwaitingReview || hasChangesRequested) && (
          <>
            {/* Approve Order Section */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Approve Order
              </h4>
              <div className="space-y-2">
                <Label>Razorpay Payment Link</Label>
                <Input
                  type="url"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://rzp.io/l/..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Create a payment link in Razorpay dashboard and paste it here
                </p>
              </div>
              <Button 
                onClick={handleApproveOrder}
                disabled={!paymentLink.trim() || isApproving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isApproving ? "Approving..." : "Approve Order"}
              </Button>
            </div>

            {/* Request Changes Section */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <XCircle className="w-4 h-4 text-orange-600" />
                Request Changes
              </h4>
              <div className="space-y-2">
                <Label>Notes for Buyer</Label>
                <Textarea
                  value={changeRequestNotes}
                  onChange={(e) => setChangeRequestNotes(e.target.value)}
                  placeholder="Explain what changes are needed (e.g., missing design files, unclear specifications)..."
                  className="min-h-20"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    disabled={changeRequestNotes.trim().length < 10 || isRequestingChanges}
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    {isRequestingChanges ? "Sending..." : "Request Changes"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Request Changes from Buyer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <p className="mb-3">The buyer will see this message and be asked to update their order:</p>
                      <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {changeRequestNotes}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRequestChanges} className="bg-orange-600 hover:bg-orange-700">
                      Send Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}

        {/* Order Info Summary */}
        <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID:</span>
            <span className="font-mono">{order.id.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-medium">₹{order.total_order_value?.toLocaleString() || order.total_amount?.toLocaleString() || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Buyer Purpose:</span>
            <span className="capitalize">{order.buyer_purpose?.replace(/_/g, ' ') || 'Not specified'}</span>
          </div>
          {order.design_explanation && (
            <div className="pt-2 border-t border-border">
              <span className="text-muted-foreground block mb-1">Order Explanation:</span>
              <p className="text-foreground whitespace-pre-wrap">{order.design_explanation}</p>
            </div>
          )}
          {order.google_drive_link && (
            <div className="pt-2 border-t border-border">
              <span className="text-muted-foreground block mb-1">Design Files:</span>
              <a 
                href={order.google_drive_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View Google Drive Folder
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminOrderApproval;
