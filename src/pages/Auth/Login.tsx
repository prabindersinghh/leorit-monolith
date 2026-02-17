import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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
