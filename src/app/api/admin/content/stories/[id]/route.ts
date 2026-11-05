import { NextResponse } from "next/server";
import { shortStories } from "@/data/stories";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";
import type { ShortStory } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const isBuiltin = shortStories.some((story) => story.id === id);
  const prisma = getPrisma();

  if (isBuiltin) {
    const builtin = shortStories.find((story) => story.id === id)!;
    await prisma.contentStory.upsert({
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

  const existing = await prisma.contentStory.findUnique({ where: { id } });
  if (existing) await prisma.contentStory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  let body: { story?: ShortStory; published?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const story = body.story;
  if (!story || story.id !== id) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const saved = await getPrisma().contentStory.upsert({
    where: { id },
    create: {
      id,
      language: String(story.language ?? "en"),
      level: story.level,
      title: story.title,
      published: body.published ?? true,
      payload: story,
      deleted: false,
    },
    update: {
      language: String(story.language ?? "en"),
      level: story.level,
      title: story.title,
      published: body.published ?? true,
      payload: story,
      deleted: false,
    },
  });

  return NextResponse.json({ ok: true, story: saved.payload });
}
