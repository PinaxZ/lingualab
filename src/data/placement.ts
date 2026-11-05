import type { LevelId } from "@/lib/types";

export type PlacementQuestion = {
  id: string;
  level: LevelId;
  prompt: string;
  passage?: string;
  options: string[];
  answerIndex: number;
};

/** Short CEFR-oriented placement quiz (RF-04). */
export const placementQuestions: PlacementQuestion[] = [
  {
    id: "p1",
    level: "a1",
    prompt: "Completa: Hi, _____ name is Ana.",
    options: ["my", "I", "me", "mine"],
    answerIndex: 0,
  },
  {
    id: "p2",
    level: "a1",
    prompt: "¿Qué significa «Good morning»?",
    options: ["Buenas noches", "Buenos días", "Hasta luego", "Por favor"],
    answerIndex: 1,
  },
  {
    id: "p3",
    level: "a2",
    prompt: "Elige la opción correcta:",
    passage: "I usually _____ coffee in the morning.",
    options: ["drink", "drinks", "drinking", "drank"],
    answerIndex: 0,
  },
  {
    id: "p4",
    level: "a2",
    prompt: "¿Cuál es la mejor respuesta?",
    passage: "A: How often do you exercise? B: _____",
    options: ["I am tall.", "Twice a week.", "It is blue.", "Yes, I am."],
    answerIndex: 1,
  },
  {
    id: "p5",
    level: "b1",
    prompt: "Elige la forma correcta:",
    passage: "If it rains tomorrow, we _____ at home.",
    options: ["stay", "will stay", "stayed", "are stay"],
    answerIndex: 1,
  },
  {
    id: "p6",
    level: "b1",
    prompt: "¿Qué opción completa mejor el texto?",
    passage: "She has lived here _____ 2019.",
    options: ["for", "since", "during", "ago"],
    answerIndex: 1,
  },
  {
    id: "p7",
    level: "b2",
    prompt: "Elige el registro más natural:",
    passage: "Despite the delay, the team _____ the deadline.",
    options: ["managed to meet", "managed meeting", "manage to meet", "was manage meet"],
    answerIndex: 0,
  },
  {
    id: "p8",
    level: "b2",
    prompt: "Mejor opción para expresar hipótesis:",
    options: [
      "If I would know, I told you.",
      "If I had known, I would have told you.",
      "If I know, I would told you.",
      "If I knew, I will tell you yesterday.",
    ],
    answerIndex: 1,
  },
];

export function scoreToPlacementLevel(correct: number, total: number): LevelId {
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio >= 0.875) return "b2";
  if (ratio >= 0.625) return "b1";
  if (ratio >= 0.375) return "a2";
  return "a1";
}
