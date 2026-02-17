import { supabase } from "@/integrations/supabase/client";

const ALLOWED_ADMIN_EMAIL = "prabhsingh@leorit.ai";

export type ResolvedRole = "admin" | "manufacturer" | "buyer";

/**
 * Determines user role from database allow-lists (NOT from client-side selection).
 * Priority: admin email → approved_manufacturers → default buyer.
 * Also syncs the resolved role to user_roles table.
 */
export async function resolveAndSyncUserRole(
  userId: string,
  email: string
): Promise<ResolvedRole> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Admin check
  if (normalizedEmail === ALLOWED_ADMIN_EMAIL) {
    await upsertUserRole(userId, "admin");
    return "admin";
  }

  // 2. Manufacturer check — email in approved_manufacturers AND verified
  const { data: manufacturer } = await supabase
    .from("approved_manufacturers")
    .select("id, verified, linked_user_id")
    .eq("email", normalizedEmail)
    .eq("verified", true)
    .maybeSingle();

  if (manufacturer) {
    // Auto-link if not yet linked
    if (!manufacturer.linked_user_id) {
      await supabase
        .from("approved_manufacturers")
        .update({ linked_user_id: userId })
        .eq("id", manufacturer.id);
    }
    await upsertUserRole(userId, "manufacturer");
    return "manufacturer";
  }

  // 3. Default → buyer
  await upsertUserRole(userId, "buyer");
  return "buyer";
}

/**
 * Upserts the user_roles record so the role always reflects the allow-list.
 */
async function upsertUserRole(userId: string, role: ResolvedRole) {
  // Check existing role
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Only update if role changed
    if (existing.role !== role) {
      await supabase
        .from("user_roles")
        .update({ role })
        .eq("id", existing.id);
    }
  } else {
    // Insert new role record
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
  }
}

/**
 * Returns the dashboard path for a given role.
 */
export function getRoleDashboard(role: ResolvedRole | string | null): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "manufacturer":
      return "/manufacturer/dashboard";
    case "buyer":
      return "/buyer/dashboard";
    default:
      return "/login";
  }
}
