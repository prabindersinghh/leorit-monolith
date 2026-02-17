import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { resolveAndSyncUserRole, getRoleDashboard } from "@/lib/resolveUserRole";

// Hardcoded allowed emails for privileged roles
const ALLOWED_ADMIN_EMAIL = "prabhsingh@leorit.ai";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

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
          resolveRoleFromAllowList(session.user.id, session.user.email);
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
        resolveRoleFromAllowList(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Resolves role from database allow-lists and syncs to user_roles.
   * Works for both email/password and Google OAuth users.
   */
  const resolveRoleFromAllowList = async (userId: string, email: string | undefined) => {
    try {
      if (!email) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Use centralized role resolution (admin → manufacturer → buyer)
      const resolvedRole = await resolveAndSyncUserRole(userId, email);
      
      // SECURITY: Admin email restriction (existing check preserved)
      if (resolvedRole === "admin" && email !== ALLOWED_ADMIN_EMAIL) {
        await forceLogout("Admin access restricted");
        return;
      }
      
      setUserRole(resolvedRole);
    } catch (error) {
      console.error('Error resolving user role:', error);
      // Fallback: try reading existing role from user_roles
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
        setUserRole(data?.role || null);
      } catch {
        setUserRole(null);
      }
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
