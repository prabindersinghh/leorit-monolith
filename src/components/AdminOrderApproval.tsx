/**
 * Admin Order Approval Panel
 * 
 * STRICT STATE MACHINE: 
 * - Approve Order: SUBMITTED → ADMIN_APPROVED (no payment link required)
 * - Payment link is added AFTER manufacturer assignment via AdminPaymentGate
 * - Request Changes: Sends notes to buyer, keeps order in SUBMITTED
 * 
 * STATE TRANSITIONS:
 * - SUBMITTED → ADMIN_APPROVED (this component)
 * - ADMIN_APPROVED → MANUFACTURER_ASSIGNED (CommandCenterActions)
 * - MANUFACTURER_ASSIGNED → PAYMENT_REQUESTED (AdminPaymentGate)
 * - PAYMENT_REQUESTED → PAYMENT_CONFIRMED (AdminPaymentGate)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { logStateChange } from "@/lib/stateChangeLogger";

interface AdminOrderApprovalProps {
  order: any;
  onUpdate: () => void;
}

const AdminOrderApproval = ({ order, onUpdate }: AdminOrderApprovalProps) => {
  const [changeRequestNotes, setChangeRequestNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);

  // STRICT STATE CHECKS - only use order_state as single source of truth
  const orderState = order.order_state || 'SUBMITTED';
  
  // Order is awaiting review only if state is SUBMITTED
  const isAwaitingReview = orderState === 'SUBMITTED';
  
  // Order is approved if state is ADMIN_APPROVED or any later state
  const isAdminApproved = [
    'ADMIN_APPROVED', 
    'MANUFACTURER_ASSIGNED', 
    'PAYMENT_REQUESTED', 
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
  ].includes(orderState);
  
  const hasChangesRequested = order.admin_notes && orderState === 'SUBMITTED';

  /**
   * STRICT RULE: Approve Order ONLY sets order_state from SUBMITTED → ADMIN_APPROVED
   * Payment link is NOT required at this stage
   * Payment link can only be added AFTER manufacturer is assigned (MANUFACTURER_ASSIGNED state)
   */
  const handleApproveOrder = async () => {
    // STRICT VALIDATION: Can only approve if current state is SUBMITTED
    if (orderState !== 'SUBMITTED') {
      toast.error(`Cannot approve: Order must be in SUBMITTED state. Current state: ${orderState}`);
      return;
    }

    setIsApproving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // CRITICAL FIX: Use .select() to get returned data and verify update happened
      const { data, error } = await supabase
        .from('orders')
        .update({
          admin_approved_at: now,
          admin_approved_by: user?.id,
          admin_notes: null, // Clear any previous change request notes
          order_state: 'ADMIN_APPROVED', // STRICT: Only set to ADMIN_APPROVED
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id)
        .select('order_state')
        .single();

      if (error) {
        console.error('[AdminOrderApproval] Update error:', error);
        throw error;
      }

      // Verify the update actually happened
      if (!data || data.order_state !== 'ADMIN_APPROVED') {
        console.error('[AdminOrderApproval] State did not update:', data);
        throw new Error('State update failed - please refresh and try again');
      }

      console.log('[AdminOrderApproval] Successfully updated to ADMIN_APPROVED:', data);

      // Log state change for debugging (use valid actor_role)
      await logStateChange(order.id, 'SUBMITTED', 'ADMIN_APPROVED', user?.id || 'admin', 'admin');

      await logOrderEvent(order.id, 'admin_approved', {
        approved_by: user?.id,
        previous_state: 'SUBMITTED',
        new_state: 'ADMIN_APPROVED',
        timestamp: now,
      });

      toast.success("Order approved! You can now assign a manufacturer.");
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

  // Payment confirmation is now handled in AdminPaymentGate after manufacturer is assigned

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
          {isAdminApproved && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
              Approved
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
        {/* Already Approved */}
        {isAdminApproved && (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              Order Approved
            </div>
            {order.admin_approved_at && (
              <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                Approved at: {new Date(order.admin_approved_at).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Next step: Assign a manufacturer below.
            </p>
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
            {/* Approve Order Section - NO payment link required */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Approve Order
              </h4>
              <p className="text-xs text-muted-foreground">
                Approving will allow manufacturer assignment. Payment link can be added after manufacturer is assigned.
              </p>
              <Button 
                onClick={handleApproveOrder}
                disabled={isApproving}
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
