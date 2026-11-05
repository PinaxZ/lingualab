import { PrismaClient, Role } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

async function upsertAdmin(username: string, displayName: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await prisma.user.update({
      where: { username },
      data: { displayName, role: Role.ADMIN, approved: true },
    });
    console.log(`Updated ADMIN: ${username}`);
    return;
  }
  const salt = randomBytes(16).toString("hex");
  await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: hashPassword(password, salt),
      salt,
      role: Role.ADMIN,
      approved: true,
    },
  });
  console.log(`Created ADMIN: ${username}`);
}

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD || "LinguaLab2026!";
  await upsertAdmin("annaordaz", "Anna Sheccid Ordaz", password);
  await upsertAdmin("joselicona", "Jose Manuel Licona", password);

  // Drop legacy teacher demo if present (role enum no longer includes TEACHER).
  try {
    await prisma.user.deleteMany({ where: { username: "maestrodemo" } });
  } catch {
    /* ignore if already gone */
  }

  console.log(`Seed password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
