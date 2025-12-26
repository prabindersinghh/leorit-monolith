/**
 * Evidence Summary Component
 * 
 * A clean, read-only evidence display with grouped sections and copy functionality.
 * Designed for rapid YC proof sharing.
 * 
 * ADD-ONLY. Does not modify any existing logic.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  CheckCircle2,
  Clock,
  Video,
  Package,
  Truck,
  CreditCard,
  FileText,
  Factory,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EvidenceSummaryProps {
  order: any;
  manufacturerName?: string;
  orderEvents?: any[];
}

const EvidenceSummary = ({ order, manufacturerName, orderEvents = [] }: EvidenceSummaryProps) => {
  const [copied, setCopied] = useState(false);

  const formatTimestamp = (ts: string | null | undefined) => {
    if (!ts) return null;
    return format(new Date(ts), "dd MMM yyyy, HH:mm");
  };

  // Build timeline from order timestamps
  const buildTimeline = () => {
    const events = [
      { label: "Order Created", timestamp: order.created_at, state: "DRAFT" },
      { label: "Payment Received", timestamp: order.fake_payment_timestamp, state: "PAYMENT" },
      { label: "Escrow Locked", timestamp: order.escrow_locked_timestamp, state: "ESCROW_LOCKED" },
      { label: "Manufacturer Assigned", timestamp: order.assigned_at, state: "MANUFACTURER_ASSIGNED" },
      { label: "Manufacturer Accepted", timestamp: order.manufacturer_accept_time, state: "ACCEPTED" },
      { label: "Sample Production Started", timestamp: order.sample_production_started_at, state: "SAMPLE_IN_PROGRESS" },
      { label: "Sample QC Uploaded", timestamp: order.sample_qc_uploaded_at || order.qc_uploaded_at, state: "SAMPLE_QC_UPLOADED" },
      { label: "Sample Approved", timestamp: order.sample_approved_at || order.sample_qc_approved_at, state: "SAMPLE_APPROVED" },
      { label: "Bulk Unlocked", timestamp: order.bulk_order_confirmed_at, state: "BULK_UNLOCKED" },
      { label: "Bulk QC Uploaded", timestamp: order.bulk_qc_uploaded_at, state: "BULK_QC_UPLOADED" },
      { label: "Bulk QC Approved", timestamp: order.bulk_qc_approved_at, state: "BULK_QC_APPROVED" },
      { label: "Order Packed", timestamp: order.packed_at, state: "PACKED" },
      { label: "Pickup Scheduled", timestamp: order.pickup_scheduled_at, state: "PICKUP_SCHEDULED" },
      { label: "In Transit", timestamp: order.in_transit_at, state: "IN_TRANSIT" },
      { label: "Dispatched", timestamp: order.dispatched_at, state: "DISPATCHED" },
      { label: "Delivered", timestamp: order.delivered_at, state: "DELIVERED" },
      { label: "Escrow Released", timestamp: order.escrow_released_timestamp, state: "ESCROW_RELEASED" },
    ].filter(e => e.timestamp);

    return events;
  };

  // Collect all evidence URLs
  const collectEvidenceData = () => {
    const sampleEvidence: { label: string; url: string; timestamp?: string }[] = [];
    const bulkEvidence: { label: string; url: string; timestamp?: string }[] = [];
    const packagingDelivery: { label: string; url?: string; value?: string; timestamp?: string }[] = [];
    const paymentHistory: { label: string; value: string; timestamp?: string }[] = [];

    // Sample Evidence
    if (order.design_file_url) {
      sampleEvidence.push({ label: "Front Design", url: order.design_file_url });
    }
    if (order.back_design_url) {
      sampleEvidence.push({ label: "Back Design", url: order.back_design_url });
    }
    if (order.mockup_image) {
      sampleEvidence.push({ label: "Front Mockup", url: order.mockup_image });
    }
    if (order.back_mockup_image) {
      sampleEvidence.push({ label: "Back Mockup", url: order.back_mockup_image });
    }
    if (order.sample_qc_video_url) {
      sampleEvidence.push({ 
        label: "Sample QC Video", 
        url: order.sample_qc_video_url,
        timestamp: formatTimestamp(order.sample_qc_uploaded_at) || undefined
      });
    } else if (order.qc_video_url) {
      sampleEvidence.push({ 
        label: "QC Video", 
        url: order.qc_video_url,
        timestamp: formatTimestamp(order.qc_uploaded_at) || undefined
      });
    }

    // Bulk QC Evidence
    if (order.bulk_qc_video_url) {
      bulkEvidence.push({ 
        label: "Bulk QC Video", 
        url: order.bulk_qc_video_url,
        timestamp: formatTimestamp(order.bulk_qc_uploaded_at) || undefined
      });
    }
    if (order.corrected_csv_url) {
      bulkEvidence.push({ label: "Size/Name CSV", url: order.corrected_csv_url });
    }
    if (order.size_chart_url) {
      bulkEvidence.push({ label: "Size Chart", url: order.size_chart_url });
    }
    // Additional QC files
    if (order.qc_files && order.qc_files.length > 0) {
      order.qc_files.forEach((url: string, idx: number) => {
        bulkEvidence.push({ label: `Additional QC ${idx + 1}`, url });
      });
    }

    // Packaging & Delivery
    if (order.packaging_video_url) {
      packagingDelivery.push({ 
        label: "Packaging Video", 
        url: order.packaging_video_url,
        timestamp: formatTimestamp(order.packed_at) || undefined
      });
    }
    if (order.tracking_id) {
      packagingDelivery.push({ label: "Tracking ID", value: order.tracking_id });
    }
    if (order.courier_name) {
      packagingDelivery.push({ label: "Courier", value: order.courier_name });
    }
    if (order.dispatched_at) {
      packagingDelivery.push({ 
        label: "Dispatched", 
        value: "Yes",
        timestamp: formatTimestamp(order.dispatched_at) || undefined
      });
    }
    if (order.delivered_at) {
      packagingDelivery.push({ 
        label: "Delivered", 
        value: "Yes",
        timestamp: formatTimestamp(order.delivered_at) || undefined
      });
    }

    // Payment History
    paymentHistory.push({ 
      label: "Payment State", 
      value: order.payment_state || order.escrow_status || "pending" 
    });
    if (order.fake_payment_timestamp) {
      paymentHistory.push({ 
        label: "Payment Received", 
        value: "55% Upfront",
        timestamp: formatTimestamp(order.fake_payment_timestamp) || undefined
      });
    }
    if (order.escrow_locked_timestamp) {
      paymentHistory.push({ 
        label: "Escrow Locked", 
        value: `₹${(order.escrow_amount || order.upfront_payable_amount || 0).toLocaleString()}`,
        timestamp: formatTimestamp(order.escrow_locked_timestamp) || undefined
      });
    }
    if (order.escrow_released_timestamp) {
      paymentHistory.push({ 
        label: "Escrow Released", 
        value: "Full Release",
        timestamp: formatTimestamp(order.escrow_released_timestamp) || undefined
      });
    }
    if (order.refunded_at) {
      paymentHistory.push({ 
        label: "Refunded", 
        value: order.refund_reason || "Refunded",
        timestamp: formatTimestamp(order.refunded_at) || undefined
      });
    }

    return { sampleEvidence, bulkEvidence, packagingDelivery, paymentHistory };
  };

  const timeline = buildTimeline();
  const { sampleEvidence, bulkEvidence, packagingDelivery, paymentHistory } = collectEvidenceData();

  // Generate plain text summary for copying
  const generateCopyText = () => {
    let text = `=== LEORIT ORDER EVIDENCE ===\n\n`;
    text += `Order ID: ${order.id}\n`;
    text += `Buyer Purpose: ${order.buyer_purpose || "Not set"}\n`;
    text += `Manufacturer: ${manufacturerName || order.manufacturer_id || "Unassigned"}\n`;
    text += `Current State: ${order.order_state || order.status}\n\n`;

    text += `--- ORDER TIMELINE ---\n`;
    timeline.forEach(event => {
      text += `[${event.timestamp ? format(new Date(event.timestamp), "yyyy-MM-dd HH:mm") : "—"}] ${event.label}\n`;
    });

    text += `\n--- SAMPLE EVIDENCE ---\n`;
    if (sampleEvidence.length === 0) {
      text += `No sample evidence uploaded\n`;
    } else {
      sampleEvidence.forEach(item => {
        text += `${item.label}: ${item.url}\n`;
        if (item.timestamp) text += `  Timestamp: ${item.timestamp}\n`;
      });
    }

    text += `\n--- BULK QC EVIDENCE ---\n`;
    if (bulkEvidence.length === 0) {
      text += `No bulk QC evidence uploaded\n`;
    } else {
      bulkEvidence.forEach(item => {
        text += `${item.label}: ${item.url}\n`;
        if (item.timestamp) text += `  Timestamp: ${item.timestamp}\n`;
      });
    }

    text += `\n--- PACKAGING & DELIVERY ---\n`;
    if (packagingDelivery.length === 0) {
      text += `No packaging/delivery info yet\n`;
    } else {
      packagingDelivery.forEach(item => {
        if (item.url) {
          text += `${item.label}: ${item.url}\n`;
        } else {
          text += `${item.label}: ${item.value}\n`;
        }
        if (item.timestamp) text += `  Timestamp: ${item.timestamp}\n`;
      });
    }

    text += `\n--- PAYMENT HISTORY ---\n`;
    paymentHistory.forEach(item => {
      text += `${item.label}: ${item.value}\n`;
      if (item.timestamp) text += `  Timestamp: ${item.timestamp}\n`;
    });

    text += `\n=== END EVIDENCE ===\n`;
    text += `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}\n`;

    return text;
  };

  const handleCopyEvidence = async () => {
    try {
      const text = generateCopyText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Evidence links copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy evidence");
    }
  };

  const getPurposeLabel = (purpose: string | null) => {
    switch (purpose) {
      case "merch_bulk": return "Merch / Bulk";
      case "blank_apparel": return "Blank Apparel";
      case "fabric_only": return "Fabric Only";
      default: return purpose || "Not set";
    }
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-amber-600" />
            Evidence Summary
            <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              YC-Ready
            </Badge>
          </CardTitle>
          <Button
            variant={copied ? "default" : "outline"}
            size="sm"
            onClick={handleCopyEvidence}
            className="gap-2"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Evidence Links
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Order Header */}
        <div className="bg-background rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Order ID:</span>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{order.id}</code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Buyer Purpose:</span>
            <Badge variant="secondary">{getPurposeLabel(order.buyer_purpose)}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Manufacturer:</span>
            <span className="text-sm font-medium flex items-center gap-1">
              <Factory className="h-3 w-3" />
              {manufacturerName || (order.manufacturer_id ? order.manufacturer_id.slice(0, 8) + "..." : "Unassigned")}
            </span>
          </div>
        </div>

        <Separator />

        {/* Full Order Timeline */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-600" />
            Full Order Timeline
          </h4>
          <div className="bg-background rounded-lg p-4">
            {timeline.length > 0 ? (
              <div className="space-y-2">
                {timeline.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span>{event.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events recorded yet</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Sample Evidence */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Video className="h-4 w-4 text-blue-600" />
            Sample Evidence
          </h4>
          <div className="bg-background rounded-lg p-4">
            {sampleEvidence.length > 0 ? (
              <div className="space-y-2">
                {sampleEvidence.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.timestamp && (
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sample evidence uploaded</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Bulk QC Evidence */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-purple-600" />
            Bulk QC Evidence
          </h4>
          <div className="bg-background rounded-lg p-4">
            {bulkEvidence.length > 0 ? (
              <div className="space-y-2">
                {bulkEvidence.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.timestamp && (
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bulk QC evidence uploaded</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Packaging & Delivery */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-emerald-600" />
            Packaging & Delivery
          </h4>
          <div className="bg-background rounded-lg p-4">
            {packagingDelivery.length > 0 ? (
              <div className="space-y-2">
                {packagingDelivery.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.timestamp && (
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      )}
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium">{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No packaging/delivery info yet</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Payment & Completion */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-indigo-600" />
            Payment & Completion
          </h4>
          <div className="bg-background rounded-lg p-4">
            <div className="space-y-2">
              {paymentHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.timestamp && (
                      <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                    )}
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvidenceSummary;
