import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import SampleQCReview from "@/components/SampleQCReview";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canTransitionTo, statusLabels, statusColors, OrderDetailedStatus } from "@/lib/orderStateMachine";

const OrderTracking = () => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Setup realtime subscription
    const channel = supabase
      .channel('buyer-orders')
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const markAsReceived = async (orderId: string, currentStatus: OrderDetailedStatus) => {
    const newStatus: OrderDetailedStatus = 'delivered';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          status: 'completed', // Backward compatibility
          sample_status: 'delivered' // Backward compatibility
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order marked as received!');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const columns = [
    { header: "Order ID", accessor: "id" },
    { header: "Product", accessor: "product_type" },
    { header: "Quantity", accessor: "quantity" },
    {
      header: "Detailed Status",
      accessor: "detailed_status",
      cell: (value: OrderDetailedStatus) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[value] || 'bg-gray-100 text-foreground'}`}>
          {statusLabels[value] || value}
        </span>
      ),
    },
    { 
      header: "Escrow", 
      accessor: "escrow_amount",
      cell: (value: number) => value ? `$${value.toLocaleString()}` : 'N/A'
    },
    { 
      header: "Date", 
      accessor: "created_at",
      cell: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string, row: any) => {
        const currentStatus = row.detailed_status as OrderDetailedStatus;
        
        return (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedOrder(value)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {currentStatus === 'dispatched' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => markAsReceived(value, currentStatus)}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="buyer" />

      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
        <div className="max-w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Tracking</h1>
            <p className="text-muted-foreground">Monitor all your bulk orders and samples</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            {loading ? (
              <div className="text-center py-12">Loading orders...</div>
            ) : (
              <DataTable columns={columns} data={orders} />
            )}
          </div>

          {/* Sample QC Section */}
          {selectedOrder && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Sample QC Review</h2>
              <SampleQCReview 
                orderId={selectedOrder}
                onStatusChange={() => fetchOrders()}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
