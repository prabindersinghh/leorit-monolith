import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

// Hardcoded allowed emails for privileged roles
const ALLOWED_ADMIN_EMAIL = "prabhsingh@leorit.ai";
const ALLOWED_MANUFACTURER_EMAIL = "singhprabindersingh@gmail.com";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();

  const forceLogout = async (message: string) => {
    await supabase.auth.signOut();
    toast.error(message);
    setAccessDenied(true);
  };

  const validateRoleAccess = (role: string | null, email: string | undefined) => {
    if (!role || !email) return true; // Will be handled by other checks

    // Admin role - only allow specific email
    if (role === "admin" && email !== ALLOWED_ADMIN_EMAIL) {
      forceLogout("Admin access restricted");
      return false;
    }

    // Manufacturer role - only allow specific email
    if (role === "manufacturer" && email !== ALLOWED_MANUFACTURER_EMAIL) {
      forceLogout("Manufacturer access restricted");
      return false;
    }

    return true;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id, session.user.email);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string, email: string | undefined) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      const role = data?.role || null;
      
      // Validate role access based on email
      if (role && !validateRoleAccess(role, email)) {
        return; // Access denied, forceLogout already called
      }
      
      setUserRole(role);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (accessDenied) {
    return <Navigate to="/login" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Double-check role + email for protected routes
  if (allowedRoles) {
    const userEmail = session.user.email;
    
    // Check if trying to access admin routes
    if (allowedRoles.includes('admin') && userRole === 'admin') {
      if (userEmail !== ALLOWED_ADMIN_EMAIL) {
        forceLogout("Admin access restricted");
        return <Navigate to="/login" replace />;
      }
    }
    
    // Check if trying to access manufacturer routes
    if (allowedRoles.includes('manufacturer') && userRole === 'manufacturer') {
      if (userEmail !== ALLOWED_MANUFACTURER_EMAIL) {
        forceLogout("Manufacturer access restricted");
        return <Navigate to="/login" replace />;
      }
    }
    
    // Standard role check
    if (userRole && !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
