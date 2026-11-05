"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { listEffectiveLessons, subscribeCatalog } from "@/lib/catalog";
import { STAGES, canAccessLevel, displayUnit, lessonPath } from "@/lib/progress";
import { useAppState } from "@/lib/useAppState";

function SkillsInner() {
  const { state } = useAppState();
  const [, setTick] = useState(0);
  useEffect(() => subscribeCatalog(() => setTick((value) => value + 1)), []);
  if (!state) return null;
  const courseLessons = listEffectiveLessons();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/inicio" className="text-sm text-muted">
          ← Volver al inicio
        </Link>
        <h1 className="font-display mt-4 text-4xl">Camino de inglés</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Básico tiene 24 unidades. Intermedio y avanzado tienen 12. Cada unidad es una situación, con lectura, escritura, habla y una lección de escucha.
        </p>
        <div className="mt-8 space-y-8">
          {STAGES.map((stage) => {
            const unlocked = canAccessLevel(state, stage.levels[0]);
            const lessons = courseLessons.filter((lesson) => stage.levels.includes(lesson.level));
            return (
              <section key={stage.id}>
                <h2 className="text-xl font-semibold">
                  {stage.title}{" "}
                  <span className="text-sm font-normal text-muted">{unlocked ? "" : "· bloqueado"}</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {lessons.map((lesson) => {
                    const done = state.completedLessonIds.includes(lesson.id);
                    const available = canAccessLevel(state, lesson.level);
                    const label = (
                      <span>
                        <span className="block font-medium">
                          Unidad {displayUnit(lesson)}. {lesson.title}
                        </span>
                        <span className="text-sm text-muted">{lesson.grammar}</span>
                      </span>
                    );
                    return (
                      <li key={lesson.id}>
                        {available ? (
                          <Link href={lessonPath(lesson.id)} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
                            {label}
                            <span className="text-xs text-muted">{done ? "Completada" : "Pendiente"}</span>
                          </Link>
                        ) : (
                          <div className="rounded-2xl border border-line bg-white px-4 py-3 opacity-60">{label}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function HabilidadesPage() {
  return (
    <AuthGate>
      <SkillsInner />
    </AuthGate>
  );
}
