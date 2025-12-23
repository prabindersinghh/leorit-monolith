import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Copy, 
  CheckCircle2, 
  Package, 
  Factory, 
  Clock,
  Image,
  Video,
  FileSpreadsheet,
  Truck,
  ExternalLink,
  Link2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderEvidenceViewProps {
  order: any;
  manufacturerInfo?: any;
  manufacturerVerification?: any;
}

interface EvidenceLink {
  label: string;
  url: string;
  type: "image" | "video" | "document" | "link";
}

const OrderEvidenceView = ({ order, manufacturerInfo, manufacturerVerification }: OrderEvidenceViewProps) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success(`${label} URL copied`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  // Collect all evidence links
  const collectEvidenceLinks = (): EvidenceLink[] => {
    const links: EvidenceLink[] = [];

    if (order.design_file_url) {
      links.push({ label: "Front Design", url: order.design_file_url, type: "image" });
    }
    if (order.back_design_url) {
      links.push({ label: "Back Design", url: order.back_design_url, type: "image" });
    }
    if (order.mockup_image) {
      links.push({ label: "Front Mockup", url: order.mockup_image, type: "image" });
    }
    if (order.back_mockup_image) {
      links.push({ label: "Back Mockup", url: order.back_mockup_image, type: "image" });
    }
    if (order.generated_preview) {
      links.push({ label: "Generated Preview", url: order.generated_preview, type: "image" });
    }
    if (order.corrected_csv_url) {
      links.push({ label: "Name/Size CSV", url: order.corrected_csv_url, type: "document" });
    }
    if (order.size_chart_url) {
      links.push({ label: "Size Chart", url: order.size_chart_url, type: "document" });
    }
    if (order.qc_video_url) {
      links.push({ label: "Sample QC Video", url: order.qc_video_url, type: "video" });
    }
    if (order.qc_files && order.qc_files.length > 0) {
      order.qc_files.forEach((url: string, idx: number) => {
        links.push({ label: `QC Video ${idx + 1}`, url, type: "video" });
      });
    }

    return links;
  };

  const evidenceLinks = collectEvidenceLinks();

  // Timeline events for display
  const timelineEvents = [
    { label: "Order Created", timestamp: order.created_at, actor: "Buyer" },
    { label: "Payment Received (55%)", timestamp: order.fake_payment_timestamp, actor: "System" },
    { label: "Assigned to Manufacturer", timestamp: order.assigned_at, actor: "Platform" },
    { label: "Manufacturer Accepted", timestamp: order.manufacturer_accept_time, actor: "Manufacturer" },
    { label: "Sample Production Started", timestamp: order.sample_production_started_at, actor: "Manufacturer" },
    { label: "Sample QC Uploaded", timestamp: order.sample_qc_uploaded_at || order.qc_uploaded_at, actor: "Manufacturer" },
    { label: "Sample Approved", timestamp: order.sample_approved_at || order.sample_qc_approved_at, actor: "Buyer" },
    { label: "Bulk Production Started", timestamp: order.bulk_order_confirmed_at, actor: "Manufacturer" },
    { label: "Dispatched", timestamp: order.dispatched_at, actor: "Manufacturer" },
    { label: "Delivered", timestamp: order.delivered_at, actor: "Buyer Confirmed" },
    { label: "Escrow Released", timestamp: order.escrow_released_timestamp, actor: "System" },
  ].filter(e => e.timestamp);

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case "sample_only": return "Sample Only";
      case "sample_then_bulk": return "Sample → Bulk";
      case "direct_bulk": return "Direct Bulk";
      default: return "Legacy";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "document": return <FileSpreadsheet className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Evidence Bundle
          <Badge variant="outline" className="ml-2">YC-Ready</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete proof of execution for order {order.id.slice(0, 8)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Order Summary
          </h4>
          <div className="bg-background rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID:</span>
              <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{order.id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Intent:</span>
              <Badge variant="outline">{getIntentLabel(order.order_intent)}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer Type:</span>
              <span className="capitalize">{order.buyer_type || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span>{order.product_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span>{order.quantity} pcs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fabric:</span>
              <span>{order.fabric_type || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Value:</span>
              <span className="font-semibold">₹{(order.total_order_value || order.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Assigned Manufacturer */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Assigned Manufacturer
          </h4>
          <div className="bg-background rounded-lg p-4 space-y-2 text-sm">
            {manufacturerVerification ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{manufacturerVerification.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>
                    {[manufacturerVerification.city, manufacturerVerification.state]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                </div>
                {order.assigned_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned:</span>
                    <span>{format(new Date(order.assigned_at), "dd MMM yyyy, HH:mm")}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Not yet assigned</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline of Events
          </h4>
          <div className="bg-background rounded-lg p-4">
            {timelineEvents.length > 0 ? (
              <div className="space-y-2 text-sm">
                {timelineEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 flex justify-between items-center">
                      <span>{event.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(event.timestamp!), "dd MMM, HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No events recorded yet</p>
            )}
          </div>
        </div>

        {/* Artifacts Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Image className="h-4 w-4" />
            Artifacts Preview
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {order.mockup_image && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Front Mockup</p>
                <img
                  src={order.mockup_image}
                  alt="Front mockup"
                  className="w-full h-24 object-contain border rounded bg-background"
                />
              </div>
            )}
            {order.back_mockup_image && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Back Mockup</p>
                <img
                  src={order.back_mockup_image}
                  alt="Back mockup"
                  className="w-full h-24 object-contain border rounded bg-background"
                />
              </div>
            )}
            {order.design_file_url && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Front Design</p>
                <img
                  src={order.design_file_url}
                  alt="Front design"
                  className="w-full h-24 object-contain border rounded bg-background"
                />
              </div>
            )}
            {order.back_design_url && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Back Design</p>
                <img
                  src={order.back_design_url}
                  alt="Back design"
                  className="w-full h-24 object-contain border rounded bg-background"
                />
              </div>
            )}
          </div>
          {!order.mockup_image && !order.back_mockup_image && !order.design_file_url && (
            <p className="text-sm text-muted-foreground">No visual artifacts uploaded</p>
          )}
        </div>

        {/* QC Videos */}
        {(order.qc_video_url || (order.qc_files && order.qc_files.length > 0)) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Video className="h-4 w-4" />
              QC Videos
            </h4>
            <div className="space-y-2">
              {order.qc_video_url && (
                <div className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">Sample QC Video</p>
                  <video controls className="w-full max-h-48 rounded">
                    <source src={order.qc_video_url} type="video/mp4" />
                  </video>
                </div>
              )}
              {order.qc_files && order.qc_files.map((url: string, idx: number) => (
                <div key={idx} className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">QC Video {idx + 1}</p>
                  <video controls className="w-full max-h-48 rounded">
                    <source src={url} type="video/mp4" />
                  </video>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispatch / Delivery Proof */}
        {(order.tracking_id || order.dispatched_at) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Dispatch & Delivery Proof
            </h4>
            <div className="bg-background rounded-lg p-4 space-y-2 text-sm">
              {order.tracking_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking ID:</span>
                  <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{order.tracking_id}</code>
                </div>
              )}
              {order.dispatched_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispatched:</span>
                  <span>{format(new Date(order.dispatched_at), "dd MMM yyyy, HH:mm")}</span>
                </div>
              )}
              {order.packed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packed:</span>
                  <span>{format(new Date(order.packed_at), "dd MMM yyyy, HH:mm")}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered:</span>
                  <span className="text-green-600 font-medium">
                    {format(new Date(order.delivered_at), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Links Section */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Export Links
            <Badge variant="secondary" className="ml-1">{evidenceLinks.length}</Badge>
          </h4>
          <p className="text-xs text-muted-foreground">
            All artifact URLs grouped for quick sharing
          </p>
          
          {evidenceLinks.length > 0 ? (
            <div className="space-y-2">
              {evidenceLinks.map((link, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 bg-background rounded-lg p-3 border"
                >
                  <span className="text-muted-foreground">{getTypeIcon(link.type)}</span>
                  <span className="text-sm font-medium flex-1">{link.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(link.url, link.label)}
                    className="h-8"
                  >
                    {copiedUrl === link.url ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8"
                  >
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground bg-background rounded-lg p-4">
              No artifacts uploaded yet
            </p>
          )}

          {/* Copy All URLs */}
          {evidenceLinks.length > 1 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const allUrls = evidenceLinks.map(l => `${l.label}: ${l.url}`).join("\n");
                navigator.clipboard.writeText(allUrls);
                toast.success("All URLs copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All URLs
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderEvidenceView;
