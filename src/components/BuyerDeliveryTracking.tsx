/**
 * Buyer Delivery Tracking Component
 * 
 * Shows delivery status and tracking info to buyer.
 * Buyer can ONLY VIEW tracking - no actions allowed.
 * Tracking is shown INSIDE Leorit only (no external links to carrier sites).
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle2, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import {
  getBuyerVisibleTrackingInfo,
  getDeliveryStateLabel,
  getDeliveryStateColor,
  DeliveryState,
} from "@/lib/deliveryStateMachine";

interface BuyerDeliveryTrackingProps {
  order: {
    id: string;
    delivery_status?: string | null;
    packed_at?: string | null;
    pickup_scheduled_at?: string | null;
    in_transit_at?: string | null;
    dispatched_at?: string | null;
    delivered_at?: string | null;
    estimated_delivery_date?: string | null;
    tracking_id?: string | null;
    courier_name?: string | null;
  };
}

const BuyerDeliveryTracking = ({ order }: BuyerDeliveryTrackingProps) => {
  const trackingInfo = getBuyerVisibleTrackingInfo(order);
  
  // Don't show if delivery hasn't started
  if (!trackingInfo.canSeeTracking) {
    return null;
  }

  const deliveryStatus = trackingInfo.status;

  // Progress steps
  const steps = [
    {
      key: 'PACKED',
      label: 'Packed',
      icon: Package,
      timestamp: trackingInfo.timestamps.packed,
      completed: ['PACKED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus),
    },
    {
      key: 'PICKUP_SCHEDULED',
      label: 'Pickup Scheduled',
      icon: Clock,
      timestamp: trackingInfo.timestamps.pickupScheduled,
      completed: ['PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus),
    },
    {
      key: 'IN_TRANSIT',
      label: 'In Transit',
      icon: Truck,
      timestamp: trackingInfo.timestamps.inTransit,
      completed: ['IN_TRANSIT', 'DELIVERED'].includes(deliveryStatus),
    },
    {
      key: 'DELIVERED',
      label: 'Delivered',
      icon: CheckCircle2,
      timestamp: trackingInfo.timestamps.delivered,
      completed: deliveryStatus === 'DELIVERED',
    },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Tracking
          </CardTitle>
          <Badge className={getDeliveryStateColor(deliveryStatus)}>
            {trackingInfo.statusLabel}
          </Badge>
        </div>
        <CardDescription>
          Track your order within Leorit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Timeline */}
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="relative flex items-start gap-4 pl-8">
                  <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted border-2 border-muted-foreground/30'
                  }`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <p className={`text-sm font-medium ${
                      step.completed ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(step.timestamp), "dd MMM yyyy, HH:mm")}
                      </p>
                    )}
                    {!step.timestamp && !step.completed && (
                      <p className="text-xs text-muted-foreground">Pending</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracking Details - Only shown once pickup is scheduled */}
        {trackingInfo.trackingId && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Shipping Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {trackingInfo.courierName && (
                <div>
                  <p className="text-xs text-muted-foreground">Courier</p>
                  <p className="font-medium">{trackingInfo.courierName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Tracking ID</p>
                <p className="font-mono text-sm">{trackingInfo.trackingId}</p>
              </div>
            </div>

            {order.estimated_delivery_date && deliveryStatus !== 'DELIVERED' && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Estimated Delivery</span>
                </div>
                <p className="text-lg font-bold text-primary mt-1">
                  {format(new Date(order.estimated_delivery_date), "EEEE, dd MMM yyyy")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Notice */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <strong>Note:</strong> Tracking updates are managed by Leorit. 
          For delivery inquiries, please use the order chat.
        </div>
      </CardContent>
    </Card>
  );
};

export default BuyerDeliveryTracking;
