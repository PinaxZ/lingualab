import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";

function progressSummary(state: unknown) {
  if (!state || typeof state !== "object") {
    return { level: null, completed: 0, knowledge: 0, placementDone: false };
  }
  const s = state as {
    level?: string;
    completedLessonIds?: string[];
    knowledge?: number;
    placementDone?: boolean;
  };
  return {
    level: s.level ?? null,
    completed: s.completedLessonIds?.length ?? 0,
    knowledge: s.knowledge ?? 0,
    placementDone: Boolean(s.placementDone),
  };
}

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const users = await getPrisma().user.findMany({
    include: {
      progress: { select: { state: true, updatedAt: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    ok: true,
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      approved: user.approved,
      createdAt: user.createdAt,
      progress: progressSummary(user.progress?.state),
      progressUpdatedAt: user.progress?.updatedAt ?? null,
    })),
  });
}
