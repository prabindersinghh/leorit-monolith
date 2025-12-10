import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import { Package, TrendingUp, Clock, Users, Truck, RefreshCw, Factory, CheckCircle, UserPlus, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Analytics {
  totalSamples: number;
  totalBulk: number;
  sampleToBulkConversion: number;
  avgQcUploadTime: number;
  avgManufacturerAcceptTime: number;
  avgDeliveryTime: number;
  repeatBuyerCount: number;
}

interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_timestamp: string;
  metadata: any;
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

interface ManufacturerStats {
  total: number;
  softOnboarded: number;
  verified: number;
  activeManufacturerEmail: string;
}

const Analytics = () => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSamples: 0,
    totalBulk: 0,
    sampleToBulkConversion: 0,
    avgQcUploadTime: 0,
    avgManufacturerAcceptTime: 0,
    avgDeliveryTime: 0,
    repeatBuyerCount: 0,
  });
  const [recentEvents, setRecentEvents] = useState<OrderEvent[]>([]);
  const [manufacturerStats, setManufacturerStats] = useState<ManufacturerStats>({
    total: 0,
    softOnboarded: 0,
    verified: 0,
    activeManufacturerEmail: "singhprabindersingh@gmail.com",
  });
  const [softOnboardedList, setSoftOnboardedList] = useState<ManufacturerVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchManufacturerStats();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch sample orders (quantity = 1)
      const { data: samples } = await supabase
        .from("orders")
        .select("*")
        .eq("quantity", 1);

      // Fetch bulk orders (quantity > 1)
      const { data: bulk } = await supabase
        .from("orders")
        .select("*")
        .gt("quantity", 1);

      // Calculate average QC upload time (from created to sample_qc_uploaded_at)
      const { data: qcOrders } = await supabase
        .from("orders")
        .select("created_at, sample_qc_uploaded_at")
        .not("sample_qc_uploaded_at", "is", null);

      let avgQcTime = 0;
      if (qcOrders && qcOrders.length > 0) {
        const totalQcTime = qcOrders.reduce((sum, order) => {
          const created = new Date(order.created_at).getTime();
          const uploaded = new Date(order.sample_qc_uploaded_at!).getTime();
          return sum + (uploaded - created) / (1000 * 60 * 60); // hours
        }, 0);
        avgQcTime = totalQcTime / qcOrders.length;
      }

      // Calculate average manufacturer accept time
      const { data: acceptOrders } = await supabase
        .from("orders")
        .select("created_at, manufacturer_accept_time")
        .not("manufacturer_accept_time", "is", null);

      let avgAcceptTime = 0;
      if (acceptOrders && acceptOrders.length > 0) {
        const totalAcceptTime = acceptOrders.reduce((sum, order) => {
          const created = new Date(order.created_at).getTime();
          const accepted = new Date(order.manufacturer_accept_time!).getTime();
          return sum + (accepted - created) / (1000 * 60 * 60); // hours
        }, 0);
        avgAcceptTime = totalAcceptTime / acceptOrders.length;
      }

      // Calculate average delivery time (from dispatched_at to delivered_at)
      const { data: deliveryOrders } = await supabase
        .from("orders")
        .select("dispatched_at, delivered_at")
        .not("dispatched_at", "is", null)
        .not("delivered_at", "is", null);

      let avgDeliveryTime = 0;
      if (deliveryOrders && deliveryOrders.length > 0) {
        const totalDeliveryTime = deliveryOrders.reduce((sum, order) => {
          const dispatched = new Date(order.dispatched_at!).getTime();
          const delivered = new Date(order.delivered_at!).getTime();
          return sum + (delivered - dispatched) / (1000 * 60 * 60 * 24); // days
        }, 0);
        avgDeliveryTime = totalDeliveryTime / deliveryOrders.length;
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

      // Repeat buyer count (buyers with more than 1 order)
      const { data: allBuyerOrders } = await supabase
        .from("orders")
        .select("buyer_id");

      const buyerOrderCounts: Record<string, number> = {};
      allBuyerOrders?.forEach((o) => {
        buyerOrderCounts[o.buyer_id] = (buyerOrderCounts[o.buyer_id] || 0) + 1;
      });
      const repeatBuyers = Object.values(buyerOrderCounts).filter((count) => count > 1).length;

      setAnalytics({
        totalSamples: samples?.length || 0,
        totalBulk: bulk?.length || 0,
        sampleToBulkConversion: conversionRate,
        avgQcUploadTime: avgQcTime,
        avgManufacturerAcceptTime: avgAcceptTime,
        avgDeliveryTime: avgDeliveryTime,
        repeatBuyerCount: repeatBuyers,
      });

      // Fetch recent order events
      const { data: events } = await supabase
        .from("order_events")
        .select("*")
        .order("event_timestamp", { ascending: false })
        .limit(50);

      setRecentEvents(events || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturerStats = async () => {
    try {
      // Fetch all manufacturer verifications
      const { data: manufacturers } = await supabase
        .from("manufacturer_verifications")
        .select("*");

      const total = manufacturers?.length || 0;
      const softOnboarded = manufacturers?.filter(m => m.soft_onboarded === true).length || 0;
      const verified = manufacturers?.filter(m => m.verified === true).length || 0;

      setManufacturerStats({
        total,
        softOnboarded,
        verified,
        activeManufacturerEmail: "singhprabindersingh@gmail.com",
      });

      // Filter soft-onboarded manufacturers for the list
      const softOnboardedManufacturers = manufacturers?.filter(m => m.soft_onboarded === true) || [];
      setSoftOnboardedList(softOnboardedManufacturers);
    } catch (error) {
      console.error("Error fetching manufacturer stats:", error);
    }
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
      mockup_generated: "bg-pink-100 text-pink-700",
      back_mockup_generated: "bg-fuchsia-100 text-fuchsia-700",
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
            <p className="text-muted-foreground">YC-critical metrics and order funnel insights</p>
          </div>

          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Samples"
              value={analytics.totalSamples}
              icon={Package}
              description="Sample orders (qty=1)"
            />
            <DashboardCard
              title="Total Bulk Orders"
              value={analytics.totalBulk}
              icon={Package}
              description="Bulk orders (qty>1)"
            />
            <DashboardCard
              title="Sample → Bulk"
              value={`${analytics.sampleToBulkConversion.toFixed(1)}%`}
              icon={TrendingUp}
              description="Conversion rate"
            />
            <DashboardCard
              title="Repeat Buyers"
              value={analytics.repeatBuyerCount}
              icon={Users}
              description="Multiple orders"
            />
          </div>

          {/* Time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Avg Manufacturer Accept
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {analytics.avgManufacturerAcceptTime > 0 
                    ? `${analytics.avgManufacturerAcceptTime.toFixed(1)} hrs`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">From order to acceptance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  Avg QC Upload Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {analytics.avgQcUploadTime > 0 
                    ? `${analytics.avgQcUploadTime.toFixed(1)} hrs`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">From order to QC upload</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  Avg Delivery Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {analytics.avgDeliveryTime > 0 
                    ? `${analytics.avgDeliveryTime.toFixed(1)} days`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">From dispatch to delivery</p>
              </CardContent>
            </Card>
          </div>

          {/* Manufacturers Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Manufacturers Summary</h2>
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
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
              <CardTitle>Order Events Timeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recent order lifecycle events (Sample → QC → Bulk)
              </p>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No events recorded yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
