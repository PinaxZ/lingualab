"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { getCheckpoint } from "@/data/checkpoints";
import { BAND_PASS, LEVEL_META, applyCheckpoint, canAccessLevel, canTakeCheckpoint, checkpointPassed, controlName, levelGap, nextLevel } from "@/lib/progress";
import { loadState, saveState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import type { LevelId } from "@/lib/types";

function isLevel(value: string): value is LevelId {
  return value === "a1" || value === "a2" || value === "b1" || value === "b2";
}

function CheckpointInner() {
  const params = useParams<{ level: string }>();
  const { state } = useAppState();
  const [score, setScore] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  if (!state) return null;

  const raw = params.level;
  if (!isLevel(raw)) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <h1 className="font-display text-4xl">Ese control no existe.</h1>
          <Link href="/nivel" className="mt-6 inline-block text-sm font-semibold text-[#1d5f99]">
            Volver a los niveles →
          </Link>
        </main>
      </div>
    );
  }

  const level = raw;
  const meta = LEVEL_META[level];
  const steps = getCheckpoint(level) ?? [];
  const following = nextLevel(level);

  if (score !== null) {
    const passed = score >= BAND_PASS;
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Control de {controlName(level)}</p>
          <h1 className="font-display mt-3 text-5xl">{score}%</h1>
          <p className="mt-4 text-lg">
            {passed
              ? following
                ? `${meta.range} queda confirmado. ${LEVEL_META[following].title} ya está abierto.`
                : `${meta.range} queda confirmado. Llegaste al final del camino.`
              : `Necesitas ${BAND_PASS}% para confirmar ${controlName(level)}. Puedes volver a presentar el control.`}
          </p>
          <Link href="/inicio" className="mt-8 inline-block rounded-full bg-[#2b8de6] px-6 py-3 text-sm font-semibold text-white">
            Volver al inicio →
          </Link>
          {!passed && (
            <button
              type="button"
              onClick={() => {
                setScore(null);
                setRound((value) => value + 1);
              }}
              className="ml-3 mt-8 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold"
            >
              Intentar de nuevo
            </button>
          )}
        </main>
      </div>
    );
  }

  if (checkpointPassed(state, level) && !canTakeCheckpoint(state, level)) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <h1 className="font-display text-4xl">Ya confirmaste {meta.range}.</h1>
          <p className="mt-3 text-muted">Tu mejor resultado en este control es {state.checkpointScores[level]}%.</p>
          <Link href="/inicio" className="mt-6 inline-block text-sm font-semibold text-[#1d5f99]">
            Seguir el camino →
          </Link>
        </main>
      </div>
    );
  }

  if (!canAccessLevel(state, level) || !canTakeCheckpoint(state, level)) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <h1 className="font-display text-4xl">El control de {controlName(level)} todavía no está abierto.</h1>
          <p className="mt-3 text-muted">Para presentarlo, {levelGap(state, level)}.</p>
          <Link href="/nivel" className="mt-6 inline-block text-sm font-semibold text-[#1d5f99]">
            Ver tu avance →
          </Link>
        </main>
      </div>
    );
  }

  return (
    <LessonPlayer
      key={round}
      exam
      lesson={{
        title: `Control de ${controlName(level)}`,
        situation: `${steps.length} actividades. Necesitas ${BAND_PASS}%. Si no puedes escuchar, cambia de actividad.`,
        level,
        grammar: "Repaso del nivel",
        steps,
      }}
      onFinished={(results) => {
        const next = results.length === 0 ? 0 : Math.round((results.filter(Boolean).length / results.length) * 100);
        const current = loadState();
        if (current) saveState(applyCheckpoint(current, level, next));
        setScore(next);
      }}
    />
  );
}

export default function CheckpointPage() {
  return (
    <AuthGate>
      <CheckpointInner />
    </AuthGate>
  );
}
