"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isPendingApproval } from "@/lib/auth";
import { parseRole } from "@/lib/roles";
import { useAppState } from "@/lib/useAppState";
import type { UserRole } from "@/lib/types";

export function AuthGate({
  children,
  requirePlacement = true,
  allowPending = false,
  roles,
}: {
  children: React.ReactNode;
  requirePlacement?: boolean;
  /** Allow admin accounts waiting for approval. */
  allowPending?: boolean;
  /** If set, only these roles may view the page. */
  roles?: UserRole[];
}) {
  const { state, ready } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!state) {
      router.replace("/");
      return;
    }

    const role = parseRole(state.user.role) as UserRole;
    const pending = isPendingApproval({
      role,
      approved: state.user.approved,
    });

    if (pending && !allowPending) {
      router.replace("/pendiente");
      return;
    }
    if (!pending && allowPending && window.location.pathname === "/pendiente") {
      router.replace(role === "ADMIN" ? "/admin" : "/inicio");
      return;
    }
    if (roles && !roles.includes(role)) {
      router.replace("/inicio");
      return;
    }
    if (requirePlacement && !state.placementDone && role === "STUDENT") {
      router.replace("/evaluacion");
    }
  }, [ready, state, router, requirePlacement, allowPending, roles]);

  if (!ready || !state) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Cargando...
      </div>
    );
  }

  const role = parseRole(state.user.role) as UserRole;
  const pending = isPendingApproval({
    role,
    approved: state.user.approved,
  });

  if (pending && !allowPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Redirigiendo...
      </div>
    );
  }

  if (roles && !roles.includes(role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Sin permiso...
      </div>
    );
  }

  if (requirePlacement && !state.placementDone && role === "STUDENT") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Preparando evaluación...
      </div>
    );
  }

  return <>{children}</>;
}
