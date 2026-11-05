"use client";

import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Logo } from "@/components/Logo";
import { clearState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";

function PendienteInner() {
  const router = useRouter();
  const { state } = useAppState();
  if (!state) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Aprobación</p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">Cuenta en revisión</h1>
        <p className="mt-3 text-muted">
          Hola, {state.user.name}. Tu cuenta de administrador debe ser aprobada por un administrador
          existente antes de continuar.
        </p>
        <button
          type="button"
          className="mt-8 w-full rounded-full border border-line py-3 text-sm font-semibold"
          onClick={async () => {
            await clearState();
            router.replace("/");
          }}
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

export default function PendientePage() {
  return (
    <AuthGate requirePlacement={false} allowPending>
      <PendienteInner />
    </AuthGate>
  );
}
