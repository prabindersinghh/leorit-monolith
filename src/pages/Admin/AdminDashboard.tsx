import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Users, Package, AlertCircle, LogOut, RefreshCw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalBuyers: 0,
    totalManufacturers: 0,
    totalOrders: 0,
    pendingQC: 0,
    completedOrders: 0,
    rejectedOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [repeatBuyerIds, setRepeatBuyerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleForceLogoutBuyers = async () => {
    setLoggingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to perform this action");
        return;
      }

      const response = await supabase.functions.invoke("force-logout-buyers", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast.success(`All buyer sessions have been logged out successfully. (${response.data.count} buyers)`);
    } catch (error: any) {
      console.error("Error forcing logout:", error);
      toast.error(error.message || "Failed to logout buyers");
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch user counts
      const { data: buyers } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact' })
        .eq('role', 'buyer');

      const { data: manufacturers } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact' })
        .eq('role', 'manufacturer');

      // Fetch order statistics
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*');

      const totalOrders = allOrders?.length || 0;
      const pendingQC = allOrders?.filter(o => o.sample_status === 'qc_uploaded').length || 0;
      const completedOrders = allOrders?.filter(o => o.sample_status === 'approved').length || 0;
      const rejectedOrders = allOrders?.filter(o => o.sample_status === 'rejected').length || 0;

      setMetrics({
        totalBuyers: buyers?.length || 0,
        totalManufacturers: manufacturers?.length || 0,
        totalOrders,
        pendingQC,
        completedOrders,
        rejectedOrders
      });

      // Get recent orders
      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentOrders(recent || []);

      // Compute repeat buyer IDs (buyers with >= 2 bulk orders)
      const { data: allBulkOrders } = await supabase
        .from('orders')
        .select('buyer_id')
        .gt('quantity', 1);

      const buyerBulkCounts: Record<string, number> = {};
      allBulkOrders?.forEach((order) => {
        buyerBulkCounts[order.buyer_id] = (buyerBulkCounts[order.buyer_id] || 0) + 1;
      });

      const repeatBuyers = new Set(
        Object.entries(buyerBulkCounts)
          .filter(([_, count]) => count >= 2)
          .map(([buyerId]) => buyerId)
      );
      setRepeatBuyerIds(repeatBuyers);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: "Total Buyers",
      value: metrics.totalBuyers,
      icon: Users,
      description: "Registered buyers"
    },
    {
      title: "Total Manufacturers",
      value: metrics.totalManufacturers,
      icon: Users,
      description: "Active manufacturers"
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders,
      icon: Package,
      description: "All time orders"
    },
    {
      title: "Pending QC",
      value: metrics.pendingQC,
      icon: AlertCircle,
      description: "Awaiting review"
    }
  ];

  const navigate = useNavigate();

  const orderColumns = [
    {
      header: "Order ID",
      accessor: "id",
      cell: (value: string, row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{value.slice(0, 8)}</span>
          {repeatBuyerIds.has(row.buyer_id) && (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
              <RefreshCw className="h-2.5 w-2.5" />
              Repeat
            </Badge>
          )}
        </div>
      )
    },
    {
      header: "Order State",
      accessor: "order_state",
      cell: (value: string) => {
        const stateColors: Record<string, string> = {
          'DRAFT': 'bg-gray-100 text-gray-700',
          'SUBMITTED': 'bg-blue-100 text-blue-700',
          'MANUFACTURER_ASSIGNED': 'bg-indigo-100 text-indigo-700',
          'SAMPLE_IN_PROGRESS': 'bg-purple-100 text-purple-700',
          'SAMPLE_QC_UPLOADED': 'bg-yellow-100 text-yellow-700',
          'SAMPLE_APPROVED': 'bg-green-100 text-green-700',
          'BULK_UNLOCKED': 'bg-teal-100 text-teal-700',
          'BULK_IN_PRODUCTION': 'bg-orange-100 text-orange-700',
          'BULK_QC_UPLOADED': 'bg-amber-100 text-amber-700',
          'READY_FOR_DISPATCH': 'bg-cyan-100 text-cyan-700',
          'DISPATCHED': 'bg-sky-100 text-sky-700',
          'DELIVERED': 'bg-emerald-100 text-emerald-700',
          'COMPLETED': 'bg-green-100 text-green-700',
        };
        return (
          <Badge className={stateColors[value] || 'bg-gray-100 text-gray-700'}>
            {value?.replace(/_/g, ' ') || 'N/A'}
          </Badge>
        );
      }
    },
    {
      header: "Manufacturer",
      accessor: "manufacturer_id",
      cell: (value: string) => (
        <span className={`text-xs ${value ? 'text-green-600 font-medium' : 'text-amber-600'}`}>
          {value ? `${value.slice(0, 6)}...` : '⚠ Unassigned'}
        </span>
      )
    },
    {
      header: "QC",
      accessor: "qc_status",
      cell: (value: string, row: any) => {
        const hasQC = row.sample_qc_video_url || row.bulk_qc_video_url || row.qc_video_url;
        return (
          <Badge variant={
            value === 'approved' ? 'default' :
            value === 'rejected' ? 'destructive' :
            hasQC ? 'secondary' : 'outline'
          } className="text-xs">
            {value === 'approved' ? '✓' : value === 'rejected' ? '✗' : hasQC ? 'Uploaded' : 'Pending'}
          </Badge>
        );
      }
    },
    {
      header: "Delivery",
      accessor: "delivery_status",
      cell: (value: string) => {
        const deliveryColors: Record<string, string> = {
          'NOT_STARTED': 'bg-gray-100 text-gray-700',
          'PACKED': 'bg-blue-100 text-blue-700',
          'PICKUP_SCHEDULED': 'bg-purple-100 text-purple-700',
          'IN_TRANSIT': 'bg-orange-100 text-orange-700',
          'DELIVERED': 'bg-green-100 text-green-700',
        };
        return (
          <Badge className={deliveryColors[value] || 'bg-gray-100 text-gray-700'} variant="outline">
            {value?.replace(/_/g, ' ') || 'Pending'}
          </Badge>
        );
      }
    },
    {
      header: "Payment",
      accessor: "payment_state",
      cell: (value: string, row: any) => {
        const displayValue = value || (row.escrow_status === 'fake_paid' ? 'PAYMENT_HELD' : 
                             row.escrow_status === 'fake_released' ? 'PAYMENT_RELEASED' : 'PAYMENT_INITIATED');
        const paymentColors: Record<string, string> = {
          'PAYMENT_INITIATED': 'bg-yellow-100 text-yellow-700',
          'PAYMENT_HELD': 'bg-blue-100 text-blue-700',
          'PAYMENT_RELEASABLE': 'bg-purple-100 text-purple-700',
          'PAYMENT_RELEASED': 'bg-green-100 text-green-700',
          'PAYMENT_REFUNDED': 'bg-red-100 text-red-700',
        };
        return (
          <Badge className={paymentColors[displayValue] || 'bg-gray-100 text-gray-700'} variant="outline">
            {displayValue === 'PAYMENT_HELD' ? 'Escrow' : 
             displayValue === 'PAYMENT_RELEASED' ? 'Released' : 
             displayValue === 'PAYMENT_INITIATED' ? 'Pending' :
             displayValue?.replace('PAYMENT_', '') || 'N/A'}
          </Badge>
        );
      }
    },
    {
      header: "Total",
      accessor: "total_amount",
      cell: (value: number) => (
        <span className="font-semibold text-xs">
          {value ? `₹${value.toLocaleString()}` : 'N/A'}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(`/admin/orders/${value}`)}
          title="View Full Details"
        >
          <Eye className="w-4 h-4" />
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="admin" />
      
      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
        <div className="max-w-full">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform overview and monitoring</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loggingOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {loggingOut ? "Logging out..." : "Force Logout All Buyers"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Force Logout All Buyers</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure? This will log out ALL buyers from ALL devices. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleForceLogoutBuyers} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Logout All Buyers
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Platform Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{metrics.completedOrders}</p>
                <p className="text-sm text-muted-foreground">Completed Orders</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{metrics.rejectedOrders}</p>
                <p className="text-sm text-muted-foreground">Rejected Orders</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {metrics.totalOrders > 0 ? ((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Orders</h2>
            <DataTable columns={orderColumns} data={recentOrders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
