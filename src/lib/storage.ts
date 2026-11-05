"use client";

import { clearSession, getSessionUsername, stateKeyFor } from "@/lib/auth";
import {
  apiLogout,
  apiGetProgress,
  apiMe,
  apiSaveProgress,
  detectStorageMode,
  getCachedStorageMode,
} from "@/lib/cloud";
import { listEffectiveLessons } from "@/lib/catalog";
import { canAccessLevel, emptyBandStats, emptySkillStats, syncUnlocks } from "@/lib/progress";
import type { AppState, LevelId, Skill, UserProfile } from "@/lib/types";

/** Legacy single-user key (migrated on first load if a session exists). */
export const STORAGE_KEY = "lingualab-state-v1";

export const DEMO_USER: UserProfile = {
  username: "lucia",
  name: "Lucía M.",
  email: "lucia@lingualab.app",
  initials: "LM",
  role: "STUDENT",
  approved: true,
};

export const EMPTY_SCORES: Record<Skill, number> = {
  lectura: 0,
  escucha: 0,
  escritura: 0,
  habla: 0,
};

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function defaultState(user: UserProfile): AppState {
  return {
    user,
    level: "a1",
    xp: 0,
    completedLessonIds: [],
    skillScores: { lectura: 0, escucha: 0, escritura: 0, habla: 0 },
    skillStats: emptySkillStats(),
    bandStats: emptyBandStats(),
    checkpointScores: {},
    lastLessonId: null,
    knowledge: 0,
    answersCorrect: 0,
    answersTotal: 0,
    unlockedLevels: ["a1"],
    examScore: null,
    examPassed: false,
    history: [],
    placementDone: false,
    placementSkipped: false,
    placementLevel: null,
    placementScore: null,
  };
}

const LEGACY_LEVEL: Record<string, LevelId> = {
  principiante: "a1",
  intermedio: "a2",
  avanzado: "b1",
  a1: "a1",
  a2: "a2",
  b1: "b1",
  b2: "b2",
};

function asLevel(value: string | undefined): LevelId {
  return LEGACY_LEVEL[value ?? ""] ?? "a1";
}

function activeKey() {
  const username = getSessionUsername();
  return username ? stateKeyFor(username) : STORAGE_KEY;
}

function normalizeUser(user: Partial<UserProfile> | undefined): UserProfile | null {
  if (!user?.name) return null;
  return {
    username: user.username ?? user.email?.split("@")[0] ?? "usuario",
    name: user.name,
    email: user.email ?? "",
    initials: user.initials ?? initialsFromName(user.name),
    role: user.role ?? "STUDENT",
    approved: user.approved ?? true,
  };
}

export function hydrateState(parsed: Partial<AppState>, sessionUsername?: string | null): AppState | null {
  const user = normalizeUser(parsed.user);
  if (!user) return null;
  if (sessionUsername) user.username = sessionUsername;

  const base = defaultState(user);
  const legacy = parsed as Partial<AppState> & { level?: string };
  const validIds = new Set(listEffectiveLessons().map((lesson) => lesson.id));
  const completedLessonIds = (parsed.completedLessonIds ?? []).filter((id) => validIds.has(id));
  const hasCourseProgress =
    completedLessonIds.length > 0 ||
    Object.values(parsed.checkpointScores ?? {}).some((score) => typeof score === "number");
  const synced = syncUnlocks({
    ...base,
    ...parsed,
    user,
    level: asLevel(legacy.level),
    skillScores: hasCourseProgress ? { ...base.skillScores, ...parsed.skillScores } : base.skillScores,
    skillStats: hasCourseProgress ? { ...base.skillStats, ...parsed.skillStats } : base.skillStats,
    bandStats: hasCourseProgress ? { ...base.bandStats, ...parsed.bandStats } : base.bandStats,
    checkpointScores: parsed.checkpointScores ?? {},
    completedLessonIds,
    unlockedLevels: ["a1"],
    knowledge: hasCourseProgress ? (parsed.knowledge ?? 0) : 0,
    answersCorrect: hasCourseProgress ? (parsed.answersCorrect ?? 0) : 0,
    answersTotal: hasCourseProgress ? (parsed.answersTotal ?? 0) : 0,
    examScore: hasCourseProgress ? (parsed.examScore ?? null) : null,
    examPassed: hasCourseProgress ? Boolean(parsed.examPassed) : false,
    history: Array.isArray(parsed.history) ? parsed.history : [],
    placementDone:
      typeof parsed.placementDone === "boolean" ? parsed.placementDone : hasCourseProgress,
    placementSkipped: Boolean(parsed.placementSkipped),
    placementLevel: parsed.placementLevel ?? null,
    placementScore: parsed.placementScore ?? null,
  });
  return canAccessLevel(synced, synced.level) ? synced : { ...synced, level: "a1" };
}

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const session = getSessionUsername();
    if (!session) return null;

    let raw = localStorage.getItem(stateKeyFor(session));
    if (!raw) {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(stateKeyFor(session), legacy);
      }
    }
    if (!raw) return null;
    return hydrateState(JSON.parse(raw) as Partial<AppState>, session);
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function queueProgressToCloud(state: AppState) {
  if (getCachedStorageMode() !== "database") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void apiSaveProgress(state);
  }, 400);
}

export function saveState(state: AppState) {
  const key = state.user.username ? stateKeyFor(state.user.username) : activeKey();
  localStorage.setItem(key, JSON.stringify(state));
  window.dispatchEvent(new Event("lingualab-state"));
  queueProgressToCloud(state);
}

export async function clearState() {
  const session = getSessionUsername();
  if (session) localStorage.removeItem(stateKeyFor(session));
  clearSession();
  const mode = getCachedStorageMode() === "unknown" ? await detectStorageMode() : getCachedStorageMode();
  if (mode === "database") await apiLogout();
  window.dispatchEvent(new Event("lingualab-state"));
}

/** Pull progress from Postgres when cloud mode is active. */
export async function hydrateFromServer(): Promise<AppState | null> {
  const mode = await detectStorageMode();
  if (mode !== "database") return loadState();

  const [me, remote] = await Promise.all([apiMe(), apiGetProgress()]);
  if (remote.unauthorized) {
    clearSession();
    return null;
  }

  let base: AppState | null = null;
  if (remote.ok && remote.state) {
    const session = getSessionUsername();
    base = hydrateState(remote.state as Partial<AppState>, session);
  }
  if (!base) base = loadState();

  if (me.user && base) {
    base = {
      ...base,
      user: {
        ...base.user,
        username: me.user.username,
        name: me.user.displayName || base.user.name,
        role: me.user.role ?? base.user.role,
        approved: me.user.approved ?? base.user.approved,
      },
    };
    localStorage.setItem(stateKeyFor(base.user.username), JSON.stringify(base));
    return base;
  }

  if (base) {
    localStorage.setItem(stateKeyFor(base.user.username), JSON.stringify(base));
  }
  return base;
}

export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,!?'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const WORD_ALIASES: Record<string, string> = {
  doughnut: "donut",
  donuts: "donut",
  coffe: "coffee",
};

function canonicalWord(word: string) {
  return WORD_ALIASES[word] ?? word;
}

export function spokenWords(value: string) {
  return normalizeAnswer(value).split(" ").filter(Boolean).map(canonicalWord);
}

export function scorePronunciation(expected: string, heard: string) {
  const expectedWords = spokenWords(expected);
  const heardWords = new Set(spokenWords(heard));
  if (expectedWords.length === 0) return 0;
  const hits = expectedWords.filter((word) => heardWords.has(word)).length;
  return Math.round((hits / expectedWords.length) * 100);
}

export function missedWords(expected: string, heard: string) {
  const heardWords = new Set(spokenWords(heard));
  return spokenWords(expected).filter((word) => !heardWords.has(word));
}

export function speakingPassed(expected: string, heard: string) {
  return heard.trim().length > 0 && scorePronunciation(expected, heard) >= 75;
}
