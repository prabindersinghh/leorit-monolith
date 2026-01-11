/**
 * Command Center Admin Actions
 * 
 * Admin controls for order intervention:
 * - Assign / reassign manufacturer
 * - Assign courier + tracking ID
 * - Manual delivery state transitions
 * 
 * All actions use existing state machine logic and log events.
 * ADD-ONLY. No analytics.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Factory, Truck, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import {
  canAdminSchedulePickup,
  canAdminMarkInTransit,
  canAdminMarkDelivered,
  DeliveryState,
} from "@/lib/deliveryStateMachine";

interface CommandCenterActionsProps {
  order: any;
  manufacturers: Record<string, string>;
  onUpdate: () => void;
}

const CommandCenterActions = ({ order, manufacturers, onUpdate }: CommandCenterActionsProps) => {
  // Manufacturer assignment
  const [availableManufacturers, setAvailableManufacturers] = useState<any[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [assigningManufacturer, setAssigningManufacturer] = useState(false);

  // Courier assignment
  const [courierName, setCourierName] = useState(order.courier_name || "");
  const [trackingId, setTrackingId] = useState(order.tracking_id || "");
  const [assigningCourier, setAssigningCourier] = useState(false);

  // Delivery state transitions
  const [transitioningDelivery, setTransitioningDelivery] = useState(false);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const fetchManufacturers = async () => {
    const { data } = await supabase
      .from('manufacturer_verifications')
      .select('user_id, company_name, city, state, verified, soft_onboarded, paused')
      .or('verified.eq.true,soft_onboarded.eq.true');

    // Filter out paused manufacturers
    const active = (data || []).filter(m => !m.paused);
    setAvailableManufacturers(active);
  };

  const handleAssignManufacturer = async () => {
    if (!selectedManufacturer) {
      toast.error("Select a manufacturer");
      return;
    }

    // ADMIN-FIRST: Payment must be received before manufacturer assignment
    if (!order.payment_received_at) {
      toast.error("Cannot assign manufacturer: Payment has not been received yet. Admin must first approve the order and mark payment as received.");
      return;
    }

    setAssigningManufacturer(true);
    try {
      const now = new Date().toISOString();
      const isReassign = !!order.manufacturer_id;

      const { error } = await supabase
        .from('orders')
        .update({
          manufacturer_id: selectedManufacturer,
          assigned_at: now,
          order_state: 'MANUFACTURER_ASSIGNED',
          detailed_status: 'submitted_to_manufacturer',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'manufacturer_assigned', {
        manufacturer_id: selectedManufacturer,
        previous_manufacturer_id: order.manufacturer_id,
        is_reassignment: isReassign,
        assigned_by: 'admin_command_center',
        timestamp: now,
      });

      toast.success(isReassign ? "Manufacturer reassigned" : "Manufacturer assigned");
      setSelectedManufacturer("");
      onUpdate();
    } catch (error: any) {
      console.error('Error assigning manufacturer:', error);
      toast.error(error.message || "Failed to assign manufacturer");
    } finally {
      setAssigningManufacturer(false);
    }
  };

  const handleAssignCourier = async () => {
    if (!courierName.trim() || !trackingId.trim()) {
      toast.error("Enter both courier name and tracking ID");
      return;
    }

    // Validate using delivery state machine
    const result = canAdminSchedulePickup(order, courierName.trim(), trackingId.trim());
    if (!result.allowed) {
      toast.error(result.reason || "Cannot schedule pickup");
      return;
    }

    setAssigningCourier(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update({
          courier_name: courierName.trim(),
          tracking_id: trackingId.trim(),
          delivery_status: 'PICKUP_SCHEDULED',
          pickup_scheduled_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'courier_assigned', {
        courier_name: courierName.trim(),
        tracking_id: trackingId.trim(),
        assigned_by: 'admin_command_center',
        timestamp: now,
      });

      await logOrderEvent(order.id, 'pickup_scheduled', {
        courier_name: courierName.trim(),
        tracking_id: trackingId.trim(),
        scheduled_by: 'admin_command_center',
        timestamp: now,
      });

      toast.success("Courier assigned & pickup scheduled");
      onUpdate();
    } catch (error: any) {
      console.error('Error assigning courier:', error);
      toast.error(error.message || "Failed to assign courier");
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleMarkInTransit = async () => {
    const result = canAdminMarkInTransit(order);
    if (!result.allowed) {
      toast.error(result.reason || "Cannot mark in transit");
      return;
    }

    setTransitioningDelivery(true);
    try {
      const now = new Date().toISOString();
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

      const { error } = await supabase
        .from('orders')
        .update({
          delivery_status: 'IN_TRANSIT',
          in_transit_at: now,
          dispatched_at: now,
          estimated_delivery_date: estimatedDelivery.toISOString(),
          order_state: 'DISPATCHED',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'in_transit', {
        marked_by: 'admin_command_center',
        tracking_id: order.tracking_id,
        courier_name: order.courier_name,
        timestamp: now,
      });

      await logOrderEvent(order.id, 'dispatched', {
        dispatched_at: now,
        estimated_delivery: estimatedDelivery.toISOString(),
        marked_by: 'admin_command_center',
      });

      toast.success("Marked as In Transit");
      onUpdate();
    } catch (error: any) {
      console.error('Error marking in transit:', error);
      toast.error(error.message || "Failed to mark in transit");
    } finally {
      setTransitioningDelivery(false);
    }
  };

  const handleMarkDelivered = async () => {
    const result = canAdminMarkDelivered(order);
    if (!result.allowed) {
      toast.error(result.reason || "Cannot mark delivered");
      return;
    }

    setTransitioningDelivery(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update({
          delivery_status: 'DELIVERED',
          delivered_at: now,
          order_state: 'DELIVERED',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'order_delivered', {
        marked_by: 'admin_command_center',
        tracking_id: order.tracking_id,
        timestamp: now,
      });

      toast.success("Marked as Delivered");
      onUpdate();
    } catch (error: any) {
      console.error('Error marking delivered:', error);
      toast.error(error.message || "Failed to mark delivered");
    } finally {
      setTransitioningDelivery(false);
    }
  };

  const currentDeliveryState = (order.delivery_status as DeliveryState) || 'NOT_STARTED';

  return (
    <div className="space-y-4">
      {/* Manufacturer Assignment */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Factory className="h-4 w-4" />
            {order.manufacturer_id ? "Reassign Manufacturer" : "Assign Manufacturer"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.manufacturer_id && (
            <div className="p-2 bg-muted rounded text-xs">
              <span className="text-muted-foreground">Current: </span>
              <span className="font-medium">{manufacturers[order.manufacturer_id] || order.manufacturer_id}</span>
            </div>
          )}
          <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
            <SelectTrigger>
              <SelectValue placeholder="Select manufacturer..." />
            </SelectTrigger>
            <SelectContent>
              {availableManufacturers
                .filter((m) => m.user_id && m.user_id.trim() !== '')
                .map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    <div className="flex items-center gap-2">
                      <span>{m.company_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {m.city}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="w-full"
            onClick={handleAssignManufacturer}
            disabled={!selectedManufacturer || assigningManufacturer}
          >
            {assigningManufacturer ? "Assigning..." : order.manufacturer_id ? "Reassign" : "Assign"}
          </Button>
        </CardContent>
      </Card>

      {/* Courier & Tracking */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Courier & Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-2 bg-muted rounded text-xs">
            <span className="text-muted-foreground">Delivery Status: </span>
            <Badge variant="outline">{currentDeliveryState}</Badge>
          </div>

          {/* Show courier form when PACKED */}
          {currentDeliveryState === 'PACKED' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Courier Name</Label>
                  <Input
                    size={1}
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="e.g., Delhivery"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tracking ID</Label>
                  <Input
                    size={1}
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g., AWB123"
                    className="text-sm"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleAssignCourier}
                disabled={!courierName.trim() || !trackingId.trim() || assigningCourier}
              >
                {assigningCourier ? "Assigning..." : "Assign Courier & Schedule Pickup"}
              </Button>
            </div>
          )}

          {/* Show current courier info */}
          {order.courier_name && order.tracking_id && (
            <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-xs">
              <p className="text-green-700 dark:text-green-400">
                <strong>Courier:</strong> {order.courier_name}
              </p>
              <p className="text-green-700 dark:text-green-400">
                <strong>Tracking:</strong> {order.tracking_id}
              </p>
            </div>
          )}

          {/* Mark In Transit */}
          {currentDeliveryState === 'PICKUP_SCHEDULED' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleMarkInTransit}
              disabled={transitioningDelivery}
            >
              {transitioningDelivery ? "Updating..." : "Mark In Transit"}
            </Button>
          )}

          {/* Mark Delivered */}
          {currentDeliveryState === 'IN_TRANSIT' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full">
                  Mark Delivered
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Confirm Delivery
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure this order has been delivered to the buyer? This action will update the order state.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkDelivered} disabled={transitioningDelivery}>
                    {transitioningDelivery ? "Updating..." : "Confirm Delivered"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Delivered state */}
          {currentDeliveryState === 'DELIVERED' && (
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-700 dark:text-green-400">
              ✓ Order has been delivered
            </div>
          )}

          {/* Not started state */}
          {currentDeliveryState === 'NOT_STARTED' && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded text-xs text-yellow-700 dark:text-yellow-400">
              Waiting for manufacturer to mark as PACKED
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommandCenterActions;
