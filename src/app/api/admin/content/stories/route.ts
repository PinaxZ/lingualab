import { NextResponse } from "next/server";
import { shortStories } from "@/data/stories";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";
import type { ShortStory } from "@/lib/types";

function asStory(payload: unknown): ShortStory | null {
  if (!payload || typeof payload !== "object") return null;
  const story = payload as ShortStory;
  if (!story.id || !story.title || !story.level || !story.text) return null;
  return { ...story, language: story.language ?? "en" };
}

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const rows = await getPrisma().contentStory.findMany({ orderBy: [{ level: "asc" }, { title: "asc" }] });
  const deleted = new Set(rows.filter((row) => row.deleted).map((row) => row.id));
  const overrides = new Map(rows.filter((row) => !row.deleted).map((row) => [row.id, row]));

  const builtin = shortStories
    .filter((story) => !deleted.has(story.id))
    .map((story) => {
      const override = overrides.get(story.id);
      if (override) {
        return {
          source: "override" as const,
          published: override.published,
          story: override.payload as ShortStory,
        };
      }
      return {
        source: "builtin" as const,
        published: true,
        story: { ...story, language: story.language ?? "en" },
      };
    });

  const custom = rows
    .filter((row) => !row.deleted && !shortStories.some((story) => story.id === row.id))
    .map((row) => ({
      source: "custom" as const,
      published: row.published,
      story: row.payload as ShortStory,
    }));

  return NextResponse.json({ ok: true, items: [...builtin, ...custom] });
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let body: { story?: unknown; published?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const story = asStory(body.story);
  if (!story) {
    return NextResponse.json({ ok: false, error: "Historia incompleta (id, title, level, text)." }, { status: 400 });
  }

  const saved = await getPrisma().contentStory.upsert({
    where: { id: story.id },
    create: {
      id: story.id,
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
