/**
 * Admin Order Control Panel
 * 
 * Provides admin controls for:
 * - Assigning manufacturer to order
 * - Assigning courier + tracking ID
 * - Manual state transitions (resolve stuck orders with reason)
 * 
 * ADD ONLY - no analytics, no charts
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Factory, Truck, Settings, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { OrderState } from "@/lib/orderStateMachineV2";
import { DeliveryState } from "@/lib/deliveryStateMachine";

interface AdminOrderControlPanelProps {
  order: any;
  onUpdate: () => void;
}

const ORDER_STATES: OrderState[] = [
  'DRAFT',
  'SUBMITTED',
  'MANUFACTURER_ASSIGNED',
  'SAMPLE_IN_PROGRESS',
  'SAMPLE_QC_UPLOADED',
  'SAMPLE_APPROVED',
  'BULK_UNLOCKED',
  'BULK_IN_PRODUCTION',
  'BULK_QC_UPLOADED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
];

const DELIVERY_STATES: DeliveryState[] = [
  'NOT_STARTED',
  'PACKED',
  'PICKUP_SCHEDULED',
  'IN_TRANSIT',
  'DELIVERED',
];

const AdminOrderControlPanel = ({ order, onUpdate }: AdminOrderControlPanelProps) => {
  // Manufacturer assignment
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [assigningManufacturer, setAssigningManufacturer] = useState(false);
  
  // Courier assignment
  const [courierName, setCourierName] = useState(order.courier_name || "");
  const [trackingId, setTrackingId] = useState(order.tracking_id || "");
  const [assigningCourier, setAssigningCourier] = useState(false);
  
  // Manual state transition
  const [targetOrderState, setTargetOrderState] = useState<string>("");
  const [targetDeliveryState, setTargetDeliveryState] = useState<string>("");
  const [transitionReason, setTransitionReason] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const fetchManufacturers = async () => {
    // Get all verified manufacturers
    const { data: verifications } = await supabase
      .from('manufacturer_verifications')
      .select('user_id, company_name, city, state, capacity, verified, soft_onboarded')
      .or('verified.eq.true,soft_onboarded.eq.true');
    
    setManufacturers(verifications || []);
  };

  const handleAssignManufacturer = async () => {
    if (!selectedManufacturer) {
      toast.error("Please select a manufacturer");
      return;
    }

    setAssigningManufacturer(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('orders')
        .update({
          manufacturer_id: selectedManufacturer,
          assigned_at: now,
          order_state: 'MANUFACTURER_ASSIGNED',
          detailed_status: 'submitted_to_manufacturer',
          state_updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'manufacturer_assigned', {
        manufacturer_id: selectedManufacturer,
        assigned_by: 'admin',
        timestamp: now,
      });

      toast.success("Manufacturer assigned successfully");
      onUpdate();
    } catch (error: any) {
      console.error('Error assigning manufacturer:', error);
      toast.error(error.message || "Failed to assign manufacturer");
    } finally {
      setAssigningManufacturer(false);
    }
  };

  const handleAssignCourier = async () => {
    if (!courierName.trim()) {
      toast.error("Please enter courier name");
      return;
    }
    if (!trackingId.trim()) {
      toast.error("Please enter tracking ID");
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
        assigned_by: 'admin',
        timestamp: now,
      });

      toast.success("Courier assigned successfully");
      onUpdate();
    } catch (error: any) {
      console.error('Error assigning courier:', error);
      toast.error(error.message || "Failed to assign courier");
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleManualTransition = async () => {
    if (!transitionReason.trim() || transitionReason.trim().length < 10) {
      toast.error("Please provide a detailed reason for manual transition (min 10 characters)");
      return;
    }

    if (!targetOrderState && !targetDeliveryState) {
      toast.error("Please select a target state");
      return;
    }

    setIsTransitioning(true);
    try {
      const now = new Date().toISOString();
      const updates: Record<string, any> = {
        updated_at: now,
      };

      if (targetOrderState) {
        updates.order_state = targetOrderState;
        updates.state_updated_at = now;
        
        // Set corresponding timestamps based on state
        if (targetOrderState === 'DISPATCHED') {
          updates.dispatched_at = now;
          updates.delivery_status = 'IN_TRANSIT';
        } else if (targetOrderState === 'DELIVERED') {
          updates.delivered_at = now;
          updates.delivery_status = 'DELIVERED';
        } else if (targetOrderState === 'COMPLETED') {
          updates.escrow_status = 'fake_released';
          updates.escrow_released_timestamp = now;
        }
      }

      if (targetDeliveryState) {
        updates.delivery_status = targetDeliveryState;
        
        if (targetDeliveryState === 'IN_TRANSIT') {
          updates.in_transit_at = now;
        } else if (targetDeliveryState === 'DELIVERED') {
          updates.delivered_at = now;
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id);

      if (error) throw error;

      // Log the manual transition
      await logOrderEvent(order.id, 'dispatched', {
        manual_transition: true,
        from_order_state: order.order_state,
        to_order_state: targetOrderState || order.order_state,
        from_delivery_state: order.delivery_status,
        to_delivery_state: targetDeliveryState || order.delivery_status,
        reason: transitionReason.trim(),
        admin_override: true,
        timestamp: now,
      });

      toast.success("Order state updated successfully");
      setTargetOrderState("");
      setTargetDeliveryState("");
      setTransitionReason("");
      onUpdate();
    } catch (error: any) {
      console.error('Error transitioning order:', error);
      toast.error(error.message || "Failed to transition order");
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manufacturer Assignment */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5" />
            Assign Manufacturer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.manufacturer_id ? (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✓ Manufacturer already assigned
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ID: {order.manufacturer_id.slice(0, 8)}...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Manufacturer</Label>
                <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a manufacturer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        <div className="flex items-center gap-2">
                          <span>{m.company_name}</span>
                          <Badge variant={m.verified ? "default" : "secondary"} className="text-xs">
                            {m.verified ? "Verified" : "Soft-Onboarded"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {m.city}, {m.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAssignManufacturer} 
                disabled={!selectedManufacturer || assigningManufacturer}
                className="w-full"
              >
                {assigningManufacturer ? "Assigning..." : "Assign Manufacturer"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Courier Assignment */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Assign Courier & Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Courier Name</Label>
              <Input
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g., Delhivery, BlueDart"
              />
            </div>
            <div className="space-y-2">
              <Label>Tracking ID</Label>
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="e.g., AWB12345678"
              />
            </div>
          </div>
          
          {order.courier_name && order.tracking_id && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                Current: {order.courier_name} — {order.tracking_id}
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleAssignCourier} 
            disabled={!courierName.trim() || !trackingId.trim() || assigningCourier}
            className="w-full"
            variant="secondary"
          >
            {assigningCourier ? "Assigning..." : order.courier_name ? "Update Courier" : "Assign Courier"}
          </Button>
        </CardContent>
      </Card>

      {/* Manual State Transition (Resolve Stuck Orders) */}
      <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
            <Settings className="h-5 w-5" />
            Manual State Override
            <Badge variant="outline" className="ml-2 text-amber-600">Admin Only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Use with caution. Manual transitions bypass normal workflow validations. 
              A reason is required and will be logged for audit purposes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Order State</Label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                {order.order_state || 'Not set'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Current Delivery State</Label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                {order.delivery_status || 'NOT_STARTED'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Order State</Label>
              <Select value={targetOrderState} onValueChange={setTargetOrderState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— No change —</SelectItem>
                  {ORDER_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Delivery State</Label>
              <Select value={targetDeliveryState} onValueChange={setTargetDeliveryState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— No change —</SelectItem>
                  {DELIVERY_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason for Manual Transition (Required)</Label>
            <Textarea
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="Explain why this manual transition is needed (min 10 characters)..."
              className="min-h-20"
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={
                  (!targetOrderState && !targetDeliveryState) || 
                  transitionReason.trim().length < 10 ||
                  isTransitioning
                }
                className="w-full"
              >
                {isTransitioning ? "Transitioning..." : "Apply Manual Transition"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Manual State Transition</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>You are about to manually override the order state:</p>
                  {targetOrderState && (
                    <p className="font-mono text-sm">
                      Order: {order.order_state || 'Not set'} → {targetOrderState}
                    </p>
                  )}
                  {targetDeliveryState && (
                    <p className="font-mono text-sm">
                      Delivery: {order.delivery_status || 'NOT_STARTED'} → {targetDeliveryState}
                    </p>
                  )}
                  <p className="text-amber-600 font-medium mt-2">
                    This action bypasses workflow validations and will be logged.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleManualTransition} className="bg-destructive text-destructive-foreground">
                  Confirm Transition
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrderControlPanel;
