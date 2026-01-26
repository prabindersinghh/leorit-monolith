/**
 * Manufacturer Packing Action Component
 * 
 * This is the ONLY delivery-related action a manufacturer can perform.
 * They can mark order as "Packed & Ready for Pickup" and must upload
 * a packaging proof video showing sealed cartons.
 * 
 * Admin handles all other delivery actions (courier, tracking, dispatch).
 */

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Upload, CheckCircle2, Video, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { uploadOrderFile } from "@/lib/orderFileStorage";
import {
  canManufacturerMarkPacked,
  validatePackagingVideoUploaded,
  getDeliveryStateLabel,
  getDeliveryStateColor,
  DeliveryState,
} from "@/lib/deliveryStateMachine";

interface ManufacturerPackingActionProps {
  order: {
    id: string;
    order_state?: string | null;
    delivery_status?: string | null;
    packaging_video_url?: string | null;
    packed_at?: string | null;
  };
  onUpdate: () => void;
}

const ManufacturerPackingAction = ({ order, onUpdate }: ManufacturerPackingActionProps) => {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deliveryStatus = (order.delivery_status as DeliveryState) || 'NOT_STARTED';
  const isPacked = deliveryStatus === 'PACKED' || !!order.packed_at;
  const hasPackagingVideo = !!order.packaging_video_url;
  
  // Check if manufacturer can mark as packed
  const canMarkPacked = canManufacturerMarkPacked(order);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file");
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file must be less than 100MB");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleUploadAndMarkPacked = async () => {
    if (!videoFile) {
      toast.error("Please select a packaging video first");
      return;
    }

    // Validate packaging video
    const videoValidation = validatePackagingVideoUploaded(order);
    if (!videoValidation.allowed && !videoFile) {
      toast.error(videoValidation.reason);
      return;
    }

    setSubmitting(true);
    try {
      // Upload video to legacy qc-videos storage (backward compatibility)
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${order.id}/packaging_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qc-videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL from legacy bucket
      const { data: { publicUrl } } = supabase.storage
        .from('qc-videos')
        .getPublicUrl(fileName);

      // Also upload to structured orders bucket for new file tracking
      const structuredUpload = await uploadOrderFile(
        order.id,
        'delivery',
        videoFile,
        'manufacturer'
      );

      if (!structuredUpload.success) {
        console.warn('[ManufacturerPackingAction] Structured upload failed:', structuredUpload.error);
        // Continue anyway - legacy upload succeeded
      }

      const now = new Date().toISOString();

      // Update order with packaging video and delivery status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          packaging_video_url: publicUrl,
          delivery_status: 'PACKED',
          packed_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Log events
      await logOrderEvent(order.id, 'packaging_video_uploaded', {
        packaging_video_url: publicUrl,
        structured_path: structuredUpload.fileUrl,
        actor: 'manufacturer',
        timestamp: now,
      });

      toast.success("Order marked as packed. Admin will schedule pickup.");
      setVideoFile(null);
      setVideoPreview(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error marking order as packed:', error);
      toast.error(error.message || "Failed to mark order as packed");
    } finally {
      setSubmitting(false);
    }
  };

  // If already packed, show status only
  if (isPacked) {
    return (
      <Card className="border-green-500/30 bg-green-50/30 dark:bg-green-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Order Packed
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-500">
            Awaiting admin to schedule pickup and assign courier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Delivery Status:</span>
            <Badge className={getDeliveryStateColor(deliveryStatus)}>
              {getDeliveryStateLabel(deliveryStatus)}
            </Badge>
          </div>
          
          {order.packed_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Packed At:</span>
              <span className="text-sm font-medium">
                {new Date(order.packed_at).toLocaleString()}
              </span>
            </div>
          )}

          {order.packaging_video_url && (
            <div className="pt-3 border-t">
              <Label className="text-xs text-muted-foreground">Packaging Video</Label>
              <video
                src={order.packaging_video_url}
                controls
                className="w-full h-32 mt-2 rounded border bg-muted/50"
              />
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> Leorit admin will assign courier and tracking details.
            You will be notified once pickup is scheduled.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show packing action form
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Mark Order as Packed
        </CardTitle>
        <CardDescription>
          Upload packaging video showing sealed cartons, then mark as ready for pickup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Check if order is in valid state */}
        {!canMarkPacked.allowed && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {canMarkPacked.reason}
            </p>
          </div>
        )}

        {/* Video Upload Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Packaging Proof Video <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Record a video showing sealed cartons with visible quantity. Max 100MB.
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {videoPreview ? (
            <div className="space-y-2">
              <video
                src={videoPreview}
                controls
                className="w-full h-40 rounded border bg-muted/50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
              >
                Remove Video
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-dashed"
              disabled={!canMarkPacked.allowed}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload packaging video
                </span>
              </div>
            </Button>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleUploadAndMarkPacked}
          disabled={!videoFile || submitting || !canMarkPacked.allowed}
          className="w-full"
        >
          {submitting ? (
            "Uploading & Marking as Packed..."
          ) : (
            <>
              <Package className="h-4 w-4 mr-2" />
              Mark as Packed & Ready for Pickup
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Once marked as packed, Leorit admin will schedule pickup and assign courier.
        </p>
      </CardContent>
    </Card>
  );
};

export default ManufacturerPackingAction;
