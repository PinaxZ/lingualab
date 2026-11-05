import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireRole } from "@/lib/serverAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const user = await getPrisma().user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
  if (user.role === "STUDENT") {
    return NextResponse.json({ ok: false, error: "Los estudiantes no requieren aprobación." }, { status: 400 });
  }

  const updated = await getPrisma().user.update({
    where: { id },
    data: { approved: true },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      role: updated.role,
      approved: updated.approved,
    },
  });
}
