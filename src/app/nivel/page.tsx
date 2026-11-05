"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import {
  BAND_PASS,
  STAGES,
  canAccessLevel,
  canTakeCheckpoint,
  checkpointPassed,
  checkpointScore,
  estimateLevel,
  levelGap,
  stageAccuracy,
  stageMeta,
  stageProgress,
  type StageId,
} from "@/lib/progress";
import { loadState, saveState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";

function NivelInner() {
  const { state } = useAppState();
  const router = useRouter();
  const [selected, setSelected] = useState<StageId>("basico");
  if (!state) return null;
  const active = state;
  const stage = stageMeta(selected);
  const open = canAccessLevel(active, stage.levels[0]);
  const place = estimateLevel(active);
  const checkpointLevel = stage.levels.find((level) => canTakeCheckpoint(active, level));
  const confirmed = stage.levels.every((level) => checkpointPassed(active, level));

  function start() {
    if (!open) return;
    const current = loadState();
    if (!current) return;
    const target = stage.levels.find((level) => canAccessLevel(active, level)) ?? stage.levels[0];
    saveState({ ...current, level: target });
    router.push("/habilidades");
  }

  return (
    <div className="min-h-screen">
      <Header showSearch={false} />
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-display text-5xl tracking-tight">Tu nivel.</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Básico cubre las dos primeras partes. Intermedio y avanzado vienen después. Tu inglés confirmado es {place.label}.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STAGES.map((item) => {
            const unlocked = canAccessLevel(state, item.levels[0]);
            const progress = stageProgress(state, item.id);
            const mastered = item.levels.every((level) => checkpointPassed(state, level));
            const active = selected === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={`rounded-[28px] border p-6 text-left ${
                  active ? "border-lime-deep bg-[#e7f3ff] shadow-sm" : "border-line bg-white"
                }`}
              >
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                <p className="mt-4 text-sm font-medium">
                  {mastered ? "Nivel confirmado" : unlocked ? `${progress.done}/${progress.total} unidades` : "Bloqueado"}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-xl rounded-[28px] border border-line bg-white p-6 text-left">
          <p className="font-semibold">
            {stage.title}: precisión {stageAccuracy(state, selected)}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-[#2b8de6]" style={{ width: `${stageAccuracy(state, selected)}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {confirmed
              ? `Control aprobado${checkpointScore(state, stage.levels[stage.levels.length - 1]) !== null ? ` con ${checkpointScore(state, stage.levels[stage.levels.length - 1])}%` : ""}.`
              : checkpointLevel
                ? `Ya puedes presentar el control. Necesitas ${BAND_PASS}%.`
                : `Para confirmarlo, ${levelGap(state, stage.levels.find((level) => !checkpointPassed(state, level)) ?? stage.levels[0]) || "sigue practicando"}.`}
          </p>
          {checkpointLevel && (
            <Link href={`/checkpoint/${checkpointLevel}`} className="mt-4 inline-block text-sm font-semibold text-[#1d5f99]">
              Presentar control de {stage.title.toLowerCase()} →
            </Link>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <Link href="/inicio" className="text-sm text-muted">
            Atrás
          </Link>
          <button
            type="button"
            disabled={!open}
            onClick={start}
            className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Practicar este nivel →
          </button>
        </div>
      </main>
    </div>
  );
}

export default function NivelPage() {
  return (
    <AuthGate>
      <NivelInner />
    </AuthGate>
  );
}
