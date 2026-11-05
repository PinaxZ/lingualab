"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { placementQuestions, scoreToPlacementLevel } from "@/data/placement";
import { LEVEL_META, applyPlacement, skipPlacement } from "@/lib/progress";
import { loadState, saveState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import type { LevelId } from "@/lib/types";

type Phase = "intro" | "quiz" | "result";

function EvaluacionInner() {
  const router = useRouter();
  const { state } = useAppState();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [placed, setPlaced] = useState<LevelId>("a1");

  const question = placementQuestions[index];
  const progress = useMemo(
    () => Math.round((index / placementQuestions.length) * 100),
    [index],
  );

  if (!state) return null;

  if (state.placementDone && phase === "intro") {
    return (
      <div className="min-h-screen">
        <Header showSearch={false} />
        <main className="mx-auto max-w-xl px-5 py-16">
          <h1 className="font-display text-4xl">Ya completaste la evaluación</h1>
          <p className="mt-3 text-muted">
            Nivel asignado: {state.placementLevel ? LEVEL_META[state.placementLevel].range : "A1"}
            {state.placementSkipped ? " (empezaste desde lo básico)." : "."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/inicio")}
            className="mt-8 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white"
          >
            Ir al inicio →
          </button>
        </main>
      </div>
    );
  }

  function startBasics() {
    const current = loadState();
    if (!current) return;
    saveState(skipPlacement(current));
    router.push("/inicio");
  }

  function finishQuiz(finalCorrect: number) {
    const level = scoreToPlacementLevel(finalCorrect, placementQuestions.length);
    setPlaced(level);
    setCorrectCount(finalCorrect);
    const current = loadState();
    if (current) saveState(applyPlacement(current, level, finalCorrect));
    setPhase("result");
  }

  function confirmAnswer() {
    if (selected === null) return;
    const nextCorrect = correctCount + (selected === question.answerIndex ? 1 : 0);
    if (index + 1 >= placementQuestions.length) {
      finishQuiz(nextCorrect);
      return;
    }
    setCorrectCount(nextCorrect);
    setIndex((value) => value + 1);
    setSelected(null);
  }

  return (
    <div className="min-h-screen">
      <Header showSearch={false} />
      <main className="mx-auto max-w-xl px-5 py-10">
        {phase === "intro" && (
          <section className="rounded-[28px] border border-line bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Evaluación inicial
            </p>
            <h1 className="font-display mt-2 text-4xl tracking-tight">
              ¿Quieres medir tu nivel?
            </h1>
            <p className="mt-3 text-muted">
              Es opcional. Puedes hacer una prueba corta (8 preguntas) para empezar más cerca
              de tu nivel, o comenzar desde lo básico (A1) sin evaluarte.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPhase("quiz")}
                className="rounded-full bg-forest py-3.5 text-sm font-semibold text-white"
              >
                Hacer la evaluación →
              </button>
              <button
                type="button"
                onClick={startBasics}
                className="rounded-full border border-line py-3.5 text-sm font-semibold"
              >
                Empezar desde lo básico (A1)
              </button>
            </div>
          </section>
        )}

        {phase === "quiz" && question && (
          <section className="rounded-[28px] border border-line bg-white p-8">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>
                Pregunta {index + 1} de {placementQuestions.length}
              </span>
              <span>{LEVEL_META[question.level].range}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-lime-deep" style={{ width: `${Math.max(progress, 8)}%` }} />
            </div>
            {question.passage && <p className="mt-6 rounded-2xl bg-bg p-4 text-lg">{question.passage}</p>}
            <h2 className="mt-6 text-xl font-semibold">{question.prompt}</h2>
            <div className="mt-4 space-y-3">
              {question.options.map((option, optionIndex) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelected(optionIndex)}
                  className={`flex w-full rounded-full border px-5 py-3 text-left text-sm ${
                    selected === optionIndex ? "border-forest bg-lime/20" : "border-line"
                  }`}
                >
                  {String.fromCharCode(97 + optionIndex)}) {option}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between gap-3">
              <button
                type="button"
                onClick={startBasics}
                className="text-sm font-medium text-muted underline"
              >
                Omitir y empezar en A1
              </button>
              <button
                type="button"
                disabled={selected === null}
                onClick={confirmAnswer}
                className="rounded-full bg-[#2b8de6] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {index + 1 >= placementQuestions.length ? "Ver resultado →" : "Siguiente →"}
              </button>
            </div>
          </section>
        )}

        {phase === "result" && (
          <section className="rounded-[28px] border border-line bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Resultado</p>
            <h1 className="font-display mt-2 text-4xl tracking-tight">
              Empiezas en {LEVEL_META[placed].title} ({LEVEL_META[placed].range})
            </h1>
            <p className="mt-3 text-muted">
              Acertaste {correctCount} de {placementQuestions.length}. Las bandas anteriores
              quedan confirmadas para que puedas continuar desde ahí.
            </p>
            <button
              type="button"
              onClick={() => router.push("/inicio")}
              className="mt-8 w-full rounded-full bg-forest py-3.5 text-sm font-semibold text-white"
            >
              Continuar a LinguaLab →
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default function EvaluacionPage() {
  return (
    <AuthGate requirePlacement={false}>
      <EvaluacionInner />
    </AuthGate>
  );
}
