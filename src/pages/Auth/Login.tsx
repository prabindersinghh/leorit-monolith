import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "manufacturer" | "admin">("buyer");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual authentication with Lovable Cloud
    // For now, just navigate based on role
    if (role === "buyer") navigate("/buyer/dashboard");
    else if (role === "manufacturer") navigate("/manufacturer/dashboard");
    else navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-foreground rounded-2xl mb-6">
            <span className="text-background font-bold text-2xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Leorit Bulk</h1>
          <p className="text-muted-foreground">AI-Powered Custom Apparel Platform</p>
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

            <div>
              <Label className="text-foreground mb-2 block">Login as</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["buyer", "manufacturer", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-4 py-2 rounded-lg border transition-all capitalize text-sm font-medium ${
                      role === r
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border hover:border-gray-400"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full bg-foreground text-background hover:bg-gray-800">
              Sign In
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
