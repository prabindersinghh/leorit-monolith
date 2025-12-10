import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";

const BuyerProfile = () => {
  const [isRepeatBuyer, setIsRepeatBuyer] = useState(false);
  const [bulkOrderCount, setBulkOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRepeatBuyer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Count bulk orders (quantity > 1) for this buyer
        const { data: bulkOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("buyer_id", user.id)
          .gt("quantity", 1);

        const count = bulkOrders?.length || 0;
        setBulkOrderCount(count);
        setIsRepeatBuyer(count >= 2);
      } catch (error) {
        console.error("Error checking repeat buyer status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkRepeatBuyer();
  }, []);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="buyer" />

      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>

          {/* Repeat Buyer Status Card */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Buyer Status</h2>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Checking..." : `You have placed ${bulkOrderCount} bulk order${bulkOrderCount !== 1 ? 's' : ''}`}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Repeat Buyer:</span>
                  {isRepeatBuyer ? (
                    <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Yes
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      No
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-8">
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Company Name</Label>
                  <Input className="mt-1" defaultValue="Acme Retail Inc." />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input className="mt-1" defaultValue="John Doe" />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input className="mt-1" type="email" defaultValue="john@acmeretail.com" />
              </div>

              <div>
                <Label>Phone</Label>
                <Input className="mt-1" type="tel" defaultValue="+1 (555) 123-4567" />
              </div>

              <div>
                <Label>Address</Label>
                <Input className="mt-1" defaultValue="123 Business St, NY 10001" />
              </div>

              <Button className="bg-foreground text-background hover:bg-gray-800">
                Save Changes
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuyerProfile;
