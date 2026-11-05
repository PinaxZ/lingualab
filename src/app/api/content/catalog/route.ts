import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import type { CourseLesson, ShortStory } from "@/lib/types";

/** Public catalog overlays (admin CMS deltas over built-in content). */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "local",
      lessons: [],
      stories: [],
      deletedLessonIds: [],
      deletedStoryIds: [],
    });
  }

  const prisma = getPrisma();
  const [lessonRows, storyRows] = await Promise.all([
    prisma.contentLesson.findMany(),
    prisma.contentStory.findMany(),
  ]);

  return NextResponse.json({
    ok: true,
    mode: "database",
    lessons: lessonRows
      .filter((row) => !row.deleted && row.published)
      .map((row) => row.payload as CourseLesson),
    stories: storyRows
      .filter((row) => !row.deleted && row.published)
      .map((row) => row.payload as ShortStory),
    deletedLessonIds: lessonRows.filter((row) => row.deleted).map((row) => row.id),
    deletedStoryIds: storyRows.filter((row) => row.deleted).map((row) => row.id),
  });
}
