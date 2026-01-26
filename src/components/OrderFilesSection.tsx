/**
 * Structured Order Files Section
 * 
 * Displays files from the order_files table grouped by type:
 * - Specs (design files, CSVs, etc.)
 * - Sample QC (videos/images from sample QC)
 * - Bulk QC (videos/images from bulk QC)
 * - Delivery (packaging proof, delivery images)
 */

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrderFiles,
  getSignedUrl,
  getFileTypeLabel,
  getFileTypeBadgeColor,
  isImageFile,
  isVideoFile,
  is3DModelFile,
  isDocumentFile,
  OrderFile,
  OrderFileType,
} from "@/lib/orderFileStorage";
import {
  Download,
  Eye,
  FileImage,
  FileVideo,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Package,
  ClipboardCheck,
  Truck,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface OrderFilesSectionProps {
  orderId: string;
  showEmpty?: boolean;
}

interface GroupedFiles {
  spec: OrderFile[];
  qc_sample: OrderFile[];
  qc_bulk: OrderFile[];
  delivery: OrderFile[];
}

const FILE_TYPE_ICONS: Record<OrderFileType, React.ReactNode> = {
  spec: <FolderOpen className="h-4 w-4" />,
  qc_sample: <ClipboardCheck className="h-4 w-4" />,
  qc_bulk: <Package className="h-4 w-4" />,
  delivery: <Truck className="h-4 w-4" />,
};

const FILE_TYPE_TITLES: Record<OrderFileType, string> = {
  spec: "Specifications",
  qc_sample: "Sample QC Files",
  qc_bulk: "Bulk QC Files",
  delivery: "Delivery Proof",
};

interface FileRowProps {
  file: OrderFile;
  signedUrl: string | null;
  downloadUrl: string | null;
  loading: boolean;
}

const FileRow = ({ file, signedUrl, downloadUrl, loading }: FileRowProps) => {
  const isImage = isImageFile(file.file_name);
  const isVideo = isVideoFile(file.file_name);
  const isModel = is3DModelFile(file.file_name);
  const isDoc = isDocumentFile(file.file_name);

  const icon = (() => {
    if (isImage) return <FileImage className="h-4 w-4 text-primary" />;
    if (isVideo) return <FileVideo className="h-4 w-4 text-red-600" />;
    if (isModel) return <FileImage className="h-4 w-4 text-purple-600" />;
    if (file.file_name.toLowerCase().includes('.csv')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  })();

  const displayUrl = signedUrl ?? '';

  if (loading) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 bg-background rounded-md">{icon}</div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{file.file_name}</p>
            <Badge variant="secondary" className={`text-xs ${getFileTypeBadgeColor(file.file_type)}`}>
              {getFileTypeLabel(file.file_type)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>By: {file.uploaded_by}</span>
            {file.created_at && (
              <>
                <span>•</span>
                <span>{format(new Date(file.created_at), "MMM d, yyyy HH:mm")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Preview button for viewable files */}
        {(isImage || isVideo || isDoc) && displayUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1"
            onClick={() => window.open(displayUrl, "_blank")}
            title="View in new tab"
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs">View</span>
          </Button>
        )}

        {/* Download button */}
        {downloadUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1"
            asChild
            title="Download file"
          >
            <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              <span className="text-xs">Download</span>
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

const OrderFilesSection = ({ orderId, showEmpty = false }: OrderFilesSectionProps) => {
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [signingUrls, setSigningUrls] = useState(false);

  // Fetch files from order_files table
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      const orderFiles = await getOrderFiles(orderId);
      setFiles(orderFiles);
      setLoading(false);
    };

    if (orderId) {
      fetchFiles();
    }
  }, [orderId]);

  // Group files by type
  const groupedFiles = useMemo<GroupedFiles>(() => {
    return files.reduce<GroupedFiles>(
      (acc, file) => {
        acc[file.file_type].push(file);
        return acc;
      },
      { spec: [], qc_sample: [], qc_bulk: [], delivery: [] }
    );
  }, [files]);

  // Generate signed URLs for all files
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (files.length === 0) return;
      
      setSigningUrls(true);
      const newSignedUrls: Record<string, string> = {};
      const newDownloadUrls: Record<string, string> = {};

      await Promise.all(
        files.map(async (file) => {
          // Generate view URL
          const viewUrl = await getSignedUrl(file.file_url, 'orders');
          if (viewUrl) newSignedUrls[file.id] = viewUrl;

          // Generate download URL
          const dlUrl = await getSignedUrl(file.file_url, 'orders', { download: true });
          if (dlUrl) newDownloadUrls[file.id] = dlUrl;
        })
      );

      setSignedUrls(newSignedUrls);
      setDownloadUrls(newDownloadUrls);
      setSigningUrls(false);
    };

    generateSignedUrls();
  }, [files]);

  const hasFiles = files.length > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Structured Order Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasFiles && !showEmpty) {
    return null;
  }

  if (!hasFiles && showEmpty) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Structured Order Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">No structured files uploaded yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fileTypeOrder: OrderFileType[] = ['spec', 'qc_sample', 'qc_bulk', 'delivery'];
  const nonEmptyTypes = fileTypeOrder.filter(type => groupedFiles[type].length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Structured Order Files
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Files organized by stage ({files.length} total)
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {nonEmptyTypes.map((fileType, index) => (
          <div key={fileType}>
            {index > 0 && <Separator className="my-4" />}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {FILE_TYPE_ICONS[fileType]}
                <h4 className="text-sm font-semibold">{FILE_TYPE_TITLES[fileType]}</h4>
                <Badge variant="outline" className="text-xs">
                  {groupedFiles[fileType].length}
                </Badge>
              </div>

              <div className="space-y-2">
                {groupedFiles[fileType].map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    signedUrl={signedUrls[file.id] ?? null}
                    downloadUrl={downloadUrls[file.id] ?? null}
                    loading={signingUrls && !signedUrls[file.id]}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default OrderFilesSection;
