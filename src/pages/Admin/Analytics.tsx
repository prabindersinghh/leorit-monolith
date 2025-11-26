import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import { Package, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Analytics {
  totalSamples: number;
  totalBulk: number;
  sampleToBulkConversion: number;
  rejectionRate: number;
  avgQcUploadTime: number;
  avgSampleProductionTime: number;
  avgBulkProductionTime: number;
}

const Analytics = () => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSamples: 0,
    totalBulk: 0,
    sampleToBulkConversion: 0,
    rejectionRate: 0,
    avgQcUploadTime: 0,
    avgSampleProductionTime: 0,
    avgBulkProductionTime: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Fetch sample orders
    const { data: samples } = await supabase
      .from("orders")
      .select("*")
      .eq("quantity", 1);

    // Fetch bulk orders
    const { data: bulk } = await supabase
      .from("orders")
      .select("*")
      .gt("quantity", 1);

    // Calculate rejection rate
    const { data: rejected } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "rejected");

    const { data: allOrders } = await supabase.from("orders").select("id");

    // Calculate average QC upload time (from created to qc_uploaded)
    const { data: qcOrders } = await supabase
      .from("orders")
      .select("created_at, qc_uploaded_at")
      .not("qc_uploaded_at", "is", null);

    let avgQcTime = 0;
    if (qcOrders && qcOrders.length > 0) {
      const totalQcTime = qcOrders.reduce((sum, order) => {
        const created = new Date(order.created_at).getTime();
        const uploaded = new Date(order.qc_uploaded_at!).getTime();
        return sum + (uploaded - created) / (1000 * 60 * 60); // hours
      }, 0);
      avgQcTime = totalQcTime / qcOrders.length;
    }

    // Calculate average sample production time
    const { data: sampleProduction } = await supabase
      .from("orders")
      .select("sample_production_started_at, qc_uploaded_at")
      .eq("quantity", 1)
      .not("sample_production_started_at", "is", null)
      .not("qc_uploaded_at", "is", null);

    let avgSampleTime = 0;
    if (sampleProduction && sampleProduction.length > 0) {
      const totalTime = sampleProduction.reduce((sum, order) => {
        const started = new Date(order.sample_production_started_at!).getTime();
        const uploaded = new Date(order.qc_uploaded_at!).getTime();
        return sum + (uploaded - started) / (1000 * 60 * 60); // hours
      }, 0);
      avgSampleTime = totalTime / sampleProduction.length;
    }

    // Sample to bulk conversion (buyers who ordered sample then bulk)
    const { data: buyerSamples } = await supabase
      .from("orders")
      .select("buyer_id")
      .eq("quantity", 1);

    const { data: buyerBulk } = await supabase
      .from("orders")
      .select("buyer_id")
      .gt("quantity", 1);

    const sampleBuyers = new Set(buyerSamples?.map((o) => o.buyer_id) || []);
    const bulkBuyers = new Set(buyerBulk?.map((o) => o.buyer_id) || []);
    const converted = [...sampleBuyers].filter((b) => bulkBuyers.has(b)).length;
    const conversionRate = sampleBuyers.size > 0 ? (converted / sampleBuyers.size) * 100 : 0;

    setAnalytics({
      totalSamples: samples?.length || 0,
      totalBulk: bulk?.length || 0,
      sampleToBulkConversion: conversionRate,
      rejectionRate: allOrders?.length ? ((rejected?.length || 0) / allOrders.length) * 100 : 0,
      avgQcUploadTime: avgQcTime,
      avgSampleProductionTime: avgSampleTime,
      avgBulkProductionTime: 72, // Placeholder
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Samples"
            value={analytics.totalSamples}
            icon={Package}
            description="Sample orders"
          />
          <DashboardCard
            title="Total Bulk Orders"
            value={analytics.totalBulk}
            icon={Package}
            description="Bulk orders"
          />
          <DashboardCard
            title="Sample → Bulk Conversion"
            value={`${analytics.sampleToBulkConversion.toFixed(1)}%`}
            icon={TrendingUp}
            description="Conversion rate"
          />
          <DashboardCard
            title="Rejection Rate"
            value={`${analytics.rejectionRate.toFixed(1)}%`}
            icon={AlertTriangle}
            description="Rejected orders"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Avg QC Upload Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {analytics.avgQcUploadTime.toFixed(1)} hrs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Avg Sample Production
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {analytics.avgSampleProductionTime.toFixed(1)} hrs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Avg Bulk Production
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {analytics.avgBulkProductionTime.toFixed(1)} hrs
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
