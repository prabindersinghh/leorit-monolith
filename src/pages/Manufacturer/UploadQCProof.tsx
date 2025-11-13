import Sidebar from "@/components/Sidebar";
import UploadBox from "@/components/UploadBox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const UploadQCProof = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="manufacturer" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Upload QC Proof</h1>
            <p className="text-muted-foreground">Submit quality control video evidence</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 space-y-6">
            <div>
              <Label>Select Order</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ord-101">ORD-101 - T-Shirts (500 units)</SelectItem>
                  <SelectItem value="ord-102">ORD-102 - Hoodies (300 units)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>QC Phase</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample">Sample QC</SelectItem>
                  <SelectItem value="bulk">Bulk Production QC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <UploadBox
              label="QC Video Proof"
              description="MP4, MOV up to 100MB - Show product quality, packaging, labels"
              accept="video/*"
              onFileSelect={setVideoFile}
            />

            {videoFile && (
              <div className="p-6 bg-gray-50 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-3">AI Analysis Preview</h3>
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-gray-500">Video will be analyzed here</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">✓ Quality check pending</p>
                  <p className="text-muted-foreground">✓ CLIP similarity analysis will run</p>
                </div>
              </div>
            )}

            <Button className="w-full bg-foreground text-background hover:bg-gray-800" disabled={!videoFile}>
              Submit QC Proof
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UploadQCProof;
