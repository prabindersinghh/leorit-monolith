import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          sample_status: 'approved',
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
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          sample_status: 'rejected',
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

  const status = order.sample_status || 'pending';
  const videoUrl = order.qc_video_url;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Sample QC Review - {orderId}</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === "approved" ? "bg-green-100 text-green-700" :
          status === "rejected" ? "bg-red-100 text-red-700" :
          status === "concern" ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {status === "pending" ? "Awaiting Review" : 
           status === "approved" ? "Approved" :
           status === "rejected" ? "Rejected" :
           "Concern Raised"}
        </div>
      </div>

      {videoUrl ? (
        <div className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center relative">
            <Play className="w-16 h-16 text-gray-400" />
            <p className="absolute bottom-4 text-sm text-muted-foreground">
              QC Video Preview - Click to play
            </p>
          </div>

          {status === "qc_submitted" && (
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
