import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

interface DeliveryTrackingInfoProps {
  trackingId?: string;
  trackingUrl?: string;
  dispatchedAt?: string;
  estimatedDeliveryDate?: string;
}

const DeliveryTrackingInfo = ({
  trackingId,
  trackingUrl,
  dispatchedAt,
  estimatedDeliveryDate,
}: DeliveryTrackingInfoProps) => {
  if (!trackingId && !dispatchedAt) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trackingId && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tracking ID:</span>
            <span className="font-mono font-semibold">{trackingId}</span>
          </div>
        )}
        
        {trackingUrl && (
          <div>
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Track Shipment
              </a>
            </Button>
          </div>
        )}
        
        {dispatchedAt && (
          <div className="flex justify-between pt-2 border-t">
            <span className="text-muted-foreground">Dispatched:</span>
            <span className="font-medium">
              {format(new Date(dispatchedAt), "dd MMM yyyy, EEE")}
            </span>
          </div>
        )}
        
        {estimatedDeliveryDate && (
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Estimated Delivery:</span>
            </div>
            <span className="font-bold text-blue-700">
              {format(new Date(estimatedDeliveryDate), "dd MMM yyyy, EEE")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryTrackingInfo;
