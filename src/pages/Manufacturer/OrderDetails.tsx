import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import OrderChat from "@/components/OrderChat";
import TrackingIdInput from "@/components/TrackingIdInput";
import OrderCostBreakdown from "@/components/OrderCostBreakdown";
import DeliveryTrackingInfo from "@/components/DeliveryTrackingInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Package, MapPin, Calendar, Download, Image, FileSpreadsheet, User, Clock, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ManufacturerOrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    fetchOrderDetails();
    getCurrentUser();
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

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
    if (orderData?.buyer_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", orderData.buyer_id)
        .maybeSingle();
      setBuyerProfile(profileData);
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
    isEstimate = false 
  }: { 
    label: string; 
    timestamp?: string | null; 
    completed: boolean;
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
        {timestamp && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(timestamp), "dd MMM yyyy, HH:mm")}
          </p>
        )}
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
        <Sidebar userRole="manufacturer" />
        <div className="flex-1 p-8">
          <p className="text-center text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="manufacturer" />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Order Details</h1>
            <Badge>{order.status}</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono text-xs">{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Type:</span>
                  <Badge variant={order.quantity === 1 ? "secondary" : "default"}>
                    {order.quantity === 1 ? "Sample" : "Bulk"}
                  </Badge>
                </div>
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
                      <span className="text-muted-foreground">Fabric:</span>
                      <span className="font-medium">{order.fabric_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="font-medium">₹{order.fabric_unit_price}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Order Value:</span>
                  <span className="font-semibold">₹{order.escrow_amount?.toLocaleString() || '0'}</span>
                </div>
                {order.delivery_cost && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Cost:</span>
                    <span className="font-semibold">₹{order.delivery_cost}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-lg">₹{order.total_amount?.toLocaleString() || '0'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline & Deadline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline & Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Placed:</span>
                  <span className="font-medium">
                    {order.created_at ? format(new Date(order.created_at), "dd MMM yyyy, HH:mm") : "-"}
                  </span>
                </div>
                {order.manufacturer_accept_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accepted At:</span>
                    <span className="font-medium">
                      {format(new Date(order.manufacturer_accept_time), "dd MMM yyyy, HH:mm")}
                    </span>
                  </div>
                )}
                {order.sample_production_started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Production Started:</span>
                    <span className="font-medium">
                      {format(new Date(order.sample_production_started_at), "dd MMM yyyy, HH:mm")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Expected Deadline:</span>
                  <span className="font-semibold text-primary">
                    {order.quantity === 1 
                      ? "24-48 hours (Sample QC window)" 
                      : order.expected_deadline 
                        ? format(new Date(order.expected_deadline), "dd MMM yyyy")
                        : "14-21 days (Bulk)"
                    }
                  </span>
                </div>
                {order.estimated_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Delivery:</span>
                    <span className="font-medium">
                      {format(new Date(order.estimated_delivery_date), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address Card */}
            {shippingInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="font-medium">{shippingInfo.full_name}</p>
                  <p className="text-sm text-muted-foreground">{shippingInfo.phone}</p>
                  <p className="text-sm">{shippingInfo.address_line1}</p>
                  {shippingInfo.address_line2 && (
                    <p className="text-sm">{shippingInfo.address_line2}</p>
                  )}
                  <p className="text-sm">
                    {shippingInfo.city}, {shippingInfo.state} - {shippingInfo.pincode}
                  </p>
                  <p className="text-sm">{shippingInfo.country}</p>
                </CardContent>
              </Card>
            )}

            {/* Buyer Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Buyer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {buyerProfile ? (
                  <>
                    {buyerProfile.company_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span className="font-medium">{buyerProfile.company_name}</span>
                      </div>
                    )}
                    {shippingInfo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{shippingInfo.city}, {shippingInfo.state}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Buyer information not available</p>
                )}
              </CardContent>
            </Card>

            {/* Buyer Notes Card */}
            {(order.concern_notes || order.rejection_reason || order.qc_feedback) && (
              <Card>
                <CardHeader>
                  <CardTitle>Buyer Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.concern_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Special Requirements:</p>
                      <p className="text-sm bg-muted p-2 rounded">{order.concern_notes}</p>
                    </div>
                  )}
                  {order.qc_feedback && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">QC Feedback:</p>
                      <p className="text-sm bg-muted p-2 rounded">{order.qc_feedback}</p>
                    </div>
                  )}
                  {order.rejection_reason && (
                    <div>
                      <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                      <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">{order.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Timeline Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  {/* Order Created */}
                  <TimelineItem
                    label="Order Created"
                    timestamp={order.created_at}
                    completed={!!order.created_at}
                  />
                  
                  {/* Payment Made */}
                  <TimelineItem
                    label="Payment Received (Escrow)"
                    timestamp={order.fake_payment_timestamp}
                    completed={!!order.fake_payment_timestamp}
                  />
                  
                  {/* Escrow Locked */}
                  <TimelineItem
                    label="Escrow Locked"
                    timestamp={order.escrow_locked_timestamp}
                    completed={!!order.escrow_locked_timestamp}
                  />
                  
                  {/* Manufacturer Accepted */}
                  <TimelineItem
                    label="Accepted by Manufacturer"
                    timestamp={order.manufacturer_accept_time}
                    completed={!!order.manufacturer_accept_time}
                  />
                  
                  {/* Production Started */}
                  <TimelineItem
                    label={order.quantity === 1 ? "Sample Production Started" : "Bulk Production Started"}
                    timestamp={order.sample_production_started_at}
                    completed={!!order.sample_production_started_at}
                  />
                  
                  {/* QC Uploaded */}
                  <TimelineItem
                    label="QC Uploaded"
                    timestamp={order.qc_uploaded_at || order.sample_qc_uploaded_at}
                    completed={!!(order.qc_uploaded_at || order.sample_qc_uploaded_at)}
                  />
                  
                  {/* Buyer Approved */}
                  <TimelineItem
                    label="Buyer Approved"
                    timestamp={order.sample_approved_at || order.sample_qc_approved_at}
                    completed={!!(order.sample_approved_at || order.sample_qc_approved_at)}
                  />
                  
                  {/* Dispatched */}
                  <TimelineItem
                    label="Dispatched"
                    timestamp={order.dispatched_at}
                    completed={!!order.dispatched_at}
                  />
                  
                  {/* Escrow Released */}
                  <TimelineItem
                    label="Escrow Released"
                    timestamp={order.escrow_released_timestamp}
                    completed={!!order.escrow_released_timestamp}
                  />
                  
                  {/* Delivered */}
                  <TimelineItem
                    label="Delivered"
                    timestamp={order.delivered_at}
                    completed={!!order.delivered_at}
                  />
                  
                  {/* Estimated Delivery */}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {order.design_file_url && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Front Design</p>
                      <img
                        src={order.design_file_url}
                        alt="Front design"
                        className="w-full h-40 object-contain border rounded bg-muted/50"
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
                        className="w-full h-40 object-contain border rounded bg-muted/50"
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
                        className="w-full h-40 object-contain border rounded bg-muted/50"
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
                        className="w-full h-40 object-contain border rounded bg-muted/50"
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
                        className="w-full h-40 object-contain border rounded bg-muted/50"
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

          <OrderCostBreakdown
            orderValue={(order.escrow_amount || 0) - (order.delivery_cost || 0)}
            deliveryCost={order.delivery_cost || undefined}
            totalAmount={order.total_amount || order.escrow_amount || 0}
            title="Order Cost Summary"
            quantity={order.quantity}
            unitPrice={order.fabric_unit_price || (order.quantity === 1 ? 500 : undefined)}
            fabricType={order.fabric_type || undefined}
          />

          {order.tracking_id || order.dispatched_at ? (
            <DeliveryTrackingInfo
              trackingId={order.tracking_id || undefined}
              trackingUrl={order.tracking_url || undefined}
              dispatchedAt={order.dispatched_at || undefined}
              estimatedDeliveryDate={order.estimated_delivery_date || undefined}
            />
          ) : order.status === "sample_in_production" ? (
            <TrackingIdInput orderId={order.id} onSuccess={fetchOrderDetails} />
          ) : null}

          <OrderChat orderId={order.id} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
};

export default ManufacturerOrderDetails;
