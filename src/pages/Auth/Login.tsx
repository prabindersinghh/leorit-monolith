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
import { resolveAndSyncUserRole, getRoleDashboard } from "@/lib/resolveUserRole";

// Hardcoded allowed emails for privileged roles
const ALLOWED_ADMIN_EMAIL = "prabhsingh@leorit.ai";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Auto-link manufacturer account on first login if not yet linked
   */
  const autoLinkManufacturer = async (userId: string, email: string) => {
    const { data: manufacturer, error } = await supabase
      .from('approved_manufacturers')
      .select('id, linked_user_id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[Login] Error checking manufacturer:', error);
      return;
    }

    // If manufacturer exists but not linked, link now
    if (manufacturer && !manufacturer.linked_user_id) {
      const { error: updateError } = await supabase
        .from('approved_manufacturers')
        .update({ linked_user_id: userId })
        .eq('id', manufacturer.id);

      if (updateError) {
        console.error('[Login] Error auto-linking manufacturer:', updateError);
      } else {
        console.log('[Login] Auto-linked manufacturer account');
      }
    }
  };

  /**
   * Check if manufacturer is properly linked
   */
  const isManufacturerActive = async (userId: string): Promise<boolean> => {
    const { data: manufacturer, error } = await supabase
      .from('approved_manufacturers')
      .select('id, linked_user_id, verified')
      .eq('linked_user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Login] Error checking manufacturer status:', error);
      return false;
    }

    return manufacturer !== null && manufacturer.verified === true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userEmail = data.user.email || '';
        
        // Resolve role from database allow-lists (admin → manufacturer → buyer)
        const resolvedRole = await resolveAndSyncUserRole(data.user.id, userEmail);
        
        // SECURITY: Validate admin access by email (existing check preserved)
        if (resolvedRole === "admin" && userEmail !== ALLOWED_ADMIN_EMAIL) {
          await supabase.auth.signOut();
          await logAuthEvent('login_blocked', data.user.id, 'admin', { 
            email: userEmail, 
            reason: 'Admin email not allowed' 
          });
          toast.error("Admin access restricted");
          setLoading(false);
          return;
        }
        
        // MANUFACTURER: Auto-link on first login + verify active status (existing logic preserved)
        if (resolvedRole === "manufacturer") {
          await autoLinkManufacturer(data.user.id, userEmail);
          
          const isActive = await isManufacturerActive(data.user.id);
          if (!isActive) {
            await supabase.auth.signOut();
            await logAuthEvent('login_blocked', data.user.id, 'manufacturer', { 
              email: userEmail, 
              reason: 'Manufacturer account not linked or not verified' 
            });
            toast.error("Manufacturer account not active. Contact admin.");
            setLoading(false);
            return;
          }
        }
        
        // Log successful login
        await logAuthEvent('login', data.user.id, resolvedRole, { email: userEmail });
        
        toast.success("Login successful!");
        
        // Navigate based on resolved role
        navigate(getRoleDashboard(resolvedRole));
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed");
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
          <p className="text-muted-foreground">End-to-end manufacturing execution, without factory chaos</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-foreground mb-6">Sign In</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
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
              />
            </div>

            <Button type="submit" className="w-full bg-foreground text-background hover:bg-gray-800" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

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
                toast.error(err.message || "Google sign-in failed");
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
            Sign in with Google
          </Button>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/signup")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't have an account? <span className="font-semibold">Sign Up</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
