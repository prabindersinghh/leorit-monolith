/**
 * Admin Dashboard - Control Panel View
 * 
 * Shows ALL orders with:
 * - Current order_state
 * - Buyer purpose
 * - Assigned manufacturer
 * - QC status (sample + bulk)
 * - Delivery status
 * - Payment status (even if simulated)
 * 
 * Admin actions: Assign manufacturer, courier, resolve stuck orders
 * This is a control panel, NOT analytics.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import OrderDelayFlags from "@/components/OrderDelayFlags";
import BuyerPurposeBadge from "@/components/BuyerPurposeBadge";
import { Users, Package, AlertCircle, LogOut, RefreshCw, Eye, Factory, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ORDER_STATES = [
  'DRAFT', 'SUBMITTED', 'MANUFACTURER_ASSIGNED', 'SAMPLE_IN_PROGRESS',
  'SAMPLE_QC_UPLOADED', 'SAMPLE_APPROVED', 'BULK_UNLOCKED', 'BULK_IN_PRODUCTION',
  'BULK_QC_UPLOADED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'COMPLETED'
];

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalBuyers: 0,
    totalManufacturers: 0,
    totalOrders: 0,
    pendingQC: 0,
    completedOrders: 0,
    rejectedOrders: 0,
    unassignedOrders: 0,
    stuckOrders: 0
  });
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [repeatBuyerIds, setRepeatBuyerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [manufacturerMap, setManufacturerMap] = useState<Record<string, string>>({});
  
  // Filters
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

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

  // Apply filters when data or filters change
  useEffect(() => {
    let filtered = [...allOrders];
    
    // State filter
    if (stateFilter !== "all") {
      filtered = filtered.filter(o => o.order_state === stateFilter);
    }
    
    // Search filter (order ID, buyer purpose)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(query) ||
        o.buyer_purpose?.toLowerCase().includes(query) ||
        o.product_type?.toLowerCase().includes(query)
      );
    }
    
    setFilteredOrders(filtered);
  }, [allOrders, stateFilter, searchQuery]);

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

      // Fetch ALL orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      const ordersList = orders || [];
      const totalOrders = ordersList.length;
      const pendingQC = ordersList.filter(o => 
        o.order_state === 'SAMPLE_QC_UPLOADED' || o.order_state === 'BULK_QC_UPLOADED'
      ).length;
      const completedOrders = ordersList.filter(o => o.order_state === 'COMPLETED').length;
      const rejectedOrders = ordersList.filter(o => o.sample_status === 'rejected').length;
      const unassignedOrders = ordersList.filter(o => 
        o.order_state === 'SUBMITTED' && !o.manufacturer_id
      ).length;
      // Stuck orders: orders older than 3 days not yet in production
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const stuckOrders = ordersList.filter(o => 
        new Date(o.created_at) < threeDaysAgo &&
        ['DRAFT', 'SUBMITTED', 'MANUFACTURER_ASSIGNED'].includes(o.order_state)
      ).length;

      setMetrics({
        totalBuyers: buyers?.length || 0,
        totalManufacturers: manufacturers?.length || 0,
        totalOrders,
        pendingQC,
        completedOrders,
        rejectedOrders,
        unassignedOrders,
        stuckOrders
      });

      setAllOrders(ordersList);
      setFilteredOrders(ordersList);

      // Fetch manufacturer names for display
      const { data: mfrData } = await supabase
        .from('manufacturer_verifications')
        .select('user_id, company_name');
      
      const mfrMap: Record<string, string> = {};
      mfrData?.forEach(m => {
        mfrMap[m.user_id] = m.company_name;
      });
      setManufacturerMap(mfrMap);

      // Compute repeat buyer IDs (buyers with >= 2 bulk orders)
      const buyerBulkCounts: Record<string, number> = {};
      ordersList.filter(o => o.quantity > 1).forEach((order) => {
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
      title: "Total Orders",
      value: metrics.totalOrders,
      icon: Package,
      description: "All orders"
    },
    {
      title: "Pending QC Review",
      value: metrics.pendingQC,
      icon: AlertCircle,
      description: "Awaiting buyer approval"
    },
    {
      title: "Unassigned",
      value: metrics.unassignedOrders,
      icon: Factory,
      description: "Need manufacturer"
    },
    {
      title: "Stuck Orders",
      value: metrics.stuckOrders,
      icon: AlertTriangle,
      description: ">3 days not in production"
    }
  ];

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
      header: "Purpose",
      accessor: "buyer_purpose",
      cell: (value: string) => value ? <BuyerPurposeBadge purpose={value as any} /> : <span className="text-muted-foreground text-xs">-</span>
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
        <span className={`text-xs ${value ? 'text-green-600 font-medium' : 'text-amber-600 font-semibold'}`}>
          {value ? (manufacturerMap[value] || `${value.slice(0, 6)}...`) : '⚠ Unassigned'}
        </span>
      )
    },
    {
      header: "Sample QC",
      accessor: "sample_qc_video_url",
      cell: (value: string, row: any) => {
        const isApproved = row.sample_approved_at;
        const isUploaded = value || row.qc_video_url;
        return (
          <Badge variant={isApproved ? 'default' : isUploaded ? 'secondary' : 'outline'} className="text-xs">
            {isApproved ? '✓ Approved' : isUploaded ? 'Uploaded' : 'Pending'}
          </Badge>
        );
      }
    },
    {
      header: "Bulk QC",
      accessor: "bulk_qc_video_url",
      cell: (value: string, row: any) => {
        // Only show for bulk orders
        if (row.quantity === 1 && row.order_mode !== 'direct_bulk') {
          return <span className="text-muted-foreground text-xs">N/A</span>;
        }
        const isApproved = row.bulk_qc_approved_at;
        return (
          <Badge variant={isApproved ? 'default' : value ? 'secondary' : 'outline'} className="text-xs">
            {isApproved ? '✓ Approved' : value ? 'Uploaded' : 'Pending'}
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
      accessor: "escrow_status",
      cell: (value: string, row: any) => {
        const paymentColors: Record<string, string> = {
          'pending': 'bg-yellow-100 text-yellow-700',
          'fake_paid': 'bg-blue-100 text-blue-700',
          'fake_released': 'bg-green-100 text-green-700',
          'partial_released': 'bg-purple-100 text-purple-700',
          'refunded': 'bg-red-100 text-red-700',
        };
        const labels: Record<string, string> = {
          'pending': 'Pending',
          'fake_paid': 'In Escrow',
          'fake_released': 'Released',
          'partial_released': 'Partial',
          'refunded': 'Refunded',
        };
        return (
          <Badge className={paymentColors[value] || 'bg-gray-100 text-gray-700'} variant="outline">
            {labels[value] || value || 'Pending'}
          </Badge>
        );
      }
    },
    {
      header: "Delays",
      accessor: "acceptance_delay_hours",
      cell: (value: number, row: any) => (
        <OrderDelayFlags order={row} compact />
      )
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/admin/orders/${value}`)}
          title="View & Control"
        >
          <Eye className="w-4 h-4 mr-1" />
          Control
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
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Control Panel</h1>
              <p className="text-muted-foreground">Full order visibility and control</p>
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          {/* Platform Summary */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Platform Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{metrics.totalBuyers}</p>
                <p className="text-sm text-muted-foreground">Buyers</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{metrics.totalManufacturers}</p>
                <p className="text-sm text-muted-foreground">Manufacturers</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{metrics.completedOrders}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{metrics.rejectedOrders}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {metrics.totalOrders > 0 ? ((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Orders Table with Filters */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">All Orders ({filteredOrders.length})</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">State:</Label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {ORDER_STATES.map(state => (
                        <SelectItem key={state} value={state}>
                          {state.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Search:</Label>
                  <Input
                    placeholder="Order ID, purpose..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Button variant="outline" onClick={fetchAdminData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            <DataTable columns={orderColumns} data={filteredOrders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
