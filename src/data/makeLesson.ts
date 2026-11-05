import type {
  CourseLesson,
  LessonStep,
  LevelId,
  ListeningTask,
  ReadingTask,
  SpeakingTask,
  Task,
  WritingTask,
} from "@/lib/types";

export type StepSpec = {
  passage: string;
  translation: string;
  question: string;
  options: string[];
  answer: number;
  readHint: string;
  spanish: string;
  accepted: string[];
  preferred: string;
  writeHint: string;
  vocab: string;
  say: string;
  storyTitle?: string;
  openWith?: "lectura" | "escritura" | "habla" | "escucha";
  listen?: {
    transcript: string;
    parts: string[];
    blanks: string[];
    bank: string[];
    hints: string[];
  };
};

export function hear(
  transcript: string,
  blanks: { word: string; hint: string }[],
  extras: string[],
): NonNullable<StepSpec["listen"]> {
  let rest = transcript;
  const parts: string[] = [];
  for (const blank of blanks) {
    const at = rest.indexOf(blank.word);
    if (at < 0) throw new Error(`Falta «${blank.word}» en: ${transcript}`);
    parts.push(rest.slice(0, at));
    rest = rest.slice(at + blank.word.length);
  }
  parts.push(rest);
  const words = blanks.map((blank) => blank.word);
  return {
    transcript,
    parts,
    blanks: words,
    bank: [...words, ...extras.filter((word) => !words.includes(word))],
    hints: blanks.map((blank) => blank.hint),
  };
}

function mix(index: number, tasks: Task[]): LessonStep {
  const start = index % tasks.length;
  return { tasks: [...tasks.slice(start), ...tasks.slice(0, start)] };
}

export function step(index: number, spec: StepSpec): LessonStep {
  const reading: ReadingTask = {
    skill: "lectura",
    passage: spec.passage,
    translation: spec.translation,
    prompt: spec.question,
    options: spec.options,
    answerIndex: spec.answer,
    hint: spec.readHint,
    storyTitle: spec.storyTitle,
  };
  const writing: WritingTask = {
    skill: "escritura",
    promptEs: spec.spanish,
    accepted: spec.accepted,
    preferred: spec.preferred,
    hint: spec.writeHint,
    vocab: spec.vocab,
  };
  const speaking: SpeakingTask = {
    skill: "habla",
    promptEs: spec.spanish,
    targetPhrase: spec.say,
  };
  const tasks: Task[] = [reading, writing, speaking];
  if (spec.listen) {
    const listening: ListeningTask = {
      skill: "escucha",
      transcript: spec.listen.transcript,
      sentenceParts: spec.listen.parts,
      blanks: spec.listen.blanks,
      bank: spec.listen.bank,
      hints: spec.listen.hints,
    };
    tasks.push(listening);
  }
  if (spec.openWith) {
    const at = tasks.findIndex((task) => task.skill === spec.openWith);
    if (at > 0) return { tasks: [...tasks.slice(at), ...tasks.slice(0, at)] };
  }
  return mix(index, tasks);
}

export function unit(
  level: LevelId,
  book: string,
  number: number,
  title: string,
  grammar: string,
  focus: string,
  steps: StepSpec[],
): CourseLesson {
  return {
    id: `${level}-u${number}`,
    level,
    book,
    unit: number,
    title,
    grammar,
    situation: `Unidad ${level === "a2" ? number + 12 : number} · ${grammar}. ${focus}`,
    minutes: 8 + steps.length * 2,
    steps: steps.map((spec, index) => step(index, spec)),
  };
}
