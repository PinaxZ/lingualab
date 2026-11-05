import { NextResponse } from "next/server";
import { courseLessons } from "@/data/course";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";
import type { CourseLesson } from "@/lib/types";

function asLesson(payload: unknown): CourseLesson | null {
  if (!payload || typeof payload !== "object") return null;
  const lesson = payload as CourseLesson;
  if (!lesson.id || !lesson.title || !lesson.level) return null;
  return {
    ...lesson,
    language: lesson.language ?? "en",
    steps: Array.isArray(lesson.steps) ? lesson.steps : [],
  };
}

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const rows = await getPrisma().contentLesson.findMany({ orderBy: [{ level: "asc" }, { title: "asc" }] });
  const deleted = new Set(rows.filter((row) => row.deleted).map((row) => row.id));
  const overrides = new Map(rows.filter((row) => !row.deleted).map((row) => [row.id, row]));

  const builtin = courseLessons
    .filter((lesson) => !deleted.has(lesson.id))
    .map((lesson) => {
      const override = overrides.get(lesson.id);
      if (override) {
        return {
          source: "override" as const,
          published: override.published,
          lesson: override.payload as CourseLesson,
        };
      }
      return {
        source: "builtin" as const,
        published: true,
        lesson: { ...lesson, language: lesson.language ?? "en" },
      };
    });

  const custom = rows
    .filter((row) => !row.deleted && !courseLessons.some((lesson) => lesson.id === row.id))
    .map((row) => ({
      source: "custom" as const,
      published: row.published,
      lesson: row.payload as CourseLesson,
    }));

  return NextResponse.json({ ok: true, items: [...builtin, ...custom] });
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let body: { lesson?: unknown; published?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const lesson = asLesson(body.lesson);
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "Lección incompleta (id, title, level)." }, { status: 400 });
  }

  const saved = await getPrisma().contentLesson.upsert({
    where: { id: lesson.id },
    create: {
      id: lesson.id,
      language: String(lesson.language ?? "en"),
      level: lesson.level,
      title: lesson.title,
      published: body.published ?? true,
      payload: lesson,
      deleted: false,
    },
    update: {
      language: String(lesson.language ?? "en"),
      level: lesson.level,
      title: lesson.title,
      published: body.published ?? true,
      payload: lesson,
      deleted: false,
    },
  });

  return NextResponse.json({ ok: true, lesson: saved.payload });
}
