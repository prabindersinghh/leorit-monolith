import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/leorit-logo.png";
import { logAuthEvent } from "@/lib/systemLogger";

// Hardcoded allowed emails for privileged roles
const ALLOWED_ADMIN_EMAIL = "prabhsingh@leorit.ai";
const ALLOWED_MANUFACTURER_EMAIL = "singhprabindersingh@gmail.com";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        const userRole = roleData?.role || 'buyer';
        const userEmail = data.user.email;
        
        // SECURITY: Validate privileged role access by email
        if (userRole === "admin" && userEmail !== ALLOWED_ADMIN_EMAIL) {
          await supabase.auth.signOut();
          await logAuthEvent('login_blocked', data.user.id, 'admin', { 
            email: userEmail, 
            reason: 'Admin email not allowed' 
          });
          toast.error("Admin access restricted");
          setLoading(false);
          return;
        }
        
        if (userRole === "manufacturer" && userEmail !== ALLOWED_MANUFACTURER_EMAIL) {
          await supabase.auth.signOut();
          await logAuthEvent('login_blocked', data.user.id, 'manufacturer', { 
            email: userEmail, 
            reason: 'Manufacturer onboarding is currently closed' 
          });
          toast.error("Manufacturer onboarding is currently closed");
          setLoading(false);
          return;
        }
        
        // Log successful login
        await logAuthEvent('login', data.user.id, userRole as 'buyer' | 'manufacturer' | 'admin', { 
          email: userEmail 
        });
        
        toast.success("Login successful!");
        
        // Navigate based on role
        if (userRole === "buyer") navigate("/buyer/dashboard");
        else if (userRole === "manufacturer") navigate("/manufacturer/dashboard");
        else if (userRole === "admin") navigate("/admin/dashboard");
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
