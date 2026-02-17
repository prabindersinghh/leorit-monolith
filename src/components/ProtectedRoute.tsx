import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

// Hardcoded allowed emails for privileged roles
const ALLOWED_ADMIN_EMAIL = "prabhsingh@leorit.ai";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const getRoleDashboard = (role: string | null): string => {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "manufacturer": return "/manufacturer/dashboard";
    case "buyer": return "/buyer/dashboard";
    default: return "/login";
  }
};

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const forceLogout = async (message: string) => {
    await supabase.auth.signOut();
    toast.error(message);
    setAccessDenied(true);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // Use setTimeout to prevent Supabase deadlock
        setTimeout(() => {
          fetchUserRole(session.user.id, session.user.email);
        }, 0);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id, session.user.email);
      } else {
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
      
      // SECURITY: Admin email restriction
      if (role === "admin" && email !== ALLOWED_ADMIN_EMAIL) {
        await forceLogout("Admin access restricted");
        return;
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

  if (accessDenied || !session) {
    return <Navigate to="/login" replace />;
  }

  // Role-based route guard: redirect to correct dashboard if wrong role
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleDashboard(userRole)} replace />;
  }

  return <>{children}</>;
};
