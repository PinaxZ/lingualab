"use client";

import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { SkillBar } from "@/components/SkillBar";
import {
  BAND_PASS,
  STAGES,
  canTakeCheckpoint,
  checkpointPassed,
  controlName,
  displayUnit,
  estimateLevel,
  lessonPath,
  levelGap,
  nextLesson,
  recommendActivities,
  SKILL_LABEL,
  stageAccuracy,
  stageOf,
  stageProgress,
} from "@/lib/progress";
import { useAppState } from "@/lib/useAppState";

function todayLabel() {
  return new Date()
    .toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

function InicioInner() {
  const { state } = useAppState();
  if (!state) return null;
  const next = nextLesson(state);
  const place = estimateLevel(state);
  const stage = STAGES.find((item) => item.id === stageOf(next?.level ?? place.working)) ?? STAGES[0];
  const openCheckpoint = (["a1", "a2", "b1", "b2"] as const).find((id) => canTakeCheckpoint(state, id));
  const reviews = recommendActivities(state);
  const recent = (state.history ?? []).slice(0, 3);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-muted">{todayLabel()}</p>
            <h1 className="font-display mt-2 text-5xl tracking-tight">
              Hola, {state.user.name.split(" ")[0].replace(".", "")}.
            </h1>
            <p className="mt-2 text-muted">
              Nivel de inglés: {place.label}. Estás en {stage.title.toLowerCase()}.
            </p>
          </div>
          {next && (
            <Link href={lessonPath(next.id)} className="rounded-full bg-[#2b8de6] px-5 py-3 text-sm font-semibold text-white">
              Continuar práctica →
            </Link>
          )}
        </div>

        <Link
          href={next ? lessonPath(next.id) : openCheckpoint ? `/checkpoint/${openCheckpoint}` : "/habilidades"}
          className="relative mt-8 block overflow-hidden rounded-[28px] bg-lime px-8 py-10"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest/70">
            {next ? "Siguiente unidad" : "Siguiente paso"}
          </p>
          <h2 className="font-display mt-3 max-w-xl text-4xl tracking-tight">
            {next
              ? `${stage.title} · Unidad ${displayUnit(next)}: ${next.title}`
              : openCheckpoint
                ? `Control de ${controlName(openCheckpoint)}`
                : place.confirmed === "b2"
                  ? "Recorriste el camino hasta avanzado."
                  : "Revisa tu camino."}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-forest/80">
            {next
              ? `${next.grammar}. ${next.steps.length} pasos, incluida una lección de escucha. ${next.minutes} min.`
              : place.detail}
          </p>
        </Link>

        <section className="mt-6 rounded-[28px] border border-line bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Nivel de inglés: {place.label}</h3>
              <p className="mt-1 text-sm text-muted">{place.detail}</p>
            </div>
            <Link href="/nivel" className="text-sm font-medium text-[#1d5f99]">
              Ver la métrica →
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted">
            Básico reúne las dos primeras partes. Intermedio y avanzado se abren después. Cada parte pide {BAND_PASS}% de precisión y un control.
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {STAGES.map((item) => {
              const progress = stageProgress(state, item.id);
              const passed = item.levels.every((level) => checkpointPassed(state, level));
              return (
                <li key={item.id} className="rounded-2xl border border-line px-4 py-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {progress.done}/{progress.total} unidades · precisión {stageAccuracy(state, item.id)}%
                    {passed ? " · confirmado" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
          {openCheckpoint && (
            <Link href={`/checkpoint/${openCheckpoint}`} className="mt-4 inline-block rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white">
              Presentar control de {controlName(openCheckpoint)} →
            </Link>
          )}
          {!openCheckpoint && place.confirmed !== "b2" && (
            <p className="mt-3 text-sm">{levelGap(state, place.working) || place.detail}</p>
          )}
        </section>

        <section className="mt-8 rounded-[28px] border border-line bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Repaso recomendado</h3>
              <p className="mt-1 text-sm text-muted">
                Actividades sugeridas según tus errores y precisión por habilidad.
              </p>
            </div>
            <Link href="/historial" className="text-sm font-medium text-[#1d5f99]">
              Ver historial →
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {reviews.map((item) => (
              <li key={`${item.title}-${item.skill}`} className="rounded-2xl border border-line px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {SKILL_LABEL[item.skill]}
                </p>
                <p className="mt-1 font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.reason}</p>
                <Link href={item.href} className="mt-3 inline-block text-sm font-semibold text-[#1d5f99]">
                  Practicar →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {recent.length > 0 && (
          <section className="mt-8 rounded-[28px] border border-line bg-white p-6">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-xl font-semibold">Actividad reciente</h3>
              <Link href="/historial" className="text-sm font-medium text-[#1d5f99]">
                Todo el historial →
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {recent.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{entry.lessonTitle}</span>
                    <span className="text-muted"> · {SKILL_LABEL[entry.skill]}</span>
                  </span>
                  <span className={entry.correct ? "text-[#1d5f99]" : "text-orange"}>
                    {entry.correct ? "Correcto" : "Incorrecto"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex items-end justify-between">
          <div>
            <h3 className="text-xl font-semibold">Tus habilidades</h3>
            <p className="text-sm text-muted">La precisión cuenta el primer intento de cada actividad.</p>
          </div>
          <Link href="/habilidades" className="text-sm font-medium text-[#1d5f99]">
            Ver unidades →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SkillBar label="Lectura" value={state.skillScores.lectura} color="#f08a4b" icon="▢" />
          <SkillBar label="Escucha" value={state.skillScores.escucha} color="#4aa3e6" icon="🎧" />
          <SkillBar label="Escritura" value={state.skillScores.escritura} color="#8b6cf0" icon="✎" />
          <SkillBar label="Habla" value={state.skillScores.habla} color="#e2a13a" icon="◎" />
        </div>
      </main>
    </div>
  );
}

export default function InicioPage() {
  return (
    <AuthGate>
      <InicioInner />
    </AuthGate>
  );
}
