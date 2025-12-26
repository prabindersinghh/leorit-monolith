/**
 * Manufacturer Pause Control Component
 * 
 * Admin-only control to pause/unpause manufacturers.
 * Paused manufacturers cannot receive new orders.
 * 
 * ADD-ONLY: No auto-routing logic, just raw control.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { PauseCircle, PlayCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManufacturerPauseControlProps {
  manufacturer: {
    user_id: string;
    company_name: string;
    paused?: boolean;
    paused_at?: string | null;
    pause_reason?: string | null;
  };
  onUpdate: () => void;
}

const ManufacturerPauseControl = ({ manufacturer, onUpdate }: ManufacturerPauseControlProps) => {
  const [pauseReason, setPauseReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isPaused = manufacturer.paused === true;

  const handlePause = async () => {
    if (!pauseReason.trim() || pauseReason.trim().length < 10) {
      toast.error("Please provide a reason for pausing (min 10 characters)");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('manufacturer_verifications')
        .update({
          paused: true,
          paused_at: now,
          paused_by: user?.id,
          pause_reason: pauseReason.trim(),
        })
        .eq('user_id', manufacturer.user_id);

      if (error) throw error;

      toast.success(`${manufacturer.company_name} has been paused`);
      setPauseReason("");
      onUpdate();
    } catch (error: any) {
      console.error('Error pausing manufacturer:', error);
      toast.error(error.message || "Failed to pause manufacturer");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpause = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('manufacturer_verifications')
        .update({
          paused: false,
          paused_at: null,
          paused_by: null,
          pause_reason: null,
        })
        .eq('user_id', manufacturer.user_id);

      if (error) throw error;

      toast.success(`${manufacturer.company_name} has been unpaused`);
      onUpdate();
    } catch (error: any) {
      console.error('Error unpausing manufacturer:', error);
      toast.error(error.message || "Failed to unpause manufacturer");
    } finally {
      setLoading(false);
    }
  };

  if (isPaused) {
    return (
      <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <PauseCircle className="h-5 w-5" />
              Manufacturer Paused
            </CardTitle>
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
              Paused
            </Badge>
          </div>
          <CardDescription className="text-amber-600 dark:text-amber-500">
            This manufacturer cannot receive new orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {manufacturer.pause_reason && (
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Label className="text-xs text-amber-600 dark:text-amber-400">Pause Reason:</Label>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                {manufacturer.pause_reason}
              </p>
            </div>
          )}
          
          {manufacturer.paused_at && (
            <p className="text-xs text-muted-foreground">
              Paused on: {new Date(manufacturer.paused_at).toLocaleString()}
            </p>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                disabled={loading}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Unpause Manufacturer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unpause {manufacturer.company_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This manufacturer will be able to receive new orders again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleUnpause}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Unpause
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PauseCircle className="h-5 w-5" />
          Pause Manufacturer
        </CardTitle>
        <CardDescription>
          Paused manufacturers cannot receive new order assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Use this to temporarily stop assigning orders to manufacturers with performance issues.
            Existing orders are not affected.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Reason for Pausing (Required)</Label>
          <Textarea
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Explain why this manufacturer is being paused (min 10 characters)..."
            className="min-h-20"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive"
              className="w-full"
              disabled={loading || pauseReason.trim().length < 10}
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Pause Manufacturer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pause {manufacturer.company_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This manufacturer will not receive any new order assignments.
                Existing orders will continue normally.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePause}
                className="bg-destructive text-destructive-foreground"
              >
                Pause
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default ManufacturerPauseControl;
