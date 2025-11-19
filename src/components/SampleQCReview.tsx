import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canTransitionTo, getActionLabel, OrderDetailedStatus } from "@/lib/orderStateMachine";

interface SampleQCReviewProps {
  orderId: string;
  onStatusChange?: () => void;
}

const SampleQCReview = ({ orderId, onStatusChange }: SampleQCReviewProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConcernForm, setShowConcernForm] = useState(false);
  const [concernMessage, setConcernMessage] = useState("");

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
    const newStatus: OrderDetailedStatus = 'sample_approved_by_buyer';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          sample_status: 'approved', // Backward compatibility
          qc_feedback: 'Approved by buyer'
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Sample QC approved! Payment will be released.");
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error approving sample:', error);
      toast.error('Failed to approve sample');
    }
  };

  const handleReject = async () => {
    const currentStatus = order.detailed_status as OrderDetailedStatus;
    const newStatus: OrderDetailedStatus = 'sample_rejected_by_buyer';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          sample_status: 'rejected', // Backward compatibility
          qc_feedback: 'Rejected by buyer'
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.error("Sample QC rejected. Manufacturer will be notified.");
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error rejecting sample:', error);
      toast.error('Failed to reject sample');
    }
  };

  const handleConcern = async () => {
    if (!concernMessage.trim()) {
      toast.error("Please specify your concerns");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          concern_notes: concernMessage,
          qc_feedback: 'Concerns raised by buyer'
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.info("Concern submitted. Manufacturer will review and respond.");
      setShowConcernForm(false);
      setConcernMessage("");
      fetchOrder();
      onStatusChange?.();
    } catch (error) {
      console.error('Error submitting concern:', error);
      toast.error('Failed to submit concern');
    }
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
  
  // Show QC review interface when status is qc_uploaded
  const showQCReview = order.status === 'qc_uploaded' || status === 'qc_uploaded';
  const latestVideo = qcFiles.length > 0 ? qcFiles[qcFiles.length - 1] : videoUrl;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Sample QC Review - {orderId}</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === 'sample_approved_by_buyer' ? "bg-green-100 text-green-700" :
          status === 'sample_rejected_by_buyer' ? "bg-red-100 text-red-700" :
          showQCReview ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {showQCReview && status !== 'sample_approved_by_buyer' && status !== 'sample_rejected_by_buyer' ? "Awaiting Review" : 
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

          {/* Action buttons - only show when QC uploaded and not yet reviewed */}
          {showQCReview && status !== 'sample_approved_by_buyer' && status !== 'sample_rejected_by_buyer' && (
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
                  onClick={handleReject}
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
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Raise Concern
                </Button>
              </div>

              {showConcernForm && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                  <Label>Specify your concerns to the manufacturer</Label>
                  <Textarea
                    value={concernMessage}
                    onChange={(e) => setConcernMessage(e.target.value)}
                    placeholder="e.g., Color seems slightly off from the mockup, stitching quality needs improvement on sleeves..."
                    className="min-h-24"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleConcern} size="sm">
                      Submit Concern
                    </Button>
                    <Button 
                      onClick={() => setShowConcernForm(false)} 
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
