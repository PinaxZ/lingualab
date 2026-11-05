"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/Header";
import {
  ListeningTaskView,
  ReadingTaskView,
  SpeakingTaskView,
  TaskSwitch,
  WritingTaskView,
  type AttemptMeta,
} from "@/components/lesson/Tasks";
import type { CourseLesson, LessonStep, Skill } from "@/lib/types";
import { SKILL_LABEL, canAccessLevel, completeLesson, estimateLevel, recordAttempt, stageMeta, stageOf } from "@/lib/progress";
import { loadState, saveState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";

function firstSkill(step: LessonStep): Skill {
  return step.tasks[0]?.skill ?? "lectura";
}

export function LessonPlayer({
  lesson,
  exam = false,
  onFinished,
}: {
  lesson: {
    title: string;
    situation: string;
    level: CourseLesson["level"];
    steps: LessonStep[];
    id?: string;
    grammar?: string;
  };
  exam?: boolean;
  onFinished?: (results: boolean[]) => void;
}) {
  const router = useRouter();
  const { state } = useAppState();
  const [stepIndex, setStepIndex] = useState(0);
  const [skill, setSkill] = useState<Skill>(firstSkill(lesson.steps[0]));
  const [results, setResults] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState(false);

  if (!state) return null;
  if (!exam && lesson.level && !canAccessLevel(state, lesson.level)) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <h1 className="font-display text-4xl">Este nivel sigue bloqueado.</h1>
          <p className="mt-3 text-muted">{estimateLevel(state).detail}</p>
          <Link href="/nivel" className="mt-6 inline-block text-sm font-semibold text-[#1d5f99]">
            Ver requisitos →
          </Link>
        </main>
      </div>
    );
  }

  const step = lesson.steps[stepIndex];
  const task = step.tasks.find((item) => item.skill === skill) ?? step.tasks[0];
  const progress = Math.round((stepIndex / lesson.steps.length) * 100);
  const solved = exam ? answered : answered && results[results.length - 1] === true;

  function attempt(correct: boolean, meta?: AttemptMeta) {
    if (answered) return;
    setAnswered(true);
    setResults((current) => [...current, correct]);
    const current = loadState();
    if (!current) return;
    saveState(
      recordAttempt(current, task.skill, correct, lesson.level, {
        lessonId: lesson.id ?? "control",
        lessonTitle: lesson.title,
        prompt: meta?.prompt ?? SKILL_LABEL[task.skill],
        answer: meta?.answer ?? "",
        expected: meta?.expected ?? "",
        feedback: meta?.feedback ?? (correct ? "Respuesta correcta." : "Respuesta incorrecta."),
      }),
    );
  }

  function continueStep() {
    if (stepIndex + 1 < lesson.steps.length) {
      const next = lesson.steps[stepIndex + 1];
      setStepIndex((value) => value + 1);
      setSkill(firstSkill(next));
      setAnswered(false);
      return;
    }
    if (exam) {
      onFinished?.(results);
      return;
    }
    if (lesson.id) {
      const current = loadState();
      if (current) saveState(completeLesson(current, lesson.id));
    }
    router.push("/inicio");
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center justify-between text-sm text-muted">
          <Link href={exam ? "/nivel" : "/inicio"}>← Salir</Link>
          <span>
            {exam ? "Control" : stageMeta(stageOf(lesson.level)).title} · {stepIndex + 1} de {lesson.steps.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-lime-deep" style={{ width: `${Math.max(progress, 8)}%` }} />
        </div>
        <h1 className="font-display mt-6 text-4xl tracking-tight">{lesson.title}</h1>
        <p className="mt-2 text-muted">{lesson.situation}</p>
        {lesson.grammar && <p className="mt-1 text-sm text-muted">Gramática: {lesson.grammar}</p>}
        <p className="mt-4 text-sm font-semibold text-[#1d5f99]">
          Actividad: {SKILL_LABEL[task.skill]}
        </p>
        {!solved && (
          <TaskSwitch
            skills={step.tasks.map((item) => item.skill)}
            current={task.skill}
            onChange={(next) => {
              setSkill(next);
              setAnswered(false);
            }}
          />
        )}
        <div className="mt-5" key={`${stepIndex}-${task.skill}`}>
          {task.skill === "lectura" && (
            <ReadingTaskView task={task} exam={exam} onAttempt={attempt} onContinue={continueStep} />
          )}
          {task.skill === "escritura" && (
            <WritingTaskView task={task} exam={exam} onAttempt={attempt} onContinue={continueStep} />
          )}
          {task.skill === "habla" && (
            <SpeakingTaskView task={task} exam={exam} onAttempt={attempt} onContinue={continueStep} />
          )}
          {task.skill === "escucha" && (
            <ListeningTaskView task={task} exam={exam} onAttempt={attempt} onContinue={continueStep} />
          )}
        </div>
      </main>
    </div>
  );
}
