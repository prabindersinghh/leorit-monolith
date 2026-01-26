/**
 * Manufacturer QC Upload Form Component
 * 
 * Structured QC upload with defect tracking.
 * Files go to qc_sample or qc_bulk folders.
 * Records stored in order_qc table.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Video, Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadOrderFile } from "@/lib/orderFileStorage";
import { logOrderEvent } from "@/lib/orderEventLogger";

interface ManufacturerQCUploadFormProps {
  orderId: string;
  stage: 'sample' | 'bulk';
  onUploadComplete: () => void;
}

const DEFECT_TYPES = [
  { value: 'none', label: 'None - No Defects' },
  { value: 'print_defect', label: 'Print Defect' },
  { value: 'stitching_defect', label: 'Stitching Defect' },
  { value: 'size_mismatch', label: 'Size Mismatch' },
  { value: 'color_mismatch', label: 'Color Mismatch' },
  { value: 'fabric_issue', label: 'Fabric Issue' },
  { value: 'packaging_issue', label: 'Packaging Issue' },
  { value: 'other', label: 'Other' },
];

const REASON_CODES = [
  { value: 'meets_specs', label: 'Meets all specifications' },
  { value: 'minor_deviation', label: 'Minor deviation within tolerance' },
  { value: 'major_defect', label: 'Major defect found' },
  { value: 'quality_below_standard', label: 'Quality below standard' },
  { value: 'requires_rework', label: 'Requires rework' },
  { value: 'customer_spec_issue', label: 'Customer spec issue' },
];

const ManufacturerQCUploadForm = ({ orderId, stage, onUploadComplete }: ManufacturerQCUploadFormProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [defectType, setDefectType] = useState<string>('none');
  const [defectSeverity, setDefectSeverity] = useState<number>(1);
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [reasonCode, setReasonCode] = useState<string>('meets_specs');
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

      // Insert QC record
      const { error: qcError } = await supabase
        .from('order_qc')
        .insert({
          order_id: orderId,
          stage,
          defect_type: defectType,
          defect_severity: defectType === 'none' ? null : defectSeverity,
          decision,
          reason_code: reasonCode,
          reviewer: 'manufacturer',
          reviewer_id: user.id,
          notes,
          file_urls: uploadedUrls,
          admin_decision: 'pending',
          created_at: now,
        });

      if (qcError) throw qcError;

      // Update order status
      const updateData: any = {
        status: 'qc_uploaded',
        detailed_status: 'qc_uploaded',
        qc_uploaded_at: now,
        updated_at: now,
      };

      if (stage === 'sample') {
        updateData.sample_status = 'qc_uploaded';
        updateData.sample_qc_uploaded_at = now;
      } else {
        updateData.bulk_status = 'qc_uploaded';
        updateData.bulk_qc_uploaded_at = now;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Log event
      await logOrderEvent(orderId, 'qc_uploaded', {
        stage,
        defect_type: defectType,
        decision,
        file_count: uploadedUrls.length,
        uploaded_by: 'manufacturer',
        timestamp: now,
      });

      // Notify buyer
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
            type: 'qc_uploaded',
            title: `${stage === 'sample' ? 'Sample' : 'Bulk'} QC Uploaded`,
            message: `Quality control for your ${orderData.product_type} order is ready for review.`,
          });
      }

      toast.success("QC uploaded successfully! Awaiting admin approval.");
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

        {/* Defect Type */}
        <div className="space-y-2">
          <Label>Defect Type</Label>
          <Select value={defectType} onValueChange={setDefectType}>
            <SelectTrigger>
              <SelectValue placeholder="Select defect type" />
            </SelectTrigger>
            <SelectContent>
              {DEFECT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Defect Severity - only show if defect type is not 'none' */}
        {defectType !== 'none' && (
          <div className="space-y-2">
            <Label>Defect Severity (1-5)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <Button
                  key={level}
                  type="button"
                  variant={defectSeverity === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDefectSeverity(level)}
                  className="w-10"
                >
                  {level}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              1 = Minor cosmetic, 5 = Critical/unusable
            </p>
          </div>
        )}

        {/* Decision */}
        <div className="space-y-3">
          <Label>Your Decision</Label>
          <RadioGroup
            value={decision}
            onValueChange={(value) => setDecision(value as 'approve' | 'reject')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="approve" id="approve" />
              <Label htmlFor="approve" className="flex items-center gap-1 cursor-pointer">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Approve
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reject" id="reject" />
              <Label htmlFor="reject" className="flex items-center gap-1 cursor-pointer">
                <XCircle className="h-4 w-4 text-red-600" />
                Reject
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Reason Code */}
        <div className="space-y-2">
          <Label>Reason Code</Label>
          <Select value={reasonCode} onValueChange={setReasonCode}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {REASON_CODES.map(reason => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional observations or notes..."
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
            <>Uploading QC Data...</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit QC for Admin Approval
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          QC must be approved by admin before delivery can proceed
        </p>
      </CardContent>
    </Card>
  );
};

export default ManufacturerQCUploadForm;
