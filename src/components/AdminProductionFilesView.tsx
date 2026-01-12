/**
 * Admin Production Files View
 * 
 * READ-ONLY view of all production-related files for an order.
 * Allows admin to see: designs, CSVs, mockups, buyer notes & attachments.
 * 
 * Handles signed URL generation for private storage buckets.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
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
  AlertCircle,
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
  signedUrl?: string | null;
  type: 'image' | 'csv' | 'document' | 'link';
  timestamp?: string | null;
  previewOnly?: boolean;
  loading?: boolean;
}

const FileItem = ({ label, url, signedUrl, type, timestamp, previewOnly, loading }: FileItemProps) => {
  if (!url) return null;

  // Use signed URL if available, otherwise fall back to original URL
  const displayUrl = signedUrl || url;
  const isExternalLink = type === 'link' || url.includes('drive.google.com');

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
      // Handle Supabase storage URLs
      const pathParts = path.split('/');
      const fileName = pathParts[pathParts.length - 1] || label;
      // Decode URL-encoded characters
      const decodedName = decodeURIComponent(fileName);
      return decodedName.length > 40 ? decodedName.slice(0, 37) + '...' : decodedName;
    } catch {
      return label;
    }
  };

  const getFileType = () => {
    if (type === 'link') return 'LINK';
    if (type === 'csv') return 'CSV';
    try {
      const ext = url.split('.').pop()?.toUpperCase()?.split('?')[0] || 'FILE';
      return ext.length > 5 ? 'FILE' : ext;
    } catch {
      return 'FILE';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 bg-background rounded-md">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{label}</p>
            {previewOnly && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
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
            onClick={() => window.open(displayUrl, '_blank')}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => window.open(displayUrl, '_blank')}
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

// Helper to extract bucket and path from Supabase storage URL
const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  try {
    // Pattern: https://{project}.supabase.co/storage/v1/object/{public|sign}/bucket/path
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (match) {
      return { bucket: match[1], path: decodeURIComponent(match[2].split('?')[0]) };
    }
    return null;
  } catch {
    return null;
  }
};

// Generate signed URL for private storage
const generateSignedUrl = async (url: string): Promise<string | null> => {
  const parsed = parseStorageUrl(url);
  if (!parsed) return null;

  try {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

const AdminProductionFilesView = ({ order }: AdminProductionFilesViewProps) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Debug: Log the order object to verify data
  useEffect(() => {
    console.log('[AdminProductionFilesView] Order data received:', {
      id: order.id,
      design_file_url: order.design_file_url,
      back_design_url: order.back_design_url,
      corrected_csv_url: order.corrected_csv_url,
      mockup_image: order.mockup_image,
      back_mockup_image: order.back_mockup_image,
      generated_preview: order.generated_preview,
      size_chart_url: order.size_chart_url,
      google_drive_link: order.google_drive_link,
      buyer_notes: order.buyer_notes,
      design_explanation: order.design_explanation,
    });
  }, [order]);

  // Generate signed URLs for private storage files
  useEffect(() => {
    const generateAllSignedUrls = async () => {
      setLoading(true);
      const urls: Record<string, string> = {};
      
      const fileFields = [
        'design_file_url',
        'back_design_url',
        'corrected_csv_url',
        'mockup_image',
        'back_mockup_image',
        'generated_preview',
        'size_chart_url',
      ] as const;

      const promises = fileFields.map(async (field) => {
        const url = order[field];
        if (url && url.includes('supabase.co/storage')) {
          const signedUrl = await generateSignedUrl(url);
          if (signedUrl) {
            urls[field] = signedUrl;
          }
        }
      });

      await Promise.all(promises);
      setSignedUrls(urls);
      setLoading(false);

      console.log('[AdminProductionFilesView] Signed URLs generated:', urls);
    };

    if (order.id) {
      generateAllSignedUrls();
    }
  }, [order.id, order.design_file_url, order.back_design_url, order.corrected_csv_url, 
      order.mockup_image, order.back_mockup_image, order.generated_preview, order.size_chart_url]);

  const hasDesigns = order.design_file_url || order.back_design_url;
  const hasCSV = order.corrected_csv_url || order.size_chart_url;
  const hasMockups = order.mockup_image || order.back_mockup_image || order.generated_preview;
  const hasBuyerInputs = order.buyer_notes || order.design_explanation || order.google_drive_link;

  const hasAnyFiles = hasDesigns || hasCSV || hasMockups || hasBuyerInputs;

  if (!hasAnyFiles && !loading) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Production Files & Buyer Inputs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              No production files uploaded yet.
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Order ID: {order.id}
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
                signedUrl={signedUrls['design_file_url']}
                type="image"
                timestamp={order.created_at}
                loading={loading && !!order.design_file_url}
              />
              <FileItem
                label="Back Design"
                url={order.back_design_url}
                signedUrl={signedUrls['back_design_url']}
                type="image"
                timestamp={order.created_at}
                loading={loading && !!order.back_design_url}
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
                signedUrl={signedUrls['corrected_csv_url']}
                type="csv"
                timestamp={order.updated_at}
                loading={loading && !!order.corrected_csv_url}
              />
              <FileItem
                label="Size Chart"
                url={order.size_chart_url}
                signedUrl={signedUrls['size_chart_url']}
                type="image"
                timestamp={order.created_at}
                loading={loading && !!order.size_chart_url}
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
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                Preview Only
              </Badge>
            </div>
            <div className="space-y-2">
              <FileItem
                label="Front Mockup"
                url={order.mockup_image}
                signedUrl={signedUrls['mockup_image']}
                type="image"
                timestamp={order.created_at}
                previewOnly
                loading={loading && !!order.mockup_image}
              />
              <FileItem
                label="Back Mockup"
                url={order.back_mockup_image}
                signedUrl={signedUrls['back_mockup_image']}
                type="image"
                timestamp={order.created_at}
                previewOnly
                loading={loading && !!order.back_mockup_image}
              />
              <FileItem
                label="AI Generated Preview"
                url={order.generated_preview}
                signedUrl={signedUrls['generated_preview']}
                type="image"
                timestamp={order.created_at}
                previewOnly
                loading={loading && !!order.generated_preview}
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

        {/* Debug info (only in development) */}
        {!hasAnyFiles && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1">
              Debug: No files detected
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">
              Check browser console for order data details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminProductionFilesView;
