import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { getSessionUsername } from "@/lib/session";
import type { Role } from "@/lib/roles";

export async function getCurrentDbUser() {
  if (!isDatabaseConfigured()) return null;
  const username = await getSessionUsername();
  if (!username) return null;
  return getPrisma().user.findUnique({
    where: { username },
    include: {
      progress: { select: { state: true, updatedAt: true } },
    },
  });
}

export async function requireRole(roles: Role[]) {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false as const, status: 401 as const, error: "No autenticado" };
  if (!user.approved && user.role === "ADMIN") {
    return { ok: false as const, status: 403 as const, error: "Cuenta pendiente de aprobación" };
  }
  if (!roles.includes(user.role as Role)) {
    return { ok: false as const, status: 403 as const, error: "Sin permiso" };
  }
  return { ok: true as const, user };
}
