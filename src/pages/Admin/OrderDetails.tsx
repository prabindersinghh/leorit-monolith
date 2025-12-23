import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import OrderCostBreakdown from "@/components/OrderCostBreakdown";
import DeliveryTrackingInfo from "@/components/DeliveryTrackingInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Package, 
  MapPin, 
  User, 
  Factory, 
  Calendar, 
  Clock, 
  CheckCircle2,
  Download,
  Image,
  FileSpreadsheet,
  Shield,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const AdminOrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [buyerInfo, setBuyerInfo] = useState<any>(null);
  const [manufacturerInfo, setManufacturerInfo] = useState<any>(null);
  const [manufacturerVerification, setManufacturerVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      toast.error("Failed to load order details");
      setLoading(false);
      return;
    }

    const { data: shippingData } = await supabase
      .from("order_shipping_info")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();

    // Fetch buyer profile
    if (orderData.buyer_id) {
      const { data: buyerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", orderData.buyer_id)
        .maybeSingle();
      setBuyerInfo(buyerData);
    }

    // Fetch manufacturer profile and verification
    if (orderData.manufacturer_id) {
      const { data: manufacturerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", orderData.manufacturer_id)
        .maybeSingle();
      setManufacturerInfo(manufacturerData);

      const { data: verificationData } = await supabase
        .from("manufacturer_verifications")
        .select("*")
        .eq("user_id", orderData.manufacturer_id)
        .maybeSingle();
      setManufacturerVerification(verificationData);
    }

    setOrder(orderData);
    setShippingInfo(shippingData);
    setLoading(false);
  };

  // Timeline Item Component
  const TimelineItem = ({ 
    label, 
    timestamp, 
    completed,
    actor,
    isEstimate = false 
  }: { 
    label: string; 
    timestamp?: string | null; 
    completed: boolean;
    actor?: string;
    isEstimate?: boolean;
  }) => (
    <div className="relative flex items-start gap-4 pl-8">
      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
        completed 
          ? 'bg-primary border-primary' 
          : isEstimate 
            ? 'bg-muted border-muted-foreground/50' 
            : 'bg-background border-muted-foreground/30'
      }`}>
        {completed && <CheckCircle2 className="w-2 h-2 text-primary-foreground absolute -top-0.5 -left-0.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          {timestamp && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(timestamp), "dd MMM yyyy, HH:mm")}
            </p>
          )}
          {actor && completed && (
            <Badge variant="outline" className="text-xs h-5">
              {actor}
            </Badge>
          )}
        </div>
        {!timestamp && !completed && !isEstimate && (
          <p className="text-xs text-muted-foreground">Pending</p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole="admin" />
        <div className="flex-1 p-8">
          <p className="text-center text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Order Details</h1>
              <p className="text-sm text-muted-foreground mt-1">Admin View — Full Access</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={order.quantity === 1 ? "secondary" : "default"}>
                {order.quantity === 1 ? "Sample" : "Bulk"}
              </Badge>
              <Badge>{order.detailed_status || order.status}</Badge>
            </div>
          </div>

          {/* Row 1: Order Core + Order Intent/Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Core Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Core
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono text-xs">{order.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Buyer Type:</span>
                  <Badge variant="outline" className="capitalize">
                    {order.buyer_type || 'Not Set'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order Intent:</span>
                  <Badge variant={
                    order.order_intent === 'sample_only' ? 'secondary' :
                    order.order_intent === 'direct_bulk' ? 'default' :
                    order.order_intent === 'sample_then_bulk' ? 'outline' : 'outline'
                  }>
                    {order.order_intent === 'sample_only' ? 'Sample Only' :
                     order.order_intent === 'direct_bulk' ? 'Direct Bulk' :
                     order.order_intent === 'sample_then_bulk' ? 'Sample → Bulk' : 'Legacy'}
                  </Badge>
                </div>
                {order.product_category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Category:</span>
                    <span className="font-medium">{order.product_category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{order.product_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{order.quantity} pieces</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Design Size:</span>
                  <span className="font-medium">{order.design_size}</span>
                </div>
                {order.fabric_type && (
                  <>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Fabric / GSM:</span>
                      <span className="font-medium">{order.fabric_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="font-medium">₹{order.fabric_unit_price}</span>
                    </div>
                  </>
                )}
                {order.expected_deadline && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Expected Deadline:</span>
                    <span className="font-medium text-primary">
                      {format(new Date(order.expected_deadline), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow State Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Workflow State
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sample Status:</span>
                  <Badge variant={
                    order.sample_status === 'approved' ? 'default' :
                    order.sample_status === 'rejected' ? 'destructive' :
                    order.sample_status === 'in_production' ? 'secondary' : 'outline'
                  }>
                    {order.sample_status?.replace(/_/g, ' ') || 'not started'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bulk Status:</span>
                  <Badge variant={
                    order.bulk_status === 'completed' ? 'default' :
                    order.bulk_status === 'in_production' ? 'secondary' : 'outline'
                  }>
                    {order.bulk_status?.replace(/_/g, ' ') || 'not started'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">QC Status:</span>
                  <Badge variant={
                    order.qc_status === 'approved' ? 'default' :
                    order.qc_status === 'rejected' ? 'destructive' :
                    order.qc_status === 'uploaded' ? 'secondary' : 'outline'
                  }>
                    {order.qc_status?.replace(/_/g, ' ') || 'pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivery Status:</span>
                  <Badge variant={
                    order.delivery_status === 'delivered' ? 'default' :
                    order.delivery_status === 'dispatched' ? 'secondary' : 'outline'
                  }>
                    {order.delivery_status?.replace(/_/g, ' ') || 'pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Badge variant={
                    order.payment_status === 'released' ? 'default' :
                    order.payment_status === 'escrow_locked' ? 'secondary' : 'outline'
                  }>
                    {order.payment_status?.replace(/_/g, ' ') || 'pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Escrow Status:</span>
                  <Badge variant={
                    order.escrow_status === 'fake_released' ? 'default' :
                    order.escrow_status === 'fake_paid' ? 'secondary' : 'outline'
                  }>
                    {order.escrow_status === 'fake_released' ? 'Released' :
                     order.escrow_status === 'fake_paid' ? 'In Escrow' :
                     order.escrow_status === 'partial_released' ? 'Partial Release' : 'Pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Detailed Status:</span>
                  <Badge>{order.detailed_status || order.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Breakdown Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Order Value:</span>
                  <span className="font-bold text-lg">₹{(order.total_order_value || order.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upfront (55%):</span>
                  <span className="font-semibold text-primary">₹{(order.upfront_payable_amount || order.escrow_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining (45%):</span>
                  <span className="font-medium">₹{Math.round((order.total_order_value || order.total_amount || 0) * 0.45).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Delivery Cost:</span>
                  <span className="font-medium">₹{order.delivery_cost || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Escrow Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Escrow Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Received:</span>
                  <span>{order.fake_payment_timestamp 
                    ? format(new Date(order.fake_payment_timestamp), "dd MMM yyyy, HH:mm") 
                    : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Escrow Locked:</span>
                  <span>{order.escrow_locked_timestamp 
                    ? format(new Date(order.escrow_locked_timestamp), "dd MMM yyyy, HH:mm") 
                    : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Escrow Released:</span>
                  <span className={order.escrow_released_timestamp ? "text-green-600 font-medium" : ""}>
                    {order.escrow_released_timestamp 
                      ? format(new Date(order.escrow_released_timestamp), "dd MMM yyyy, HH:mm") 
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Buyer Info (Full) + Shipping Address (Full) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Full Buyer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Buyer Information (Full)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {buyerInfo ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company:</span>
                      <span className="font-medium">{buyerInfo.company_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{buyerInfo.email}</span>
                    </div>
                    {shippingInfo?.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{shippingInfo.phone}</span>
                      </div>
                    )}
                    {shippingInfo?.full_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact Name:</span>
                        <span className="font-medium">{shippingInfo.full_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer ID:</span>
                      <span className="font-mono text-xs">{order.buyer_id?.slice(0, 8)}...</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Buyer information not available</p>
                )}

                {/* Buyer Notes/Concerns */}
                {order.concern_notes && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Buyer Notes:</p>
                    <p className="text-sm bg-muted p-2 rounded">{order.concern_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address (Full)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shippingInfo ? (
                  <div className="space-y-1">
                    <p className="font-medium">{shippingInfo.full_name}</p>
                    <p className="text-sm text-primary font-medium">{shippingInfo.phone}</p>
                    <p className="text-sm">{shippingInfo.address_line1}</p>
                    {shippingInfo.address_line2 && (
                      <p className="text-sm">{shippingInfo.address_line2}</p>
                    )}
                    <p className="text-sm">
                      {shippingInfo.city}, {shippingInfo.state} - {shippingInfo.pincode}
                    </p>
                    <p className="text-sm">{shippingInfo.country}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Shipping address not provided</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Manufacturer Info + Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Manufacturer Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.manufacturer_id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company:</span>
                      <span className="font-medium">{manufacturerInfo?.company_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{manufacturerInfo?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer ID:</span>
                      <span className="font-mono text-xs">{order.manufacturer_id?.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {manufacturerVerification && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location:</span>
                          <span className="font-medium">
                            {manufacturerVerification.city}, {manufacturerVerification.state}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Status:</span>
                          <div className="flex gap-2">
                            {manufacturerVerification.verified && (
                              <Badge variant="default">Verified</Badge>
                            )}
                            {manufacturerVerification.soft_onboarded && (
                              <Badge variant="secondary">Soft-Onboarded</Badge>
                            )}
                            {!manufacturerVerification.verified && !manufacturerVerification.soft_onboarded && (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-medium">{manufacturerVerification.capacity}</span>
                        </div>
                      </>
                    )}
                    {/* Assignment Timestamps */}
                    <div className="pt-2 border-t space-y-2">
                      {order.assigned_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform Assigned:</span>
                          <span className="font-medium">
                            {format(new Date(order.assigned_at), "dd MMM yyyy, HH:mm")}
                          </span>
                        </div>
                      )}
                      {order.manufacturer_accept_time && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Manufacturer Accepted:</span>
                          <span className="font-medium">
                            {format(new Date(order.manufacturer_accept_time), "dd MMM yyyy, HH:mm")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Not yet assigned to manufacturer</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 4: Deadlines & Delivery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deadlines Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.quantity === 1 ? (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Sample Order</p>
                    <p className="font-medium mt-1">Standard sample timeline applies</p>
                    <p className="text-xs text-muted-foreground mt-1">24-48 hours QC window</p>
                  </div>
                ) : order.expected_deadline ? (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Buyer Requested Deadline</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {format(new Date(order.expected_deadline), "dd MMM yyyy")}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Bulk Order</p>
                    <p className="font-medium mt-1">Deadline not specified</p>
                    <p className="text-xs text-muted-foreground mt-1">Standard turnaround applies</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking ID:</span>
                  <span className="font-mono text-sm">{order.tracking_id || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispatched:</span>
                  <span>{order.dispatched_at 
                    ? format(new Date(order.dispatched_at), "dd MMM yyyy, HH:mm") 
                    : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Delivery:</span>
                  <span>{order.estimated_delivery_date 
                    ? format(new Date(order.estimated_delivery_date), "dd MMM yyyy") 
                    : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered:</span>
                  <span className={order.delivered_at ? "text-green-600 font-medium" : ""}>
                    {order.delivered_at 
                      ? format(new Date(order.delivered_at), "dd MMM yyyy, HH:mm") 
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Timeline (Read-Only) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Order Timeline (Audit Log)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  <TimelineItem
                    label="Order Created"
                    timestamp={order.created_at}
                    completed={!!order.created_at}
                    actor="Buyer"
                  />
                  
                  <TimelineItem
                    label="Payment Received (Upfront 55%)"
                    timestamp={order.fake_payment_timestamp}
                    completed={!!order.fake_payment_timestamp}
                    actor="System"
                  />
                  
                  <TimelineItem
                    label="Platform Assigned Manufacturer"
                    timestamp={order.assigned_at}
                    completed={!!order.assigned_at}
                    actor="System"
                  />
                  
                  <TimelineItem
                    label="Escrow Locked"
                    timestamp={order.escrow_locked_timestamp}
                    completed={!!order.escrow_locked_timestamp}
                    actor="System"
                  />
                  
                  <TimelineItem
                    label="Accepted by Manufacturer"
                    timestamp={order.manufacturer_accept_time}
                    completed={!!order.manufacturer_accept_time}
                    actor="Manufacturer"
                  />
                  
                  <TimelineItem
                    label="Sample Production Started"
                    timestamp={order.sample_production_started_at}
                    completed={!!order.sample_production_started_at}
                    actor="Manufacturer"
                  />
                  
                  <TimelineItem
                    label="Sample QC Uploaded"
                    timestamp={order.qc_uploaded_at || order.sample_qc_uploaded_at}
                    completed={!!(order.qc_uploaded_at || order.sample_qc_uploaded_at)}
                    actor="Manufacturer"
                  />
                  
                  <TimelineItem
                    label="Sample Approved by Buyer"
                    timestamp={order.sample_approved_at || order.sample_qc_approved_at}
                    completed={!!(order.sample_approved_at || order.sample_qc_approved_at)}
                    actor="Buyer"
                  />
                  
                  {/* Bulk-specific timeline events */}
                  {(order.order_intent === 'direct_bulk' || order.order_intent === 'sample_then_bulk' || order.quantity > 1) && (
                    <>
                      <TimelineItem
                        label="Bulk Production Started"
                        timestamp={order.bulk_order_confirmed_at}
                        completed={!!order.bulk_order_confirmed_at || order.bulk_status === 'in_production' || order.bulk_status === 'completed'}
                        actor="Manufacturer"
                      />
                      
                      <TimelineItem
                        label="Bulk QC Completed"
                        timestamp={order.bulk_status === 'completed' || !!order.dispatched_at ? order.dispatched_at : null}
                        completed={order.bulk_status === 'completed' || !!order.dispatched_at}
                        actor="Manufacturer"
                      />
                    </>
                  )}
                  
                  <TimelineItem
                    label="Dispatched"
                    timestamp={order.dispatched_at}
                    completed={!!order.dispatched_at}
                    actor="Manufacturer"
                  />
                  
                  <TimelineItem
                    label="Delivered"
                    timestamp={order.delivered_at}
                    completed={!!order.delivered_at}
                    actor="Buyer Confirmed"
                  />
                  
                  <TimelineItem
                    label="Escrow Released (Full)"
                    timestamp={order.escrow_released_timestamp}
                    completed={!!order.escrow_released_timestamp}
                    actor="System"
                  />
                  
                  {order.estimated_delivery_date && !order.delivered_at && (
                    <TimelineItem
                      label="Estimated Delivery"
                      timestamp={order.estimated_delivery_date}
                      completed={false}
                      isEstimate
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Files Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Production Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Design Images */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Design Images</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {order.design_file_url && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Front Design</p>
                      <img
                        src={order.design_file_url}
                        alt="Front design"
                        className="w-full h-32 object-contain border rounded bg-muted/50"
                      />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={order.design_file_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </Button>
                    </div>
                  )}
                  {order.back_design_url && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Back Design</p>
                      <img
                        src={order.back_design_url}
                        alt="Back design"
                        className="w-full h-32 object-contain border rounded bg-muted/50"
                      />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={order.back_design_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </Button>
                    </div>
                  )}
                  {order.mockup_image && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Front Mockup</p>
                      <img
                        src={order.mockup_image}
                        alt="Front mockup"
                        className="w-full h-32 object-contain border rounded bg-muted/50"
                      />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={order.mockup_image} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </Button>
                    </div>
                  )}
                  {order.back_mockup_image && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Back Mockup</p>
                      <img
                        src={order.back_mockup_image}
                        alt="Back mockup"
                        className="w-full h-32 object-contain border rounded bg-muted/50"
                      />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={order.back_mockup_image} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </Button>
                    </div>
                  )}
                  {order.generated_preview && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Generated Preview</p>
                      <img
                        src={order.generated_preview}
                        alt="Generated preview"
                        className="w-full h-32 object-contain border rounded bg-muted/50"
                      />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={order.generated_preview} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
                {!order.design_file_url && !order.back_design_url && (
                  <p className="text-sm text-muted-foreground">No design files uploaded</p>
                )}
              </div>

              {/* CSV & Size Chart */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Documents</h4>
                <div className="flex flex-wrap gap-3">
                  {order.corrected_csv_url && (
                    <Button variant="outline" asChild>
                      <a href={order.corrected_csv_url} download target="_blank" rel="noopener noreferrer">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Download Name/Size CSV
                      </a>
                    </Button>
                  )}
                  {order.size_chart_url && (
                    <Button variant="outline" asChild>
                      <a href={order.size_chart_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-4 h-4 mr-2" />
                        View Size Chart PDF
                      </a>
                    </Button>
                  )}
                  {!order.corrected_csv_url && !order.size_chart_url && (
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QC Video */}
          {order.qc_files && order.qc_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  QC Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <video controls className="w-full max-w-2xl mx-auto rounded">
                  <source src={order.qc_files[0]} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {order.qc_feedback && (
                  <div className="mt-4 p-3 bg-muted rounded">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Buyer QC Feedback:</p>
                    <p className="text-sm">{order.qc_feedback}</p>
                  </div>
                )}
                {order.rejection_reason && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                    <p className="text-sm text-destructive">{order.rejection_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cost Summary */}
          <OrderCostBreakdown
            orderValue={(order.escrow_amount || 0) - (order.delivery_cost || 0)}
            deliveryCost={order.delivery_cost || undefined}
            totalAmount={order.total_amount || order.escrow_amount || 0}
            title="Financial Summary"
            quantity={order.quantity}
            unitPrice={order.fabric_unit_price || (order.quantity === 1 ? 500 : undefined)}
            fabricType={order.fabric_type || undefined}
          />

          {/* Tracking Info (if exists) */}
          {(order.tracking_id || order.dispatched_at) && (
            <DeliveryTrackingInfo
              trackingId={order.tracking_id || undefined}
              trackingUrl={order.tracking_url || undefined}
              dispatchedAt={order.dispatched_at || undefined}
              estimatedDeliveryDate={order.estimated_delivery_date || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetails;
