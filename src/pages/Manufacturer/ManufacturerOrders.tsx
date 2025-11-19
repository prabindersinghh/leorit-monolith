import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

const ManufacturerOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Setup realtime subscription
    const channel = supabase
      .channel('manufacturer-orders')
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
      toast.error("Failed to load orders");
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
          sample_status: 'in_production'
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order accepted!");
      fetchOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error("Failed to accept order");
    }
  };

  const handleDispatchOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'dispatched',
          sample_status: 'dispatched'
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order dispatched!");
      fetchOrders();
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast.error("Failed to dispatch order");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          rejection_reason: 'Manufacturer declined the order'
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order rejected");
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error("Failed to reject order");
    }
  };

  const columns = [
    {
      header: "Order ID",
      accessor: "id",
      cell: (value: string) => <span className="font-mono text-xs">{value.slice(0, 8)}</span>
    },
    {
      header: "Product",
      accessor: "product_type",
    },
    {
      header: "Quantity",
      accessor: "quantity",
    },
    {
      header: "Escrow Status",
      accessor: "escrow_amount",
      cell: (value: number) => (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          ${value?.toFixed(2) || '0.00'} in Escrow
        </Badge>
      )
    },
    {
      header: "Sample Status",
      accessor: "sample_status",
      cell: (value: string) => {
        const statusColors: Record<string, string> = {
          'not_started': 'bg-gray-100 text-gray-700',
          'in_production': 'bg-blue-100 text-blue-700',
          'qc_uploaded': 'bg-yellow-100 text-yellow-700',
          'approved': 'bg-green-100 text-green-700',
          'rejected': 'bg-red-100 text-red-700',
        };
        return (
          <Badge className={statusColors[value] || 'bg-gray-100 text-gray-700'}>
            {value?.replace('_', ' ') || 'Not Started'}
          </Badge>
        );
      }
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string, row: any) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => handleAcceptOrder(value)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRejectOrder(value)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </>
          )}
          {row.status === 'accepted' && row.sample_status === 'in_production' && (
            <Button
              size="sm"
              onClick={() => window.location.href = '/manufacturer/qc'}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Upload QC
            </Button>
          )}
          {row.sample_status === 'approved' && row.status !== 'dispatched' && (
            <Button
              size="sm"
              onClick={() => handleDispatchOrder(value)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Dispatch Order
            </Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="manufacturer" />
      
      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64 overflow-x-auto">
        <div className="max-w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Management</h1>
            <p className="text-muted-foreground">View and manage orders assigned to you</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={orders} />
          )}
        </div>
      </main>
    </div>
  );
};

export default ManufacturerOrders;
