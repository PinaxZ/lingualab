"use client";

import { apiLogin, apiRegister, detectStorageMode } from "@/lib/cloud";
import type { Role } from "@/lib/roles";
import { isAdmin, parseRole } from "@/lib/roles";

export type StoredUser = {
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  role: Role;
  approved: boolean;
};

const USERS_KEY = "lingualab-users-v1";
const SESSION_KEY = "lingualab-session-v1";
const LOCAL_ADMIN_PASSWORD = "LinguaLab2026!";

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function isPendingApproval(user: { role: Role; approved?: boolean }) {
  return isAdmin(user.role) && !user.approved;
}

async function ensureLocalAdmins(users: StoredUser[]) {
  const seeds: { username: string; displayName: string }[] = [
    { username: "annaordaz", displayName: "Anna Sheccid Ordaz" },
    { username: "joselicona", displayName: "Jose Manuel Licona" },
  ];
  let next = users.filter((user) => user.username !== "maestrodemo");
  let changed = next.length !== users.length;

  for (const seed of seeds) {
    const existing = next.find((user) => user.username === seed.username);
    if (existing) {
      if (existing.role !== "ADMIN" || !existing.approved) {
        existing.role = "ADMIN";
        existing.approved = true;
        existing.displayName = seed.displayName;
        changed = true;
      }
      continue;
    }
    const salt = randomSalt();
    next.push({
      username: seed.username,
      displayName: seed.displayName,
      passwordHash: await hashPassword(LOCAL_ADMIN_PASSWORD, salt),
      salt,
      createdAt: new Date().toISOString(),
      role: "ADMIN",
      approved: true,
    });
    changed = true;
  }
  if (changed) writeUsers(next);
  return next;
}

function readUsersRaw(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredUser>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((user) => ({
      username: user.username ?? "",
      displayName: user.displayName ?? user.username ?? "",
      passwordHash: user.passwordHash ?? "",
      salt: user.salt ?? "",
      createdAt: user.createdAt ?? new Date().toISOString(),
      role: parseRole(user.role),
      approved: user.approved ?? parseRole(user.role) === "STUDENT",
    }));
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function readUsers(): Promise<StoredUser[]> {
  return ensureLocalAdmins(readUsersRaw());
}

export function getSessionUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username ? normalizeUsername(parsed.username) : null;
  } catch {
    return null;
  }
}

export function setSession(username: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: normalizeUsername(username) }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function findUser(username: string) {
  const key = normalizeUsername(username);
  const users = await readUsers();
  return users.find((user) => user.username === key) ?? null;
}

export type RegisterOptions = {
  displayName?: string;
  role?: Role;
};

async function registerLocal(username: string, password: string, options: RegisterOptions = {}) {
  const key = normalizeUsername(username);
  const role = parseRole(options.role);
  if (key.length < 3) return { ok: false as const, error: "El usuario debe tener al menos 3 caracteres." };
  if (password.length < 4) return { ok: false as const, error: "La contraseña debe tener al menos 4 caracteres." };

  const users = await readUsers();
  if (users.some((user) => user.username === key)) {
    return { ok: false as const, error: "Ese nombre de usuario ya existe." };
  }

  const salt = randomSalt();
  const user: StoredUser = {
    username: key,
    displayName: (options.displayName?.trim() || username.trim()).slice(0, 40),
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role,
    approved: role === "STUDENT",
  };
  writeUsers([...users, user]);
  setSession(key);
  return { ok: true as const, user, pendingApproval: isPendingApproval(user) };
}

async function loginLocal(username: string, password: string) {
  const user = await findUser(username);
  if (!user) return { ok: false as const, error: "Usuario o contraseña incorrectos." };
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) {
    return { ok: false as const, error: "Usuario o contraseña incorrectos." };
  }
  setSession(user.username);
  return { ok: true as const, user, pendingApproval: isPendingApproval(user) };
}

export async function registerUser(
  username: string,
  password: string,
  displayName?: string,
  role: Role = "STUDENT",
) {
  const mode = await detectStorageMode();
  if (mode === "database") {
    const result = await apiRegister(username, password, displayName, role);
    if (!result.ok || !result.user) {
      return { ok: false as const, error: result.error || "No se pudo crear la cuenta." };
    }
    setSession(result.user.username);
    const user: StoredUser = {
      username: result.user.username,
      displayName: result.user.displayName,
      passwordHash: "",
      salt: "",
      createdAt: new Date().toISOString(),
      role: parseRole(result.user.role),
      approved: Boolean(result.user.approved),
    };
    return {
      ok: true as const,
      user,
      pendingApproval: Boolean(result.pendingApproval),
    };
  }
  return registerLocal(username, password, { displayName, role });
}

export async function loginUser(username: string, password: string) {
  const mode = await detectStorageMode();
  if (mode === "database") {
    const result = await apiLogin(username, password);
    if (!result.ok || !result.user) {
      return { ok: false as const, error: result.error || "Usuario o contraseña incorrectos." };
    }
    setSession(result.user.username);
    const user: StoredUser = {
      username: result.user.username,
      displayName: result.user.displayName,
      passwordHash: "",
      salt: "",
      createdAt: new Date().toISOString(),
      role: parseRole(result.user.role),
      approved: Boolean(result.user.approved),
    };
    return {
      ok: true as const,
      user,
      pendingApproval: Boolean(result.pendingApproval),
    };
  }
  return loginLocal(username, password);
}

export function stateKeyFor(username: string) {
  return `lingualab-state-v1:${normalizeUsername(username)}`;
}

export async function listLocalUsers() {
  return readUsers();
}

export async function deleteLocalUser(username: string, actorUsername: string) {
  const key = normalizeUsername(username);
  if (key === normalizeUsername(actorUsername)) {
    return { ok: false as const, error: "No puedes eliminarte a ti mismo." };
  }
  const users = await readUsers();
  writeUsers(users.filter((user) => user.username !== key));
  return { ok: true as const };
}

export async function approveLocalUser(username: string) {
  const users = await readUsers();
  const next = users.map((user) =>
    user.username === normalizeUsername(username) ? { ...user, approved: true } : user,
  );
  writeUsers(next);
  return { ok: true as const };
}
