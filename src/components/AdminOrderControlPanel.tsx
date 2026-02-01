/**
 * Admin Order Control Panel
 * 
 * Provides admin controls for:
 * - Spec locking (required before production)
 * - Admin QC decision (required before delivery/payment)
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
import { Factory, Truck, Settings, AlertTriangle, PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logOrderEvent } from "@/lib/orderEventLogger";
import { OrderState } from "@/lib/orderStateMachineV2";
import { DeliveryState } from "@/lib/deliveryStateMachine";
import OrderDelayFlags from "@/components/OrderDelayFlags";
import AdminOrderApproval from "@/components/AdminOrderApproval";
import AdminSpecLocking from "@/components/AdminSpecLocking";
import AdminQCDecision from "@/components/AdminQCDecision";

interface AdminOrderControlPanelProps {
  order: any;
  onUpdate: () => void;
}

// Using string array for manual override - includes all possible states
const OVERRIDE_ORDER_STATES = [
  'DRAFT',
  'SUBMITTED',
  'ADMIN_APPROVED',
  'MANUFACTURER_ASSIGNED',
  'PAYMENT_REQUESTED',
  'PAYMENT_CONFIRMED',
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
] as const;

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
    // Get all verified/soft-onboarded manufacturers that are NOT paused
    const { data: verifications } = await supabase
      .from('manufacturer_verifications')
      .select('user_id, company_name, city, state, capacity, verified, soft_onboarded, paused')
      .or('verified.eq.true,soft_onboarded.eq.true');
    
    // Filter out paused manufacturers client-side for proper logic
    const activeManufacturers = (verifications || []).filter(m => !m.paused);
    setManufacturers(activeManufacturers);
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

    // Validate delivery status - must be PACKED first
    if (order.delivery_status !== 'PACKED') {
      toast.error("Manufacturer must mark order as PACKED before assigning courier");
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

      await logOrderEvent(order.id, 'pickup_scheduled', {
        courier_name: courierName.trim(),
        tracking_id: trackingId.trim(),
        scheduled_by: 'admin',
        timestamp: now,
      });

      toast.success("Courier assigned and pickup scheduled");
      onUpdate();
    } catch (error: any) {
      console.error('Error assigning courier:', error);
      toast.error(error.message || "Failed to assign courier");
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleMarkInTransit = async () => {
    if (order.delivery_status !== 'PICKUP_SCHEDULED') {
      toast.error("Pickup must be scheduled before marking in transit");
      return;
    }

    setAssigningCourier(true);
    try {
      const now = new Date().toISOString();
      const dispatchedAt = now;
      // Calculate estimated delivery (dispatched_at + 3 days)
      const estimatedDelivery = new Date(now);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
      
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_status: 'IN_TRANSIT',
          in_transit_at: now,
          dispatched_at: dispatchedAt,
          estimated_delivery_date: estimatedDelivery.toISOString(),
          order_state: 'DISPATCHED',
          state_updated_at: now,
          updated_at: now,
        })
        .eq('id', order.id);

      if (error) throw error;

      await logOrderEvent(order.id, 'in_transit', {
        marked_by: 'admin',
        timestamp: now,
        tracking_id: order.tracking_id,
        courier_name: order.courier_name,
      });

      await logOrderEvent(order.id, 'dispatched', {
        dispatched_at: dispatchedAt,
        estimated_delivery: estimatedDelivery.toISOString(),
        marked_by: 'admin',
      });

      toast.success("Order marked as in transit");
      onUpdate();
    } catch (error: any) {
      console.error('Error marking in transit:', error);
      toast.error(error.message || "Failed to mark in transit");
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (order.delivery_status !== 'IN_TRANSIT') {
      toast.error("Order must be in transit before marking delivered");
      return;
    }

    setAssigningCourier(true);
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
        marked_by: 'admin',
        timestamp: now,
        tracking_id: order.tracking_id,
      });

      toast.success("Order marked as delivered");
      onUpdate();
    } catch (error: any) {
      console.error('Error marking delivered:', error);
      toast.error(error.message || "Failed to mark delivered");
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
      {/* Order Approval Section - New approval workflow */}
      <AdminOrderApproval order={order} onUpdate={onUpdate} />

      {/* Spec Locking - Required before production */}
      <AdminSpecLocking order={order} onUpdate={onUpdate} />

      {/* Admin QC Decision - Required before delivery/payment */}
      <AdminQCDecision order={order} onUpdate={onUpdate} />

      {/* Delay Metrics - Admin visibility into manufacturer discipline */}
      <Card className="border-muted">
        <CardContent className="pt-4">
          <OrderDelayFlags order={order} />
        </CardContent>
      </Card>

      {/* Manufacturer Assignment - Only after payment received */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5" />
            Assign Manufacturer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Gate - Manufacturer assignment only after payment */}
          {!order.payment_received_at && !order.manufacturer_id && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-start gap-2">
              <PauseCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Awaiting Payment
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Manufacturer can only be assigned after buyer payment is received.
                  {!order.admin_approved_at && " Please approve the order and add payment link first."}
                  {order.admin_approved_at && !order.payment_received_at && " Waiting for buyer to complete payment."}
                </p>
              </div>
            </div>
          )}
          
          {order.manufacturer_id ? (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✓ Manufacturer already assigned
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ID: {order.manufacturer_id.slice(0, 8)}...
              </p>
            </div>
          ) : order.payment_received_at ? (
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
          ) : null}
        </CardContent>
      </Card>

      {/* Courier & Delivery Management */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Delivery Management (Admin Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Delivery Status */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Delivery Status:</span>
              <Badge variant="outline" className="font-mono">
                {order.delivery_status || 'NOT_STARTED'}
              </Badge>
            </div>
            {order.packed_at && (
              <p className="text-xs text-muted-foreground">
                Packed at: {new Date(order.packed_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Courier Assignment - Only when PACKED */}
          {order.delivery_status === 'PACKED' && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Order is packed. Assign courier and schedule pickup:
              </p>
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
              <Button 
                onClick={handleAssignCourier} 
                disabled={!courierName.trim() || !trackingId.trim() || assigningCourier}
                className="w-full"
              >
                {assigningCourier ? "Assigning..." : "Assign Courier & Schedule Pickup"}
              </Button>
            </div>
          )}

          {/* Current Courier Info */}
          {order.courier_name && order.tracking_id && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✓ Courier: {order.courier_name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tracking ID: {order.tracking_id}
              </p>
            </div>
          )}

          {/* Mark In Transit - Only when PICKUP_SCHEDULED */}
          {order.delivery_status === 'PICKUP_SCHEDULED' && (
            <Button 
              onClick={handleMarkInTransit} 
              disabled={assigningCourier}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {assigningCourier ? "Processing..." : "Mark as In Transit (Dispatched)"}
            </Button>
          )}

          {/* Mark Delivered - Only when IN_TRANSIT */}
          {order.delivery_status === 'IN_TRANSIT' && (
            <Button 
              onClick={handleMarkDelivered} 
              disabled={assigningCourier}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {assigningCourier ? "Processing..." : "Mark as Delivered"}
            </Button>
          )}

          {/* Delivery Flow Explanation */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            <strong>Delivery Flow:</strong>
            <div className="mt-1 space-y-1">
              <p>1. Manufacturer marks as PACKED (with video)</p>
              <p>2. Admin assigns courier + tracking ID → PICKUP_SCHEDULED</p>
              <p>3. Admin marks as IN_TRANSIT when picked up</p>
              <p>4. Admin marks as DELIVERED on confirmation</p>
            </div>
          </div>
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
                  {OVERRIDE_ORDER_STATES.map((state) => (
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
