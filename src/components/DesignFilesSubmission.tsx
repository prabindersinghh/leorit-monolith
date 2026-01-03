/**
 * Design Files & Order Explanation Section
 * 
 * Mandatory for apparel/merch orders (NOT for fabric-only orders)
 * - At least one design file OR Google Drive link required
 * - Order explanation is mandatory
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Upload, FolderOpen, Info, CheckCircle2 } from "lucide-react";
import UploadBox from "@/components/UploadBox";

interface DesignFilesSubmissionProps {
  designExplanation: string;
  onDesignExplanationChange: (value: string) => void;
  googleDriveLink: string;
  onGoogleDriveLinkChange: (value: string) => void;
  hasDesignFile: boolean;
  hasMockup: boolean;
  onAdditionalFileSelect?: (file: File | null) => void;
}

const DesignFilesSubmission = ({
  designExplanation,
  onDesignExplanationChange,
  googleDriveLink,
  onGoogleDriveLinkChange,
  hasDesignFile,
  hasMockup,
  onAdditionalFileSelect,
}: DesignFilesSubmissionProps) => {
  const [additionalFile, setAdditionalFile] = useState<File | null>(null);
  
  // Check if at least one valid reference exists
  const hasValidReference = hasDesignFile || hasMockup || googleDriveLink.trim().length > 0 || additionalFile !== null;
  
  const handleFileSelect = (file: File | null) => {
    setAdditionalFile(file);
    onAdditionalFileSelect?.(file);
  };

  return (
    <div className="space-y-6 p-6 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Design Files & Order Explanation</h3>
      </div>

      {/* A. Design File Submission */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Design Reference (At least ONE required)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Provide at least one of the following: uploaded design file, mockup image, or Google Drive link
          </p>
        </div>

        {/* Status indicators for existing files */}
        <div className="space-y-2">
          {hasDesignFile && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Front design file uploaded</span>
            </div>
          )}
          {hasMockup && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mockup generated</span>
            </div>
          )}
        </div>

        {/* Additional file upload */}
        {!hasDesignFile && !hasMockup && (
          <UploadBox
            label="Upload Design File (PNG with transparent background preferred)"
            description="PNG, JPG, or PDF up to 10MB"
            accept="image/*,.pdf"
            onFileSelect={handleFileSelect}
          />
        )}

        {/* B. Google Drive Link */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Or Paste Google Drive Link</Label>
          <Input
            type="url"
            value={googleDriveLink}
            onChange={(e) => onGoogleDriveLinkChange(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className="font-mono text-sm"
          />
          
          {/* Drive Instructions */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-2">
              How to share via Google Drive:
            </p>
            <ol className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Create a folder in Google Drive</li>
              <li>Upload all your design files / mockups inside it</li>
              <li>Right-click the folder → "Get link"</li>
              <li>Set access to "Anyone with the link – Viewer"</li>
              <li>Paste the folder link here</li>
            </ol>
            <a 
              href="https://drive.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              Open Google Drive
            </a>
          </div>
        </div>

        {/* Validation status */}
        {!hasValidReference && (
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Please provide at least one design reference (file upload, mockup, or Google Drive link)
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* C. Order Explanation (Mandatory) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Explain Your Order Briefly <span className="text-red-500">*</span>
        </Label>
        <Textarea
          value={designExplanation}
          onChange={(e) => onDesignExplanationChange(e.target.value)}
          placeholder="Describe your design placement (front/back), sizing intent, colors, and any special instructions so our team can verify everything correctly."
          className="min-h-24"
          required
        />
        {designExplanation.trim().length === 0 && (
          <p className="text-xs text-red-500">This field is required</p>
        )}
      </div>

      {/* D. Trust & Safety Note */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-300 text-sm">
          <strong>Why this step?</strong><br />
          This ensures no information is missed while the system is under active development.
          Every order is manually verified by the Leorit.ai team before production begins.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DesignFilesSubmission;
