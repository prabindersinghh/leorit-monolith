import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Package, Clock, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ManufacturerOnboardingModal from "@/components/ManufacturerOnboardingModal";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ManufacturerDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkOnboardingAndFetchOrders();

    // Setup realtime subscription
    const channel = supabase
      .channel('manufacturer-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkOnboardingAndFetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Check if onboarding is completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_type')
        .eq('id', user.id)
        .single();

      if (profile && !profile.onboarding_completed) {
        setShowOnboarding(true);
      }

      await fetchOrders();
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('manufacturer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          detailed_status: 'accepted_by_manufacturer',
          manufacturer_accept_time: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order accepted successfully");
      fetchOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error("Failed to accept order");
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'rejected_by_manufacturer',
          detailed_status: 'rejected_by_manufacturer',
          manufacturer_id: null,
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order declined");
      fetchOrders();
    } catch (error) {
      console.error('Error declining order:', error);
      toast.error("Failed to decline order");
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending').slice(0, 5);

  // Calculate real stats
  const activeOrders = orders.filter(o => 
    ['accepted', 'sample_in_production', 'bulk_in_production'].includes(o.status) ||
    ['SAMPLE_IN_PROGRESS', 'BULK_IN_PRODUCTION', 'BULK_QC_UPLOADED', 'PAYMENT_CONFIRMED'].includes(o.order_state)
  ).length;

  const pendingCount = orders.filter(o => 
    o.status === 'pending' || o.order_state === 'MANUFACTURER_ASSIGNED'
  ).length;

  // Calculate on-time rate from actual order data
  const completedOrders = orders.filter(o => 
    o.order_state === 'COMPLETED' || o.status === 'completed'
  );
  const onTimeOrders = completedOrders.filter(o => {
    if (!o.delivered_at || !o.estimated_delivery_date) return true;
    return new Date(o.delivered_at) <= new Date(o.estimated_delivery_date);
  });
  const onTimeRate = completedOrders.length > 0 
    ? Math.round((onTimeOrders.length / completedOrders.length) * 100)
    : 100;

  // Calculate escrow released (completed orders)
  const releasedAmount = orders
    .filter(o => o.order_state === 'COMPLETED' || o.escrow_status === 'fake_released')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const stats = [
    { title: "Active Orders", value: activeOrders.toString(), icon: Package, description: "In progress" },
    { title: "Pending Acceptance", value: pendingCount.toString(), icon: Clock, description: "New requests" },
    { title: "On-Time Rate", value: `${onTimeRate}%`, icon: TrendingUp, description: completedOrders.length > 0 ? `${onTimeOrders.length}/${completedOrders.length} orders` : "No completed orders" },
    { 
      title: "Escrow Released", 
      value: `₹${releasedAmount.toLocaleString()}`, 
      icon: DollarSign, 
      description: "Completed orders" 
    },
  ];

  const columns = [
    { header: "Order ID", accessor: "id", cell: (value: string) => value.slice(0, 8) },
    { header: "Product", accessor: "product_type" },
    { header: "Quantity", accessor: "quantity" },
    { 
      header: "Created", 
      accessor: "created_at",
      cell: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string) => (
        <div className="flex gap-2">
          <button 
            className="px-4 py-1 bg-foreground text-background rounded-lg text-sm hover:bg-foreground/80"
            onClick={() => handleAcceptOrder(value)}
          >
            Accept
          </button>
          <button 
            className="px-4 py-1 border border-border rounded-lg text-sm hover:bg-muted"
            onClick={() => handleDeclineOrder(value)}
          >
            Decline
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="manufacturer" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Manufacturer Dashboard</h1>
            <p className="text-muted-foreground">Manage production and incoming orders</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Pending Order Requests</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <DataTable columns={columns} data={pendingOrders} />
            )}
          </div>
        </div>
      </main>

      {/* Manufacturer Onboarding Modal */}
      {userId && (
        <ManufacturerOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userId={userId}
        />
      )}
    </div>
  );
};

export default ManufacturerDashboard;
