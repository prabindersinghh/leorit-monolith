/**
 * Admin Production Files View
 *
 * READ-ONLY admin audit of buyer-provided assets.
 * - Reads file references from BOTH the order row (canonical fields) and order_evidence (specification stage)
 * - Always generates signed URLs for private storage objects
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  Download,
  ExternalLink,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImageIcon,
  Link as LinkIcon,
  Palette,
  Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import { getOrderEvidence } from "@/lib/evidenceStorage";

interface AdminProductionFilesViewProps {
  order: {
    id: string;
    created_at?: string;

    // Canonical order fields
    design_file_url?: string | null;
    back_design_url?: string | null;
    corrected_csv_url?: string | null;
    size_chart_url?: string | null;

    mockup_image?: string | null;
    back_mockup_image?: string | null;
    generated_preview?: string | null;

    buyer_notes?: string | null;
    design_explanation?: string | null;

    // This may not exist in schema yet; keep optional for compatibility.
    buyer_note_attachments?: string[] | null;

    google_drive_link?: string | null;
  };
}

type FileKind = "image" | "csv" | "document" | "link" | "model3d";

interface FileItemProps {
  label: string;
  src: string;
  kind: FileKind;
  timestamp?: string | null;
  previewOnly?: boolean;
  signedUrl?: string | null;
  downloadUrl?: string | null;
  loading?: boolean;
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isDataUrl = (value: string) => /^data:/i.test(value);

const getExtension = (value: string) => {
  const clean = value.split("?")[0];
  const last = clean.split("/").pop() ?? "";
  const ext = last.includes(".") ? last.split(".").pop() : "";
  return (ext ?? "").toLowerCase();
};

const getFileTypeLabel = (kind: FileKind, src: string) => {
  if (kind === "link") return "LINK";
  if (kind === "csv") return "CSV";
  const ext = getExtension(src);
  if (!ext) return "FILE";
  return ext.length > 5 ? "FILE" : ext.toUpperCase();
};

const getFileNameFromSrc = (src: string) => {
  if (isDataUrl(src)) return "inline";
  const clean = src.split("?")[0];
  const name = clean.split("/").pop() ?? clean;
  try {
    const decoded = decodeURIComponent(name);
    return decoded.length > 60 ? decoded.slice(0, 57) + "..." : decoded;
  } catch {
    return name;
  }
};

// Supports either full storage URLs or raw object paths.
const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  try {
    // https://{project}/storage/v1/object/{public|sign}/bucket/path
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2].split("?")[0]) };
  } catch {
    return null;
  }
};

const createSignedUrl = async (
  bucket: string, 
  path: string, 
  options?: { download?: boolean }
): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600, options);
  if (error) {
    console.error("[AdminProductionFilesView] createSignedUrl error", { bucket, path, error });
    return null;
  }
  return data?.signedUrl ?? null;
};

// Check if file is a 3D model
const is3DModel = (src: string): boolean => {
  const ext = getExtension(src);
  return ["glb", "gltf"].includes(ext);
};

// 3D Model Viewer Component using Google's model-viewer
// Script is loaded in index.html for reliability
const ModelViewer3D = ({ src, alt }: { src: string; alt?: string }) => {
  return (
    <div className="w-full h-[400px] bg-muted/30 rounded-lg overflow-hidden border border-border/50 mt-2">
      {/* @ts-ignore - model-viewer is a web component */}
      <model-viewer
        src={src}
        alt={alt || "3D Model Preview"}
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

const FileItem = ({ label, src, kind, timestamp, previewOnly, signedUrl, downloadUrl, loading }: FileItemProps) => {
  const displayUrl = signedUrl ?? src;
  const dlUrl = downloadUrl ?? displayUrl;
  const isExternal = kind === "link";
  const isModel = kind === "model3d";
  const isImage = kind === "image";
  const isCsv = kind === "csv";

  const icon = (() => {
    switch (kind) {
      case "image":
        return <FileImage className="h-4 w-4 text-primary" />;
      case "csv":
        return <FileSpreadsheet className="h-4 w-4 text-primary" />;
      case "link":
        return <ExternalLink className="h-4 w-4 text-primary" />;
      case "model3d":
        return <FileImage className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  })();

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
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 bg-background rounded-md">{icon}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{label}</p>
              {previewOnly && (
                <Badge variant="outline" className="text-xs">
                  Preview only
                </Badge>
              )}
              {isModel && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                  3D Model
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {getFileTypeLabel(kind, src)}
              </Badge>
              <span className="truncate">{getFileNameFromSrc(src)}</span>
            </div>

            {timestamp && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Uploaded: {format(new Date(timestamp), "MMM d, yyyy HH:mm")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Preview button for images and 3D models */}
          {(isImage || isModel) && displayUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(displayUrl, "_blank")}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {/* Download button - uses download URL with Content-Disposition header */}
          {!isExternal && dlUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              asChild
              title="Download"
            >
              <a href={dlUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}

          {/* External link button */}
          {isExternal && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(displayUrl, "_blank")}
              title="Open"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Inline 3D Model Viewer */}
      {isModel && displayUrl && !loading && (
        <ModelViewer3D src={displayUrl} alt={label} />
      )}
    </div>
  );
};

const DEFAULT_BUCKET_FOR_ORDER_FILES = "design-files";

const AdminProductionFilesView = ({ order }: AdminProductionFilesViewProps) => {
  const [signedBySrc, setSignedBySrc] = useState<Record<string, string>>({});
  const [downloadBySrc, setDownloadBySrc] = useState<Record<string, string>>({});
  const [loadingSigned, setLoadingSigned] = useState(false);
  const [specEvidence, setSpecEvidence] = useState<any[]>([]);

  // STEP 1: Verify fields actually arrive (requested one-time debug)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[AdminProductionFilesView] ORDER FILE FIELDS", {
      order_id: order.id,
      design_file_url: order.design_file_url,
      back_design_url: order.back_design_url,
      corrected_csv_url: order.corrected_csv_url,
      mockup_image: order.mockup_image,
      back_mockup_image: order.back_mockup_image,
      generated_preview: order.generated_preview,
      buyer_note_attachments: (order as any).buyer_note_attachments,
      google_drive_link: order.google_drive_link,
    });
    
    // CSV-specific debug log
    // eslint-disable-next-line no-console
    console.log("[AdminProductionFilesView] CSV URL:", order.corrected_csv_url);
  }, [order.id, order.corrected_csv_url]);

  // Fetch specification evidence (attachments / links / supplementary files)
  useEffect(() => {
    const run = async () => {
      if (!order.id) return;
      const items = await getOrderEvidence(order.id);
      setSpecEvidence((items || []).filter((e) => e.stage === "specification"));
    };
    run();
  }, [order.id]);

  const attachmentsFromEvidence = useMemo(() => {
    const attachmentTypes = new Set(["buyer_attachment", "buyer_note_attachment", "attachment", "buyer_note_file"]);
    return (specEvidence || [])
      .filter((e) => e?.file_url && typeof e.file_url === "string" && attachmentTypes.has(e.evidence_type))
      .map((e) => e.file_url as string);
  }, [specEvidence]);

  const allAttachmentSrcs = useMemo(() => {
    const fromOrderArray = ((order as any).buyer_note_attachments as string[] | null | undefined) ?? [];
    const merged = [...fromOrderArray, ...attachmentsFromEvidence].filter(Boolean);
    // de-dupe
    return Array.from(new Set(merged));
  }, [order, attachmentsFromEvidence]);

  const sourcesNeedingSigned = useMemo(() => {
    const candidates = [
      order.design_file_url,
      order.back_design_url,
      order.corrected_csv_url,
      order.size_chart_url,
      order.mockup_image,
      order.back_mockup_image,
      order.generated_preview,
      ...allAttachmentSrcs,
    ].filter((v): v is string => !!v && typeof v === "string");

    return candidates.filter((src) => {
      if (isDataUrl(src)) return false;
      if (src.includes("drive.google.com")) return false;
      return true;
    });
  }, [order, allAttachmentSrcs]);

  // STEP 3/4: Always sign private files for admin - generate BOTH preview and download URLs
  useEffect(() => {
    const run = async () => {
      if (!order.id) return;
      setLoadingSigned(true);

      const nextSigned: Record<string, string> = {};
      const nextDownload: Record<string, string> = {};

      await Promise.all(
        sourcesNeedingSigned.map(async (src) => {
          if (signedBySrc[src]) return;

          let bucket = DEFAULT_BUCKET_FOR_ORDER_FILES;
          let path = src;

          // Full storage URL - parse bucket and path
          if (isHttpUrl(src)) {
            const parsed = parseStorageUrl(src);
            if (!parsed) return;
            bucket = parsed.bucket;
            path = parsed.path;
          }

          // Create preview URL (inline viewing)
          const previewUrl = await createSignedUrl(bucket, path);
          if (previewUrl) nextSigned[src] = previewUrl;

          // Create download URL with Content-Disposition: attachment header
          const dlUrl = await createSignedUrl(bucket, path, { download: true });
          if (dlUrl) nextDownload[src] = dlUrl;
        })
      );

      if (Object.keys(nextSigned).length > 0) {
        setSignedBySrc((prev) => ({ ...prev, ...nextSigned }));
      }
      if (Object.keys(nextDownload).length > 0) {
        setDownloadBySrc((prev) => ({ ...prev, ...nextDownload }));
      }


      setLoadingSigned(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, sourcesNeedingSigned.join("|")]);

  const hasDesigns = !!(order.design_file_url || order.back_design_url);
  const hasCSV = !!(order.corrected_csv_url || order.size_chart_url);
  const hasMockups = !!(order.mockup_image || order.back_mockup_image || order.generated_preview);
  const hasNotes = !!(order.buyer_notes || order.design_explanation);
  const hasAttachments = allAttachmentSrcs.length > 0;
  const hasDrive = !!order.google_drive_link;

  const hasAny = hasDesigns || hasCSV || hasMockups || hasNotes || hasAttachments || hasDrive;

  if (!hasAny && !loadingSigned) {
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
            <p className="text-sm">No production files uploaded yet.</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Order ID: {order.id}</p>
        </CardContent>
      </Card>
    );
  }

  const tsFallback = order.created_at ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Production Files & Buyer Inputs
        </CardTitle>
        <p className="text-xs text-muted-foreground">All buyer-provided files for this order (read-only)</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Designs */}
        {(hasDesigns || loadingSigned) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Design Files</h4>
            </div>
            <div className="space-y-2">
              {order.design_file_url && (
                <FileItem
                  label="Front Design"
                  src={order.design_file_url}
                  kind="image"
                  timestamp={tsFallback}
                  signedUrl={signedBySrc[order.design_file_url]}
                  downloadUrl={downloadBySrc[order.design_file_url]}
                  loading={loadingSigned && !signedBySrc[order.design_file_url] && !isDataUrl(order.design_file_url)}
                />
              )}
              {order.back_design_url && (
                <FileItem
                  label="Back Design"
                  src={order.back_design_url}
                  kind="image"
                  timestamp={tsFallback}
                  signedUrl={signedBySrc[order.back_design_url]}
                  downloadUrl={downloadBySrc[order.back_design_url]}
                  loading={loadingSigned && !signedBySrc[order.back_design_url] && !isDataUrl(order.back_design_url)}
                />
              )}
              {!order.design_file_url && !order.back_design_url && !loadingSigned && (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>
        )}

        {(hasDesigns || loadingSigned) && (hasCSV || hasMockups || hasNotes || hasAttachments || hasDrive) && <Separator />}

        {/* CSV */}
        {(hasCSV || loadingSigned) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">CSV Files</h4>
            </div>
            <div className="space-y-2">
              {order.corrected_csv_url && (
                <FileItem
                  label="Size Distribution CSV"
                  src={order.corrected_csv_url}
                  kind="csv"
                  timestamp={tsFallback}
                  signedUrl={signedBySrc[order.corrected_csv_url]}
                  downloadUrl={downloadBySrc[order.corrected_csv_url]}
                  loading={loadingSigned && !signedBySrc[order.corrected_csv_url] && !isDataUrl(order.corrected_csv_url)}
                />
              )}
              {order.size_chart_url && (
                <FileItem
                  label="Size Chart"
                  src={order.size_chart_url}
                  kind="image"
                  timestamp={tsFallback}
                  signedUrl={signedBySrc[order.size_chart_url]}
                  downloadUrl={downloadBySrc[order.size_chart_url]}
                  loading={loadingSigned && !signedBySrc[order.size_chart_url] && !isDataUrl(order.size_chart_url)}
                />
              )}
              {!order.corrected_csv_url && !order.size_chart_url && !loadingSigned && (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>
        )}

        {(hasCSV || loadingSigned) && (hasMockups || hasNotes || hasAttachments || hasDrive) && <Separator />}

        {/* Mockups */}
        {(hasMockups || loadingSigned) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Mockups</h4>
              <Badge variant="outline" className="text-xs">
                Preview only
              </Badge>
            </div>
            <div className="space-y-2">
              {order.mockup_image && (
                <FileItem
                  label="Front Mockup"
                  src={order.mockup_image}
                  kind={is3DModel(order.mockup_image) ? "model3d" : "image"}
                  timestamp={tsFallback}
                  previewOnly
                  signedUrl={signedBySrc[order.mockup_image]}
                  downloadUrl={downloadBySrc[order.mockup_image]}
                  loading={loadingSigned && !signedBySrc[order.mockup_image] && !isDataUrl(order.mockup_image)}
                />
              )}
              {order.back_mockup_image && (
                <FileItem
                  label="Back Mockup"
                  src={order.back_mockup_image}
                  kind={is3DModel(order.back_mockup_image) ? "model3d" : "image"}
                  timestamp={tsFallback}
                  previewOnly
                  signedUrl={signedBySrc[order.back_mockup_image]}
                  downloadUrl={downloadBySrc[order.back_mockup_image]}
                  loading={loadingSigned && !signedBySrc[order.back_mockup_image] && !isDataUrl(order.back_mockup_image)}
                />
              )}
              {order.generated_preview && (
                <FileItem
                  label="AI Preview"
                  src={order.generated_preview}
                  kind="image"
                  timestamp={tsFallback}
                  previewOnly
                  signedUrl={signedBySrc[order.generated_preview]}
                  downloadUrl={downloadBySrc[order.generated_preview]}
                  loading={loadingSigned && !signedBySrc[order.generated_preview] && !isDataUrl(order.generated_preview)}
                />
              )}
              {!order.mockup_image && !order.back_mockup_image && !order.generated_preview && !loadingSigned && (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>
        )}

        {(hasMockups || loadingSigned) && (hasNotes || hasAttachments || hasDrive) && <Separator />}

        {/* Buyer notes & attachments */}
        {(hasNotes || hasAttachments || hasDrive) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Buyer Notes & Attachments</h4>
            </div>

            <div className="space-y-3">
              {order.google_drive_link && (
                <div className="flex items-start gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <a
                    href={order.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {order.google_drive_link}
                  </a>
                </div>
              )}

              {order.design_explanation && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Order Explanation</p>
                  <p className="text-sm whitespace-pre-wrap">{order.design_explanation}</p>
                </div>
              )}

              {order.buyer_notes && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Buyer Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{order.buyer_notes}</p>
                </div>
              )}

              {allAttachmentSrcs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Attachments</p>
                  </div>
                  <div className="space-y-2">
                    {allAttachmentSrcs.map((src, i) => (
                      <FileItem
                        key={`${src}-${i}`}
                        label={`Attachment ${i + 1}`}
                        src={src}
                        kind={src.includes(".csv") ? "csv" : isDataUrl(src) ? "image" : "document"}
                        timestamp={tsFallback}
                        signedUrl={signedBySrc[src]}
                        downloadUrl={downloadBySrc[src]}
                        loading={loadingSigned && !signedBySrc[src] && !isDataUrl(src) && !src.includes("drive.google.com")}
                      />
                    ))}
                  </div>
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
