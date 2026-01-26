/**
 * Admin Spec Locking Component
 * 
 * Mandatory form for admin to lock specs before production can start.
 * Stores data in order_specs table and uploads sample image to specs folder.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, Upload, AlertTriangle, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadOrderFile } from "@/lib/orderFileStorage";
import { logOrderEvent } from "@/lib/orderEventLogger";

interface AdminSpecLockingProps {
  order: {
    id: string;
    order_state: string | null;
    specs_locked: boolean | null;
    specs_locked_at: string | null;
    fabric_type: string | null;
    selected_color: string | null;
  };
  onUpdate: () => void;
}

interface SpecFormData {
  fabric_type: string;
  gsm: string;
  color: string;
  print_type: string;
  print_position: string;
  print_size: string;
  tolerance_mm: string;
}

const PRINT_TYPES = ['DTG', 'Screen', 'Embroidery', 'None'];
const PRINT_POSITIONS = ['Front', 'Back', 'Both', 'None'];

const AdminSpecLocking = ({ order, onUpdate }: AdminSpecLockingProps) => {
  const [isLocking, setIsLocking] = useState(false);
  const [sampleImage, setSampleImage] = useState<File | null>(null);
  const [existingSpecs, setExistingSpecs] = useState<any>(null);
  const [formData, setFormData] = useState<SpecFormData>({
    fabric_type: order.fabric_type || '',
    gsm: '',
    color: order.selected_color || '',
    print_type: '',
    print_position: '',
    print_size: '',
    tolerance_mm: '2',
  });

  // Fetch existing specs if any
  useEffect(() => {
    const fetchSpecs = async () => {
      const { data } = await supabase
        .from('order_specs')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle();
      
      if (data) {
        setExistingSpecs(data);
        setFormData({
          fabric_type: data.fabric_type || '',
          gsm: data.gsm?.toString() || '',
          color: data.color || '',
          print_type: data.print_type || '',
          print_position: data.print_position || '',
          print_size: data.print_size || '',
          tolerance_mm: data.tolerance_mm?.toString() || '2',
        });
      }
    };
    fetchSpecs();
  }, [order.id]);

  // Already locked - show locked state
  if (order.specs_locked) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Specs Locked
            </CardTitle>
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Locked
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {existingSpecs && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Fabric:</span> {existingSpecs.fabric_type}</div>
              <div><span className="text-muted-foreground">GSM:</span> {existingSpecs.gsm}</div>
              <div><span className="text-muted-foreground">Color:</span> {existingSpecs.color}</div>
              <div><span className="text-muted-foreground">Print Type:</span> {existingSpecs.print_type}</div>
              <div><span className="text-muted-foreground">Print Position:</span> {existingSpecs.print_position}</div>
              <div><span className="text-muted-foreground">Print Size:</span> {existingSpecs.print_size}</div>
              <div><span className="text-muted-foreground">Tolerance:</span> {existingSpecs.tolerance_mm}mm</div>
              {existingSpecs.approved_sample_url && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Sample Image:</span>{' '}
                  <a href={existingSpecs.approved_sample_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    View Sample
                  </a>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Locked on {order.specs_locked_at ? new Date(order.specs_locked_at).toLocaleString() : 'N/A'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if order is in correct state for spec locking
  const canLockSpecs = ['PAYMENT_CONFIRMED', 'ADMIN_APPROVED', 'MANUFACTURER_ASSIGNED'].includes(order.order_state || '');

  if (!canLockSpecs) {
    return null; // Don't show if not in right state
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (JPG, PNG, or WebP)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB");
        return;
      }
      setSampleImage(file);
    }
  };

  const handleLockSpecs = async () => {
    // Validate required fields
    if (!formData.fabric_type || !formData.gsm || !formData.color || 
        !formData.print_type || !formData.print_position || !formData.print_size) {
      toast.error("Please fill in all required fields");
      return;
    }

    const gsm = parseFloat(formData.gsm);
    const tolerance = parseFloat(formData.tolerance_mm);

    if (isNaN(gsm) || gsm <= 0) {
      toast.error("Please enter a valid GSM value");
      return;
    }

    if (isNaN(tolerance) || tolerance < 0) {
      toast.error("Please enter a valid tolerance value");
      return;
    }

    setIsLocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let sampleUrl: string | null = null;

      // Upload sample image if provided
      if (sampleImage) {
        const uploadResult = await uploadOrderFile(
          order.id,
          'spec',
          sampleImage,
          'admin'
        );

        if (uploadResult.success && uploadResult.fileUrl) {
          // Get signed URL for the uploaded file
          const { data: signedData } = await supabase.storage
            .from('orders')
            .createSignedUrl(uploadResult.fileUrl, 3600 * 24 * 365); // 1 year expiry
          sampleUrl = signedData?.signedUrl || null;
        }
      }

      const now = new Date().toISOString();

      // Insert or update order_specs
      const specsData = {
        order_id: order.id,
        fabric_type: formData.fabric_type,
        gsm: gsm,
        color: formData.color,
        print_type: formData.print_type,
        print_position: formData.print_position,
        print_size: formData.print_size,
        tolerance_mm: tolerance,
        approved_sample_url: sampleUrl,
        locked_by: user.id,
        created_at: now,
      };

      const { error: specsError } = await supabase
        .from('order_specs')
        .upsert(specsData, { onConflict: 'order_id' });

      if (specsError) throw specsError;

      // Update order to mark specs as locked
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          specs_locked: true,
          specs_locked_at: now,
          specs_locked_by: user.id,
          updated_at: now,
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Log the event
      await logOrderEvent(order.id, 'specs_locked', {
        locked_by: user.id,
        fabric_type: formData.fabric_type,
        gsm: gsm,
        print_type: formData.print_type,
        timestamp: now,
      });

      toast.success("Specs locked successfully! Production can now begin.");
      onUpdate();
    } catch (error: any) {
      console.error('Error locking specs:', error);
      toast.error(error.message || "Failed to lock specs");
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            Lock Specs Before Production
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
            Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-300 bg-amber-100/50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Production is blocked until specs are locked. Fill in all fields below.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fabric_type">Fabric Type *</Label>
            <Input
              id="fabric_type"
              value={formData.fabric_type}
              onChange={(e) => setFormData(prev => ({ ...prev, fabric_type: e.target.value }))}
              placeholder="e.g., 100% Cotton"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gsm">GSM *</Label>
            <Input
              id="gsm"
              type="number"
              value={formData.gsm}
              onChange={(e) => setFormData(prev => ({ ...prev, gsm: e.target.value }))}
              placeholder="e.g., 180"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color *</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              placeholder="e.g., Navy Blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="print_type">Print Type *</Label>
            <Select
              value={formData.print_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, print_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select print type" />
              </SelectTrigger>
              <SelectContent>
                {PRINT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="print_position">Print Position *</Label>
            <Select
              value={formData.print_position}
              onValueChange={(value) => setFormData(prev => ({ ...prev, print_position: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {PRINT_POSITIONS.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="print_size">Print Size *</Label>
            <Input
              id="print_size"
              value={formData.print_size}
              onChange={(e) => setFormData(prev => ({ ...prev, print_size: e.target.value }))}
              placeholder="e.g., A4, 12x12 inches"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tolerance_mm">Tolerance (mm) *</Label>
            <Input
              id="tolerance_mm"
              type="number"
              step="0.5"
              value={formData.tolerance_mm}
              onChange={(e) => setFormData(prev => ({ ...prev, tolerance_mm: e.target.value }))}
              placeholder="e.g., 2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample_image">Approved Sample Image</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sample_image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="text-sm"
              />
              {sampleImage && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileImage className="h-3 w-3" />
                  {sampleImage.name.substring(0, 15)}...
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={handleLockSpecs}
          disabled={isLocking}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {isLocking ? (
            <>Locking Specs...</>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Lock Specs
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminSpecLocking;
