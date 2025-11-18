import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Video } from "lucide-react";

const UploadQCProof = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [qcVideo, setQcVideo] = useState<File | null>(null);
  const [qcNotes, setQcNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchInProductionOrders();
  }, []);

  const fetchInProductionOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('manufacturer_id', user.id)
        .in('sample_status', ['in_production', 'not_started'])
        .eq('status', 'accepted');

      if (error) throw error;
      setOrders(data || []);
      
      if (!data || data.length === 0) {
        console.log('No orders found for QC upload. Make sure you have accepted orders first.');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load orders");
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate video file
      const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
      const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        toast.error("Please upload a valid video file (MP4, WebM, or MOV)");
        return;
      }

      if (file.size > MAX_VIDEO_SIZE) {
        toast.error("Video file must be less than 100MB");
        return;
      }

      setQcVideo(file);
    }
  };

  const handleUploadQC = async () => {
    if (!selectedOrder || !qcVideo) {
      toast.error("Please select an order and upload a QC video");
      return;
    }

    setUploading(true);
    try {
      // For now, we'll store a mock URL
      // In production, this would upload to Supabase Storage
      const mockVideoUrl = `https://storage.example.com/qc-videos/${Date.now()}.mp4`;

      const { error } = await supabase
        .from('orders')
        .update({
          sample_status: 'qc_uploaded',
          qc_video_url: mockVideoUrl,
          qc_feedback: qcNotes
        })
        .eq('id', selectedOrder);

      if (error) throw error;

      toast.success("QC video uploaded successfully! Buyer will be notified.");
      setSelectedOrder("");
      setQcVideo(null);
      setQcNotes("");
      fetchInProductionOrders();
    } catch (error) {
      console.error('Error uploading QC:', error);
      toast.error("Failed to upload QC video");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="manufacturer" />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Upload QC Proof</h1>
            <p className="text-muted-foreground">Upload quality control videos for sample verification</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Orders Available</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any accepted orders ready for QC upload.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please go to the <a href="/manufacturer/orders" className="text-primary underline">Orders page</a> to accept orders first.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-foreground">Select Order</Label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger className="mt-2 bg-background">
                      <SelectValue placeholder="Choose an order..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          Order {order.id.slice(0, 8)} - {order.product_type} (Qty: {order.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-foreground">QC Video</Label>
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {qcVideo ? (
                          <>
                            <Video className="w-8 h-8 text-green-600 mb-2" />
                            <p className="text-sm text-foreground font-medium">{qcVideo.name}</p>
                            <p className="text-xs text-muted-foreground">{(qcVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload QC video</p>
                            <p className="text-xs text-muted-foreground">MP4, WebM or MOV (max 100MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoChange}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-foreground">QC Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes about the sample quality..."
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                    className="mt-2 min-h-[100px]"
                  />
                </div>

                <Button
                  onClick={handleUploadQC}
                  disabled={uploading || !selectedOrder || !qcVideo}
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                >
                  {uploading ? "Uploading..." : "Upload QC Proof"}
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UploadQCProof;
