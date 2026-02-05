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
import BuyerPaymentGate from "@/components/BuyerPaymentGate";
import { FileText, Package, MapPin, CreditCard, Info, AlertTriangle, ExternalLink, Video, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getBuyerDisplayStatus, isAwaitingReview } from "@/lib/buyerStatusLabels";

interface QCMediaItem {
  url: string;
  isVideo: boolean;
}

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [qcData, setQcData] = useState<any>(null);
  const [qcMediaUrls, setQcMediaUrls] = useState<QCMediaItem[]>([]);
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

  /**
   * Generate signed URL for a storage path
   */
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('orders')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Failed to get signed URL:', err);
      return null;
    }
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

    // Fetch QC data from order_qc table
    const { data: qcDetails, error: qcError } = await supabase
      .from("order_qc")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qcError) {
      console.error("Error fetching QC details:", qcError);
    }

    // Generate signed URLs for QC files if they exist
    if (qcDetails?.file_urls && Array.isArray(qcDetails.file_urls)) {
      const mediaItems: QCMediaItem[] = [];
      
      for (const filePath of qcDetails.file_urls) {
        const signedUrl = await getSignedUrl(filePath);
        if (signedUrl) {
          const isVideo = /\.(mp4|mov|webm|quicktime)$/i.test(filePath);
          mediaItems.push({ url: signedUrl, isVideo });
        }
      }
      
      setQcMediaUrls(mediaItems);
    }

    setOrder(orderData);
    setShippingInfo(shippingData);
    setQcData(qcDetails);
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

          {/* Changes Requested Alert */}
          {order.admin_notes && !order.admin_approved_at && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Changes Requested:</strong>
                <p className="mt-1">{order.admin_notes}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* PAYMENT GATE - Shows payment status to buyer */}
          <BuyerPaymentGate order={order} />

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
                {order.design_explanation && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block mb-1">Order Explanation:</span>
                    <p className="text-sm whitespace-pre-wrap">{order.design_explanation}</p>
                  </div>
                )}
                {order.google_drive_link && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground block mb-1">Design Files:</span>
                    <a 
                      href={order.google_drive_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Google Drive Folder
                    </a>
                  </div>
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

          {/* QC Media from order_qc table */}
          {qcMediaUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Sample QC Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Videos first */}
                {qcMediaUrls.filter(m => m.isVideo).map((media, index) => (
                  <div key={`video-${index}`} className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      QC Video {qcMediaUrls.filter(m => m.isVideo).length > 1 ? index + 1 : ''}
                    </p>
                    <video 
                      controls 
                      className="w-full max-w-2xl mx-auto rounded-lg border bg-black"
                    >
                      <source src={media.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
                
                {/* Images grid */}
                {qcMediaUrls.filter(m => !m.isVideo).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" />
                      QC Images ({qcMediaUrls.filter(m => !m.isVideo).length})
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {qcMediaUrls.filter(m => !m.isVideo).map((media, index) => (
                        <a 
                          key={`image-${index}`}
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group"
                        >
                          <img
                            src={media.url}
                            alt={`QC Image ${index + 1}`}
                            className="w-full h-40 object-cover rounded-lg border transition-transform group-hover:scale-105"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* QC Notes from manufacturer */}
                {qcData?.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Manufacturer Notes:</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{qcData.notes}</p>
                  </div>
                )}
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
