import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck } from "lucide-react";

interface TrackingIdInputProps {
  orderId: string;
  onSuccess: () => void;
}

const TrackingIdInput = ({ orderId, onSuccess }: TrackingIdInputProps) => {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      toast.error("Please enter a tracking ID");
      return;
    }

    setLoading(true);
    
    const trackingUrl = `https://tracking.leorit.ai/${trackingId.trim()}`;
    const dispatchedAt = new Date();
    
    // Calculate estimated delivery date (dispatched_at + 3 days)
    const estimatedDeliveryDate = new Date(dispatchedAt);
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3);
    
    const { error } = await supabase
      .from("orders")
      .update({ 
        tracking_id: trackingId.trim(),
        tracking_url: trackingUrl,
        dispatched_at: dispatchedAt.toISOString(),
        estimated_delivery_date: estimatedDeliveryDate.toISOString(),
        status: "dispatched",
        detailed_status: "dispatched"
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update tracking ID");
    } else {
      toast.success("Order dispatched with tracking ID");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Enter Tracking ID
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tracking_id">Tracking ID</Label>
            <Input
              id="tracking_id"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter shipment tracking number"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Tracking ID"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TrackingIdInput;
