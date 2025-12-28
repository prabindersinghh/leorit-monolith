import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import PaymentTimeline from "@/components/PaymentTimeline";
import EscrowMoneyFlow from "@/components/EscrowMoneyFlow";
import OrderChat from "@/components/OrderChat";
import DeliveryTrackingInfo from "@/components/DeliveryTrackingInfo";
import OrderCostBreakdown from "@/components/OrderCostBreakdown";
import OrderModeInfoBanner from "@/components/OrderModeInfoBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Package, MapPin, CreditCard, Info } from "lucide-react";
import { toast } from "sonner";
import { getBuyerDisplayStatus, isAwaitingReview } from "@/lib/buyerStatusLabels";

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
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
      .single();

    setOrder(orderData);
    setShippingInfo(shippingData);
    setLoading(false);
  };

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
        <Sidebar userRole="buyer" />
        <div className="flex-1 p-8">
          <p className="text-center text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  const displayStatus = getBuyerDisplayStatus(order);
  const awaitingReview = isAwaitingReview(order);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="buyer" />
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Order Details</h1>
            <Badge className={displayStatus.color}>{displayStatus.label}</Badge>
          </div>

          {/* Informational alert for orders under review */}
          {awaitingReview && (
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your order is under review. Payment will be enabled after approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Pending Alert with Proceed to Payment button */}
          {displayStatus.showPaymentPending && (
            <Alert className="border-orange-200 bg-orange-50">
              <CreditCard className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 flex items-center justify-between">
                <span>Your order has been approved! Please complete the payment to proceed.</span>
                <Button 
                  size="sm"
                  className="ml-4 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => toast.info("Payment gateway will be integrated soon")}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Order Mode Info Banner - ADD-ONLY informational text */}
          <OrderModeInfoBanner order={order} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{order.product_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{order.quantity}</span>
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
              </CardContent>
            </Card>

            {shippingInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
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
          </div>

          {order.design_file_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Design Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Front Design</p>
                    <img
                      src={order.design_file_url}
                      alt="Front design"
                      className="w-full h-48 object-contain border rounded"
                    />
                  </div>
                  {order.back_design_url && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Back Design</p>
                      <img
                        src={order.back_design_url}
                        alt="Back design"
                        className="w-full h-48 object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {order.size_chart_url && (
            <Card>
              <CardHeader>
                <CardTitle>Size Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <a href={order.size_chart_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-2" />
                    View Size Chart PDF
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          <OrderCostBreakdown
            orderValue={(order.escrow_amount || 0) - (order.delivery_cost || 0)}
            deliveryCost={order.delivery_cost || undefined}
            totalAmount={order.total_amount || order.escrow_amount || 0}
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
          ) : null}

          {order.quantity === 1 && (
            <>
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
              {order.escrow_released_timestamp ? (
                <EscrowMoneyFlow
                  stage="released"
                  amount={order.escrow_amount || 500}
                />
              ) : order.escrow_locked_timestamp ? (
                <EscrowMoneyFlow
                  stage="locked"
                  amount={order.escrow_amount || 500}
                />
              ) : order.fake_payment_timestamp ? (
                <EscrowMoneyFlow
                  stage="payment"
                  amount={order.escrow_amount || 500}
                />
              ) : null}
            </>
          )}

          {order.qc_files && order.qc_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>QC Video</CardTitle>
              </CardHeader>
              <CardContent>
                <video controls className="w-full max-w-2xl mx-auto rounded">
                  <source src={order.qc_files[0]} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </CardContent>
            </Card>
          )}

          <OrderChat orderId={order.id} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
