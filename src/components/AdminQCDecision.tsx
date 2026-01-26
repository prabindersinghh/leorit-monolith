/**
 * Admin QC Decision Component
 * 
 * Admin must approve/reject QC before:
 * - Delivery can proceed
 * - Payment can be released
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Eye,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { getSignedUrl } from "@/lib/orderFileStorage";

interface AdminQCDecisionProps {
  order: {
    id: string;
    order_state: string | null;
    admin_qc_approved: boolean | null;
    admin_qc_approved_at: string | null;
    sample_qc_uploaded_at: string | null;
    bulk_qc_uploaded_at: string | null;
  };
  onUpdate: () => void;
}

interface QCRecord {
  id: string;
  stage: string;
  defect_type: string | null;
  defect_severity: number | null;
  decision: string;
  reason_code: string | null;
  notes: string | null;
  file_urls: string[] | null;
  admin_decision: string | null;
  admin_notes: string | null;
  created_at: string;
}

const AdminQCDecision = ({ order, onUpdate }: AdminQCDecisionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qcRecords, setQCRecords] = useState<QCRecord[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Fetch QC records for this order
  useEffect(() => {
    const fetchQCRecords = async () => {
      const { data, error } = await supabase
        .from('order_qc')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQCRecords(data);
        
        // Generate signed URLs for all files
        const urls: Record<string, string> = {};
        for (const record of data) {
          if (record.file_urls) {
            for (const fileUrl of record.file_urls) {
              const signed = await getSignedUrl(fileUrl, 'orders');
              if (signed) {
                urls[fileUrl] = signed;
              }
            }
          }
        }
        setSignedUrls(urls);
      }
    };

    fetchQCRecords();
  }, [order.id]);

  // Check if there's pending QC that needs admin decision
  const pendingQC = qcRecords.find(qc => qc.admin_decision === 'pending');
  const hasQCUploaded = order.sample_qc_uploaded_at || order.bulk_qc_uploaded_at;

  // If already approved, show approved state
  if (order.admin_qc_approved) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Admin QC Approved
            </CardTitle>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Approved
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            QC approved on {order.admin_qc_approved_at ? new Date(order.admin_qc_approved_at).toLocaleString() : 'N/A'}
          </p>
          <p className="text-sm text-green-700 mt-2">
            ✓ Delivery can proceed<br/>
            ✓ Payment can be released
          </p>
        </CardContent>
      </Card>
    );
  }

  // If no QC uploaded yet, don't show this component
  if (!hasQCUploaded && qcRecords.length === 0) {
    return null;
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !adminNotes.trim()) {
      toast.error("Please provide notes explaining the rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      // Update QC record if exists
      if (pendingQC) {
        const { error: qcError } = await supabase
          .from('order_qc')
          .update({
            admin_decision: decision,
            admin_decision_by: user.id,
            admin_decision_at: now,
            admin_notes: adminNotes || null,
          })
          .eq('id', pendingQC.id);

        if (qcError) throw qcError;
      }

      // Update order
      if (decision === 'approved') {
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            admin_qc_approved: true,
            admin_qc_approved_at: now,
            admin_qc_approved_by: user.id,
            updated_at: now,
          })
          .eq('id', order.id);

        if (orderError) throw orderError;
      }

      // Log event
      await logOrderEvent(order.id, `admin_qc_${decision}`, {
        decision,
        notes: adminNotes,
        decided_by: user.id,
        timestamp: now,
        qc_record_id: pendingQC?.id,
      });

      toast.success(
        decision === 'approved' 
          ? "QC approved! Delivery and payment can now proceed."
          : "QC rejected. Manufacturer will be notified."
      );
      onUpdate();
    } catch (error: any) {
      console.error('Error processing QC decision:', error);
      toast.error(error.message || "Failed to process decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefectLabel = (defectType: string | null) => {
    const labels: Record<string, string> = {
      'none': 'None',
      'print_defect': 'Print Defect',
      'stitching_defect': 'Stitching Defect',
      'size_mismatch': 'Size Mismatch',
      'color_mismatch': 'Color Mismatch',
      'fabric_issue': 'Fabric Issue',
      'packaging_issue': 'Packaging Issue',
      'other': 'Other',
    };
    return labels[defectType || 'none'] || defectType;
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            Admin QC Decision Required
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-300 bg-amber-100/50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Delivery and payment are blocked until admin approves QC.
          </AlertDescription>
        </Alert>

        {/* QC Records Summary */}
        {qcRecords.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">QC Submissions</h4>
            {qcRecords.map((qc) => (
              <div key={qc.id} className="p-3 bg-background rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {qc.stage === 'sample' ? 'Sample' : 'Bulk'} QC
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(qc.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Defect:</span>{' '}
                    {getDefectLabel(qc.defect_type)}
                  </div>
                  {qc.defect_severity && (
                    <div>
                      <span className="text-muted-foreground">Severity:</span>{' '}
                      {qc.defect_severity}/5
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Mfg Decision:</span>{' '}
                    <Badge 
                      variant="outline" 
                      className={qc.decision === 'approve' ? 'text-green-600' : 'text-red-600'}
                    >
                      {qc.decision}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge 
                      variant="outline" 
                      className={
                        qc.admin_decision === 'approved' ? 'text-green-600' : 
                        qc.admin_decision === 'rejected' ? 'text-red-600' : 
                        'text-amber-600'
                      }
                    >
                      {qc.admin_decision || 'pending'}
                    </Badge>
                  </div>
                </div>
                {qc.notes && (
                  <p className="text-xs text-muted-foreground">
                    Notes: {qc.notes}
                  </p>
                )}
                {/* File previews */}
                {qc.file_urls && qc.file_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {qc.file_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={signedUrls[url] || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Eye className="h-3 w-3" />
                        File {idx + 1}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Admin Notes */}
        <div className="space-y-2">
          <Label>Admin Notes (required for rejection)</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Enter any observations or reasons for rejection..."
            rows={3}
          />
        </div>

        {/* Decision Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleDecision('approved')}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve QC
              </>
            )}
          </Button>
          <Button
            onClick={() => handleDecision('rejected')}
            disabled={isSubmitting}
            variant="destructive"
            className="flex-1"
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Reject QC
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminQCDecision;
