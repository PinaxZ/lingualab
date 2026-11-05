import { courseLessons as builtinLessons } from "@/data/course";
import { shortStories as builtinStories } from "@/data/stories";
import type { CourseLesson, ShortStory } from "@/lib/types";

/** LinguaLab teaches English only. */
export const APP_LANGUAGE = "en" as const;

export type CatalogOverlay = {
  lessons: CourseLesson[];
  stories: ShortStory[];
  deletedLessonIds: string[];
  deletedStoryIds: string[];
};

const EMPTY: CatalogOverlay = {
  lessons: [],
  stories: [],
  deletedLessonIds: [],
  deletedStoryIds: [],
};

let overlay: CatalogOverlay = EMPTY;
const listeners = new Set<() => void>();

export function getCatalogOverlay() {
  return overlay;
}

export function setCatalogOverlay(next: CatalogOverlay) {
  overlay = next;
  listeners.forEach((listener) => listener());
}

export function subscribeCatalog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function mergeLessons(base: CourseLesson[], pack: CatalogOverlay): CourseLesson[] {
  const deleted = new Set(pack.deletedLessonIds);
  const map = new Map<string, CourseLesson>();
  for (const lesson of base) {
    if (!deleted.has(lesson.id)) map.set(lesson.id, { ...lesson, language: APP_LANGUAGE });
  }
  for (const lesson of pack.lessons) {
    if (deleted.has(lesson.id)) continue;
    map.set(lesson.id, { ...lesson, language: APP_LANGUAGE });
  }
  return [...map.values()].sort((a, b) => {
    const levelOrder = { a1: 0, a2: 1, b1: 2, b2: 3 };
    const la = levelOrder[a.level] ?? 9;
    const lb = levelOrder[b.level] ?? 9;
    if (la !== lb) return la - lb;
    return a.unit - b.unit || a.title.localeCompare(b.title);
  });
}

export function mergeStories(base: ShortStory[], pack: CatalogOverlay): ShortStory[] {
  const deleted = new Set(pack.deletedStoryIds);
  const map = new Map<string, ShortStory>();
  for (const story of base) {
    if (!deleted.has(story.id)) map.set(story.id, { ...story, language: APP_LANGUAGE });
  }
  for (const story of pack.stories) {
    if (deleted.has(story.id)) continue;
    map.set(story.id, { ...story, language: APP_LANGUAGE });
  }
  return [...map.values()];
}

export function listEffectiveLessons() {
  return mergeLessons(builtinLessons, overlay);
}

export function listEffectiveStories() {
  return mergeStories(builtinStories, overlay);
}

export function getEffectiveLesson(id: string) {
  return listEffectiveLessons().find((lesson) => lesson.id === id);
}

export function getEffectiveStory(id: string) {
  return listEffectiveStories().find((story) => story.id === id);
}

export function builtinLessonMap() {
  return new Map(builtinLessons.map((lesson) => [lesson.id, lesson]));
}

export function builtinStoryMap() {
  return new Map(builtinStories.map((story) => [story.id, story]));
}
