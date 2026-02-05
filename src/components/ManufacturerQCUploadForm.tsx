/**
 * Manufacturer QC Upload Form Component
 * 
 * ROLE: Manufacturer uploads QC images/videos as proof of sample completion.
 * RESPONSIBILITY: Upload only - NO approve/reject decisions.
 * 
 * State transition: Order moves to SAMPLE_QC_UPLOADED after submission.
 * Buyer will then review and approve/reject the sample.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Video, Upload, XCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadOrderFile } from "@/lib/orderFileStorage";
import { logOrderEvent } from "@/lib/orderEventLogger";

interface ManufacturerQCUploadFormProps {
  orderId: string;
  stage: 'sample' | 'bulk';
  onUploadComplete: () => void;
}

const ManufacturerQCUploadForm = ({ orderId, stage, onUploadComplete }: ManufacturerQCUploadFormProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setImages(prev => [...prev, ...validFiles]);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid video (MP4, WebM, or MOV)");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video must be less than 100MB");
        return;
      }
      setVideo(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileType = stage === 'bulk' ? 'qc_bulk' : 'qc_sample';
      const uploadedUrls: string[] = [];

      // Upload all images
      for (const image of images) {
        const result = await uploadOrderFile(orderId, fileType, image, 'manufacturer');
        if (result.success && result.fileUrl) {
          uploadedUrls.push(result.fileUrl);
        }
      }

      // Upload video if provided
      if (video) {
        const videoResult = await uploadOrderFile(orderId, fileType, video, 'manufacturer');
        if (videoResult.success && videoResult.fileUrl) {
          uploadedUrls.push(videoResult.fileUrl);
        }

        // Also upload to legacy bucket for backward compatibility
        const fileExt = video.name.split('.').pop();
        const filePath = `${user.id}/${orderId}.${fileExt}`;
        await supabase.storage
          .from('qc-videos')
          .upload(filePath, video, { upsert: true });
      }

      const now = new Date().toISOString();

      // Insert QC record - Manufacturer only uploads, no decision
      const { error: qcError } = await supabase
        .from('order_qc')
        .insert({
          order_id: orderId,
          stage,
          defect_type: null, // Manufacturer does not assess defects
          defect_severity: null,
          decision: 'pending_buyer_review', // Buyer will decide
          reason_code: null,
          reviewer: 'manufacturer',
          reviewer_id: user.id,
          notes: notes || null,
          file_urls: uploadedUrls,
          admin_decision: 'pending',
          created_at: now,
        });

      if (qcError) throw qcError;

      // Update order status - Transition to SAMPLE_QC_UPLOADED
      // UPDATED: Works from PAYMENT_CONFIRMED or SAMPLE_IN_PROGRESS states
      const updateData: Record<string, any> = {
        status: 'qc_uploaded',
        detailed_status: 'qc_uploaded',
        qc_uploaded_at: now,
        updated_at: now,
      };

      if (stage === 'sample') {
        // Sample QC: transition to SAMPLE_QC_UPLOADED
        // This is valid from PAYMENT_CONFIRMED or SAMPLE_IN_PROGRESS
        updateData.order_state = 'SAMPLE_QC_UPLOADED';
        updateData.sample_status = 'qc_uploaded';
        updateData.sample_qc_uploaded_at = now;
        updateData.state_updated_at = now;
      } else {
        // Bulk QC
        updateData.order_state = 'BULK_QC_UPLOADED';
        updateData.bulk_status = 'qc_uploaded';
        updateData.bulk_qc_uploaded_at = now;
        updateData.state_updated_at = now;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Log event
      await logOrderEvent(orderId, 'qc_uploaded', {
        stage,
        file_count: uploadedUrls.length,
        uploaded_by: 'manufacturer',
        awaiting_buyer_review: true,
        timestamp: now,
      });

      // Notify buyer that QC is ready for review
      const { data: orderData } = await supabase
        .from('orders')
        .select('buyer_id, product_type')
        .eq('id', orderId)
        .single();

      if (orderData) {
        await supabase
          .from('notifications')
          .insert({
            user_id: orderData.buyer_id,
            order_id: orderId,
            type: 'qc_ready_for_review',
            title: `${stage === 'sample' ? 'Sample' : 'Bulk'} Ready for Your Review`,
            message: `The manufacturer has uploaded QC proof for your ${orderData.product_type} order. Please review and approve or reject.`,
          });
      }

      toast.success("Sample submitted for buyer review!");
      onUploadComplete();
    } catch (error: any) {
      console.error('Error uploading QC:', error);
      toast.error(error.message || "Failed to upload QC");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {stage === 'sample' ? 'Sample' : 'Bulk'} QC Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-700 dark:text-blue-300">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Upload QC proof for buyer review</p>
            <p className="text-blue-600 dark:text-blue-400 mt-1">
              The buyer will review your images/video and decide whether to approve or request changes.
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            QC Images (Required) *
          </Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((img, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => removeImage(index)}
                >
                  {img.name.substring(0, 20)}...
                  <XCircle className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Upload clear images of the product from multiple angles
          </p>
        </div>

        {/* Video Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            QC Video (Optional)
          </Label>
          <Input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoChange}
          />
          {video && (
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              <Video className="h-3 w-3" />
              {video.name.substring(0, 30)}...
            </Badge>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Additional Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for the buyer about this sample..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isUploading || images.length === 0}
          className="w-full"
        >
          {isUploading ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit Sample For Buyer Review
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          After submission, the buyer will review and approve or request changes.
        </p>
      </CardContent>
    </Card>
  );
};

export default ManufacturerQCUploadForm;
