import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/leorit-logo.png";
import { logAuthEvent } from "@/lib/systemLogger";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"buyer" | "manufacturer">("buyer");

  /**
   * Validate manufacturer email against whitelist
   * Returns: { valid: boolean, manufacturerId?: string, error?: string }
   */
  const validateManufacturerEmail = async (email: string): Promise<{
    valid: boolean;
    manufacturerId?: string;
    error?: string;
  }> => {
    const { data: manufacturer, error } = await supabase
      .from('manufacturer_verifications')
      .select('id, user_id, email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[Signup] Error checking manufacturer whitelist:', error);
      return { valid: false, error: 'Error validating manufacturer access.' };
    }

    // Email not in whitelist
    if (!manufacturer) {
      return { 
        valid: false, 
        error: 'This email is not approved for manufacturer access.' 
      };
    }

    // Already activated (user_id exists)
    if (manufacturer.user_id) {
      return { 
        valid: false, 
        error: 'Manufacturer account already activated. Please login.' 
      };
    }

    // Valid: email found, not yet linked
    return { valid: true, manufacturerId: manufacturer.id };
  };

  /**
   * Link manufacturer record to newly created user
   */
  const linkManufacturerAccount = async (manufacturerId: string, userId: string) => {
    const { error } = await supabase
      .from('manufacturer_verifications')
      .update({ user_id: userId })
      .eq('id', manufacturerId);

    if (error) {
      console.error('[Signup] Error linking manufacturer account:', error);
      // Don't throw - account is created, linking can happen on first login
    } else {
      console.log('[Signup] Successfully linked manufacturer account');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let manufacturerId: string | undefined;

    try {
      // MANUFACTURER WHITELIST CHECK
      // Only runs if manufacturer role is selected
      if (selectedRole === "manufacturer") {
        const validation = await validateManufacturerEmail(email);
        
        if (!validation.valid) {
          toast.error(validation.error);
          setLoading(false);
          return;
        }
        
        manufacturerId = validation.manufacturerId;
      }

      // SIGNUP - works for both buyer and manufacturer
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            company_name: companyName,
            role: selectedRole,
          },
        },
      });

      if (error) throw error;

      // POST-SIGNUP: Link manufacturer account if applicable
      if (data.user && selectedRole === "manufacturer" && manufacturerId) {
        await linkManufacturerAccount(manufacturerId, data.user.id);
      }

      // Log signup event for both roles
      if (data.user) {
        await logAuthEvent('signup', data.user.id, selectedRole, { 
          email, 
          company_name: companyName 
        });
      }

      toast.success("Account created successfully! You can now sign in.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Leorit.ai" className="w-20 h-20 object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Leorit.ai</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-foreground mb-6">Sign Up</h2>
          
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <Label className="text-foreground mb-3 block">I am a</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as "buyer" | "manufacturer")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="role-buyer" />
                  <Label htmlFor="role-buyer" className="cursor-pointer">Buyer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manufacturer" id="role-manufacturer" />
                  <Label htmlFor="role-manufacturer" className="cursor-pointer">Manufacturer</Label>
                </div>
              </RadioGroup>
              {selectedRole === "manufacturer" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Manufacturer signup requires pre-approval. Contact admin if not approved.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="company" className="text-foreground">Company Name</Label>
              <Input
                id="company"
                type="text"
                placeholder="Your Company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 bg-background border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-background border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-background border-border"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full bg-foreground text-background hover:bg-gray-800" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? <span className="font-semibold">Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
