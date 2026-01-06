/**
 * Dispute Center
 * 
 * Displays real dispute data from the database.
 * Admin can review and resolve disputes.
 */

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  status: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string | null;
}

const DisputeCenter = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast.error("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim()) {
      toast.error("Please enter a resolution");
      return;
    }

    setResolving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution: resolution.trim(),
          resolved_at: now,
          resolved_by: user?.id,
        })
        .eq("id", selectedDispute.id);

      if (error) throw error;
      toast.success("Dispute resolved");
      setSelectedDispute(null);
      setResolution("");
      fetchDisputes();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error("Failed to resolve dispute");
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "resolved") {
      return <Badge className="bg-green-100 text-green-700">Resolved</Badge>;
    }
    if (status === "in_review") {
      return <Badge className="bg-blue-100 text-blue-700">In Review</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700">Open</Badge>;
  };

  const columns = [
    { 
      header: "Dispute ID", 
      accessor: "id",
      cell: (value: string) => (
        <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      )
    },
    { 
      header: "Order", 
      accessor: "order_id",
      cell: (value: string) => (
        <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      )
    },
    { 
      header: "Reason", 
      accessor: "reason",
      cell: (value: string) => (
        <span className="text-sm max-w-[200px] truncate block">{value}</span>
      )
    },
    { 
      header: "Opened", 
      accessor: "created_at",
      cell: (value: string | null) => value ? format(new Date(value), "dd MMM yyyy") : "—"
    },
    { 
      header: "Status", 
      accessor: "status",
      cell: (value: string | null) => getStatusBadge(value)
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (id: string, row: Dispute) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedDispute(row);
              setResolution(row.resolution || "");
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            Review
          </Button>
          {row.status !== "resolved" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedDispute(row);
                setResolution("");
              }}
            >
              Resolve
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Summary stats
  const totalDisputes = disputes.length;
  const openCount = disputes.filter(d => d.status === "open" || !d.status).length;
  const inReviewCount = disputes.filter(d => d.status === "in_review").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Dispute Center</h1>
              <p className="text-muted-foreground">Manage order disputes and escrow decisions</p>
            </div>
            <Button variant="outline" onClick={fetchDisputes} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Total Disputes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalDisputes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Open
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{openCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  In Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{inReviewCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              </div>
            ) : disputes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No disputes yet.
              </div>
            ) : (
              <DataTable columns={columns} data={disputes} />
            )}
          </div>
        </div>
      </main>

      {/* Review/Resolve Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDispute?.status === "resolved" ? "Dispute Details" : "Resolve Dispute"}
            </DialogTitle>
            <DialogDescription>
              Order ID: {selectedDispute?.order_id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Reason</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {selectedDispute?.reason}
              </p>
            </div>

            {selectedDispute?.status === "resolved" && selectedDispute.resolution && (
              <div>
                <p className="text-sm font-medium mb-1">Resolution</p>
                <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/30 p-3 rounded">
                  {selectedDispute.resolution}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Resolved on: {selectedDispute.resolved_at ? format(new Date(selectedDispute.resolved_at), "dd MMM yyyy HH:mm") : "—"}
                </p>
              </div>
            )}

            {selectedDispute?.status !== "resolved" && (
              <div>
                <p className="text-sm font-medium mb-1">Resolution</p>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe how this dispute was resolved..."
                  className="min-h-24"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Close
            </Button>
            {selectedDispute?.status !== "resolved" && (
              <Button 
                onClick={handleResolve} 
                disabled={!resolution.trim() || resolving}
                className="bg-green-600 hover:bg-green-700"
              >
                {resolving ? "Resolving..." : "Mark as Resolved"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DisputeCenter;
