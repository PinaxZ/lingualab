"use client";

import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { LEVEL_META, SKILL_LABEL, lessonPath } from "@/lib/progress";
import { useAppState } from "@/lib/useAppState";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function HistorialInner() {
  const { state } = useAppState();
  if (!state) return null;
  const history = state.history ?? [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">RF-16</p>
        <h1 className="font-display mt-2 text-4xl tracking-tight">Historial de actividades</h1>
        <p className="mt-2 text-muted">
          Consulta intentos previos, resultados y la retroalimentación que recibiste.
        </p>

        {history.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-line bg-white p-8 text-muted">
            Aún no hay actividades registradas. Completa una lección para ver tu historial aquí.
            <div className="mt-4">
              <Link href="/habilidades" className="text-sm font-semibold text-[#1d5f99]">
                Ir a unidades →
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-[24px] border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">
                      {formatWhen(entry.at)} · {LEVEL_META[entry.level].range} · {SKILL_LABEL[entry.skill]}
                    </p>
                    <Link href={lessonPath(entry.lessonId)} className="mt-1 block font-semibold hover:text-[#1d5f99]">
                      {entry.lessonTitle}
                    </Link>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entry.correct ? "bg-[#e8f4ff] text-[#1d5f99]" : "bg-[#f8e2c8] text-forest"
                    }`}
                  >
                    {entry.correct ? "Correcto" : "Incorrecto"}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  <span className="text-muted">Consigna: </span>
                  {entry.prompt}
                </p>
                {entry.answer && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted">Tu respuesta: </span>
                    {entry.answer}
                  </p>
                )}
                {!entry.correct && entry.expected && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted">Esperado: </span>
                    {entry.expected}
                  </p>
                )}
                <p className="mt-2 rounded-2xl bg-bg px-3 py-2 text-sm text-muted">{entry.feedback}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function HistorialPage() {
  return (
    <AuthGate>
      <HistorialInner />
    </AuthGate>
  );
}
