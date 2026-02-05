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
    
    // Track upload results for rollback awareness
    const uploadedImagePaths: string[] = [];
    let uploadedVideoPath: string | null = null;
    let legacyVideoPath: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileType = stage === 'bulk' ? 'qc_bulk' : 'qc_sample';

      // ========================================
      // STEP 1: Upload ALL images to storage FIRST
      // ========================================
      console.log(`[QC Upload] Starting upload of ${images.length} images...`);
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const timestamp = Date.now();
        const sanitizedName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const imagePath = `${orderId}/${fileType}/${timestamp}_image_${i}_${sanitizedName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('orders')
          .upload(imagePath, image, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`[QC Upload] Image ${i + 1} upload failed:`, uploadError);
          throw new Error(`Failed to upload image ${i + 1}: ${uploadError.message}`);
        }

        if (!uploadData?.path) {
          throw new Error(`Failed to upload image ${i + 1}: No path returned`);
        }

        uploadedImagePaths.push(uploadData.path);
        console.log(`[QC Upload] Image ${i + 1}/${images.length} uploaded: ${uploadData.path}`);
        
        // Track in order_files table
        await supabase.from('order_files').insert({
          order_id: orderId,
          file_type: fileType,
          file_url: uploadData.path,
          file_name: image.name,
          uploaded_by: 'manufacturer',
        });
      }

      // ========================================
      // STEP 2: Upload video to storage (required for QC)
      // ========================================
      if (video) {
        console.log('[QC Upload] Uploading video...');
        const timestamp = Date.now();
        const sanitizedName = video.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const videoPath = `${orderId}/${fileType}/${timestamp}_video_${sanitizedName}`;

        const { data: videoData, error: videoError } = await supabase.storage
          .from('orders')
          .upload(videoPath, video, {
            cacheControl: '3600',
            upsert: false,
          });

        if (videoError) {
          console.error('[QC Upload] Video upload failed:', videoError);
          throw new Error(`Failed to upload video: ${videoError.message}`);
        }

        if (!videoData?.path) {
          throw new Error('Failed to upload video: No path returned');
        }

        uploadedVideoPath = videoData.path;
        console.log(`[QC Upload] Video uploaded: ${videoData.path}`);

        // Track in order_files table
        await supabase.from('order_files').insert({
          order_id: orderId,
          file_type: fileType,
          file_url: videoData.path,
          file_name: video.name,
          uploaded_by: 'manufacturer',
        });

        // Also upload to legacy qc-videos bucket for backward compatibility
        const fileExt = video.name.split('.').pop();
        legacyVideoPath = `${user.id}/${orderId}.${fileExt}`;
        
        const { error: legacyError } = await supabase.storage
          .from('qc-videos')
          .upload(legacyVideoPath, video, { upsert: true });

        if (legacyError) {
          console.warn('[QC Upload] Legacy video upload warning:', legacyError);
          // Non-fatal - continue with main flow
        }
      }

      // ========================================
      // STEP 3: Generate signed URLs for verification
      // ========================================
      console.log('[QC Upload] Generating signed URLs for verification...');
      
      const signedImageUrls: string[] = [];
      for (const imagePath of uploadedImagePaths) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('orders')
          .createSignedUrl(imagePath, 3600);
        
        if (signedError || !signedData?.signedUrl) {
          console.error('[QC Upload] Failed to generate signed URL for image:', imagePath);
          throw new Error('Failed to verify uploaded image - cannot generate access URL');
        }
        signedImageUrls.push(signedData.signedUrl);
      }

      let signedVideoUrl: string | null = null;
      if (uploadedVideoPath) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('orders')
          .createSignedUrl(uploadedVideoPath, 3600);
        
        if (signedError || !signedData?.signedUrl) {
          console.error('[QC Upload] Failed to generate signed URL for video:', uploadedVideoPath);
          throw new Error('Failed to verify uploaded video - cannot generate access URL');
        }
        signedVideoUrl = signedData.signedUrl;
      }

      console.log('[QC Upload] All files verified with signed URLs');

      // ========================================
      // STEP 4: Insert QC record with storage paths
      // ========================================
      const now = new Date().toISOString();

      // Combine all paths for file_urls (storage paths, not signed URLs)
      const allFilePaths = [...uploadedImagePaths];
      if (uploadedVideoPath) {
        allFilePaths.push(uploadedVideoPath);
      }

      const { error: qcError } = await supabase
        .from('order_qc')
        .insert({
          order_id: orderId,
          stage,
          defect_type: null,
          defect_severity: null,
          decision: 'pending_buyer_review',
          reason_code: null,
          reviewer: 'manufacturer',
          reviewer_id: user.id,
          notes: notes || null,
          file_urls: allFilePaths,
          admin_decision: 'pending',
          created_at: now,
        });

      if (qcError) {
        console.error('[QC Upload] Failed to insert QC record:', qcError);
        throw new Error(`Failed to save QC record: ${qcError.message}`);
      }

      console.log('[QC Upload] QC record inserted successfully');

      // ========================================
      // STEP 5: Update order state to SAMPLE_QC_UPLOADED
      // ========================================
      const updateData: Record<string, any> = {
        status: 'qc_uploaded',
        detailed_status: 'qc_uploaded',
        qc_uploaded_at: now,
        qc_files: allFilePaths,
        updated_at: now,
      };

      if (stage === 'sample') {
        updateData.order_state = 'SAMPLE_QC_UPLOADED';
        updateData.sample_status = 'qc_uploaded';
        updateData.sample_qc_uploaded_at = now;
        updateData.sample_qc_video_url = uploadedVideoPath;
        updateData.state_updated_at = now;
      } else {
        updateData.order_state = 'BULK_QC_UPLOADED';
        updateData.bulk_status = 'qc_uploaded';
        updateData.bulk_qc_uploaded_at = now;
        updateData.bulk_qc_video_url = uploadedVideoPath;
        updateData.state_updated_at = now;
      }

      // Use .select() to verify update succeeded
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select('order_state, qc_files')
        .single();

      if (orderError) {
        console.error('[QC Upload] Failed to update order state:', orderError);
        throw new Error(`Failed to update order: ${orderError.message}`);
      }

      if (!updatedOrder || updatedOrder.order_state !== updateData.order_state) {
        console.error('[QC Upload] Order state update verification failed:', updatedOrder);
        throw new Error('Order state update failed - please refresh and try again');
      }

      console.log('[QC Upload] Order state updated successfully:', updatedOrder.order_state);

      // ========================================
      // STEP 6: Log event and notify buyer
      // ========================================
      await logOrderEvent(orderId, 'qc_uploaded', {
        stage,
        image_count: uploadedImagePaths.length,
        has_video: !!uploadedVideoPath,
        image_paths: uploadedImagePaths,
        video_path: uploadedVideoPath,
        uploaded_by: 'manufacturer',
        awaiting_buyer_review: true,
        timestamp: now,
      });

      const { data: orderData } = await supabase
        .from('orders')
        .select('buyer_id, product_type')
        .eq('id', orderId)
        .single();

      if (orderData) {
        await supabase.from('notifications').insert({
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
      console.error('[QC Upload] Error:', error);
      toast.error(error.message || "Failed to upload QC");
      
      // Note: We don't delete uploaded files on failure - they can be reused
      // The order state was never changed, so the upload can be retried
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
