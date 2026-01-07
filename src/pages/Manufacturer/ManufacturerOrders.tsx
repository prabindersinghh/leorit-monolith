import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Truck, Eye } from "lucide-react";
import { canTransitionTo, getActionLabel, statusLabels, statusColors, OrderDetailedStatus, isSampleOrder } from "@/lib/orderStateMachine";
import { getOrderMode, shouldShowStartBulkButton, getManufacturerQCUploadType } from "@/lib/orderModeUtils";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { canManufacturerStartProduction } from "@/components/ManufacturerPaymentGate";
import { addDays, format } from "date-fns";

const ManufacturerOrders = () => {
  const navigate = useNavigate();
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

  const handleAcceptOrder = async (orderId: string, currentStatus: OrderDetailedStatus) => {
    const newStatus: OrderDetailedStatus = 'accepted_by_manufacturer';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          status: 'accepted', // Backward compatibility
          sample_status: 'not_started', // Backward compatibility
          escrow_locked_timestamp: now, // Lock escrow when manufacturer accepts
          manufacturer_accept_time: now // Analytics timestamp for manufacturer acceptance
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order accepted! Escrow locked.");
      fetchOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error("Failed to accept order");
    }
  };

  const handleRejectOrder = async (orderId: string, currentStatus: OrderDetailedStatus) => {
    const newStatus: OrderDetailedStatus = 'rejected_by_manufacturer';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          status: 'rejected', // Backward compatibility
          rejection_reason: 'Manufacturer declined the order'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log manufacturer rejected event for analytics
      await logOrderEvent(orderId, 'manufacturer_rejected', { status: newStatus });
      
      toast.success("Order rejected");
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error("Failed to reject order");
    }
  };

  const handleDispatchOrder = async (orderId: string, currentStatus: OrderDetailedStatus) => {
    const newStatus: OrderDetailedStatus = 'dispatched';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    const now = new Date();
    const estimatedDelivery = addDays(now, 3);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          status: 'dispatched', // Backward compatibility
          sample_status: 'dispatched', // Backward compatibility
          dispatched_at: now.toISOString(),
          estimated_delivery_date: format(estimatedDelivery, 'yyyy-MM-dd')
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log dispatched event for analytics
      await logOrderEvent(orderId, 'dispatched', { estimatedDelivery: format(estimatedDelivery, 'yyyy-MM-dd') });
      
      toast.success(`Order dispatched! Estimated delivery: ${format(estimatedDelivery, 'MMM dd, yyyy')}`);
      fetchOrders();
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast.error("Failed to dispatch order");
    }
  };

  const handleStartSampleProduction = async (orderId: string, currentStatus: OrderDetailedStatus, order: any) => {
    // PAYMENT GATE: Check if payment is confirmed
    const paymentCheck = canManufacturerStartProduction(order);
    if (!paymentCheck.allowed) {
      toast.error(paymentCheck.reason || "Payment not confirmed. Cannot start production.");
      return;
    }

    const newStatus: OrderDetailedStatus = 'sample_in_production';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus,
          sample_status: 'in_production', // Backward compatibility
          sample_production_started_at: now // Track sample production start time
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log sample production started event for analytics
      await logOrderEvent(orderId, 'sample_production_started', { status: newStatus });
      
      toast.success("Sample production started!");
      fetchOrders();
    } catch (error) {
      console.error('Error starting production:', error);
      toast.error("Failed to start production");
    }
  };

  const handleStartBulkProduction = async (orderId: string, currentStatus: OrderDetailedStatus, order: any) => {
    // PAYMENT GATE: Check if payment is confirmed
    const paymentCheck = canManufacturerStartProduction(order);
    if (!paymentCheck.allowed) {
      toast.error(paymentCheck.reason || "Payment not confirmed. Cannot start production.");
      return;
    }

    const newStatus: OrderDetailedStatus = 'bulk_in_production';
    
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error("Invalid state transition");
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          detailed_status: newStatus
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Log bulk production started event for analytics
      await logOrderEvent(orderId, 'bulk_production_started', { status: newStatus });
      
      toast.success("Bulk production started!");
      fetchOrders();
    } catch (error) {
      console.error('Error starting bulk production:', error);
      toast.error("Failed to start bulk production");
    }
  };


  const columns = [
    {
      header: "Order ID",
      accessor: "id",
      cell: (value: string) => (
        <button
          onClick={() => navigate(`/manufacturer/order/${value}`)}
          className="font-mono text-xs text-primary hover:underline cursor-pointer"
        >
          {value.slice(0, 8)}
        </button>
      )
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
      cell: (value: number, row: any) => {
        const escrowStatus = row.escrow_status;
        return (
          <div>
            <div className="font-semibold text-foreground mb-1">
              ₹{value?.toLocaleString() || '0'}
            </div>
            {escrowStatus === 'fake_paid' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                In Escrow
              </Badge>
            )}
            {escrowStatus === 'fake_released' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Released to You
              </Badge>
            )}
            {escrowStatus === 'pending' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                Pending
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      header: "Total Amount",
      accessor: "total_amount",
      cell: (value: number, row: any) => (
        <div className="space-y-1">
          <div className="font-bold text-foreground">
            ₹{value?.toLocaleString() || '0'}
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
      header: "Detailed Status",
      accessor: "detailed_status",
      cell: (value: OrderDetailedStatus) => (
        <Badge className={statusColors[value] || 'bg-gray-100 text-gray-700'}>
          {statusLabels[value] || value}
        </Badge>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (value: string, row: any) => {
        const currentStatus = row.detailed_status as OrderDetailedStatus;
        const orderMode = getOrderMode(row);
        const qcUploadType = getManufacturerQCUploadType(row);
        const showBulkButton = shouldShowStartBulkButton(row);
        
        return (
          <div className="flex gap-2 flex-wrap">
            {currentStatus === 'submitted_to_manufacturer' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleAcceptOrder(value, currentStatus)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {getActionLabel('accepted_by_manufacturer')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRejectOrder(value, currentStatus)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {getActionLabel('rejected_by_manufacturer')}
                </Button>
              </>
            )}
            {currentStatus === 'accepted_by_manufacturer' && (
              <Button
                size="sm"
                onClick={() => handleStartSampleProduction(value, currentStatus, row)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {getActionLabel('sample_in_production')}
              </Button>
            )}
            {/* QC Upload - order_mode aware */}
            {currentStatus === 'sample_in_production' && qcUploadType === 'sample' && (
              <Button
                size="sm"
                onClick={() => window.location.href = '/manufacturer/qc'}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {orderMode === 'sample_only' ? 'Upload Sample QC' : getActionLabel('qc_uploaded')}
              </Button>
            )}
            {/* Bulk QC Upload - for bulk_in_production status */}
            {currentStatus === 'bulk_in_production' && qcUploadType === 'bulk' && (
              <Button
                size="sm"
                onClick={() => window.location.href = '/manufacturer/qc'}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Upload Bulk QC
              </Button>
            )}
            {/* Start Bulk Production - only for sample_then_bulk after sample approval */}
            {showBulkButton && currentStatus === 'sample_approved_by_buyer' && (
              <Button
                size="sm"
                onClick={() => handleStartBulkProduction(value, currentStatus, row)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {getActionLabel('bulk_in_production')}
              </Button>
            )}
            {/* Dispatch - for bulk orders */}
            {currentStatus === 'bulk_in_production' && (
              <Button
                size="sm"
                onClick={() => handleDispatchOrder(value, currentStatus)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Truck className="w-4 h-4 mr-1" />
                Mark as Dispatched
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/manufacturer/order/${value}`)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        );
      }
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
