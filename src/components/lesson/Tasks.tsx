"use client";

import { useRef, useState } from "react";
import type { ListeningTask, ReadingTask, SpeakingTask, Skill, WritingTask } from "@/lib/types";
import {
  missedWords,
  scorePronunciation,
  speakingPassed,
  spokenWords,
} from "@/lib/storage";
import { canUseSpeechRecognition, ensureMic, speak, startListening } from "@/lib/speech";
import { SKILL_LABEL } from "@/lib/progress";
import {
  listeningFeedback,
  readingFeedback,
  speakingFeedback,
  writingFeedback,
} from "@/lib/feedback";
import { AiFeedbackPanel } from "@/components/lesson/AiFeedbackPanel";
import type { AiFeedbackPayload } from "@/lib/aiFeedback";

export type AttemptMeta = {
  prompt: string;
  answer: string;
  expected: string;
  feedback: string;
};

export type TaskResult = {
  onAttempt: (correct: boolean, meta?: AttemptMeta) => void;
  onContinue: () => void;
  exam?: boolean;
};

export function TaskSwitch({
  skills,
  current,
  onChange,
}: {
  skills: Skill[];
  current: Skill;
  onChange: (skill: Skill) => void;
}) {
  return (
    <div className="mt-4 rounded-[24px] border border-line bg-white px-4 py-3">
      <p className="text-sm text-muted">
        ¿No puedes hacer esta actividad? Cámbiala, como en una lección larga.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => onChange(skill)}
            className={`rounded-full px-4 py-2 text-sm ${
              skill === current ? "bg-[#2b8de6] text-white" : "border border-line bg-bg"
            }`}
          >
            {SKILL_LABEL[skill]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReadingTaskView({
  task,
  onAttempt,
  onContinue,
  exam = false,
}: TaskResult & { task: ReadingTask }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [showEs, setShowEs] = useState(false);
  const [fb, setFb] = useState<{ summary: string; detail: string } | null>(null);
  const [aiPayload, setAiPayload] = useState<AiFeedbackPayload | null>(null);
  const correct = selected === task.answerIndex;

  function check() {
    if (selected === null || checked) return;
    setChecked(true);
    const message = readingFeedback(correct, task.hint, task.options[task.answerIndex]);
    setFb(message);
    const answer = task.options[selected];
    const expected = task.options[task.answerIndex];
    const feedback = `${message.summary} ${message.detail}`;
    setAiPayload({
      skill: "lectura",
      prompt: task.prompt,
      answer,
      expected,
      correct,
      localFeedback: feedback,
    });
    onAttempt(correct, {
      prompt: task.prompt,
      answer,
      expected,
      feedback,
    });
  }

  return (
    <section className="rounded-[28px] border border-line bg-white p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Lectura</p>
      {task.storyTitle && (
        <h2 className="font-display mt-3 text-2xl tracking-tight">{task.storyTitle}</h2>
      )}
      <p className="mt-4 whitespace-pre-line text-lg leading-8">{task.passage}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setShowEs((value) => !value)} className="rounded-full border border-line px-3 py-1 text-xs">
          Traducción
        </button>
        <button type="button" onClick={() => speak(task.passage)} className="rounded-full border border-line px-3 py-1 text-xs">
          Escuchar texto
        </button>
      </div>
      {showEs && <p className="mt-4 whitespace-pre-line rounded-2xl bg-bg p-4 text-sm text-muted">{task.translation}</p>}
      <h2 className="mt-6 text-xl font-semibold">{task.prompt}</h2>
      <div className="mt-4 space-y-3">
        {task.options.map((option, index) => {
          const letter = String.fromCharCode(97 + index);
          const picked = selected === index;
          let cls = "border-line";
          if (checked && correct && index === task.answerIndex) cls = "border-[#7eb6ea] bg-[#e8f4ff]";
          if (checked && picked && index !== task.answerIndex) cls = "border-orange bg-orange/10";
          if (!checked && picked) cls = "border-forest";
          return (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setSelected(index)}
              className={`flex w-full rounded-full border px-5 py-3 text-left text-sm ${cls}`}
            >
              {letter}) {option}
            </button>
          );
        })}
      </div>
      {checked && fb && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${correct ? "bg-[#e8f4ff] text-[#1d5f99]" : "bg-[#f8e2c8]"}`}>
          <p className="font-medium">{fb.summary}</p>
          <p className="mt-1">{fb.detail}</p>
          <AiFeedbackPanel active={checked} payload={aiPayload} />
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={selected === null}
          onClick={() => {
            if (!checked) check();
            else if (correct || exam) onContinue();
            else {
              setChecked(false);
              setSelected(null);
              setFb(null);
              setAiPayload(null);
            }
          }}
          className="rounded-full bg-[#2b8de6] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {!checked ? "Comprobar →" : correct || exam ? "Continuar →" : "Intentar de nuevo"}
        </button>
      </div>
    </section>
  );
}

export function WritingTaskView({
  task,
  onAttempt,
  onContinue,
  exam = false,
}: TaskResult & { task: WritingTask }) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [fb, setFb] = useState<{ summary: string; detail: string; correct: boolean } | null>(null);
  const [aiPayload, setAiPayload] = useState<AiFeedbackPayload | null>(null);

  function check() {
    if (checked) return;
    const message = writingFeedback(answer, task.accepted, task.preferred, task.hint);
    setChecked(true);
    setFb(message);
    if (!answer.trim()) return;
    const feedback = `${message.summary} ${message.detail}`;
    setAiPayload({
      skill: "escritura",
      prompt: task.promptEs,
      answer,
      expected: task.preferred,
      correct: message.correct,
      localFeedback: feedback,
    });
    onAttempt(message.correct, {
      prompt: task.promptEs,
      answer,
      expected: task.preferred,
      feedback,
    });
  }

  return (
    <section className="rounded-[28px] border border-line bg-white p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Escritura</p>
      <p className="mt-4 text-lg">Traduce al inglés: {task.promptEs}</p>
      <p className="mt-2 text-sm text-muted">
        Escribe una frase completa. Recibes evaluación local y feedback con IA.
      </p>
      <textarea
        value={answer}
        placeholder="Escribe aquí tu respuesta en inglés..."
        onChange={(event) => {
          setAnswer(event.target.value);
          if (!exam) {
            setChecked(false);
            setFb(null);
            setAiPayload(null);
          }
        }}
        disabled={exam && checked}
        className="mt-4 min-h-32 w-full rounded-[24px] border border-line p-4 outline-none focus:ring-2 focus:ring-lime"
      />
      <p className="mt-3 text-sm text-muted">Vocabulario: {task.vocab}</p>
      {checked && fb && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${fb.correct ? "bg-[#e8f4ff] text-[#1d5f99]" : "bg-[#f8e2c8]"}`}>
          <p className="font-medium">{fb.summary}</p>
          <p className="mt-1">{fb.detail}</p>
          <AiFeedbackPanel active={checked && Boolean(answer.trim())} payload={aiPayload} />
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (!checked) check();
            else if ((fb?.correct || exam) && answer.trim()) onContinue();
            else {
              setChecked(false);
              setFb(null);
              setAiPayload(null);
            }
          }}
          className="rounded-full bg-[#2b8de6] px-6 py-3 text-sm font-semibold text-white"
        >
          {!checked ? "Comprobar →" : fb?.correct || (exam && answer.trim()) ? "Continuar →" : "Intentar de nuevo"}
        </button>
      </div>
    </section>
  );
}

export function ListeningTaskView({
  task,
  onAttempt,
  onContinue,
  exam = false,
}: TaskResult & { task: ListeningTask }) {
  const [fills, setFills] = useState<(string | null)[]>(task.blanks.map(() => null));
  const [checked, setChecked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fb, setFb] = useState<{ summary: string; detail: string } | null>(null);
  const [aiPayload, setAiPayload] = useState<AiFeedbackPayload | null>(null);
  const used = new Set(fills.filter(Boolean));
  const allFilled = fills.every(Boolean);
  const allCorrect = task.blanks.every((blank, index) => fills[index] === blank);

  function play() {
    setPlaying(true);
    if (task.audioUrl) {
      const audio = new Audio(task.audioUrl);
      audio.onended = () => setPlaying(false);
      void audio.play().catch(() => {
        speak(task.transcript, 0.95);
        window.setTimeout(() => setPlaying(false), 2500);
      });
      return;
    }
    speak(task.transcript, 0.95);
    window.setTimeout(() => setPlaying(false), 2500);
  }

  function pick(word: string) {
    if (exam && checked) return;
    const slot = fills.findIndex((value) => value === null);
    if (slot === -1) return;
    const next = [...fills];
    next[slot] = word;
    setFills(next);
    setChecked(false);
    setFb(null);
    setAiPayload(null);
  }

  function check() {
    if (!allFilled || checked) return;
    setChecked(true);
    const message = listeningFeedback(allCorrect, task.hints, task.blanks, fills);
    setFb(message);
    const answer = fills.map((value) => value ?? "…").join(" / ");
    const expected = task.blanks.join(" / ");
    const feedback = `${message.summary} ${message.detail}`;
    setAiPayload({
      skill: "escucha",
      prompt: "Completa lo que escuchaste",
      answer,
      expected,
      correct: allCorrect,
      localFeedback: feedback,
    });
    onAttempt(allCorrect, {
      prompt: "Completa lo que escuchaste",
      answer,
      expected,
      feedback,
    });
  }

  return (
    <section className="rounded-[28px] border border-line bg-white p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Escucha</p>
      <p className="mt-2 text-muted">Escucha y completa. Si no puedes oírlo, cambia a lectura o escritura.</p>
      <button type="button" onClick={play} className="mt-4 rounded-full bg-forest px-4 py-2 text-sm text-white">
        {playing ? "Reproduciendo..." : "Reproducir audio"}
      </button>
      <p className="mt-6 text-xl leading-relaxed">
        {task.sentenceParts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < task.blanks.length && (
              <button
                type="button"
                onClick={() => {
                  const next = [...fills];
                  next[index] = null;
                  setFills(next);
                  setChecked(false);
                }}
                className={`mx-1 min-w-24 rounded-full border border-dashed px-3 py-1 text-base ${
                  checked && fills[index] && fills[index] !== task.blanks[index]
                    ? "border-orange bg-orange/10"
                    : "border-line bg-white"
                }`}
              >
                {fills[index] ?? "····"}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {task.bank.map((word) => (
          <button
            key={word}
            type="button"
            disabled={used.has(word) || (exam && checked)}
            onClick={() => pick(word)}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-30"
          >
            {word}
          </button>
        ))}
      </div>
      {checked && fb && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${allCorrect ? "bg-[#e8f4ff] text-[#1d5f99]" : "bg-[#f8e2c8]"}`}>
          <p className="font-medium">{fb.summary}</p>
          <p className="mt-1">{fb.detail}</p>
          <AiFeedbackPanel active={checked} payload={aiPayload} />
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!allFilled && !checked}
          onClick={() => {
            if (!checked) check();
            else if (allCorrect || exam) onContinue();
            else {
              setFills(fills.map((value, index) => (value === task.blanks[index] ? value : null)));
              setChecked(false);
              setFb(null);
              setAiPayload(null);
            }
          }}
          className="rounded-full bg-[#2b8de6] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {!checked ? "Comprobar →" : allCorrect || exam ? "Continuar →" : "Intentar de nuevo"}
        </button>
      </div>
    </section>
  );
}

export function SpeakingTaskView({
  task,
  onAttempt,
  onContinue,
  exam = false,
}: TaskResult & { task: SpeakingTask }) {
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [aiPayload, setAiPayload] = useState<AiFeedbackPayload | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const heardRef = useRef("");
  const runRef = useRef(0);
  const gradedRef = useRef(false);
  const heardSet = new Set(spokenWords(heard));
  const passed = score !== null && speakingPassed(task.targetPhrase, heard);
  const missing = score === null ? [] : missedWords(task.targetPhrase, heard);

  function grade(text: string) {
    if (gradedRef.current) return;
    gradedRef.current = true;
    const next = scorePronunciation(task.targetPhrase, text);
    const ok = speakingPassed(task.targetPhrase, text);
    const miss = missedWords(task.targetPhrase, text);
    const message = speakingFeedback(ok, next, miss);
    const feedback = `${message.summary} ${message.detail}`;
    setScore(next);
    setChecked(true);
    setRecording(false);
    setAiPayload({
      skill: "habla",
      prompt: task.promptEs,
      answer: text,
      expected: task.targetPhrase,
      correct: ok,
      localFeedback: feedback,
    });
    onAttempt(ok, {
      prompt: task.promptEs,
      answer: text,
      expected: task.targetPhrase,
      feedback,
    });
  }

  async function record() {
    if (exam && checked) return;
    const run = runRef.current + 1;
    runRef.current = run;
    setError("");
    setScore(null);
    setChecked(false);
    gradedRef.current = false;
    setHeard("");
    heardRef.current = "";
    if (!canUseSpeechRecognition()) {
      setError("El reconocimiento de voz funciona en Chrome o Edge. Si no puedes hablar, cambia a lectura o escritura.");
      return;
    }
    setRecording(true);
    const micError = await ensureMic();
    if (run !== runRef.current) return;
    if (micError) {
      setRecording(false);
      setError(micError);
      return;
    }
    const session = startListening(
      (text, isFinal) => {
        if (run !== runRef.current) return;
        heardRef.current = text;
        setHeard(text);
        if (isFinal) grade(text);
      },
      (message) => {
        if (run !== runRef.current) return;
        setError(message);
        setRecording(false);
      },
      () => {
        if (run !== runRef.current) return;
        setRecording(false);
        if (heardRef.current) grade(heardRef.current);
        else setError("No escuché tu voz. Di la frase completa o cambia de actividad.");
      },
    );
    if (!session || run !== runRef.current) {
      session?.stop();
      setRecording(false);
      return;
    }
    stopRef.current = session.stop;
  }

  function stop() {
    runRef.current += 1;
    stopRef.current?.();
    stopRef.current = null;
    setRecording(false);
    if (heardRef.current) grade(heardRef.current);
  }

  return (
    <section className="rounded-[28px] border border-line bg-white p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Habla</p>
      <p className="mt-3 text-muted">{task.promptEs}</p>
      <p className="mt-4 text-2xl font-medium">{task.targetPhrase}</p>
      <button
        type="button"
        onClick={recording ? stop : record}
        className={`mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full ${
          recording ? "bg-lime shadow-[0_0_0_18px_rgba(43,141,230,0.35)]" : "bg-lime"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl">🎤</span>
      </button>
      <p className="mt-3 text-center text-sm">{recording ? "Escuchando..." : "Toca y di la frase"}</p>
      {error && <p className="mt-3 text-center text-sm text-orange">{error}</p>}
      <p className="mt-4 text-sm leading-7">
        {task.targetPhrase.split(" ").map((word, index) => {
          const key = spokenWords(word)[0] ?? "";
          const ok = score !== null && heardSet.has(key);
          return (
            <span key={`${word}-${index}`} className={`mr-1 rounded px-1 ${ok ? "bg-lime/80" : score !== null ? "bg-orange/30" : ""}`}>
              {word}
            </span>
          );
        })}
      </p>
      {heard && <p className="mt-2 text-sm text-muted">Te escuché: “{heard}”</p>}
      {checked && score !== null && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${passed ? "bg-[#e8f4ff] text-[#1d5f99]" : "bg-[#f8e2c8]"}`}>
          <p className="font-medium">{speakingFeedback(passed, score, missing).summary}</p>
          <p className="mt-1">{speakingFeedback(passed, score, missing).detail}</p>
          <AiFeedbackPanel active={checked} payload={aiPayload} />
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!checked}
          onClick={() => {
            if (passed || exam) onContinue();
            else {
              setChecked(false);
              setScore(null);
              setHeard("");
              setAiPayload(null);
            }
          }}
          className="rounded-full bg-[#2b8de6] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {checked && (passed || exam) ? "Continuar →" : "Intentar de nuevo"}
        </button>
      </div>
    </section>
  );
}
