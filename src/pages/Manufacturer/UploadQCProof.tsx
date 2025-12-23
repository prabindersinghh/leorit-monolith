import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Video, Info } from "lucide-react";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { getOrderMode, getManufacturerQCUploadType } from "@/lib/orderModeUtils";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload video to Supabase Storage
      const fileExt = qcVideo.name.split('.').pop();
      const filePath = `${user.id}/${selectedOrder}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('qc-videos')
        .upload(filePath, qcVideo, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('qc-videos')
        .getPublicUrl(filePath);

      // Get existing qc_files array
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('qc_files')
        .eq('id', selectedOrder)
        .single();

      const existingFiles = existingOrder?.qc_files || [];

      // Update order with video URL, add to qc_files array, and set status to qc_uploaded
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'qc_uploaded',
          detailed_status: 'qc_uploaded',
          sample_status: 'qc_uploaded',
          qc_video_url: publicUrl,
          qc_files: [...existingFiles, publicUrl],
          qc_feedback: qcNotes,
          qc_uploaded_at: now, // Track QC upload timestamp
          sample_qc_uploaded_at: now // Analytics timestamp for sample QC upload
        })
        .eq('id', selectedOrder);

      if (updateError) throw updateError;

      // Log QC upload event for analytics with evidence metadata
      await logOrderEvent(selectedOrder, 'qc_uploaded', { 
        url: publicUrl, 
        uploaded_by: 'manufacturer' 
      });

      // Get order details to notify buyer
      const { data: orderData } = await supabase
        .from('orders')
        .select('buyer_id, product_type')
        .eq('id', selectedOrder)
        .single();

      if (orderData) {
        // Create notification for buyer
        await supabase
          .from('notifications')
          .insert({
            user_id: orderData.buyer_id,
            order_id: selectedOrder,
            type: 'qc_uploaded',
            title: 'QC Video Uploaded',
            message: `Quality control video for your ${orderData.product_type} order is ready for review.`
          });
      }

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
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="manufacturer" />
      
      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
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
                      {orders.map((order) => {
                        const orderMode = getOrderMode(order);
                        const qcType = getManufacturerQCUploadType(order);
                        const modeLabel = orderMode === 'sample_only' ? '(Sample Only)' : 
                                         orderMode === 'direct_bulk' ? '(Direct Bulk)' : 
                                         '(Sample → Bulk)';
                        return (
                          <SelectItem key={order.id} value={order.id}>
                            Order {order.id.slice(0, 8)} - {order.product_type} (Qty: {order.quantity}) {modeLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Order mode-specific guidance */}
                {selectedOrder && (() => {
                  const selectedOrderData = orders.find(o => o.id === selectedOrder);
                  if (!selectedOrderData) return null;
                  
                  const orderMode = getOrderMode(selectedOrderData);
                  const qcType = getManufacturerQCUploadType(selectedOrderData);
                  
                  return (
                    <div className="p-3 rounded-lg border flex items-start gap-2 text-sm bg-muted/50">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        {orderMode === 'sample_only' && (
                          <p><strong>Sample-only order:</strong> Upload the sample QC video. This order ends after buyer approval - no bulk production.</p>
                        )}
                        {orderMode === 'sample_then_bulk' && qcType === 'sample' && (
                          <p><strong>Sample → Bulk order:</strong> Upload sample QC video. After buyer approval, you'll upload a separate bulk QC video.</p>
                        )}
                        {orderMode === 'sample_then_bulk' && qcType === 'bulk' && (
                          <p><strong>Bulk QC required:</strong> Sample was approved. Now upload the bulk production QC video.</p>
                        )}
                        {orderMode === 'direct_bulk' && qcType === 'sample' && (
                          <p><strong>Direct bulk order:</strong> Sample QC is optional and informational. Bulk production continues regardless.</p>
                        )}
                        {orderMode === 'direct_bulk' && qcType === 'bulk' && (
                          <p><strong>Bulk QC required:</strong> Upload the bulk production QC video. This is mandatory for order completion.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
