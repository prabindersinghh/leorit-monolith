import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Package, Clock, CheckCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DashboardHome = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Setup realtime subscription
    const channel = supabase
      .channel('buyer-dashboard')
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

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { title: "Active Orders", value: orders.filter(o => o.status === 'accepted').length.toString(), icon: Package, description: "In production" },
    { title: "Pending Samples", value: orders.filter(o => o.sample_status === 'qc_submitted').length.toString(), icon: Clock, description: "Awaiting QC" },
    { title: "Completed", value: orders.filter(o => o.status === 'completed').length.toString(), icon: CheckCircle, description: "This month" },
    { 
      title: "In Escrow", 
      value: `₹${orders.filter(o => o.escrow_status === 'fake_paid').reduce((sum, o) => sum + (o.escrow_amount || 0), 0).toLocaleString()}`, 
      icon: DollarSign, 
      description: "Protected funds" 
    },
  ];

  const columns = [
    { header: "Order ID", accessor: "id", cell: (value: string) => value.slice(0, 8) },
    { header: "Product", accessor: "product_type" },
    { header: "Quantity", accessor: "quantity" },
    { 
      header: "Status", 
      accessor: "status",
      cell: (value: string) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-foreground">
          {value}
        </span>
      )
    },
    { 
      header: "Created", 
      accessor: "created_at",
      cell: (value: string) => (
        <div className="text-sm">
          <div className="font-medium text-foreground">
            {new Date(value).toLocaleDateString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="buyer" />
      
      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
        <div className="max-w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your order overview.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Orders</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <DataTable columns={columns} data={orders} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardHome;
