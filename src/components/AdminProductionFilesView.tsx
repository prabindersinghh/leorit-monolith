/**
 * Admin Production Files View
 * 
 * READ-ONLY view of all production-related files for an order.
 * Allows admin to see: designs, CSVs, mockups, buyer notes & attachments.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileImage,
  FileSpreadsheet,
  Eye,
  Download,
  ExternalLink,
  ImageIcon,
  FileText,
  Palette,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";

interface AdminProductionFilesViewProps {
  order: {
    id: string;
    design_file_url?: string | null;
    back_design_url?: string | null;
    corrected_csv_url?: string | null;
    mockup_image?: string | null;
    back_mockup_image?: string | null;
    generated_preview?: string | null;
    google_drive_link?: string | null;
    buyer_notes?: string | null;
    design_explanation?: string | null;
    size_chart_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };
}

interface FileItemProps {
  label: string;
  url: string | null | undefined;
  type: 'image' | 'csv' | 'document' | 'link';
  timestamp?: string | null;
  previewOnly?: boolean;
}

const FileItem = ({ label, url, type, timestamp, previewOnly }: FileItemProps) => {
  if (!url) return null;

  const getIcon = () => {
    switch (type) {
      case 'image':
        return <FileImage className="h-4 w-4 text-primary" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case 'link':
        return <ExternalLink className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getFileName = () => {
    if (type === 'link') return 'External Link';
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const fileName = path.split('/').pop() || label;
      return fileName.length > 30 ? fileName.slice(0, 27) + '...' : fileName;
    } catch {
      return label;
    }
  };

  const getFileType = () => {
    if (type === 'link') return 'LINK';
    if (type === 'csv') return 'CSV';
    const ext = url.split('.').pop()?.toUpperCase() || 'FILE';
    return ext.length > 5 ? 'FILE' : ext;
  };

  const isExternalLink = type === 'link' || url.includes('drive.google.com');

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 bg-background rounded-md">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{label}</p>
            {previewOnly && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Preview Only
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {getFileType()}
            </Badge>
            <span className="truncate">{getFileName()}</span>
          </div>
          {timestamp && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploaded: {format(new Date(timestamp), 'MMM d, yyyy HH:mm')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {type === 'image' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(url, '_blank')}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => window.open(url, '_blank')}
          title={isExternalLink ? "Open Link" : "Download"}
        >
          {isExternalLink ? (
            <ExternalLink className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

const AdminProductionFilesView = ({ order }: AdminProductionFilesViewProps) => {
  const hasDesigns = order.design_file_url || order.back_design_url;
  const hasCSV = order.corrected_csv_url || order.size_chart_url;
  const hasMockups = order.mockup_image || order.back_mockup_image || order.generated_preview;
  const hasBuyerInputs = order.buyer_notes || order.design_explanation || order.google_drive_link;

  const hasAnyFiles = hasDesigns || hasCSV || hasMockups || hasBuyerInputs;

  if (!hasAnyFiles) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Production Files & Buyer Inputs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No production files uploaded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200/50 bg-blue-50/30 dark:border-blue-800/50 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-blue-600" />
          Production Files & Buyer Inputs
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          All files uploaded by buyer for this order (read-only)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* DESIGNS SECTION */}
        {hasDesigns && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                Designs
              </h4>
            </div>
            <div className="space-y-2">
              <FileItem
                label="Front Design"
                url={order.design_file_url}
                type="image"
                timestamp={order.created_at}
              />
              <FileItem
                label="Back Design"
                url={order.back_design_url}
                type="image"
                timestamp={order.created_at}
              />
            </div>
            {!order.back_design_url && order.design_file_url && (
              <p className="text-xs text-muted-foreground italic pl-2">
                Single-design order (front only)
              </p>
            )}
          </div>
        )}

        {hasDesigns && (hasCSV || hasMockups || hasBuyerInputs) && <Separator />}

        {/* CSV DATA SECTION */}
        {hasCSV && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
                CSV Data
              </h4>
            </div>
            <div className="space-y-2">
              <FileItem
                label="Size Distribution CSV"
                url={order.corrected_csv_url}
                type="csv"
                timestamp={order.updated_at}
              />
              <FileItem
                label="Size Chart"
                url={order.size_chart_url}
                type="image"
                timestamp={order.created_at}
              />
            </div>
          </div>
        )}

        {hasCSV && (hasMockups || hasBuyerInputs) && <Separator />}

        {/* MOCKUPS SECTION */}
        {hasMockups && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Mockups
              </h4>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                Preview Only
              </Badge>
            </div>
            <div className="space-y-2">
              <FileItem
                label="Front Mockup"
                url={order.mockup_image}
                type="image"
                timestamp={order.created_at}
                previewOnly
              />
              <FileItem
                label="Back Mockup"
                url={order.back_mockup_image}
                type="image"
                timestamp={order.created_at}
                previewOnly
              />
              <FileItem
                label="AI Generated Preview"
                url={order.generated_preview}
                type="image"
                timestamp={order.created_at}
                previewOnly
              />
            </div>
          </div>
        )}

        {hasMockups && hasBuyerInputs && <Separator />}

        {/* BUYER NOTES & ATTACHMENTS SECTION */}
        {hasBuyerInputs && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Buyer Notes & Attachments
              </h4>
            </div>
            <div className="space-y-3">
              {/* Google Drive Link */}
              <FileItem
                label="Google Drive Folder"
                url={order.google_drive_link}
                type="link"
              />

              {/* Design Explanation */}
              {order.design_explanation && (
                <div className="p-3 bg-background/80 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Order Explanation
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {order.design_explanation}
                  </p>
                </div>
              )}

              {/* Buyer Notes */}
              {order.buyer_notes && (
                <div className="p-3 bg-background/80 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Buyer Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {order.buyer_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminProductionFilesView;
