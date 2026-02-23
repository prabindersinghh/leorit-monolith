import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import logo from "@/assets/leorit-logo.png";
import { logAuthEvent } from "@/lib/systemLogger";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Check if manufacturer email is approved and not yet linked
   */
  const checkManufacturerApproval = async (emailToCheck: string): Promise<{
    isManufacturer: boolean;
    approved: boolean;
    error?: string;
  }> => {
    const { data: manufacturer, error } = await supabase
      .from('approved_manufacturers')
      .select('id, email, verified, linked_user_id')
      .eq('email', emailToCheck.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[Signup] Error checking manufacturer approval:', error);
      return { isManufacturer: false, approved: false };
    }

    // Email not in approved list → not a manufacturer, proceed as buyer
    if (!manufacturer) {
      return { isManufacturer: false, approved: false };
    }

    // Not verified by admin
    if (!manufacturer.verified) {
      return { 
        isManufacturer: true, 
        approved: false, 
        error: 'Your manufacturer account is pending verification.' 
      };
    }

    // Already linked to a user account
    if (manufacturer.linked_user_id) {
      return { 
        isManufacturer: true, 
        approved: false, 
        error: 'This manufacturer account is already activated. Please login.' 
      };
    }

    return { isManufacturer: true, approved: true };
  };

  /**
   * Link manufacturer record to newly created user
   */
  const linkManufacturerAccount = async (emailToLink: string, userId: string) => {
    const { error } = await supabase
      .from('approved_manufacturers')
      .update({ linked_user_id: userId })
      .eq('email', emailToLink.trim().toLowerCase());

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
      // Check if email is an approved manufacturer
      const approval = await checkManufacturerApproval(email);
      
      // If email is in manufacturer list but not approved/available, block
      if (approval.isManufacturer && !approval.approved) {
        toast.error(approval.error);
        setLoading(false);
        return;
      }

      // Determine role from allow-list (NOT from user selection)
      const signupRole = approval.isManufacturer ? "manufacturer" : "buyer";

      // CREATE AUTH USER
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            company_name: companyName,
            role: signupRole,
          },
        },
      });

      if (error) throw error;

      // POST-SIGNUP: Link manufacturer account if applicable
      if (data.user && signupRole === "manufacturer") {
        const linked = await linkManufacturerAccount(email, data.user.id);
        if (!linked) {
          console.warn('[Signup] Failed to link manufacturer, will retry on login');
        }
      }

      // Log signup event
      if (data.user) {
        await logAuthEvent('signup', data.user.id, signupRole, { 
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

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Your role will be assigned automatically based on your email.
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) throw error;
              } catch (err: any) {
                toast.error(err.message || "Google sign-up failed");
                setLoading(false);
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </Button>

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
