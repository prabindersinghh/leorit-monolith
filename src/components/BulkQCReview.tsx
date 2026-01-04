/**
 * Bulk QC Review Component
 * 
 * Allows buyers to review and approve/reject bulk QC videos.
 * 
 * Enforces:
 * - BULK_QC_UPLOADED required before READY_FOR_DISPATCH
 * - Buyer must Approve or Reject bulk QC
 * - Rejection requires mandatory reason
 * - All actions logged via logOrderEvent
 * 
 * Bulk QC video should show:
 * - Randomly sampled units
 * - Front + back views
 * - Print + stitching quality
 * - Packaging proof (sealed cartons, quantity visible)
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Package, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { trackBulkQCApproved } from "@/lib/analyticsLogger";
import { storeQCDecisionEvidence, storeAdminQCFeedback } from "@/lib/evidenceStorage";
import StructuredQCFeedback from "@/components/StructuredQCFeedback";
import { 
  canApproveBulkQC, 
  canRejectBulkQC, 
  createBulkQCTimestamp,
  createBulkQCActionMetadata,
  BULK_QC_REQUIREMENTS
} from "@/lib/bulkQCWorkflow";

interface BulkQCReviewProps {
  orderId: string;
  onStatusChange?: () => void;
}

const BulkQCReview = ({ orderId, onStatusChange }: BulkQCReviewProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [structuredFeedback, setStructuredFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (isSubmitting) return;
    
    // =====================================================
    // BULK QC WORKFLOW ENFORCEMENT - ADD ONLY
    // Validate approval is allowed before proceeding
    // =====================================================
    const approvalCheck = canApproveBulkQC({
      id: order.id,
      order_state: order.order_state,
      detailed_status: order.detailed_status,
      bulk_qc_video_url: order.bulk_qc_video_url,
      bulk_qc_uploaded_at: order.bulk_qc_uploaded_at,
      order_mode: order.order_mode,
      order_intent: order.order_intent,
      quantity: order.quantity,
    });
    
    if (!approvalCheck.allowed) {
      toast.error(approvalCheck.reason);
      console.error('Bulk QC approval blocked:', approvalCheck.reason);
      return;
    }
    // =====================================================
    // END: BULK QC WORKFLOW ENFORCEMENT
    // =====================================================

    setIsSubmitting(true);
    try {
      const now = createBulkQCTimestamp();
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          bulk_qc_approved_at: now,
          bulk_status: 'qc_approved',
          qc_feedback: 'Bulk QC approved by buyer',
          order_state: 'READY_FOR_DISPATCH',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log bulk QC approved event
      await logOrderEvent(orderId, 'bulk_qc_approved', createBulkQCActionMetadata('bulk_qc_approved', order, {
        approval_timestamp: now,
      }));
      
      // Track bulk QC approved for analytics dashboard
      await trackBulkQCApproved(orderId, order.buyer_id);
      
      // Store evidence for this decision
      await storeQCDecisionEvidence(orderId, order.buyer_id, 'bulk', 'approved');

      toast.success("Bulk QC approved! Order is now ready for dispatch.", { duration: 5000 });
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error approving bulk QC:', error);
      toast.error('Failed to approve bulk QC');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isSubmitting) return;
    
    // =====================================================
    // BULK QC WORKFLOW ENFORCEMENT - ADD ONLY
    // Validate rejection: reason is MANDATORY
    // =====================================================
    const rejectCheck = canRejectBulkQC({
      id: order.id,
      order_state: order.order_state,
      detailed_status: order.detailed_status,
      bulk_qc_video_url: order.bulk_qc_video_url,
      bulk_qc_uploaded_at: order.bulk_qc_uploaded_at,
      order_mode: order.order_mode,
      order_intent: order.order_intent,
      quantity: order.quantity,
    }, rejectReason);
    
    if (!rejectCheck.allowed) {
      toast.error(rejectCheck.reason);
      console.error('Bulk QC rejection blocked:', rejectCheck.reason);
      if (!showRejectForm) {
        setShowRejectForm(true);
      }
      return;
    }
    // =====================================================
    // END: BULK QC WORKFLOW ENFORCEMENT
    // =====================================================

    setIsSubmitting(true);
    try {
      const now = createBulkQCTimestamp();
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          bulk_status: 'qc_rejected',
          qc_feedback: `Bulk QC Rejected: ${rejectReason}`,
          qc_feedback_structured: structuredFeedback || null,
          // Go back to bulk in production for manufacturer to re-do
          order_state: 'BULK_IN_PRODUCTION',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log bulk QC rejected event with reason
      await logOrderEvent(orderId, 'bulk_qc_rejected', createBulkQCActionMetadata('bulk_qc_rejected', order, {
        reason: rejectReason,
        rejection_timestamp: now,
      }));
      
      // Store rejection evidence
      await storeQCDecisionEvidence(orderId, order.buyer_id, 'bulk', 'rejected', rejectReason, structuredFeedback);
      
      // Store admin structured feedback as separate evidence if provided
      if (structuredFeedback) {
        await storeAdminQCFeedback(orderId, order.buyer_id, 'bulk', structuredFeedback);
      }
      
      toast.error("Bulk QC rejected. Manufacturer will be notified to re-upload.");
      setShowRejectForm(false);
      setRejectReason("");
      setStructuredFeedback("");
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error rejecting bulk QC:', error);
      toast.error('Failed to reject bulk QC');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">Order not found</div>;
  }

  const orderState = order.order_state;
  const bulkVideoUrl = order.bulk_qc_video_url;
  
  // Show bulk QC review interface when order_state is BULK_QC_UPLOADED
  const showBulkQCReview = orderState === 'BULK_QC_UPLOADED' && bulkVideoUrl;
  
  // Show approval status if already processed
  const isApproved = order.bulk_qc_approved_at || orderState === 'READY_FOR_DISPATCH' || orderState === 'DISPATCHED' || orderState === 'DELIVERED' || orderState === 'COMPLETED';
  const isRejected = order.bulk_status === 'qc_rejected';

  if (!bulkVideoUrl && !isApproved) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Bulk QC Review</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Waiting for manufacturer to upload bulk QC video...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-foreground">Bulk QC Review</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isApproved ? "bg-green-100 text-green-700" :
          isRejected ? "bg-red-100 text-red-700" :
          orderState === 'BULK_QC_UPLOADED' ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {isApproved ? "Approved" : 
           isRejected ? "Rejected - Awaiting Re-upload" :
           orderState === 'BULK_QC_UPLOADED' ? "Awaiting Review" :
           orderState}
        </div>
      </div>

      {/* QC Requirements Checklist */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium mb-2">Bulk QC should include:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {BULK_QC_REQUIREMENTS.map((req, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {req}
            </li>
          ))}
        </ul>
      </div>

      {showBulkQCReview && bulkVideoUrl ? (
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              controls 
              className="w-full h-full"
              src={bulkVideoUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Quantity info */}
          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Order Quantity:</span>
            <span className="text-lg font-bold">{order.quantity} pieces</span>
          </div>

          {/* Action buttons - only show when order_state is BULK_QC_UPLOADED */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button 
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Processing...' : 'Approve Bulk QC'}
              </Button>
              <Button 
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Bulk QC
              </Button>
            </div>

            {/* Reject form - reason is MANDATORY */}
            {showRejectForm && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                <Label className="text-red-700 font-medium">
                  Rejection Reason (Required) *
                </Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please explain why you are rejecting this bulk QC (minimum 10 characters)..."
                  className="min-h-24 border-red-200 focus:border-red-400"
                />
                <p className="text-xs text-red-600">
                  A detailed reason is mandatory for rejection. This helps the manufacturer understand what needs to be fixed.
                </p>
                
                {/* Structured QC Feedback - for ML labeling */}
                <div className="pt-3 border-t border-red-200">
                  <StructuredQCFeedback
                    value={structuredFeedback}
                    onChange={setStructuredFeedback}
                    isRequired={true}
                    stage="bulk"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleReject} 
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting || rejectReason.trim().length < 10}
                  >
                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                      setStructuredFeedback("");
                    }} 
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isApproved ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <p className="font-medium">Bulk QC Approved</p>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Order is ready for dispatch.
          </p>
          {order.bulk_qc_approved_at && (
            <p className="text-xs text-green-500 mt-2">
              Approved on: {new Date(order.bulk_qc_approved_at).toLocaleString()}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default BulkQCReview;
