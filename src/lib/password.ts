import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function createSalt() {
  return randomBytes(16).toString("hex");
}

/** SHA-256(salt:password) — same scheme as the pretotype, now server-side. */
export function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = hashPassword(password, salt);
  const a = Buffer.from(actual);
  const b = Buffer.from(expectedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
