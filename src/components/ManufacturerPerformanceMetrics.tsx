import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle, Truck, Package, XCircle } from "lucide-react";

/**
 * Raw performance metrics for a manufacturer
 * Computed from existing order timestamps - NO derived intelligence
 */
interface ManufacturerMetrics {
  manufacturerId: string;
  companyName: string;
  // Raw counts
  totalOrders: number;
  completedOrders: number;
  qcRejectionCount: number;
  orderFailureCount: number;
  // Average times (in hours for accept/QC, days for delivery)
  avgAcceptanceTimeHours: number | null;
  avgSampleQcDelayHours: number | null;
  avgBulkQcDelayHours: number | null;
  avgDeliveryDelayDays: number | null;
  // Raw timestamp arrays for drill-down
  acceptanceTimes: number[];
  sampleQcDelays: number[];
  bulkQcDelays: number[];
  deliveryDelays: number[];
}

interface Props {
  manufacturerId?: string; // If provided, show metrics for specific manufacturer
  showSummary?: boolean;   // If true, show aggregated summary across all manufacturers
}

const ManufacturerPerformanceMetrics = ({ manufacturerId, showSummary = false }: Props) => {
  const [metrics, setMetrics] = useState<ManufacturerMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [manufacturerId]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch all orders with manufacturer assignments
      let query = supabase
        .from("orders")
        .select("*")
        .not("manufacturer_id", "is", null);

      if (manufacturerId) {
        query = query.eq("manufacturer_id", manufacturerId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Fetch manufacturer profiles
      const manufacturerIds = [...new Set(orders?.map(o => o.manufacturer_id) || [])];
      const { data: verifications } = await supabase
        .from("manufacturer_verifications")
        .select("user_id, company_name")
        .in("user_id", manufacturerIds);

      const companyNames: Record<string, string> = {};
      verifications?.forEach(v => {
        companyNames[v.user_id] = v.company_name;
      });

      // Group orders by manufacturer
      const ordersByManufacturer: Record<string, any[]> = {};
      orders?.forEach(order => {
        const mId = order.manufacturer_id;
        if (!ordersByManufacturer[mId]) {
          ordersByManufacturer[mId] = [];
        }
        ordersByManufacturer[mId].push(order);
      });

      // Compute metrics for each manufacturer
      const computedMetrics: ManufacturerMetrics[] = Object.entries(ordersByManufacturer).map(
        ([mId, mOrders]) => {
          const acceptanceTimes: number[] = [];
          const sampleQcDelays: number[] = [];
          const bulkQcDelays: number[] = [];
          const deliveryDelays: number[] = [];
          let qcRejectionCount = 0;
          let orderFailureCount = 0;
          let completedOrders = 0;

          mOrders.forEach(order => {
            // Acceptance time: assigned_at → manufacturer_accept_time
            if (order.assigned_at && order.manufacturer_accept_time) {
              const assigned = new Date(order.assigned_at).getTime();
              const accepted = new Date(order.manufacturer_accept_time).getTime();
              const hoursToAccept = (accepted - assigned) / (1000 * 60 * 60);
              if (hoursToAccept >= 0) acceptanceTimes.push(hoursToAccept);
            }

            // Sample QC delay: sample_production_started_at → qc_uploaded_at
            if (order.sample_production_started_at && (order.qc_uploaded_at || order.sample_qc_uploaded_at)) {
              const started = new Date(order.sample_production_started_at).getTime();
              const uploaded = new Date(order.qc_uploaded_at || order.sample_qc_uploaded_at).getTime();
              const hoursDelay = (uploaded - started) / (1000 * 60 * 60);
              if (hoursDelay >= 0) sampleQcDelays.push(hoursDelay);
            }

            // Bulk QC delay: bulk_order_confirmed_at → dispatched_at (approximation)
            if (order.bulk_order_confirmed_at && order.dispatched_at) {
              const started = new Date(order.bulk_order_confirmed_at).getTime();
              const dispatched = new Date(order.dispatched_at).getTime();
              const hoursDelay = (dispatched - started) / (1000 * 60 * 60);
              if (hoursDelay >= 0) bulkQcDelays.push(hoursDelay);
            }

            // Delivery delay: dispatched_at → delivered_at
            if (order.dispatched_at && order.delivered_at) {
              const dispatched = new Date(order.dispatched_at).getTime();
              const delivered = new Date(order.delivered_at).getTime();
              const daysDelay = (delivered - dispatched) / (1000 * 60 * 60 * 24);
              if (daysDelay >= 0) deliveryDelays.push(daysDelay);
            }

            // QC rejection count
            if (order.sample_status === 'rejected' || order.detailed_status === 'sample_rejected_by_buyer') {
              qcRejectionCount++;
            }

            // Order failure flags
            if (order.rejection_reason || order.detailed_status === 'rejected_by_manufacturer') {
              orderFailureCount++;
            }

            // Completed orders
            if (order.detailed_status === 'completed' || order.status === 'completed') {
              completedOrders++;
            }
          });

          // Calculate averages
          const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

          return {
            manufacturerId: mId,
            companyName: companyNames[mId] || 'Unknown',
            totalOrders: mOrders.length,
            completedOrders,
            qcRejectionCount,
            orderFailureCount,
            avgAcceptanceTimeHours: avg(acceptanceTimes),
            avgSampleQcDelayHours: avg(sampleQcDelays),
            avgBulkQcDelayHours: avg(bulkQcDelays),
            avgDeliveryDelayDays: avg(deliveryDelays),
            acceptanceTimes,
            sampleQcDelays,
            bulkQcDelays,
            deliveryDelays,
          };
        }
      );

      setMetrics(computedMetrics);
    } catch (error) {
      console.error("Error fetching manufacturer metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (value: number | null, unit: string) => {
    if (value === null) return "—";
    return `${value.toFixed(1)} ${unit}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading performance metrics...
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No order data available for performance metrics
        </CardContent>
      </Card>
    );
  }

  // If showing summary, aggregate all metrics
  if (showSummary) {
    const allAcceptanceTimes = metrics.flatMap(m => m.acceptanceTimes);
    const allSampleQcDelays = metrics.flatMap(m => m.sampleQcDelays);
    const allBulkQcDelays = metrics.flatMap(m => m.bulkQcDelays);
    const allDeliveryDelays = metrics.flatMap(m => m.deliveryDelays);
    const totalQcRejections = metrics.reduce((sum, m) => sum + m.qcRejectionCount, 0);
    const totalFailures = metrics.reduce((sum, m) => sum + m.orderFailureCount, 0);
    const totalOrders = metrics.reduce((sum, m) => sum + m.totalOrders, 0);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manufacturer Performance Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggregated metrics across {metrics.length} manufacturer(s) • {totalOrders} orders
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold">{formatTime(avg(allAcceptanceTimes), "hrs")}</p>
              <p className="text-xs text-muted-foreground">Avg Accept Time</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold">{formatTime(avg(allSampleQcDelays), "hrs")}</p>
              <p className="text-xs text-muted-foreground">Sample QC Delay</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold">{formatTime(avg(allBulkQcDelays), "hrs")}</p>
              <p className="text-xs text-muted-foreground">Bulk QC Delay</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <Truck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold">{formatTime(avg(allDeliveryDelays), "days")}</p>
              <p className="text-xs text-muted-foreground">Delivery Delay</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
              <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
              <p className="text-xl font-bold text-red-600">{totalQcRejections}</p>
              <p className="text-xs text-muted-foreground">QC Rejections</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-xl font-bold text-amber-600">{totalFailures}</p>
              <p className="text-xs text-muted-foreground">Order Failures</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show individual manufacturer metrics
  return (
    <div className="space-y-4">
      {metrics.map((m) => (
        <Card key={m.manufacturerId}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{m.companyName}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{m.totalOrders} orders</Badge>
                <Badge variant="secondary">{m.completedOrders} completed</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{m.manufacturerId.slice(0, 8)}...</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold">{formatTime(m.avgAcceptanceTimeHours, "hrs")}</p>
                <p className="text-xs text-muted-foreground">Avg Accept</p>
                <p className="text-xs text-muted-foreground">({m.acceptanceTimes.length} samples)</p>
              </div>
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold">{formatTime(m.avgSampleQcDelayHours, "hrs")}</p>
                <p className="text-xs text-muted-foreground">Sample QC</p>
                <p className="text-xs text-muted-foreground">({m.sampleQcDelays.length} samples)</p>
              </div>
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold">{formatTime(m.avgBulkQcDelayHours, "hrs")}</p>
                <p className="text-xs text-muted-foreground">Bulk QC</p>
                <p className="text-xs text-muted-foreground">({m.bulkQcDelays.length} samples)</p>
              </div>
              <div className="p-2 bg-muted/30 rounded text-center">
                <p className="text-lg font-bold">{formatTime(m.avgDeliveryDelayDays, "days")}</p>
                <p className="text-xs text-muted-foreground">Delivery</p>
                <p className="text-xs text-muted-foreground">({m.deliveryDelays.length} samples)</p>
              </div>
              <div className={`p-2 rounded text-center ${m.qcRejectionCount > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/30'}`}>
                <p className={`text-lg font-bold ${m.qcRejectionCount > 0 ? 'text-red-600' : ''}`}>
                  {m.qcRejectionCount}
                </p>
                <p className="text-xs text-muted-foreground">QC Rejections</p>
              </div>
              <div className={`p-2 rounded text-center ${m.orderFailureCount > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                <p className={`text-lg font-bold ${m.orderFailureCount > 0 ? 'text-amber-600' : ''}`}>
                  {m.orderFailureCount}
                </p>
                <p className="text-xs text-muted-foreground">Failures</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ManufacturerPerformanceMetrics;
