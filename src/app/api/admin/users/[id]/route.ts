import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const user = await getPrisma().user.findUnique({
    where: { id },
    include: { progress: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      approved: user.approved,
      state: user.progress?.state ?? null,
      progressUpdatedAt: user.progress?.updatedAt ?? null,
    },
  });
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  if (auth.user.id === id) {
    return NextResponse.json({ ok: false, error: "No puedes eliminarte a ti mismo." }, { status: 400 });
  }

  const target = await getPrisma().user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });

  await getPrisma().user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
