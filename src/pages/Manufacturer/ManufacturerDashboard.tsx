import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardCard from "@/components/DashboardCard";
import DataTable from "@/components/DataTable";
import { Package, Clock, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ManufacturerDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

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

  const pendingOrders = orders.filter(o => o.status === 'pending').slice(0, 5);

  const stats = [
    { title: "Active Orders", value: orders.filter(o => o.status === 'accepted').length.toString(), icon: Package, description: "In progress" },
    { title: "Pending Acceptance", value: orders.filter(o => o.status === 'pending').length.toString(), icon: Clock, description: "New requests" },
    { title: "On-Time Rate", value: "96%", icon: TrendingUp, description: "+2% this month" },
    { 
      title: "Escrow Released", 
      value: `₹${orders.filter(o => o.escrow_status === 'fake_released').reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}`, 
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
      cell: () => (
        <div className="flex gap-2">
          <button className="px-4 py-1 bg-foreground text-background rounded-lg text-sm hover:bg-gray-800">
            Accept
          </button>
          <button className="px-4 py-1 border border-border rounded-lg text-sm hover:bg-gray-50">
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
    </div>
  );
};

export default ManufacturerDashboard;
