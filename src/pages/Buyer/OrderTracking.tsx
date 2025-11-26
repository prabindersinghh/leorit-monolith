import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import SampleQCReview from "@/components/SampleQCReview";
import PaymentTimeline from "@/components/PaymentTimeline";
import EscrowMoneyFlow from "@/components/EscrowMoneyFlow";
import { Button } from "@/components/ui/button";
import { Eye, Package, Clock, CheckCircle2, Truck, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canTransitionTo, statusLabels, statusColors, OrderDetailedStatus, isSampleOrder } from "@/lib/orderStateMachine";
import { format, parseISO } from "date-fns";

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

  const confirmDelivery = async (orderId: string, currentStatus: OrderDetailedStatus, escrowAmount: number) => {
    // Transition through delivered to completed
    if (!canTransitionTo(currentStatus, 'delivered')) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const now = new Date();
      
      // First update to delivered
      const { error: deliveredError } = await supabase
        .from('orders')
        .update({ 
          detailed_status: 'delivered',
          delivered_at: now.toISOString()
        })
        .eq('id', orderId);

      if (deliveredError) throw deliveredError;

      // Then immediately update to completed and release escrow
      const { error: completedError } = await supabase
        .from('orders')
        .update({ 
          detailed_status: 'completed',
          status: 'completed', // Backward compatibility
          sample_status: 'delivered', // Backward compatibility
          escrow_status: 'fake_released'
        })
        .eq('id', orderId);

      if (completedError) throw completedError;
      
      toast.success(
        `Order completed! ₹${escrowAmount.toLocaleString()} escrow released to manufacturer.`,
        { duration: 5000 }
      );
      fetchOrders();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    }
  };

  const columns = [
    { header: "Order ID", accessor: "id" },
    { header: "Product", accessor: "product_type" },
    { header: "Quantity", accessor: "quantity" },
    {
      header: "Status",
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
      cell: (value: number, row: any) => {
        const escrowStatus = row.escrow_status;
        return (
          <div className="space-y-1">
            <div className="font-semibold text-foreground">
              {value ? `₹${value.toLocaleString()}` : 'N/A'}
            </div>
            {row.escrow_locked_timestamp && !row.escrow_released_timestamp && (
              <div className="text-xs text-yellow-600 font-medium">In Escrow</div>
            )}
            {row.escrow_released_timestamp && (
              <div className="text-xs text-green-600 font-medium">Released</div>
            )}
          </div>
        );
      }
    },
    {
      header: "Estimated Delivery",
      accessor: "estimated_delivery_date",
      cell: (value: string, row: any) => {
        if (!value || row.detailed_status === 'completed' || row.detailed_status === 'delivered') return '-';
        return format(parseISO(value), 'MMM dd, yyyy');
      }
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
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {currentStatus === 'dispatched' && (
              <Button 
                size="sm"
                onClick={() => confirmDelivery(value, currentStatus, row.escrow_amount)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <Package className="w-4 h-4 mr-2" />
                YES, I RECEIVED MY ORDER
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

          {/* Payment Timeline Section - Only for Sample Orders */}
          {selectedOrder && (() => {
            const order = orders.find(o => o.id === selectedOrder);
            if (!order || !isSampleOrder(order.quantity)) return null;
            
            // Only show escrow flow if escrow has been locked (manufacturer accepted)
            if (!order.escrow_locked_timestamp) return null;
            
            // Determine escrow flow stage based on timestamps
            let escrowStage: "payment" | "locked" | "released" = "locked";
            if (order.escrow_released_timestamp) {
              escrowStage = "released";
            } else if (order.fake_payment_timestamp) {
              escrowStage = "payment";
            }

            return (
              <div className="mb-6">
                <EscrowMoneyFlow 
                  stage={escrowStage}
                  amount={order.escrow_amount || 500}
                  animated={false}
                />
                <div className="mt-6">
                  <PaymentTimeline
                    orderCreatedAt={order.created_at}
                    fakePaymentTimestamp={order.fake_payment_timestamp}
                    escrowLockedTimestamp={order.escrow_locked_timestamp}
                    sampleProductionStartedAt={order.sample_production_started_at}
                    qcUploadedAt={order.qc_uploaded_at}
                    sampleApprovedAt={order.sample_approved_at}
                    escrowReleasedTimestamp={order.escrow_released_timestamp}
                    escrowAmount={order.escrow_amount || 500}
                  />
                </div>
              </div>
            );
          })()}

          {/* Order Timeline Section */}
          {selectedOrder && (
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Order Timeline</h2>
              {(() => {
                const order = orders.find(o => o.id === selectedOrder);
                if (!order) return <p className="text-muted-foreground">Order not found</p>;

                const timelineEvents = [
                  {
                    label: "Order Created",
                    timestamp: order.created_at,
                    icon: Send,
                    color: "text-blue-600",
                    bgColor: "bg-blue-100",
                    show: true
                  },
                  {
                    label: "QC Uploaded",
                    timestamp: order.qc_uploaded_at,
                    icon: CheckCircle2,
                    color: "text-purple-600",
                    bgColor: "bg-purple-100",
                    show: !!order.qc_uploaded_at
                  },
                  {
                    label: "Sample Approved",
                    timestamp: order.sample_approved_at,
                    icon: CheckCircle2,
                    color: "text-green-600",
                    bgColor: "bg-green-100",
                    show: !!order.sample_approved_at
                  },
                  {
                    label: "Dispatched",
                    timestamp: order.dispatched_at,
                    icon: Truck,
                    color: "text-orange-600",
                    bgColor: "bg-orange-100",
                    show: !!order.dispatched_at
                  },
                  {
                    label: "Delivered",
                    timestamp: order.delivered_at,
                    icon: Package,
                    color: "text-green-700",
                    bgColor: "bg-green-200",
                    show: !!order.delivered_at
                  }
                ].filter(event => event.show);

                return (
                  <div className="space-y-4">
                    {timelineEvents.map((event, index) => {
                      const Icon = event.icon;
                      return (
                        <div key={index} className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${event.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${event.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{event.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(parseISO(event.timestamp), 'MMM dd, yyyy - hh:mm a')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

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
