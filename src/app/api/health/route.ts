import { connection } from "next/server";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  // Ensure runtime evaluation of env (not frozen at build time).
  await connection();
  const db = isDatabaseConfigured();
  const authSecret = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16);
  return NextResponse.json({
    ok: true,
    storage: db ? "database" : "local",
    readyForPublish: db && authSecret,
    authSecretConfigured: authSecret,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
