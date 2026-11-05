import { listEffectiveLessons } from "@/lib/catalog";
import type { ActivityRecord, AppState, CourseLesson, LevelId, Skill, SkillStat } from "@/lib/types";

export const BAND_PASS = 70;
export const KNOWLEDGE_TO_ADVANCE = BAND_PASS;
export const EXAM_PASS = BAND_PASS;

export const LEVEL_ORDER: LevelId[] = ["a1", "a2", "b1", "b2"];

export const LEVEL_META: Record<
  LevelId,
  { title: string; range: string; book: string; body: string }
> = {
  a1: {
    title: "Básico",
    range: "A1",
    book: "Básico",
    body: "Presentarte, la familia, la casa, rutinas y el pasado simple.",
  },
  a2: {
    title: "Básico",
    range: "A2",
    book: "Básico",
    body: "Hábitos, planes, comparaciones, experiencia y descripciones.",
  },
  b1: {
    title: "Intermedio",
    range: "B1",
    book: "Intermedio",
    body: "Historias, opiniones, pasiva y habla reportada.",
  },
  b2: {
    title: "Avanzado",
    range: "B2",
    book: "Avanzado",
    body: "Matices, hipótesis, registro y argumentos.",
  },
};

export type StageId = "basico" | "intermedio" | "avanzado";

export const STAGES: {
  id: StageId;
  title: string;
  levels: LevelId[];
  body: string;
}[] = [
  {
    id: "basico",
    title: "Básico",
    levels: ["a1", "a2"],
    body: "Presentarte, rutinas, planes, comparaciones y experiencia.",
  },
  {
    id: "intermedio",
    title: "Intermedio",
    levels: ["b1"],
    body: "Historias, opiniones, pasiva y habla reportada.",
  },
  {
    id: "avanzado",
    title: "Avanzado",
    levels: ["b2"],
    body: "Matices, hipótesis, registro y argumentos.",
  },
];

export function stageOf(level: LevelId): StageId {
  if (level === "b1") return "intermedio";
  if (level === "b2") return "avanzado";
  return "basico";
}

export function stageMeta(id: StageId) {
  return STAGES.find((stage) => stage.id === id) ?? STAGES[0];
}

export function displayUnit(lesson: { level: LevelId; unit: number }) {
  return lesson.level === "a2" ? lesson.unit + 12 : lesson.unit;
}

export function controlName(level: LevelId) {
  if (level === "a1" || level === "a2") return "básico";
  if (level === "b1") return "intermedio";
  return "avanzado";
}

export const SKILL_LABEL: Record<Skill, string> = {
  lectura: "Lectura",
  escritura: "Escritura",
  habla: "Habla",
  escucha: "Escucha",
};

export function emptySkillStats(): Record<Skill, SkillStat> {
  return {
    lectura: { correct: 0, total: 0 },
    escucha: { correct: 0, total: 0 },
    escritura: { correct: 0, total: 0 },
    habla: { correct: 0, total: 0 },
  };
}

export function emptyBandStats(): Record<LevelId, SkillStat> {
  return {
    a1: { correct: 0, total: 0 },
    a2: { correct: 0, total: 0 },
    b1: { correct: 0, total: 0 },
    b2: { correct: 0, total: 0 },
  };
}

function ratio(stat: SkillStat | undefined) {
  if (!stat || stat.total === 0) return 0;
  return Math.round((stat.correct / stat.total) * 100);
}

export function lessonsIn(level: LevelId) {
  return listEffectiveLessons().filter((lesson) => lesson.level === level);
}

export function levelComplete(state: AppState, level: LevelId) {
  return lessonsIn(level).every((lesson) => state.completedLessonIds.includes(lesson.id));
}

export function levelProgress(state: AppState, level: LevelId) {
  const lessons = lessonsIn(level);
  const done = lessons.filter((lesson) => state.completedLessonIds.includes(lesson.id)).length;
  return { done, total: lessons.length };
}

export function bandAccuracy(state: AppState, level: LevelId) {
  return ratio(state.bandStats?.[level]);
}

export function checkpointScore(state: AppState, level: LevelId) {
  return state.checkpointScores?.[level] ?? null;
}

export function checkpointPassed(state: AppState, level: LevelId) {
  return (checkpointScore(state, level) ?? 0) >= BAND_PASS;
}

export function previousLevel(level: LevelId): LevelId | null {
  const index = LEVEL_ORDER.indexOf(level);
  return index <= 0 ? null : LEVEL_ORDER[index - 1];
}

export function nextLevel(level: LevelId): LevelId | null {
  const index = LEVEL_ORDER.indexOf(level);
  return index < 0 || index === LEVEL_ORDER.length - 1 ? null : LEVEL_ORDER[index + 1];
}

export function bandReady(state: AppState, level: LevelId) {
  const progress = levelProgress(state, level);
  return progress.done === progress.total && progress.total > 0 && bandAccuracy(state, level) >= BAND_PASS;
}

export function bandMastered(state: AppState, level: LevelId) {
  return bandReady(state, level) && checkpointPassed(state, level);
}

export function canAccessLevel(state: AppState, level: LevelId) {
  const previous = previousLevel(level);
  if (!previous) return true;
  return bandMastered(state, previous);
}

export function canTakeCheckpoint(state: AppState, level: LevelId) {
  return canAccessLevel(state, level) && bandReady(state, level) && !checkpointPassed(state, level);
}

export function estimateLevel(state: AppState) {
  let confirmed: LevelId | null = null;
  for (const level of LEVEL_ORDER) {
    if (bandMastered(state, level)) confirmed = level;
    else break;
  }
  const working = confirmed ? nextLevel(confirmed) ?? confirmed : "a1";
  const progress = levelProgress(state, working);
  return {
    confirmed,
    working,
    label: confirmed ? LEVEL_META[confirmed].range : "Antes de A1",
    detail: confirmed
      ? `${LEVEL_META[confirmed].range} confirmado. Sigues en ${LEVEL_META[working].title}.`
      : `Estás construyendo ${LEVEL_META.a1.range}: ${progress.done}/${progress.total} unidades.`,
  };
}

export function syncUnlocks(state: AppState): AppState {
  const unlocked = new Set<LevelId>(["a1"]);
  for (const level of LEVEL_ORDER) {
    if (canAccessLevel({ ...state, unlockedLevels: [...unlocked] }, level)) unlocked.add(level);
  }
  return { ...state, unlockedLevels: LEVEL_ORDER.filter((level) => unlocked.has(level)) };
}

export function recordAttempt(
  state: AppState,
  skill: Skill,
  correct: boolean,
  level: LevelId,
  activity?: Omit<ActivityRecord, "id" | "at" | "skill" | "correct" | "level">,
): AppState {
  const currentSkill = state.skillStats?.[skill] ?? { correct: 0, total: 0 };
  const skillStats = {
    ...emptySkillStats(),
    ...state.skillStats,
    [skill]: {
      correct: currentSkill.correct + (correct ? 1 : 0),
      total: currentSkill.total + 1,
    },
  };
  const currentBand = state.bandStats?.[level] ?? { correct: 0, total: 0 };
  const bandStats = {
    ...emptyBandStats(),
    ...state.bandStats,
    [level]: {
      correct: currentBand.correct + (correct ? 1 : 0),
      total: currentBand.total + 1,
    },
  };
  const answersCorrect = state.answersCorrect + (correct ? 1 : 0);
  const answersTotal = state.answersTotal + 1;
  const historyEntry: ActivityRecord | null = activity
    ? {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        skill,
        correct,
        level,
        ...activity,
      }
    : null;
  const history = historyEntry
    ? [historyEntry, ...(state.history ?? [])].slice(0, 200)
    : state.history ?? [];
  return syncUnlocks({
    ...state,
    skillStats,
    bandStats,
    history,
    skillScores: {
      lectura: ratio(skillStats.lectura),
      escucha: ratio(skillStats.escucha),
      escritura: ratio(skillStats.escritura),
      habla: ratio(skillStats.habla),
    },
    answersCorrect,
    answersTotal,
    knowledge: Math.round((answersCorrect / answersTotal) * 100),
  });
}

export type ReviewSuggestion = {
  skill: Skill;
  title: string;
  reason: string;
  href: string;
  lessonId?: string;
};

/** RF-15: recomienda repaso según habilidades y errores recientes. */
export function recommendActivities(state: AppState): ReviewSuggestion[] {
  const suggestions: ReviewSuggestion[] = [];
  const skills = (Object.keys(SKILL_LABEL) as Skill[]).map((skill) => ({
    skill,
    accuracy: ratio(state.skillStats?.[skill]),
    total: state.skillStats?.[skill]?.total ?? 0,
  }));

  const weak = [...skills]
    .filter((item) => item.total >= 2)
    .sort((a, b) => a.accuracy - b.accuracy)
    .filter((item) => item.accuracy < BAND_PASS)
    .slice(0, 2);

  for (const item of weak) {
    const recentMiss = (state.history ?? []).find(
      (entry) => entry.skill === item.skill && !entry.correct,
    );
    const lesson =
      (recentMiss && listEffectiveLessons().find((l) => l.id === recentMiss.lessonId)) ||
      nextLesson(state) ||
      listEffectiveLessons().find((l) => canAccessLevel(state, l.level));
    suggestions.push({
      skill: item.skill,
      title: `Repasa ${SKILL_LABEL[item.skill].toLowerCase()}`,
      reason: recentMiss
        ? `Precisión ${item.accuracy}% y errores recientes en «${recentMiss.lessonTitle}».`
        : `Tu precisión en ${SKILL_LABEL[item.skill].toLowerCase()} es ${item.accuracy}% (meta ${BAND_PASS}%).`,
      href: lesson ? lessonPath(lesson.id) : "/habilidades",
      lessonId: lesson?.id,
    });
  }

  const errorLessons = new Map<string, number>();
  for (const entry of state.history ?? []) {
    if (!entry.correct) errorLessons.set(entry.lessonId, (errorLessons.get(entry.lessonId) ?? 0) + 1);
  }
  const topError = [...errorLessons.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topError) {
    const lesson = listEffectiveLessons().find((item) => item.id === topError[0]);
    if (lesson && !suggestions.some((s) => s.lessonId === lesson.id)) {
      suggestions.push({
        skill: "lectura",
        title: `Repite: ${lesson.title}`,
        reason: `Registraste ${topError[1]} error(es) en esta unidad.`,
        href: lessonPath(lesson.id),
        lessonId: lesson.id,
      });
    }
  }

  if (suggestions.length === 0) {
    const next = nextLesson(state);
    if (next) {
      suggestions.push({
        skill: "lectura",
        title: `Sigue con: ${next.title}`,
        reason: "Aún no hay debilidades claras; continúa el camino.",
        href: lessonPath(next.id),
        lessonId: next.id,
      });
    }
  }

  return suggestions.slice(0, 3);
}

export function completeLesson(state: AppState, lessonId: string): AppState {
  const lesson = listEffectiveLessons().find((item) => item.id === lessonId);
  if (!lesson) return state;
  const already = state.completedLessonIds.includes(lessonId);
  return syncUnlocks({
    ...state,
    completedLessonIds: already ? state.completedLessonIds : [...state.completedLessonIds, lessonId],
    xp: already ? state.xp : state.xp + 40,
    lastLessonId: lessonId,
  });
}

export function applyCheckpoint(state: AppState, level: LevelId, score: number): AppState {
  const previous = state.checkpointScores?.[level];
  const best = Math.max(previous ?? 0, score);
  const passed = best >= BAND_PASS;
  const next = nextLevel(level);
  return syncUnlocks({
    ...state,
    checkpointScores: { ...state.checkpointScores, [level]: best },
    examScore: score,
    examPassed: level === "b2" ? passed : state.examPassed,
    level: passed && next ? next : state.level,
    xp: state.xp + (passed && (previous ?? 0) < BAND_PASS ? 80 : 0),
  });
}

/** Skip placement and start from A1 basics (RF-04 optional). */
export function skipPlacement(state: AppState): AppState {
  return syncUnlocks({
    ...state,
    placementDone: true,
    placementSkipped: true,
    placementLevel: "a1",
    placementScore: null,
    level: "a1",
  });
}

/**
 * Place the learner at a CEFR band by confirming previous bands
 * (units + accuracy + checkpoint), without forcing them through the course.
 */
export function applyPlacement(state: AppState, placed: LevelId, score: number): AppState {
  const index = LEVEL_ORDER.indexOf(placed);
  const completed = new Set(state.completedLessonIds);
  const bandStats = { ...emptyBandStats(), ...state.bandStats };
  const checkpointScores = { ...state.checkpointScores };

  for (let i = 0; i < index; i++) {
    const level = LEVEL_ORDER[i];
    for (const lesson of lessonsIn(level)) completed.add(lesson.id);
    bandStats[level] = { correct: 12, total: 12 };
    checkpointScores[level] = 100;
  }

  return syncUnlocks({
    ...state,
    completedLessonIds: [...completed],
    bandStats,
    checkpointScores,
    placementDone: true,
    placementSkipped: false,
    placementLevel: placed,
    placementScore: score,
    level: placed,
    knowledge: Math.max(state.knowledge, Math.round((score / 8) * 100)),
  });
}

export function lessonPath(id: string) {
  return `/leccion/${id}`;
}

export function nextLesson(state: AppState): CourseLesson | null {
  const current = lessonsIn(state.level).find(
    (lesson) => canAccessLevel(state, lesson.level) && !state.completedLessonIds.includes(lesson.id),
  );
  if (current) return current;
  return (
    listEffectiveLessons().find(
      (lesson) => canAccessLevel(state, lesson.level) && !state.completedLessonIds.includes(lesson.id),
    ) ?? null
  );
}

export function stageProgress(state: AppState, stageId: StageId) {
  return stageMeta(stageId).levels.reduce(
    (sum, level) => {
      const progress = levelProgress(state, level);
      return { done: sum.done + progress.done, total: sum.total + progress.total };
    },
    { done: 0, total: 0 },
  );
}

export function stageAccuracy(state: AppState, stageId: StageId) {
  const totals = stageMeta(stageId).levels.reduce(
    (sum, level) => {
      const stat = state.bandStats?.[level] ?? { correct: 0, total: 0 };
      return { correct: sum.correct + stat.correct, total: sum.total + stat.total };
    },
    { correct: 0, total: 0 },
  );
  return ratio(totals);
}

export function levelGap(state: AppState, level: LevelId) {
  const previous = previousLevel(level);
  if (previous && !bandMastered(state, previous)) {
    if (level === "a2") return "confirma A1, la primera mitad de básico, antes de seguir";
    return `confirma ${LEVEL_META[previous].title} antes de abrir ${LEVEL_META[level].title}`;
  }
  const progress = levelProgress(state, level);
  const pending: string[] = [];
  if (progress.done < progress.total) {
    pending.push(`termina las ${progress.total} unidades (${progress.done}/${progress.total})`);
  }
  const accuracy = bandAccuracy(state, level);
  if (accuracy < BAND_PASS) {
    pending.push(`llega a ${BAND_PASS}% de precisión en ${controlName(level)} (ahora ${accuracy}%)`);
  }
  if (bandReady(state, level) && !checkpointPassed(state, level)) {
    pending.push(`aprueba el control de ${controlName(level)} con ${BAND_PASS}%`);
  }
  return pending.join(" y ");
}

export function canUnlockMid(state: AppState) {
  return bandMastered(state, "a1");
}

export function canTakeExam(state: AppState) {
  return canTakeCheckpoint(state, "b1") || canTakeCheckpoint(state, "b2");
}

export function midLockedReason(state: AppState) {
  return levelGap(state, "a2");
}

export function examLockedReason(state: AppState) {
  return levelGap(state, "b2");
}
