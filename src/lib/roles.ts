export type Role = "ADMIN" | "STUDENT";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  STUDENT: "Estudiante",
};

export function isAdmin(role: Role) {
  return role === "ADMIN";
}

/** @deprecated use isAdmin — kept for call sites during transition */
export function isStaff(role: Role) {
  return isAdmin(role);
}

export function parseRole(value: unknown): Role {
  if (value === "ADMIN" || value === "STUDENT") return value;
  // Legacy TEACHER accounts map to STUDENT so they do not gain admin powers.
  return "STUDENT";
}
