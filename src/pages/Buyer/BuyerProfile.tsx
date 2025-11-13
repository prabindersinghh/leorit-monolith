import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const BuyerProfile = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="buyer" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information</p>
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
