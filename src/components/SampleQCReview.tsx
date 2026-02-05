import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertCircle, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canTransitionTo, getActionLabel, OrderDetailedStatus, isSampleOrder, canStartBulkProduction } from "@/lib/orderStateMachine";
import { getOrderMode, shouldShowStartBulkButton, isBulkQCRequired } from "@/lib/orderModeUtils";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { trackSampleQCApproved } from "@/lib/analyticsLogger";
import { storeQCDecisionEvidence, storeAdminQCFeedback } from "@/lib/evidenceStorage";
import StructuredQCFeedback from "@/components/StructuredQCFeedback";
import { 
  canApproveSample, 
  canRejectSample, 
  canRequestRevision, 
  createQCTimestamp,
  createQCActionMetadata 
} from "@/lib/sampleQCWorkflow";
interface SampleQCReviewProps {
  orderId: string;
  onStatusChange?: () => void;
}

const SampleQCReview = ({ orderId, onStatusChange }: SampleQCReviewProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConcernForm, setShowConcernForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [concernMessage, setConcernMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [structuredFeedback, setStructuredFeedback] = useState("");

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
    const currentStatus = order.detailed_status as OrderDetailedStatus;
    const isSample = isSampleOrder(order.quantity);
    const orderMode = getOrderMode(order);
    const orderIntent = order.order_intent;
    
    // =====================================================
    // SAMPLE QC WORKFLOW ENFORCEMENT - ADD ONLY
    // Validate approval is allowed before proceeding
    // =====================================================
    const approvalCheck = canApproveSample({
      id: order.id,
      order_state: order.order_state,
      detailed_status: order.detailed_status,
      qc_video_url: order.qc_video_url,
      qc_files: order.qc_files,
      sample_qc_video_url: order.sample_qc_video_url,
      sample_approved_at: order.sample_approved_at,
      order_mode: orderMode,
      order_intent: orderIntent,
    });
    
    if (!approvalCheck.allowed) {
      toast.error(approvalCheck.reason);
      console.error('Sample approval blocked:', approvalCheck.reason);
      return;
    }
    // =====================================================
    // END: SAMPLE QC WORKFLOW ENFORCEMENT
    // =====================================================
    
    // First transition to sample_approved_by_buyer
    const newStatus: OrderDetailedStatus = 'sample_approved_by_buyer';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const now = new Date().toISOString();
      
      // STATE TRANSITION: SAMPLE_QC_UPLOADED → SAMPLE_APPROVED
      // Buyer approves the sample after reviewing QC proof
      const { error: approveError } = await supabase
        .from('orders')
        .update({ 
          order_state: 'SAMPLE_APPROVED', // PRIMARY state transition
          detailed_status: 'sample_approved_by_buyer',
          sample_status: 'approved',
          qc_feedback: 'Approved by buyer',
          sample_approved_at: now,
          sample_qc_approved_at: now,
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      if (approveError) throw approveError;

      // Log QC approved event for analytics
      await logOrderEvent(orderId, 'qc_approved', { 
        isSample, 
        escrowAmount: order.escrow_amount, 
        orderIntent, 
        orderMode,
        previous_state: 'SAMPLE_QC_UPLOADED',
        new_state: 'SAMPLE_APPROVED',
        approved_by: 'buyer',
      });
      
      // Track sample QC approved for analytics dashboard
      await trackSampleQCApproved(orderId, order.buyer_id);
      
      // Store evidence for this decision
      await storeQCDecisionEvidence(orderId, order.buyer_id, 'sample', 'approved');

      // Determine next action based on order_mode
      if (orderMode === 'sample_only') {
        // Sample-only flow: Complete the order and release escrow
        const { error: completeError } = await supabase
          .from('orders')
          .update({
            order_state: 'COMPLETED',
            detailed_status: 'sample_completed',
            status: 'completed',
            escrow_status: 'fake_released',
            escrow_released_timestamp: now,
            state_updated_at: now,
          })
          .eq('id', orderId);
          
        if (completeError) throw completeError;
        
        await logOrderEvent(orderId, 'sample_completed', { orderMode, escrowReleased: true });
        toast.success(`Sample order completed! ₹${order.escrow_amount} released from Escrow → Manufacturer Wallet`, { duration: 5000 });
      } else if (orderMode === 'sample_then_bulk') {
        // Sample then bulk flow: Sample approved, unlock bulk production
        // Manufacturer must click "Start Bulk Production" next
        // INVARIANT ENFORCEMENT: Verify bulk production prerequisites
        const bulkCheck = canStartBulkProduction({
          detailed_status: 'sample_approved_by_buyer',
          qc_uploaded_at: order.qc_uploaded_at,
          qc_files: order.qc_files,
          sample_approved_at: now,
          order_intent: orderIntent
        });
        
        if (!bulkCheck.allowed) {
          console.error('Bulk production blocked:', bulkCheck.reason);
          toast.error(bulkCheck.reason || 'Cannot start bulk production');
          fetchOrder();
          onStatusChange?.();
          return;
        }
        
        // Stay at sample_approved_by_buyer - manufacturer needs to explicitly start bulk
        await logOrderEvent(orderId, 'sample_approved_bulk_unlocked', { orderMode, sampleSpecsLocked: true });
        toast.success("Sample approved! Bulk production is now unlocked. Waiting for manufacturer to start.", { duration: 5000 });
      } else if (orderMode === 'direct_bulk') {
        // Direct bulk flow: Bulk production already started
        // Sample approval is informational only, does NOT block bulk
        // Transition to bulk_in_production if not already there
        const { error: bulkError } = await supabase
          .from('orders')
          .update({
            detailed_status: 'bulk_in_production',
            bulk_status: 'in_production',
          })
          .eq('id', orderId);
          
        if (bulkError) throw bulkError;
        
        await logOrderEvent(orderId, 'direct_bulk_sample_approved', { orderMode, bulkContinues: true });
        toast.success("Sample approved! Bulk production continues. Sample was for reference only.", { duration: 5000 });
      } else {
        // Fallback for legacy orders without order_mode - use quantity-based logic
        if (isSample) {
          const { error: completeError } = await supabase
            .from('orders')
            .update({
              detailed_status: 'sample_completed',
              escrow_status: 'fake_released',
              escrow_released_timestamp: now
            })
            .eq('id', orderId);
            
          if (completeError) throw completeError;
          toast.success(`Sample approved! ₹${order.escrow_amount} released from Escrow → Manufacturer Wallet`, { duration: 5000 });
        } else {
          toast.success("Sample approved! You can now proceed to bulk production.");
        }
      }
      
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error approving sample:', error);
      toast.error('Failed to approve sample');
    }
  };

  const handleReject = async () => {
    const currentStatus = order.detailed_status as OrderDetailedStatus;
    const orderMode = getOrderMode(order);
    const orderIntent = order.order_intent;
    
    // =====================================================
    // SAMPLE QC WORKFLOW ENFORCEMENT - ADD ONLY
    // Validate rejection: reason is MANDATORY
    // =====================================================
    const rejectCheck = canRejectSample({
      id: order.id,
      order_state: order.order_state,
      detailed_status: order.detailed_status,
      qc_video_url: order.qc_video_url,
      qc_files: order.qc_files,
      sample_qc_video_url: order.sample_qc_video_url,
      order_mode: orderMode,
      order_intent: orderIntent,
    }, rejectReason);
    
    if (!rejectCheck.allowed) {
      toast.error(rejectCheck.reason);
      console.error('Sample rejection blocked:', rejectCheck.reason);
      // Show the reject form if reason is missing
      if (!showRejectForm) {
        setShowRejectForm(true);
      }
      return;
    }
    // =====================================================
    // END: SAMPLE QC WORKFLOW ENFORCEMENT
    // =====================================================
    
    const newStatus: OrderDetailedStatus = 'sample_rejected_by_buyer';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const now = createQCTimestamp();
      
      // STATE TRANSITION: SAMPLE_QC_UPLOADED → SAMPLE_IN_PROGRESS (for re-work)
      // Buyer rejects the sample, manufacturer needs to redo the sample
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_state: 'SAMPLE_IN_PROGRESS', // Back to production for re-work
          detailed_status: newStatus,
          sample_status: 'rejected',
          qc_feedback: `Rejected: ${rejectReason}`,
          qc_feedback_structured: structuredFeedback || null,
          rejection_reason: rejectReason,
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log rejection event with reason for analytics
      await logOrderEvent(orderId, 'qc_rejected', createQCActionMetadata('sample_rejected', order, {
        reason: rejectReason,
        rejection_timestamp: now,
        previous_state: 'SAMPLE_QC_UPLOADED',
        new_state: 'SAMPLE_IN_PROGRESS',
        rejected_by: 'buyer',
      }));
      
      // Store rejection evidence
      await storeQCDecisionEvidence(orderId, order.buyer_id, 'sample', 'rejected', rejectReason, structuredFeedback);
      
      // Store structured feedback as separate evidence if provided
      if (structuredFeedback) {
        await storeAdminQCFeedback(orderId, order.buyer_id, 'sample', structuredFeedback);
      }
      
      toast.error("Sample rejected. Manufacturer will redo and re-upload QC.");
      setShowRejectForm(false);
      setRejectReason("");
      setStructuredFeedback("");
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error rejecting sample:', error);
      toast.error('Failed to reject sample');
    }
  };

  const handleRevision = async () => {
    const orderMode = getOrderMode(order);
    const orderIntent = order.order_intent;
    
    // =====================================================
    // SAMPLE QC WORKFLOW ENFORCEMENT - ADD ONLY
    // Validate revision request: reason is MANDATORY
    // =====================================================
    const revisionCheck = canRequestRevision({
      id: order.id,
      order_state: order.order_state,
      detailed_status: order.detailed_status,
      qc_video_url: order.qc_video_url,
      qc_files: order.qc_files,
      sample_qc_video_url: order.sample_qc_video_url,
      order_mode: orderMode,
      order_intent: orderIntent,
    }, concernMessage);
    
    if (!revisionCheck.allowed) {
      toast.error(revisionCheck.reason);
      console.error('Revision request blocked:', revisionCheck.reason);
      return;
    }
    // =====================================================
    // END: SAMPLE QC WORKFLOW ENFORCEMENT
    // =====================================================

    try {
      const now = createQCTimestamp();
      
      // STATE TRANSITION: SAMPLE_QC_UPLOADED → SAMPLE_IN_PROGRESS (for revision)
      // Buyer requests revision, manufacturer needs to re-upload
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_state: 'SAMPLE_IN_PROGRESS', // Back to production for revision
          concern_notes: concernMessage,
          qc_feedback: `Revision requested: ${concernMessage}`,
          detailed_status: 'sample_in_production',
          sample_status: 'revision_requested',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log revision request for analytics
      await logOrderEvent(orderId, 'concern_raised', createQCActionMetadata('sample_revision_requested', order, {
        revision_reason: concernMessage,
        revision_timestamp: now,
        previous_state: 'SAMPLE_QC_UPLOADED',
        new_state: 'SAMPLE_IN_PROGRESS',
        requested_by: 'buyer',
      }));
      
      toast.info("Revision requested. Manufacturer will make changes and re-upload.");
      setShowConcernForm(false);
      setConcernMessage("");
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Failed to request revision');
    }
  };

  // handleConcern is now replaced by handleRevision above
  // Keeping for backward compatibility but redirecting to revision flow
  const handleConcern = async () => {
    await handleRevision();
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">Order not found</div>;
  }

  const status = order.detailed_status as OrderDetailedStatus || 'created';
  const videoUrl = order.qc_video_url;
  const qcFiles = order.qc_files || [];
  
  // Show QC review interface when detailed_status is qc_uploaded
  const showQCReview = status === 'qc_uploaded';
  const latestVideo = qcFiles.length > 0 ? qcFiles[qcFiles.length - 1] : videoUrl;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Sample QC Review - {orderId}</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === 'sample_approved_by_buyer' ? "bg-green-100 text-green-700" :
          status === 'sample_rejected_by_buyer' ? "bg-red-100 text-red-700" :
          status === 'qc_uploaded' ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {status === 'qc_uploaded' ? "Awaiting Review" : 
           status === 'sample_approved_by_buyer' ? "Approved" :
           status === 'sample_rejected_by_buyer' ? "Rejected" :
           status}
        </div>
      </div>

      {showQCReview && latestVideo ? (
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              controls 
              className="w-full h-full"
              src={latestVideo}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Show all QC files if multiple */}
          {qcFiles.length > 1 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">All QC Videos ({qcFiles.length})</p>
              <div className="flex flex-wrap gap-2">
                {qcFiles.map((fileUrl: string, index: number) => (
                  <a 
                    key={index}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-background rounded hover:bg-accent"
                  >
                    Video {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Manufacturer notes */}
          {order.qc_feedback && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Manufacturer Notes</p>
              <p className="text-sm text-muted-foreground">{order.qc_feedback}</p>
            </div>
          )}

          {/* Action buttons - only show when detailed_status is qc_uploaded */}
          {status === 'qc_uploaded' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button 
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Sample
                </Button>
                <Button 
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Sample
                </Button>
                <Button 
                  onClick={() => setShowConcernForm(!showConcernForm)}
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Request Revision
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
                    placeholder="Please explain why you are rejecting this sample (minimum 10 characters)..."
                    className="min-h-24 border-red-200 focus:border-red-400"
                  />
                  <p className="text-xs text-red-600">
                    A detailed reason is mandatory for rejection. This helps the manufacturer understand what went wrong.
                  </p>
                  
                  {/* Structured QC Feedback - for ML labeling */}
                  <div className="pt-3 border-t border-red-200">
                    <StructuredQCFeedback
                      value={structuredFeedback}
                      onChange={setStructuredFeedback}
                      isRequired={true}
                      stage="sample"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleReject} 
                      size="sm"
                      variant="destructive"
                      disabled={rejectReason.trim().length < 10}
                    >
                      Confirm Rejection
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                        setStructuredFeedback("");
                      }} 
                      variant="ghost" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Revision request form - reason is MANDATORY */}
              {showConcernForm && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                  <Label className="text-yellow-700 font-medium">
                    What needs to be revised? (Required) *
                  </Label>
                  <Textarea
                    value={concernMessage}
                    onChange={(e) => setConcernMessage(e.target.value)}
                    placeholder="e.g., Color seems slightly off from the mockup, stitching quality needs improvement on sleeves... (minimum 10 characters)"
                    className="min-h-24 border-yellow-200 focus:border-yellow-400"
                  />
                  <p className="text-xs text-yellow-600">
                    A detailed revision request is mandatory. The manufacturer will re-upload QC video after addressing your concerns.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRevision} 
                      size="sm"
                      disabled={concernMessage.trim().length < 10}
                    >
                      Request Revision
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowConcernForm(false);
                        setConcernMessage("");
                      }} 
                      variant="ghost" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
          <div className="text-center">
            <Play className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Waiting for manufacturer to upload QC video
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleQCReview;
