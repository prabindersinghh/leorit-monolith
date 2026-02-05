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
   * Check if manufacturer email is approved and not yet linked
   */
  const checkManufacturerApproval = async (email: string): Promise<{
    approved: boolean;
    error?: string;
  }> => {
    const { data: manufacturer, error } = await supabase
      .from('approved_manufacturers')
      .select('id, email, verified, linked_user_id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[Signup] Error checking manufacturer approval:', error);
      return { approved: false, error: 'Error validating manufacturer access.' };
    }

    // Email not in approved list
    if (!manufacturer) {
      return { 
        approved: false, 
        error: 'This email is not approved for manufacturer access. Contact admin.' 
      };
    }

    // Not verified by admin
    if (!manufacturer.verified) {
      return { 
        approved: false, 
        error: 'Your manufacturer account is pending verification.' 
      };
    }

    // Already linked to a user account
    if (manufacturer.linked_user_id) {
      return { 
        approved: false, 
        error: 'This manufacturer account is already activated. Please login.' 
      };
    }

    return { approved: true };
  };

  /**
   * Link manufacturer record to newly created user
   */
  const linkManufacturerAccount = async (email: string, userId: string) => {
    const { error } = await supabase
      .from('approved_manufacturers')
      .update({ linked_user_id: userId })
      .eq('email', email);

    if (error) {
      console.error('[Signup] Error linking manufacturer account:', error);
      return false;
    }
    
    console.log('[Signup] Successfully linked manufacturer account');
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // MANUFACTURER APPROVAL CHECK
      if (selectedRole === "manufacturer") {
        const approval = await checkManufacturerApproval(email);
        
        if (!approval.approved) {
          toast.error(approval.error);
          setLoading(false);
          return;
        }
      }

      // CREATE AUTH USER
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

      // POST-SIGNUP: Link manufacturer account
      if (data.user && selectedRole === "manufacturer") {
        const linked = await linkManufacturerAccount(email, data.user.id);
        if (!linked) {
          console.warn('[Signup] Failed to link manufacturer, will retry on login');
        }
      }

      // Log signup event
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
