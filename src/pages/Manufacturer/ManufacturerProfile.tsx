import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ManufacturerPerformanceScore from "@/components/ManufacturerPerformanceScore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ManufacturerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    company_name: "",
    email: "",
    phone: "",
    address: "",
    on_time_deliveries: 0,
    qc_pass_rate: 0,
    total_disputes: 0,
    performance_score: 0,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const score = (data.on_time_deliveries || 0) * 2 + (data.qc_pass_rate || 0) * 3 - (data.total_disputes || 0) * 5;
        setProfile({
          company_name: data.company_name || "",
          email: data.email || "",
          phone: "",
          address: "",
          on_time_deliveries: data.on_time_deliveries || 0,
          qc_pass_rate: data.qc_pass_rate || 0,
          total_disputes: data.total_disputes || 0,
          performance_score: Math.max(0, score),
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: profile.company_name,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background w-full">
        <Sidebar userRole="manufacturer" />
        <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar userRole="manufacturer" />

      <main className="flex-1 p-8 w-[calc(100%-16rem)] ml-64">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your manufacturer account information</p>
          </div>

          <ManufacturerPerformanceScore
            onTimeDeliveries={profile.on_time_deliveries}
            qcPassRate={profile.qc_pass_rate}
            totalDisputes={profile.total_disputes}
            performanceScore={profile.performance_score}
          />

          <div className="bg-card border border-border rounded-xl p-8">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Company Name</Label>
                  <Input 
                    className="mt-1" 
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input className="mt-1" placeholder="Contact name" />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input 
                  className="mt-1" 
                  type="email" 
                  value={profile.email}
                  disabled
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input 
                  className="mt-1" 
                  type="tel" 
                  placeholder="+91 XXXXXXXXXX"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input 
                  className="mt-1" 
                  placeholder="Factory address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>

              <Button 
                type="submit"
                className="bg-foreground text-background hover:bg-gray-800"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManufacturerProfile;
