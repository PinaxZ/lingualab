import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { normalizeUsername, verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Base de datos no configurada (DATABASE_URL).", mode: "local" },
      { status: 503 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  await setSessionCookie(user.username);

  return NextResponse.json({
    ok: true,
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      approved: user.approved,
    },
    pendingApproval: !user.approved && user.role === "ADMIN",
  });
}
