import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const users = await getPrisma().user.findMany({
    include: { progress: { select: { state: true } } },
  });

  const byRole = { ADMIN: 0, STUDENT: 0 };
  const byLevel: Record<string, number> = { a1: 0, a2: 0, b1: 0, b2: 0, none: 0 };
  const lessonCompletions = new Map<string, number>();
  let knowledgeSum = 0;
  let knowledgeCount = 0;
  let placementDone = 0;
  let withProgress = 0;

  for (const user of users) {
    byRole[user.role as keyof typeof byRole] =
      (byRole[user.role as keyof typeof byRole] ?? 0) + 1;

    const state = user.progress?.state as
      | {
          level?: string;
          knowledge?: number;
          completedLessonIds?: string[];
          placementDone?: boolean;
        }
      | undefined;

    if (!state) {
      byLevel.none += 1;
      continue;
    }

    withProgress += 1;
    const level = state.level ?? "none";
    byLevel[level] = (byLevel[level] ?? 0) + 1;
    if (typeof state.knowledge === "number") {
      knowledgeSum += state.knowledge;
      knowledgeCount += 1;
    }
    if (state.placementDone) placementDone += 1;
    for (const lessonId of state.completedLessonIds ?? []) {
      lessonCompletions.set(lessonId, (lessonCompletions.get(lessonId) ?? 0) + 1);
    }
  }

  const topLessons = [...lessonCompletions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, completions]) => ({ id, completions }));

  return NextResponse.json({
    ok: true,
    stats: {
      totalUsers: users.length,
      byRole,
      byLevel,
      withProgress,
      placementDone,
      avgKnowledge: knowledgeCount ? Math.round(knowledgeSum / knowledgeCount) : 0,
      topLessons,
      content: {
        lessons: await getPrisma().contentLesson.count({ where: { deleted: false } }),
        stories: await getPrisma().contentStory.count({ where: { deleted: false } }),
      },
    },
  });
}
