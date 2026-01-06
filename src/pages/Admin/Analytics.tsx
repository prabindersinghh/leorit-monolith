import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import ManufacturerPerformanceMetrics from "@/components/ManufacturerPerformanceMetrics";
import { Package, TrendingUp, Clock, Users, Truck, RefreshCw, Factory, CheckCircle, UserPlus, Star, ShoppingBag, ArrowRightCircle, Layers, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface OrderMetrics {
  totalOrders: number;
  sampleOnlyOrders: number;
  sampleThenBulkOrders: number;
  directBulkOrders: number;
}

interface ConversionMetrics {
  sampleToBulkConversionRate: number;
  convertedCount: number;
  pendingConversion: number;
  terminalSampleOrders: number;
}

interface OperationalMetrics {
  avgSampleTurnaround: number;
  avgBulkTurnaround: number;
  avgDeliveryTime: number;
  qcApprovalRate: number;
  totalQcReviewed: number;
  totalQcApproved: number;
}

interface ManufacturerStats {
  total: number;
  softOnboarded: number;
  verified: number;
  activeManufacturerEmail: string;
}

interface ManufacturerVerification {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  soft_onboarded: boolean | null;
  verified: boolean | null;
  user_id: string;
}

interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_timestamp: string;
  metadata: any;
}

const Analytics = () => {
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics>({
    totalOrders: 0,
    sampleOnlyOrders: 0,
    sampleThenBulkOrders: 0,
    directBulkOrders: 0,
  });
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics>({
    sampleToBulkConversionRate: 0,
    convertedCount: 0,
    pendingConversion: 0,
    terminalSampleOrders: 0,
  });
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics>({
    avgSampleTurnaround: 0,
    avgBulkTurnaround: 0,
    avgDeliveryTime: 0,
    qcApprovalRate: 0,
    totalQcReviewed: 0,
    totalQcApproved: 0,
  });
  const [manufacturerStats, setManufacturerStats] = useState<ManufacturerStats>({
    total: 0,
    softOnboarded: 0,
    verified: 0,
    activeManufacturerEmail: "",
  });
  const [softOnboardedList, setSoftOnboardedList] = useState<ManufacturerVerification[]>([]);
  const [recentEvents, setRecentEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMetrics();
  }, []);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrderMetrics(),
        fetchOperationalMetrics(),
        fetchManufacturerStats(),
        fetchRecentEvents(),
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderMetrics = async () => {
    // Fetch all orders with their intent
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_intent, detailed_status, sample_approved_at, bulk_order_confirmed_at");

    if (!orders) return;

    const totalOrders = orders.length;
    const sampleOnlyOrders = orders.filter(o => o.order_intent === "sample_only").length;
    const sampleThenBulkOrders = orders.filter(o => o.order_intent === "sample_then_bulk").length;
    const directBulkOrders = orders.filter(o => o.order_intent === "direct_bulk").length;

    setOrderMetrics({
      totalOrders,
      sampleOnlyOrders,
      sampleThenBulkOrders,
      directBulkOrders,
    });

    // Conversion metrics (only for sample_then_bulk intent)
    const sampleThenBulkList = orders.filter(o => o.order_intent === "sample_then_bulk");
    
    // Converted = sample approved AND bulk confirmed
    const converted = sampleThenBulkList.filter(o => 
      o.sample_approved_at && o.bulk_order_confirmed_at
    ).length;
    
    // Pending = sample approved but bulk not yet confirmed
    const pendingConversion = sampleThenBulkList.filter(o => 
      o.sample_approved_at && !o.bulk_order_confirmed_at
    ).length;

    const conversionRate = sampleThenBulkList.length > 0 
      ? (converted / sampleThenBulkList.length) * 100 
      : 0;

    // Terminal sample orders = sample_only intent (these will never convert)
    const terminalSamples = sampleOnlyOrders;

    setConversionMetrics({
      sampleToBulkConversionRate: conversionRate,
      convertedCount: converted,
      pendingConversion,
      terminalSampleOrders: terminalSamples,
    });
  };

  const fetchOperationalMetrics = async () => {
    // Fetch orders with timing data
    const { data: orders } = await supabase
      .from("orders")
      .select(`
        order_intent,
        sample_production_started_at,
        sample_qc_uploaded_at,
        sample_approved_at,
        bulk_order_confirmed_at,
        qc_uploaded_at,
        dispatched_at,
        delivered_at,
        qc_status,
        sample_status
      `);

    if (!orders) return;

    // Avg sample turnaround: sample_production_started → sample_qc_uploaded
    const sampleOrders = orders.filter(o => 
      o.sample_production_started_at && o.sample_qc_uploaded_at
    );
    let avgSampleTurnaround = 0;
    if (sampleOrders.length > 0) {
      const totalTime = sampleOrders.reduce((sum, o) => {
        const start = new Date(o.sample_production_started_at!).getTime();
        const end = new Date(o.sample_qc_uploaded_at!).getTime();
        return sum + (end - start) / (1000 * 60 * 60 * 24); // days
      }, 0);
      avgSampleTurnaround = totalTime / sampleOrders.length;
    }

    // Avg bulk turnaround: bulk_order_confirmed → qc_uploaded (for bulk)
    const bulkOrders = orders.filter(o => 
      o.bulk_order_confirmed_at && o.qc_uploaded_at
    );
    let avgBulkTurnaround = 0;
    if (bulkOrders.length > 0) {
      const totalTime = bulkOrders.reduce((sum, o) => {
        const start = new Date(o.bulk_order_confirmed_at!).getTime();
        const end = new Date(o.qc_uploaded_at!).getTime();
        return sum + (end - start) / (1000 * 60 * 60 * 24); // days
      }, 0);
      avgBulkTurnaround = totalTime / bulkOrders.length;
    }

    // Avg delivery time: dispatched → delivered
    const deliveredOrders = orders.filter(o => 
      o.dispatched_at && o.delivered_at
    );
    let avgDeliveryTime = 0;
    if (deliveredOrders.length > 0) {
      const totalTime = deliveredOrders.reduce((sum, o) => {
        const start = new Date(o.dispatched_at!).getTime();
        const end = new Date(o.delivered_at!).getTime();
        return sum + (end - start) / (1000 * 60 * 60 * 24); // days
      }, 0);
      avgDeliveryTime = totalTime / deliveredOrders.length;
    }

    // QC approval rate: approved / (approved + rejected)
    const qcReviewed = orders.filter(o => 
      o.qc_status === "approved" || o.qc_status === "rejected" ||
      o.sample_status === "approved" || o.sample_status === "rejected"
    );
    const qcApproved = orders.filter(o => 
      o.qc_status === "approved" || o.sample_status === "approved"
    );
    const qcApprovalRate = qcReviewed.length > 0 
      ? (qcApproved.length / qcReviewed.length) * 100 
      : 0;

    setOperationalMetrics({
      avgSampleTurnaround,
      avgBulkTurnaround,
      avgDeliveryTime,
      qcApprovalRate,
      totalQcReviewed: qcReviewed.length,
      totalQcApproved: qcApproved.length,
    });
  };

  const fetchManufacturerStats = async () => {
    const { data: manufacturers } = await supabase
      .from("manufacturer_verifications")
      .select("*");

    const total = manufacturers?.length || 0;
    const softOnboarded = manufacturers?.filter(m => m.soft_onboarded === true).length || 0;
    const verified = manufacturers?.filter(m => m.verified === true).length || 0;

    // Find the most recently active manufacturer
    const activeManufacturer = manufacturers?.find(m => m.verified || m.soft_onboarded);
    
    setManufacturerStats({
      total,
      softOnboarded,
      verified,
      activeManufacturerEmail: "", // Removed hardcoded email - no longer displayed
    });

    const softOnboardedManufacturers = manufacturers?.filter(m => m.soft_onboarded === true) || [];
    setSoftOnboardedList(softOnboardedManufacturers);
  };

  const fetchRecentEvents = async () => {
    const { data: events } = await supabase
      .from("order_events")
      .select("*")
      .order("event_timestamp", { ascending: false })
      .limit(30);

    setRecentEvents(events || []);
  };

  const getEventBadgeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      sample_created: "bg-blue-100 text-blue-700",
      bulk_created: "bg-indigo-100 text-indigo-700",
      manufacturer_accepted: "bg-green-100 text-green-700",
      manufacturer_rejected: "bg-red-100 text-red-700",
      sample_production_started: "bg-purple-100 text-purple-700",
      qc_uploaded: "bg-yellow-100 text-yellow-700",
      qc_approved: "bg-emerald-100 text-emerald-700",
      bulk_production_started: "bg-cyan-100 text-cyan-700",
      dispatched: "bg-orange-100 text-orange-700",
      delivered: "bg-teal-100 text-teal-700",
    };
    return colors[eventType] || "bg-gray-100 text-gray-700";
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole="admin" />
        <div className="flex-1 p-8 ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Intent-aware metrics and operational insights</p>
          </div>

          {/* Order Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Order Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard
                title="Total Orders"
                value={orderMetrics.totalOrders}
                icon={Package}
                description="All orders"
              />
              <DashboardCard
                title="Sample-Only"
                value={orderMetrics.sampleOnlyOrders}
                icon={ShoppingBag}
                description="Intent: sample_only"
              />
              <DashboardCard
                title="Sample → Bulk"
                value={orderMetrics.sampleThenBulkOrders}
                icon={ArrowRightCircle}
                description="Intent: sample_then_bulk"
              />
              <DashboardCard
                title="Direct Bulk"
                value={orderMetrics.directBulkOrders}
                icon={Layers}
                description="Intent: direct_bulk"
              />
            </div>
          </div>

          {/* Conversion Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Conversion Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-2 border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Sample → Bulk Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {conversionMetrics.sampleToBulkConversionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only sample_then_bulk intent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Converted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {conversionMetrics.convertedCount}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sample approved + bulk confirmed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-amber-600" />
                    Pending Conversion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {conversionMetrics.pendingConversion}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sample approved, awaiting bulk
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    Terminal Samples
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {conversionMetrics.terminalSampleOrders}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    sample_only intent (no bulk)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Operational Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCw className="h-5 w-5 text-purple-600" />
                    Avg Sample Turnaround
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {operationalMetrics.avgSampleTurnaround > 0 
                      ? `${operationalMetrics.avgSampleTurnaround.toFixed(1)} days`
                      : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Production start → QC upload
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-5 w-5 text-indigo-600" />
                    Avg Bulk Turnaround
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {operationalMetrics.avgBulkTurnaround > 0 
                      ? `${operationalMetrics.avgBulkTurnaround.toFixed(1)} days`
                      : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bulk confirmed → QC upload
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-5 w-5 text-orange-600" />
                    Avg Delivery Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {operationalMetrics.avgDeliveryTime > 0 
                      ? `${operationalMetrics.avgDeliveryTime.toFixed(1)} days`
                      : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dispatch → Delivered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Percent className="h-5 w-5 text-emerald-600" />
                    QC Approval Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {operationalMetrics.qcApprovalRate > 0 
                      ? `${operationalMetrics.qcApprovalRate.toFixed(1)}%`
                      : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {operationalMetrics.totalQcApproved} / {operationalMetrics.totalQcReviewed} reviewed
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Manufacturer Performance Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Manufacturer Performance Metrics</h2>
            <ManufacturerPerformanceMetrics showSummary />
          </div>

          {/* Manufacturer Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Manufacturer Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <DashboardCard
                title="Total Manufacturers"
                value={manufacturerStats.total}
                icon={Factory}
                description="All registered"
              />
              <DashboardCard
                title="Soft-Onboarded"
                value={manufacturerStats.softOnboarded}
                icon={UserPlus}
                description="Ready for orders"
              />
              <DashboardCard
                title="Verified"
                value={manufacturerStats.verified}
                icon={CheckCircle}
                description="Fully verified"
              />
              <Card className="border-2 border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-5 w-5 text-primary" />
                    Active Manufacturer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-foreground truncate">
                    {manufacturerStats.activeManufacturerEmail}
                  </p>
                  <Badge className="mt-2 bg-primary text-primary-foreground">Currently Routing</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Soft-Onboarded List */}
            {softOnboardedList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Soft-Onboarded Manufacturers</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manufacturers ready for future order assignment
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {softOnboardedList.map((manufacturer) => (
                      <div
                        key={manufacturer.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {manufacturer.company_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {[manufacturer.city, manufacturer.state].filter(Boolean).join(", ") || "Location not specified"}
                          </span>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700">Soft-Onboarded</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Events Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Order Events</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest order lifecycle events
              </p>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No events recorded yet</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getEventBadgeColor(event.event_type)}>
                          {formatEventType(event.event_type)}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          Order: {event.order_id.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(event.event_timestamp), "MMM d, HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
