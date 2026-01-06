/**
 * Manufacturer Verification Panel
 * 
 * Displays real manufacturer verification data from the database.
 * Admin can approve, verify, or deny manufacturer applications.
 */

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, RefreshCw, Shield, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ManufacturerVerification {
  id: string;
  user_id: string;
  company_name: string;
  location: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: string;
  status: string | null;
  soft_onboarded: boolean | null;
  verified: boolean | null;
  paused: boolean | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  notes: string | null;
}

const VerificationPanel = () => {
  const [verifications, setVerifications] = useState<ManufacturerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("manufacturer_verifications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      toast.error("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSoftOnboard = async (id: string) => {
    setProcessing(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("manufacturer_verifications")
        .update({
          soft_onboarded: true,
          status: "soft_onboarded",
          reviewed_at: now,
          reviewed_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Manufacturer soft-onboarded");
      fetchVerifications();
    } catch (error) {
      console.error("Error soft onboarding:", error);
      toast.error("Failed to soft onboard");
    } finally {
      setProcessing(null);
    }
  };

  const handleVerify = async (id: string) => {
    setProcessing(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("manufacturer_verifications")
        .update({
          verified: true,
          soft_onboarded: true,
          status: "verified",
          reviewed_at: now,
          reviewed_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Manufacturer fully verified");
      fetchVerifications();
    } catch (error) {
      console.error("Error verifying:", error);
      toast.error("Failed to verify");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("manufacturer_verifications")
        .update({
          status: "rejected",
          reviewed_at: now,
          reviewed_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Manufacturer application rejected");
      fetchVerifications();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (verification: ManufacturerVerification) => {
    if (verification.verified) {
      return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
    }
    if (verification.soft_onboarded) {
      return <Badge className="bg-blue-100 text-blue-700">Soft Onboarded</Badge>;
    }
    if (verification.status === "rejected") {
      return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    }
    if (verification.paused) {
      return <Badge className="bg-yellow-100 text-yellow-700">Paused</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">Pending</Badge>;
  };

  const columns = [
    { 
      header: "Company", 
      accessor: "company_name",
      cell: (value: string) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    { 
      header: "Location", 
      accessor: "location",
      cell: (_: string, row: ManufacturerVerification) => (
        <span className="text-sm text-muted-foreground">
          {row.city && row.state ? `${row.city}, ${row.state}` : row.location}
        </span>
      )
    },
    { header: "Capacity", accessor: "capacity" },
    { 
      header: "Submitted", 
      accessor: "submitted_at",
      cell: (value: string | null) => value ? format(new Date(value), "dd MMM yyyy") : "—"
    },
    { 
      header: "Status", 
      accessor: "status",
      cell: (_: string, row: ManufacturerVerification) => getStatusBadge(row)
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (id: string, row: ManufacturerVerification) => {
        const isProcessing = processing === id;
        const isPending = !row.verified && !row.soft_onboarded && row.status !== "rejected";
        const isSoftOnboarded = row.soft_onboarded && !row.verified;

        return (
          <div className="flex gap-2">
            {isPending && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => handleSoftOnboard(id)}
                  disabled={isProcessing}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Soft Onboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-green-600 hover:text-green-700"
                  onClick={() => handleVerify(id)}
                  disabled={isProcessing}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Verify
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleReject(id)}
                  disabled={isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {isSoftOnboarded && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-green-600 hover:text-green-700"
                onClick={() => handleVerify(id)}
                disabled={isProcessing}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Upgrade to Verified
              </Button>
            )}
            {row.verified && (
              <span className="text-xs text-muted-foreground">Fully verified</span>
            )}
            {row.status === "rejected" && (
              <span className="text-xs text-muted-foreground">Application rejected</span>
            )}
          </div>
        );
      },
    },
  ];

  // Summary stats
  const totalManufacturers = verifications.length;
  const pendingCount = verifications.filter(v => !v.verified && !v.soft_onboarded && v.status !== "rejected").length;
  const softOnboardedCount = verifications.filter(v => v.soft_onboarded && !v.verified).length;
  const verifiedCount = verifications.filter(v => v.verified).length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Manufacturer Verification</h1>
              <p className="text-muted-foreground">Review and approve manufacturer applications</p>
            </div>
            <Button variant="outline" onClick={fetchVerifications} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalManufacturers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Soft Onboarded</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{softOnboardedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              </div>
            ) : verifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No manufacturer verification requests yet.
              </div>
            ) : (
              <DataTable columns={columns} data={verifications} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerificationPanel;
