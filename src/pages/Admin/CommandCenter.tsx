/**
 * Admin Command Center
 * 
 * THE SINGLE CONTROL ROOM for all admin order operations.
 * All order details, buyer inputs, production files, approvals, 
 * manufacturer assignment, and payment control happen HERE.
 * 
 * NO separate order detail page navigation.
 * Everything in-drawer on this same page.
 */

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  RefreshCw,
  Eye,
  Video,
  Package,
  Truck,
  Clock,
  User,
  Factory,
  FileText,
  MapPin,
  Calendar,
  Hash,
  CreditCard,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import BuyerPurposeBadge from "@/components/BuyerPurposeBadge";
import CommandCenterActions from "@/components/CommandCenterActions";
import AdminOrderApproval from "@/components/AdminOrderApproval";
import AdminPaymentGate from "@/components/AdminPaymentGate";
import AdminProductionFilesView from "@/components/AdminProductionFilesView";
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
  // Admin panel fields
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
  // Production files
  back_design_url: string | null;
  mockup_image: string | null;
  back_mockup_image: string | null;
  generated_preview: string | null;
  size_chart_url: string | null;
  // Additional order fields
  total_amount: number | null;
  upfront_payable_amount: number | null;
  rejection_reason: string | null;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
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

  const fetchBuyerInfo = async (buyerId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', buyerId)
        .single();
      
      if (!error && data) {
        setBuyerProfile(data);
      }
    } catch (error) {
      console.error('Error fetching buyer info:', error);
    }
  };

  const fetchShippingInfo = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_shipping_info')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (!error && data) {
        setShippingInfo(data);
      } else {
        setShippingInfo(null);
      }
    } catch (error) {
      console.error('Error fetching shipping info:', error);
      setShippingInfo(null);
    }
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
    setBuyerProfile(null);
    setShippingInfo(null);
    
    // Fetch all related data in parallel
    await Promise.all([
      fetchOrderEvents(order.id),
      fetchBuyerInfo(order.buyer_id),
      fetchShippingInfo(order.id),
    ]);
  };

  const handleOrderUpdate = async () => {
    // Fetch fresh order data directly from database and refresh related info
    if (selectedOrder) {
      console.log('[CommandCenter] Refreshing order:', selectedOrder.id);
      
      const { data: freshOrder, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrder.id)
        .single();

      if (!error && freshOrder) {
        console.log('[CommandCenter] Fresh order data:', {
          id: freshOrder.id,
          design_file_url: freshOrder.design_file_url,
          back_design_url: freshOrder.back_design_url,
          corrected_csv_url: freshOrder.corrected_csv_url,
          mockup_image: freshOrder.mockup_image,
          google_drive_link: freshOrder.google_drive_link,
        });
        
        setSelectedOrder(freshOrder as Order);
        await Promise.all([
          fetchOrderEvents(freshOrder.id),
          fetchBuyerInfo(freshOrder.buyer_id),
          fetchShippingInfo(freshOrder.id),
        ]);
      }
    }
    // Also refresh the orders list
    await fetchOrders();
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
      'ADMIN_APPROVED': 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
      'MANUFACTURER_ASSIGNED': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'PAYMENT_REQUESTED': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'PAYMENT_CONFIRMED': 'bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300',
      'SAMPLE_IN_PROGRESS': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
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
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                        <TableCell 
                          className="font-mono text-xs text-primary hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrderClick(order);
                          }}
                        >
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
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
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

      {/* Order Detail Drawer - FULL WIDTH CONTROL ROOM */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[800px] sm:max-w-[800px] overflow-hidden flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Order Control Panel
              </SheetTitle>
              {selectedOrder && (
                <div className="flex items-center gap-2">
                  <Badge className={getStateColor(selectedOrder.order_state)}>
                    {selectedOrder.order_state}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOrderUpdate}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
            {selectedOrder && (
              <p className="text-xs text-muted-foreground font-mono">
                Order ID: {selectedOrder.id}
              </p>
            )}
          </SheetHeader>

          {selectedOrder && (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* ADMIN DECISION PANEL - State-based controls */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>

                  {/* OVERVIEW TAB */}
                  <TabsContent value="overview" className="space-y-4 mt-0">
                    {/* Order Overview Card */}
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Order Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs text-muted-foreground block">Order ID</span>
                              <p className="font-mono text-xs">{selectedOrder.id}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Purpose</span>
                              {selectedOrder.buyer_purpose ? (
                                <BuyerPurposeBadge purpose={selectedOrder.buyer_purpose as any} />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Product Type</span>
                              <p className="font-medium">{selectedOrder.product_type || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Quantity</span>
                              <p className="font-bold text-lg">{selectedOrder.quantity || 0} pcs</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs text-muted-foreground block">Order State</span>
                              <Badge className={getStateColor(selectedOrder.order_state)}>
                                {selectedOrder.order_state}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Payment State</span>
                              <Badge variant="outline">
                                {selectedOrder.payment_state || 'pending'}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Total Value</span>
                              <p className="font-bold text-lg text-green-600">
                                ₹{selectedOrder.total_order_value?.toLocaleString() || selectedOrder.total_amount?.toLocaleString() || '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Created</span>
                              <p className="text-xs">{formatTimestamp(selectedOrder.created_at)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <Separator />
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <span className="text-xs text-muted-foreground block">Fabric/GSM</span>
                            <p className="font-medium text-sm">{selectedOrder.fabric_type || '—'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Color</span>
                            <p className="font-medium text-sm capitalize">{selectedOrder.selected_color?.replace('_', ' ') || '—'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Design Size</span>
                            <p className="font-medium text-sm">{selectedOrder.design_size || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Buyer Details Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Buyer Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {buyerProfile ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs text-muted-foreground block">Email</span>
                              <p className="font-medium">{buyerProfile.email}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Company</span>
                              <p className="font-medium">{buyerProfile.company_name || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Buyer ID</span>
                              <p className="font-mono text-xs">{selectedOrder.buyer_id}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono text-xs">{selectedOrder.buyer_id}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Shipping Address Card */}
                    {shippingInfo && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Shipping Address
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <div className="space-y-1">
                            <p className="font-medium">{shippingInfo.full_name}</p>
                            <p>{shippingInfo.address_line1}</p>
                            {shippingInfo.address_line2 && <p>{shippingInfo.address_line2}</p>}
                            <p>{shippingInfo.city}, {shippingInfo.state} - {shippingInfo.pincode}</p>
                            <p>{shippingInfo.country}</p>
                            <p className="text-muted-foreground">Phone: {shippingInfo.phone}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Manufacturer Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          Assigned Manufacturer
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {selectedOrder.manufacturer_id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <p className="font-medium">
                                {manufacturers[selectedOrder.manufacturer_id] || 'Unknown'}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {selectedOrder.manufacturer_id}
                            </p>
                            {selectedOrder.assigned_at && (
                              <p className="text-xs text-muted-foreground">
                                Assigned: {formatTimestamp(selectedOrder.assigned_at)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <strong>Not assigned</strong>
                              <p className="mt-1">
                                {selectedOrder.admin_approved_at 
                                  ? "Order approved. Go to Actions tab to assign manufacturer." 
                                  : "Awaiting approval. Please approve the order first."}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* FILES TAB */}
                  <TabsContent value="files" className="space-y-4 mt-0">
                    {/* Production Files & Buyer Inputs */}
                    <AdminProductionFilesView order={selectedOrder} />

                    {/* Buyer Notes Section */}
                    {(selectedOrder.buyer_notes || selectedOrder.design_explanation) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Buyer Notes & Explanation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedOrder.design_explanation && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Order Explanation</p>
                              <p className="text-sm whitespace-pre-wrap">{selectedOrder.design_explanation}</p>
                            </div>
                          )}
                          {selectedOrder.buyer_notes && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Additional Notes</p>
                              <p className="text-sm whitespace-pre-wrap">{selectedOrder.buyer_notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* QC Videos Section */}
                    {(selectedOrder.sample_qc_video_url || selectedOrder.bulk_qc_video_url || selectedOrder.packaging_video_url) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            QC Videos
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {selectedOrder.sample_qc_video_url && (
                            <a 
                              href={selectedOrder.sample_qc_video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                              <Video className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">Sample QC Video</span>
                            </a>
                          )}
                          {selectedOrder.bulk_qc_video_url && (
                            <a 
                              href={selectedOrder.bulk_qc_video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                              <Video className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Bulk QC Video</span>
                            </a>
                          )}
                          {selectedOrder.packaging_video_url && (
                            <a 
                              href={selectedOrder.packaging_video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                              <Package className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">Packaging Video</span>
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* ACTIONS TAB */}
                  <TabsContent value="actions" className="space-y-4 mt-0">
                    {/* Admin Approval Panel */}
                    <AdminOrderApproval 
                      order={selectedOrder} 
                      onUpdate={handleOrderUpdate} 
                    />

                    {/* Payment Gate */}
                    <AdminPaymentGate
                      order={selectedOrder}
                      onUpdate={handleOrderUpdate}
                    />

                    {/* Manufacturer & Delivery Actions */}
                    <CommandCenterActions
                      order={selectedOrder}
                      manufacturers={manufacturers}
                      onUpdate={handleOrderUpdate}
                    />
                  </TabsContent>

                  {/* TIMELINE TAB */}
                  <TabsContent value="timeline" className="space-y-4 mt-0">
                    {/* Evidence Summary */}
                    <EvidenceSummary
                      order={selectedOrder}
                      manufacturerName={manufacturers[selectedOrder.manufacturer_id || '']}
                      orderEvents={orderEvents}
                    />

                    {/* Event Timeline */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Event Log ({orderEvents.length} events)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {orderEvents.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No events logged</p>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-auto">
                            {orderEvents.slice().reverse().map((event) => (
                              <div
                                key={event.id}
                                className="flex items-start gap-3 text-xs border-l-2 border-primary/30 pl-3 py-2 hover:bg-muted/30 rounded-r-lg transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{event.event_type.replace(/_/g, ' ').toUpperCase()}</p>
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

                    {/* Key Timestamps */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Key Timestamps
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Created</span>
                            <span>{formatTimestamp(selectedOrder.created_at)}</span>
                          </div>
                          {selectedOrder.admin_approved_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Admin Approved</span>
                              <span>{formatTimestamp(selectedOrder.admin_approved_at)}</span>
                            </div>
                          )}
                          {selectedOrder.payment_received_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Payment Received</span>
                              <span>{formatTimestamp(selectedOrder.payment_received_at)}</span>
                            </div>
                          )}
                          {selectedOrder.assigned_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Manufacturer Assigned</span>
                              <span>{formatTimestamp(selectedOrder.assigned_at)}</span>
                            </div>
                          )}
                          {selectedOrder.sample_qc_uploaded_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Sample QC Uploaded</span>
                              <span>{formatTimestamp(selectedOrder.sample_qc_uploaded_at)}</span>
                            </div>
                          )}
                          {selectedOrder.sample_qc_approved_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Sample Approved</span>
                              <span>{formatTimestamp(selectedOrder.sample_qc_approved_at)}</span>
                            </div>
                          )}
                          {selectedOrder.bulk_qc_uploaded_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Bulk QC Uploaded</span>
                              <span>{formatTimestamp(selectedOrder.bulk_qc_uploaded_at)}</span>
                            </div>
                          )}
                          {selectedOrder.packed_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Packed</span>
                              <span>{formatTimestamp(selectedOrder.packed_at)}</span>
                            </div>
                          )}
                          {selectedOrder.dispatched_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Dispatched</span>
                              <span>{formatTimestamp(selectedOrder.dispatched_at)}</span>
                            </div>
                          )}
                          {selectedOrder.delivered_at && (
                            <div className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">Delivered</span>
                              <span>{formatTimestamp(selectedOrder.delivered_at)}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Last Updated</span>
                            <span>{formatTimestamp(selectedOrder.updated_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tracking Info */}
                    {(selectedOrder.courier_name || selectedOrder.tracking_id) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Delivery Tracking
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs text-muted-foreground block">Courier</span>
                              <p className="font-medium">{selectedOrder.courier_name || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Tracking ID</span>
                              <p className="font-mono">{selectedOrder.tracking_id || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Delivery Status</span>
                              <Badge variant="outline">{selectedOrder.delivery_status || 'NOT_STARTED'}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CommandCenter;
