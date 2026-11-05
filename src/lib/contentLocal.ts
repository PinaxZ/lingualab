"use client";

import type { CatalogOverlay } from "@/lib/catalog";
import type { CourseLesson, ShortStory } from "@/lib/types";

const KEY = "lingualab-content-v1";

export function readLocalContent(): CatalogOverlay {
  if (typeof window === "undefined") {
    return { lessons: [], stories: [], deletedLessonIds: [], deletedStoryIds: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { lessons: [], stories: [], deletedLessonIds: [], deletedStoryIds: [] };
    const parsed = JSON.parse(raw) as Partial<CatalogOverlay>;
    return {
      lessons: Array.isArray(parsed.lessons) ? (parsed.lessons as CourseLesson[]) : [],
      stories: Array.isArray(parsed.stories) ? (parsed.stories as ShortStory[]) : [],
      deletedLessonIds: Array.isArray(parsed.deletedLessonIds) ? parsed.deletedLessonIds : [],
      deletedStoryIds: Array.isArray(parsed.deletedStoryIds) ? parsed.deletedStoryIds : [],
    };
  } catch {
    return { lessons: [], stories: [], deletedLessonIds: [], deletedStoryIds: [] };
  }
}

export function writeLocalContent(pack: CatalogOverlay) {
  localStorage.setItem(KEY, JSON.stringify(pack));
}

export function upsertLocalLesson(lesson: CourseLesson) {
  const pack = readLocalContent();
  const lessons = pack.lessons.filter((item) => item.id !== lesson.id);
  lessons.push(lesson);
  const next = {
    ...pack,
    lessons,
    deletedLessonIds: pack.deletedLessonIds.filter((id) => id !== lesson.id),
  };
  writeLocalContent(next);
  return next;
}

export function deleteLocalLesson(id: string, isBuiltin: boolean) {
  const pack = readLocalContent();
  const lessons = pack.lessons.filter((item) => item.id !== id);
  const deletedLessonIds = isBuiltin
    ? [...new Set([...pack.deletedLessonIds, id])]
    : pack.deletedLessonIds.filter((item) => item !== id);
  const next = { ...pack, lessons, deletedLessonIds };
  writeLocalContent(next);
  return next;
}

export function upsertLocalStory(story: ShortStory) {
  const pack = readLocalContent();
  const stories = pack.stories.filter((item) => item.id !== story.id);
  stories.push(story);
  const next = {
    ...pack,
    stories,
    deletedStoryIds: pack.deletedStoryIds.filter((id) => id !== story.id),
  };
  writeLocalContent(next);
  return next;
}

export function deleteLocalStory(id: string, isBuiltin: boolean) {
  const pack = readLocalContent();
  const stories = pack.stories.filter((item) => item.id !== id);
  const deletedStoryIds = isBuiltin
    ? [...new Set([...pack.deletedStoryIds, id])]
    : pack.deletedStoryIds.filter((item) => item !== id);
  const next = { ...pack, stories, deletedStoryIds };
  writeLocalContent(next);
  return next;
}
