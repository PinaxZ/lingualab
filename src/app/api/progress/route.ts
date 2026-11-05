import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { getSessionUsername } from "@/lib/session";
import type { AppState } from "@/lib/types";
import type { Prisma } from "@prisma/client";

async function currentUser() {
  const username = await getSessionUsername();
  if (!username) return null;
  return getPrisma().user.findUnique({ where: { username } });
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, mode: "local", error: "DB no configurada" }, { status: 503 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  const progress = await getPrisma().progress.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    ok: true,
    mode: "database",
    state: (progress?.state as AppState | null) ?? null,
    user: { username: user.username, displayName: user.displayName },
  });
}

export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, mode: "local", error: "DB no configurada" }, { status: 503 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  let body: { state?: AppState };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!body.state || typeof body.state !== "object") {
    return NextResponse.json({ ok: false, error: "state requerido" }, { status: 400 });
  }

  // Keep profile username aligned with the account.
  const state: AppState = {
    ...body.state,
    user: {
      ...body.state.user,
      username: user.username,
      name: body.state.user?.name || user.displayName,
    },
  };

  await getPrisma().progress.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      state: state as unknown as Prisma.InputJsonValue,
    },
    update: {
      state: state as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true });
}
