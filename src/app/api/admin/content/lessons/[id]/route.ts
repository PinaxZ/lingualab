import { NextResponse } from "next/server";
import { courseLessons } from "@/data/course";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";
import type { CourseLesson } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const isBuiltin = courseLessons.some((lesson) => lesson.id === id);
  const prisma = getPrisma();
  const existing = await prisma.contentLesson.findUnique({ where: { id } });

  if (isBuiltin) {
    const builtin = courseLessons.find((lesson) => lesson.id === id)!;
    await prisma.contentLesson.upsert({
      where: { id },
      create: {
        id,
        language: String(builtin.language ?? "en"),
        level: builtin.level,
        title: builtin.title,
        published: false,
        payload: builtin as object,
        deleted: true,
      },
      update: { deleted: true, published: false },
    });
    return NextResponse.json({ ok: true, tombstone: true });
  }

  if (existing) {
    await prisma.contentLesson.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  let body: { lesson?: CourseLesson; published?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const lesson = body.lesson;
  if (!lesson || lesson.id !== id) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const saved = await getPrisma().contentLesson.upsert({
    where: { id },
    create: {
      id,
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
