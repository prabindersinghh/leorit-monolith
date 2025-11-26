import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

interface SizeChartUploadProps {
  orderId: string;
  onSuccess?: (url: string) => void;
}

const SizeChartUpload = ({ orderId, onSuccess }: SizeChartUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${orderId}-${Date.now()}.pdf`;
      const { data, error: uploadError } = await supabase.storage
        .from("design-files")
        .upload(`sizechart/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("design-files")
        .getPublicUrl(`sizechart/${fileName}`);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ size_chart_url: publicUrl })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast.success("Size chart uploaded successfully");
      if (onSuccess) onSuccess(publicUrl);
    } catch (error) {
      console.error("Error uploading size chart:", error);
      toast.error("Failed to upload size chart");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Size Chart (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="size_chart">Upload Size Chart PDF</Label>
          <input
            id="size_chart"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Upload a PDF file containing size measurements
          </p>
        </div>
        {file && (
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Size Chart"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SizeChartUpload;
