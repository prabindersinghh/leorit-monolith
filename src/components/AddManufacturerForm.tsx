import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddManufacturerFormProps {
  onSuccess: () => void;
}

const AddManufacturerForm = ({ onSuccess }: AddManufacturerFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    city: "",
    state: "",
    country: "India",
    capacity: "",
    notes: "",
    verified: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert into approved_manufacturers table
      // linked_user_id is NULL - manufacturer will link on signup
      const { error } = await supabase.from("approved_manufacturers").insert({
        company_name: formData.company_name,
        email: formData.email,
        verified: formData.verified,
        linked_user_id: null, // Will be set when manufacturer signs up
        city: formData.city,
        state: formData.state,
        country: formData.country,
        capacity: formData.capacity || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manufacturer added. They can now create their account using this email.",
      });

      // Reset form
      setFormData({
        company_name: "",
        email: "",
        city: "",
        state: "",
        country: "India",
        capacity: "",
        notes: "",
        verified: true,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Manufacturer</CardTitle>
        <CardDescription>
          Approve a manufacturer email. They will create their own password during signup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                required
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Manufacturer will use this email to create their account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Production Capacity</Label>
              <Input
                id="capacity"
                placeholder="e.g., 10,000 units/month"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the manufacturer..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="verified"
              checked={formData.verified}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, verified: checked })
              }
            />
            <Label htmlFor="verified">Pre-approve for signup</Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Manufacturer...
              </>
            ) : (
              "Add Manufacturer"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddManufacturerForm;
