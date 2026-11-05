"use client";

import type { Role } from "@/lib/roles";

export type StorageMode = "database" | "local" | "unknown";

let cachedMode: StorageMode = "unknown";

export async function detectStorageMode(): Promise<StorageMode> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) {
      cachedMode = "local";
      return cachedMode;
    }
    const data = (await res.json()) as { storage?: StorageMode };
    cachedMode = data.storage === "database" ? "database" : "local";
    return cachedMode;
  } catch {
    cachedMode = "local";
    return cachedMode;
  }
}

export function getCachedStorageMode(): StorageMode {
  return cachedMode;
}

export type AuthUserDto = {
  username: string;
  displayName: string;
  role?: Role;
  approved?: boolean;
};

export async function apiRegister(
  username: string,
  password: string,
  displayName?: string,
  role?: Role,
) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, displayName, role }),
  });
  return (await res.json()) as {
    ok: boolean;
    error?: string;
    mode?: string;
    pendingApproval?: boolean;
    user?: AuthUserDto;
  };
}

export async function apiLogin(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return (await res.json()) as {
    ok: boolean;
    error?: string;
    mode?: string;
    pendingApproval?: boolean;
    user?: AuthUserDto;
  };
}

export async function apiLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function apiMe() {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  return (await res.json()) as {
    ok: boolean;
    mode?: string;
    user: AuthUserDto | null;
  };
}

export async function apiGetProgress() {
  const res = await fetch("/api/progress", { cache: "no-store" });
  if (res.status === 401) return { ok: false as const, unauthorized: true as const, state: null };
  if (!res.ok) return { ok: false as const, unauthorized: false as const, state: null };
  const data = (await res.json()) as { ok: boolean; state: unknown };
  return { ok: data.ok, unauthorized: false as const, state: data.state };
}

export async function apiSaveProgress(state: unknown) {
  const res = await fetch("/api/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  return res.ok;
}

export async function apiGetCatalog() {
  const res = await fetch("/api/content/catalog", { cache: "no-store" });
  if (!res.ok) {
    return {
      ok: false as const,
      lessons: [],
      stories: [],
      deletedLessonIds: [] as string[],
      deletedStoryIds: [] as string[],
    };
  }
  return (await res.json()) as {
    ok: boolean;
    lessons: import("@/lib/types").CourseLesson[];
    stories: import("@/lib/types").ShortStory[];
    deletedLessonIds: string[];
    deletedStoryIds: string[];
  };
}
