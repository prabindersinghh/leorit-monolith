import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <ShieldAlert className="w-24 h-24 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button onClick={() => navigate("/login")} className="bg-foreground text-background hover:bg-foreground/90">
          Return to Login
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;
