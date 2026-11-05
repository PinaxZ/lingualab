import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { createSalt, hashPassword, normalizeUsername } from "@/lib/password";
import { parseRole } from "@/lib/roles";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Base de datos no configurada (DATABASE_URL).", mode: "local" },
      { status: 503 },
    );
  }

  let body: {
    username?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";
  const displayName = (body.displayName?.trim() || body.username?.trim() || username).slice(0, 40);
  const role = parseRole(body.role) as Role;

  if (username.length < 3) {
    return NextResponse.json({ ok: false, error: "El usuario debe tener al menos 3 caracteres." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 4 caracteres." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Ese nombre de usuario ya existe." }, { status: 409 });
  }

  const salt = createSalt();
  const passwordHash = hashPassword(password, salt);
  const approved = role === Role.STUDENT;

  const user = await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash,
      salt,
      role,
      approved,
    },
  });

  await setSessionCookie(user.username);

  return NextResponse.json({
    ok: true,
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      approved: user.approved,
    },
    pendingApproval: !user.approved && user.role === Role.ADMIN,
  });
}
