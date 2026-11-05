"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AboutButton } from "@/components/AboutButton";
import { Logo } from "@/components/Logo";
import { loginUser, registerUser } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import { ROLE_LABEL } from "@/lib/roles";
import {
  defaultState,
  hydrateFromServer,
  initialsFromName,
  loadState,
  saveState,
} from "@/lib/storage";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function goAfterAuth(pendingApproval?: boolean, userRole?: Role) {
    if (pendingApproval) {
      router.push("/pendiente");
      return;
    }
    if (userRole === "ADMIN") {
      router.push("/admin");
      return;
    }
    const remote = await hydrateFromServer();
    const state = remote ?? loadState();
    if (!state) {
      router.push("/");
      return;
    }
    saveState(state);
    router.push(state.placementDone ? "/inicio" : "/evaluacion");
  }

  useEffect(() => {
    (async () => {
      const existing = await hydrateFromServer();
      if (!existing) return;
      const userRole = existing.user.role ?? "STUDENT";
      if (userRole === "ADMIN" && existing.user.approved === false) {
        router.replace("/pendiente");
        return;
      }
      if (userRole === "ADMIN") router.replace("/admin");
      else router.replace(existing.placementDone ? "/inicio" : "/evaluacion");
    })();
  }, [router]);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const result = await registerUser(username, password, displayName || username, role);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        saveState(
          defaultState({
            username: result.user.username,
            name: result.user.displayName,
            email: `${result.user.username}@lingualab.local`,
            initials: initialsFromName(result.user.displayName),
            role: result.user.role,
            approved: result.user.approved,
          }),
        );
        await goAfterAuth(result.pendingApproval, result.user.role);
      } else {
        const result = await loginUser(username, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const existing = (await hydrateFromServer()) ?? loadState();
        if (!existing) {
          saveState(
            defaultState({
              username: result.user.username,
              name: result.user.displayName,
              email: `${result.user.username}@lingualab.local`,
              initials: initialsFromName(result.user.displayName),
              role: result.user.role,
              approved: result.user.approved,
            }),
          );
        } else {
          saveState({
            ...existing,
            user: {
              ...existing.user,
              role: result.user.role,
              approved: result.user.approved,
            },
          });
        }
        await goAfterAuth(result.pendingApproval, result.user.role);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed right-5 top-4 z-20">
        <AboutButton />
      </div>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Estudiantes · Administradores
          </p>
          <h1 className="font-display mt-2 text-4xl tracking-tight">
            Practica inglés <span className="text-forest">sin miedo.</span>
          </h1>
          <p className="mt-3 text-muted">
            Los administradores nuevos requieren aprobación de un admin existente.
          </p>

          <div className="mt-6 flex rounded-full border border-line bg-bg p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold ${mode === "login" ? "bg-white shadow-sm" : "text-muted"}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold ${mode === "register" ? "bg-white shadow-sm" : "text-muted"}`}
            >
              Crear cuenta
            </button>
          </div>

          {mode === "register" && (
            <>
              <label className="mt-6 block text-sm font-medium">Nombre para mostrar</label>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Lucía Mendoza"
                className="mt-1 w-full rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-lime"
              />
              <label className="mt-4 block text-sm font-medium">Tipo de cuenta</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="mt-1 w-full rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-lime"
              >
                <option value="STUDENT">{ROLE_LABEL.STUDENT}</option>
                <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
              </select>
              {role === "ADMIN" && (
                <p className="mt-3 rounded-2xl bg-[#f8e2c8] px-3 py-2 text-xs">
                  Esta cuenta quedará pendiente hasta que un administrador la apruebe.
                </p>
              )}
            </>
          )}

          <label className="mt-4 block text-sm font-medium">Usuario</label>
          <input
            value={username}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="lucia"
            className="mt-1 w-full rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-lime"
          />
          <label className="mt-4 block text-sm font-medium">Contraseña</label>
          <input
            type="password"
            value={password}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••"
            className="mt-1 w-full rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:ring-2 focus:ring-lime"
          />

          {error && <p className="mt-3 text-sm text-orange">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="mt-6 w-full rounded-full bg-forest py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Espera…" : mode === "register" ? "Crear cuenta" : "Entrar"}
          </button>
          <p className="mt-4 text-xs text-muted">
            Admins iniciales: <strong>annaordaz</strong> y <strong>joselicona</strong> · contraseña{" "}
            <strong>LinguaLab2026!</strong>
          </p>
        </section>
      </main>
    </>
  );
}
