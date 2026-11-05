import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getCurrentDbUser } from "@/lib/serverAuth";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, mode: "local", user: null });
  }

  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ ok: true, mode: "database", user: null });
  }

  return NextResponse.json({
    ok: true,
    mode: "database",
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      approved: user.approved,
    },
  });
}
