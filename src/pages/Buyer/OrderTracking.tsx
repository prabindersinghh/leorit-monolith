import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import SampleQCReview from "@/components/SampleQCReview";
import PaymentTimeline from "@/components/PaymentTimeline";
import EscrowMoneyFlow from "@/components/EscrowMoneyFlow";
import OrderModeInfoBanner from "@/components/OrderModeInfoBanner";
import BuyerDeliveryTracking from "@/components/BuyerDeliveryTracking";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eye, Package, Clock, CheckCircle2, Truck, Send, CreditCard, Info, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canTransitionTo, OrderDetailedStatus, isSampleOrder } from "@/lib/orderStateMachine";
import { buyerStatusLabels, buyerStatusColors, getBuyerDisplayStatus, isAwaitingReview } from "@/lib/buyerStatusLabels";
import { getOrderMode } from "@/lib/orderModeUtils";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { PAYMENT_CONSTANTS } from "@/lib/orderStatusConstants";
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

  const confirmDelivery = async (orderId: string, currentStatus: OrderDetailedStatus, order: any) => {
    // Transition through delivered to completed
    if (!canTransitionTo(currentStatus, 'delivered')) {
      toast.error("Invalid state transition");
      return;
    }

    const orderMode = getOrderMode(order); // Use order_mode for explicit enforcement
    const orderIntent = order.order_intent; // Backward compatibility
    const totalOrderValue = order.total_order_value || order.escrow_amount || 0;
    const upfrontAmount = order.upfront_payable_amount || order.escrow_amount || 0;

    try {
      const now = new Date().toISOString();
      
      // First update to delivered
      const { error: deliveredError } = await supabase
        .from('orders')
        .update({ 
          detailed_status: 'delivered',
          delivered_at: now,
          delivery_status: 'delivered'
        })
        .eq('id', orderId);

      if (deliveredError) throw deliveredError;
      
      // Log delivery event
      await logOrderEvent(orderId, 'delivered', { 
        orderIntent, 
        deliveredAt: now 
      });

      // =====================================================
      // PAYMENT RELEASE ENFORCEMENT (order_mode aware)
      // Remaining 45% can ONLY be released if:
      // 1. Bulk QC is approved (for bulk orders)
      // 2. Delivery is confirmed (we just did this)
      // =====================================================
      
      let canReleaseRemainingPayment = false;
      let releaseReason = '';
      
      if (orderMode === 'sample_only') {
        // Sample-only: No remaining payment - upfront was already released at sample approval
        canReleaseRemainingPayment = false;
        releaseReason = 'sample_only_no_remaining';
      } else if (orderMode === 'sample_then_bulk' || orderMode === 'direct_bulk') {
        // Bulk orders: Check if bulk QC was approved
        // Bulk QC is considered approved if detailed_status reached 'dispatched' 
        // (which means it passed through bulk production)
        const bulkQCApproved = currentStatus === 'dispatched' && order.sample_approved_at;
        
        if (bulkQCApproved) {
          canReleaseRemainingPayment = true;
          releaseReason = 'bulk_qc_approved_and_delivered';
        } else {
          canReleaseRemainingPayment = false;
          releaseReason = 'bulk_qc_not_approved';
        }
      } else {
        // Legacy orders without order_mode - use existing behavior
        canReleaseRemainingPayment = true;
        releaseReason = 'legacy_order';
      }

      // Calculate remaining amount (45% of total)
      const remainingAmount = Math.round(totalOrderValue * PAYMENT_CONSTANTS.REMAINING_PAYMENT_RATIO);

      // Update to completed and handle escrow release
      const updateData: any = {
        detailed_status: 'completed',
        status: 'completed',
        sample_status: 'delivered',
        bulk_status: orderMode === 'sample_only' ? 'not_started' : 'completed',
        escrow_status: canReleaseRemainingPayment ? 'fake_released' : 'partial_released',
        escrow_released_timestamp: now
      };

      const { error: completedError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (completedError) throw completedError;

      // Log payment release events
      if (canReleaseRemainingPayment) {
        await logOrderEvent(orderId, 'remaining_payment_released', {
          amount: remainingAmount,
          reason: releaseReason,
          totalOrderValue,
          upfrontAmount,
          remainingAmount
        });
        
        await logOrderEvent(orderId, 'full_payment_released', {
          totalOrderValue,
          upfrontAmount,
          remainingAmount,
          orderMode,
          orderIntent
        });
        
        toast.success(
          `Order completed! Full payment ₹${totalOrderValue.toLocaleString()} released to manufacturer.`,
          { duration: 5000 }
        );
      } else {
        // Log that remaining payment was NOT released
        await logOrderEvent(orderId, 'delivered', {
          remainingPaymentHeld: true,
          reason: releaseReason,
          heldAmount: remainingAmount
        });
        
        toast.success(
          `Order delivered! Upfront payment ₹${upfrontAmount.toLocaleString()} released.`,
          { duration: 5000 }
        );
      }
      
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
      cell: (value: OrderDetailedStatus, row: any) => {
        const displayStatus = getBuyerDisplayStatus(row);
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${displayStatus.color}`}>
            {displayStatus.label}
          </span>
        );
      },
    },
    { 
      header: "Payment", 
      accessor: "escrow_amount",
      cell: (value: number, row: any) => {
        const displayStatus = getBuyerDisplayStatus(row);
        return (
          <div className="space-y-1">
            <div className="font-semibold text-foreground">
              {value ? `₹${value.toLocaleString()}` : 'N/A'}
            </div>
            {displayStatus.showPaymentPending && (
              <div className="text-xs text-orange-600 font-medium">Awaiting Payment</div>
            )}
            {row.escrow_locked_timestamp && !row.escrow_released_timestamp && !displayStatus.showPaymentPending && (
              <div className="text-xs text-green-600 font-medium">Paid & Secured</div>
            )}
            {row.escrow_released_timestamp && (
              <div className="text-xs text-green-600 font-medium">Completed</div>
            )}
          </div>
        );
      }
    },
    {
      header: "Total",
      accessor: "total_amount",
      cell: (value: number, row: any) => (
        <div className="space-y-1">
          <div className="font-bold text-foreground">
            {value ? `₹${value.toLocaleString()}` : 'N/A'}
          </div>
          {row.delivery_cost && (
            <div className="text-xs text-muted-foreground">
              (incl. ₹{row.delivery_cost} delivery)
            </div>
          )}
        </div>
      )
    },
    {
      header: "Estimated Delivery",
      accessor: "estimated_delivery_date",
      cell: (value: string, row: any) => {
        // Only show estimated delivery if dispatched
        if (!value || !row.dispatched_at) return '-';
        if (row.detailed_status === 'completed' || row.detailed_status === 'delivered') return 'Delivered';
        return format(parseISO(value), 'dd MMM yyyy, EEE');
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
        const displayStatus = getBuyerDisplayStatus(row);
        
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
            {/* Show Pay Now button when order is approved and has payment link */}
            {displayStatus.showPayNow && row.payment_link && (
              <Button 
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  // Open payment link in new tab
                  window.open(row.payment_link, '_blank');
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}
            {/* Show pending payment message when approved but no payment link yet */}
            {displayStatus.showPaymentPending && !row.payment_link && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Payment link pending
              </Badge>
            )}
            {currentStatus === 'dispatched' && (
              <Button 
                size="sm"
                onClick={() => confirmDelivery(value, currentStatus, row)}
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

          {/* Informational alert for orders under review */}
          {orders.some(o => isAwaitingReview(o)) && (
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your order is under review. Payment will be enabled after approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Alert for orders with change requests */}
          {orders.some(o => o.admin_notes && !o.admin_approved_at) && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Changes Requested:</strong> One or more orders need your attention. Please review the notes from our team.
              </AlertDescription>
            </Alert>
          )}

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
                    label: "Order Submitted",
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
                  <>
                    {/* Order Mode Info Banner - shows buyer what type of order this is */}
                    <div className="mb-4">
                      <OrderModeInfoBanner order={order} />
                    </div>
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
                  </>
                );
              })()}
            </div>
          )}

          {/* Delivery Tracking Section - Buyer view only, no actions */}
          {selectedOrder && (() => {
            const order = orders.find(o => o.id === selectedOrder);
            if (!order) return null;
            
            return (
              <div className="mb-6">
                <BuyerDeliveryTracking order={order} />
              </div>
            );
          })()}

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
