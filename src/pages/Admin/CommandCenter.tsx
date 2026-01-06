/**
 * Admin Command Center
 * 
 * A minimal but powerful control panel for admin intervention on orders.
 * - View all orders with key status columns
 * - Click to open order detail drawer with full evidence
 * - Admin actions: assign manufacturer, courier, tracking, delivery states
 * 
 * ADD-ONLY. No analytics. No charts.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  ExternalLink,
  Video,
  Package,
  Truck,
  Clock,
  User,
  Factory,
  FileText,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import BuyerPurposeBadge from "@/components/BuyerPurposeBadge";
import CommandCenterActions from "@/components/CommandCenterActions";
import AdminOrderApproval from "@/components/AdminOrderApproval";
import EvidenceSummary from "@/components/EvidenceSummary";
import { format } from "date-fns";

interface Order {
  id: string;
  buyer_id: string;
  buyer_purpose: string | null;
  order_state: string | null;
  order_mode: string | null;
  manufacturer_id: string | null;
  payment_state: string | null;
  delivery_status: string | null;
  updated_at: string;
  created_at: string;
  buyer_notes: string | null;
  sample_qc_video_url: string | null;
  bulk_qc_video_url: string | null;
  packaging_video_url: string | null;
  tracking_id: string | null;
  courier_name: string | null;
  escrow_status: string | null;
  total_order_value: number | null;
  assigned_at: string | null;
  sample_qc_uploaded_at: string | null;
  sample_qc_approved_at: string | null;
  bulk_qc_uploaded_at: string | null;
  bulk_qc_approved_at: string | null;
  packed_at: string | null;
  pickup_scheduled_at: string | null;
  in_transit_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  escrow_locked_timestamp: string | null;
  escrow_released_timestamp: string | null;
  state_updated_at: string | null;
  // Additional fields for admin panel
  admin_approved_at: string | null;
  admin_notes: string | null;
  payment_link: string | null;
  payment_received_at: string | null;
  design_explanation: string | null;
  google_drive_link: string | null;
  design_file_url: string | null;
  corrected_csv_url: string | null;
  quantity: number | null;
  product_type: string | null;
  fabric_type: string | null;
  selected_color: string | null;
  design_size: string | null;
}

interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_timestamp: string;
  metadata: any;
}

interface ManufacturerInfo {
  user_id: string;
  company_name: string;
}

const CommandCenter = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [manufacturers, setManufacturers] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchManufacturers();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const { data } = await supabase
        .from('manufacturer_verifications')
        .select('user_id, company_name');
      
      const map: Record<string, string> = {};
      (data || []).forEach((m: ManufacturerInfo) => {
        map[m.user_id] = m.company_name;
      });
      setManufacturers(map);
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
    }
  };

  const fetchOrderEvents = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('event_timestamp', { ascending: true });

      if (error) throw error;
      setOrderEvents(data || []);
    } catch (error) {
      console.error('Error fetching order events:', error);
    }
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
    await fetchOrderEvents(order.id);
  };

  const handleOrderUpdate = async () => {
    await fetchOrders();
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
        await fetchOrderEvents(updated.id);
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(term) ||
      order.order_state?.toLowerCase().includes(term) ||
      order.buyer_purpose?.toLowerCase().includes(term) ||
      manufacturers[order.manufacturer_id || '']?.toLowerCase().includes(term)
    );
  });

  const getStateColor = (state: string | null) => {
    if (!state) return 'bg-muted text-muted-foreground';
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      'SUBMITTED': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'MANUFACTURER_ASSIGNED': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'SAMPLE_IN_PROGRESS': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'SAMPLE_QC_UPLOADED': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'SAMPLE_APPROVED': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'BULK_UNLOCKED': 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
      'BULK_IN_PRODUCTION': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
      'BULK_QC_UPLOADED': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
      'READY_FOR_DISPATCH': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
      'DISPATCHED': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      'DELIVERED': 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
      'COMPLETED': 'bg-green-300 text-green-900 dark:bg-green-700 dark:text-green-100',
    };
    return colors[state] || 'bg-muted text-muted-foreground';
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    return format(new Date(ts), 'MMM d, yyyy HH:mm');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar userRole="admin" />
      <main className="flex-1 overflow-auto ml-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Command Center</h1>
              <p className="text-sm text-muted-foreground">
                Admin control panel for order intervention
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">Order ID</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Order State</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOrderClick(order)}
                      >
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {order.buyer_purpose ? (
                            <BuyerPurposeBadge purpose={order.buyer_purpose as any} />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStateColor(order.order_state)} font-mono text-xs`}>
                            {order.order_state || 'UNKNOWN'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.manufacturer_id ? (
                            <span className="text-sm">
                              {manufacturers[order.manufacturer_id] || order.manufacturer_id.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {order.payment_state || order.escrow_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {order.delivery_status || 'NOT_STARTED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTimestamp(order.updated_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/order/${order.id}`);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Order Count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>
      </main>

      {/* Order Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </SheetTitle>
          </SheetHeader>

          {selectedOrder && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 py-4">
                {/* ADMIN APPROVAL PANEL - FIRST AUTHORITY */}
                <AdminOrderApproval 
                  order={selectedOrder} 
                  onUpdate={handleOrderUpdate} 
                />

                {/* Full Order Specifications */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Full Order Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Order ID:</span>
                        <p className="font-mono text-xs">{selectedOrder.id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">State:</span>
                        <Badge className={`ml-2 ${getStateColor(selectedOrder.order_state)}`}>
                          {selectedOrder.order_state}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Product:</span>
                        <p className="font-medium">{selectedOrder.product_type || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <p className="font-bold">{selectedOrder.quantity || 0} pcs</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Fabric/GSM:</span>
                        <p className="font-medium">{selectedOrder.fabric_type || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Color:</span>
                        <p className="font-medium capitalize">{selectedOrder.selected_color?.replace('_', ' ') || '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Design Size:</span>
                        <p className="font-medium">{selectedOrder.design_size || '—'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Purpose:</span>
                        {selectedOrder.buyer_purpose ? (
                          <BuyerPurposeBadge purpose={selectedOrder.buyer_purpose as any} />
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Value:</span>
                      <p className="text-lg font-bold">₹{selectedOrder.total_order_value?.toLocaleString() || '—'}</p>
                    </div>
                    
                    {/* Design Explanation */}
                    {selectedOrder.design_explanation && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Order Explanation:</span>
                        <p className="whitespace-pre-wrap bg-background/80 p-2 rounded mt-1">
                          {selectedOrder.design_explanation}
                        </p>
                      </div>
                    )}
                    
                    {/* Google Drive Link */}
                    {selectedOrder.google_drive_link && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Google Drive:</span>
                        <a 
                          href={selectedOrder.google_drive_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Design Files
                        </a>
                      </div>
                    )}
                    
                    {/* CSV File */}
                    {selectedOrder.corrected_csv_url && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Size Distribution CSV:</span>
                        <p className="text-xs font-mono mt-1">CSV uploaded</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manufacturer Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      Manufacturer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedOrder.manufacturer_id ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {manufacturers[selectedOrder.manufacturer_id] || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {selectedOrder.manufacturer_id}
                        </p>
                        {selectedOrder.assigned_at && (
                          <p className="text-xs text-muted-foreground">
                            Assigned: {formatTimestamp(selectedOrder.assigned_at)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                        <strong>Not assigned</strong>
                        <p className="mt-1">
                          {selectedOrder.payment_received_at 
                            ? "Payment received. Ready for manufacturer assignment." 
                            : "Awaiting payment. Assign manufacturer after payment is confirmed."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Buyer Notes */}
                {selectedOrder.buyer_notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Buyer Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedOrder.buyer_notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Evidence Summary - YC Ready */}
                <EvidenceSummary
                  order={selectedOrder}
                  manufacturerName={manufacturers[selectedOrder.manufacturer_id || '']}
                  orderEvents={orderEvents}
                />

                {/* Order Timeline */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Event Timeline ({orderEvents.length} events)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events logged</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-auto">
                        {orderEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 text-xs border-l-2 border-primary/20 pl-3 py-1"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{event.event_type}</p>
                              <p className="text-muted-foreground">
                                {formatTimestamp(event.event_timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator />

                {/* Admin Actions - Only show after payment */}
                <div className="pb-6">
                  <h3 className="text-sm font-semibold mb-4">Admin Actions</h3>
                  {!selectedOrder.payment_received_at && (
                    <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                      ⚠️ Payment has not been received. Approve the order and mark payment as received before assigning a manufacturer.
                    </div>
                  )}
                  <CommandCenterActions
                    order={selectedOrder}
                    manufacturers={manufacturers}
                    onUpdate={handleOrderUpdate}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CommandCenter;
