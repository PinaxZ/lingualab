"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { courseLessons } from "@/data/course";
import { shortStories as builtinStories } from "@/data/stories";
import {
  approveLocalUser,
  deleteLocalUser,
  getSessionUsername,
  listLocalUsers,
  stateKeyFor,
} from "@/lib/auth";
import {
  APP_LANGUAGE,
  listEffectiveLessons,
  listEffectiveStories,
  setCatalogOverlay,
} from "@/lib/catalog";
import { detectStorageMode } from "@/lib/cloud";
import {
  deleteLocalLesson,
  deleteLocalStory,
  readLocalContent,
  upsertLocalLesson,
  upsertLocalStory,
} from "@/lib/contentLocal";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import type { CourseLesson, LevelId, ShortStory } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

type Tab = "usuarios" | "contenido" | "estadisticas";
type ContentKind = "lecciones" | "historias";

type AdminUserRow = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  approved: boolean;
  progress: { level: string | null; completed: number; knowledge: number };
  detailState?: unknown;
};

type Stats = {
  totalUsers: number;
  byRole: { ADMIN: number; STUDENT: number };
  byLevel: Record<string, number>;
  withProgress: number;
  placementDone: number;
  avgKnowledge: number;
  topLessons: { id: string; completions: number }[];
  content?: { lessons: number; stories: number };
};

function emptyLessonDraft(): CourseLesson {
  return {
    id: `custom-${Date.now()}`,
    language: APP_LANGUAGE,
    level: "a1",
    title: "Nueva lección",
    situation: "Describe la situación de práctica.",
    minutes: 8,
    book: "Admin",
    unit: 1,
    grammar: "Contenido nuevo",
    steps: [
      {
        tasks: [
          {
            skill: "lectura",
            passage: "Hello. This is a new reading text.",
            translation: "Hola. Este es un texto nuevo de lectura.",
            prompt: "What is this text about?",
            options: ["A greeting", "A recipe", "A ticket", "A map"],
            answerIndex: 0,
            hint: "Look at the first word.",
          },
          {
            skill: "escritura",
            promptEs: "Escribe un saludo simple.",
            accepted: ["hello", "hi", "good morning"],
            preferred: "Hello",
            hint: "Un saludo en inglés",
            vocab: "hello = hola",
          },
          {
            skill: "habla",
            promptEs: "Di un saludo.",
            targetPhrase: "Hello",
          },
          {
            skill: "escucha",
            transcript: "Hello friends",
            sentenceParts: ["", " ", ""],
            blanks: ["Hello", "friends"],
            bank: ["Hello", "friends", "today"],
            hints: ["saludo", "amigos"],
            audioUrl: "",
          },
        ],
      },
    ],
  };
}

function emptyStoryDraft(): ShortStory {
  return {
    id: `story-custom-${Date.now()}`,
    language: APP_LANGUAGE,
    level: "a1",
    title: "New story",
    titleEs: "Nueva historia",
    minutes: 2,
    text: "Once upon a time there was a student.",
    translation: "Había una vez un estudiante.",
    moralEs: "Practica con textos cortos.",
    audioUrl: "",
  };
}

function AdminInner() {
  const { state } = useAppState();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"database" | "local">("local");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [stats, setStats] = useState<Stats | null>(null);

  const [contentKind, setContentKind] = useState<ContentKind>("lecciones");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [stories, setStories] = useState<ShortStory[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [editingStory, setEditingStory] = useState<ShortStory | null>(null);
  const [lessonJson, setLessonJson] = useState("");
  const [storyJson, setStoryJson] = useState("");
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setError("");
    const storage = await detectStorageMode();
    setMode(storage === "database" ? "database" : "local");
    if (storage === "database") {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar usuarios");
        return;
      }
      setUsers(data.users);
      return;
    }
    const local = await listLocalUsers();
    setUsers(
      local.map((user) => {
        const raw = localStorage.getItem(stateKeyFor(user.username));
        let progress = { level: null as string | null, completed: 0, knowledge: 0 };
        let detailState: unknown = null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as {
              level?: string;
              completedLessonIds?: string[];
              knowledge?: number;
            };
            detailState = parsed;
            progress = {
              level: parsed.level ?? null,
              completed: parsed.completedLessonIds?.length ?? 0,
              knowledge: parsed.knowledge ?? 0,
            };
          } catch {
            /* ignore */
          }
        }
        return {
          id: user.username,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          approved: user.approved,
          progress,
          detailState,
        };
      }),
    );
  }, []);

  const loadContent = useCallback(async () => {
    const storage = await detectStorageMode();
    if (storage === "database") {
      const [lessonsRes, storiesRes, catalogRes] = await Promise.all([
        fetch("/api/admin/content/lessons", { cache: "no-store" }),
        fetch("/api/admin/content/stories", { cache: "no-store" }),
        fetch("/api/content/catalog", { cache: "no-store" }),
      ]);
      const lessonsData = await lessonsRes.json();
      const storiesData = await storiesRes.json();
      const catalog = await catalogRes.json();
      if (lessonsRes.ok) {
        setLessons((lessonsData.items ?? []).map((item: { lesson: CourseLesson }) => item.lesson));
      }
      if (storiesRes.ok) {
        setStories((storiesData.items ?? []).map((item: { story: ShortStory }) => item.story));
      }
      if (catalogRes.ok) {
        setCatalogOverlay({
          lessons: catalog.lessons ?? [],
          stories: catalog.stories ?? [],
          deletedLessonIds: catalog.deletedLessonIds ?? [],
          deletedStoryIds: catalog.deletedStoryIds ?? [],
        });
      }
      return;
    }
    const pack = readLocalContent();
    setCatalogOverlay(pack);
    setLessons(listEffectiveLessons());
    setStories(listEffectiveStories());
  }, []);

  const loadStats = useCallback(async () => {
    const storage = await detectStorageMode();
    if (storage === "database") {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setStats(data.stats);
      return;
    }
    const local = await listLocalUsers();
    const byRole = { ADMIN: 0, STUDENT: 0 };
    const byLevel: Record<string, number> = { a1: 0, a2: 0, b1: 0, b2: 0, none: 0 };
    const lessonCompletions = new Map<string, number>();
    let knowledgeSum = 0;
    let knowledgeCount = 0;
    let placementDone = 0;
    let withProgress = 0;
    for (const user of local) {
      byRole[user.role] += 1;
      const raw = localStorage.getItem(stateKeyFor(user.username));
      if (!raw) {
        byLevel.none += 1;
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as {
          level?: string;
          knowledge?: number;
          completedLessonIds?: string[];
          placementDone?: boolean;
        };
        withProgress += 1;
        byLevel[parsed.level ?? "none"] = (byLevel[parsed.level ?? "none"] ?? 0) + 1;
        if (typeof parsed.knowledge === "number") {
          knowledgeSum += parsed.knowledge;
          knowledgeCount += 1;
        }
        if (parsed.placementDone) placementDone += 1;
        for (const id of parsed.completedLessonIds ?? []) {
          lessonCompletions.set(id, (lessonCompletions.get(id) ?? 0) + 1);
        }
      } catch {
        byLevel.none += 1;
      }
    }
    setStats({
      totalUsers: local.length,
      byRole,
      byLevel,
      withProgress,
      placementDone,
      avgKnowledge: knowledgeCount ? Math.round(knowledgeSum / knowledgeCount) : 0,
      topLessons: [...lessonCompletions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, completions]) => ({ id, completions })),
      content: { lessons: listEffectiveLessons().length, stories: listEffectiveStories().length },
    });
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadContent();
  }, [loadUsers, loadContent]);

  useEffect(() => {
    if (tab === "estadisticas") void loadStats();
  }, [tab, loadStats]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!q) return true;
      return `${user.displayName} ${user.username}`.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const pendingAdmins = users.filter((user) => user.role === "ADMIN" && !user.approved);

  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        if (levelFilter !== "all" && lesson.level !== levelFilter) return false;
        return true;
      }),
    [lessons, levelFilter],
  );

  const filteredStories = useMemo(
    () =>
      stories.filter((story) => {
        if (levelFilter !== "all" && story.level !== levelFilter) return false;
        return true;
      }),
    [stories, levelFilter],
  );

  useEffect(() => {
    if (selectedLessonId && !filteredLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId("");
      setEditingLesson(null);
    }
  }, [filteredLessons, selectedLessonId]);

  useEffect(() => {
    if (selectedStoryId && !filteredStories.some((story) => story.id === selectedStoryId)) {
      setSelectedStoryId("");
      setEditingStory(null);
    }
  }, [filteredStories, selectedStoryId]);

  async function approve(user: AdminUserRow) {
    setBusy(true);
    try {
      if (mode === "database") {
        const res = await fetch(`/api/admin/users/${user.id}/approve`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo aprobar");
          return;
        }
      } else {
        await approveLocalUser(user.username);
      }
      await loadUsers();
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(user: AdminUserRow) {
    if (!confirm(`¿Eliminar a ${user.displayName}?`)) return;
    setBusy(true);
    try {
      if (mode === "database") {
        const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo eliminar");
          return;
        }
      } else {
        const actor = getSessionUsername() ?? state?.user.username ?? "";
        const result = await deleteLocalUser(user.username, actor);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        localStorage.removeItem(stateKeyFor(user.username));
      }
      await loadUsers();
    } finally {
      setBusy(false);
    }
  }

  function openLessonEditor(lesson?: CourseLesson) {
    const draft = { ...(lesson ?? emptyLessonDraft()), language: APP_LANGUAGE };
    setSelectedLessonId(draft.id);
    setEditingLesson(draft);
    setLessonJson(JSON.stringify(draft, null, 2));
    setEditingStory(null);
    setSelectedStoryId("");
  }

  function openStoryEditor(story?: ShortStory) {
    const draft = { ...(story ?? emptyStoryDraft()), language: APP_LANGUAGE };
    setSelectedStoryId(draft.id);
    setEditingStory(draft);
    setStoryJson(JSON.stringify(draft, null, 2));
    setEditingLesson(null);
    setSelectedLessonId("");
  }

  async function saveLesson() {
    setBusy(true);
    setError("");
    try {
      const lesson = JSON.parse(lessonJson) as CourseLesson;
      if (!lesson.id || !lesson.title || !lesson.level) {
        setError("La lección necesita id, title y level.");
        return;
      }
      lesson.language = APP_LANGUAGE;
      if (mode === "database") {
        const res = await fetch("/api/admin/content/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lesson, published: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo guardar");
          return;
        }
      } else {
        setCatalogOverlay(upsertLocalLesson(lesson));
      }
      setEditingLesson(null);
      setSelectedLessonId("");
      await loadContent();
    } catch {
      setError("JSON de lección inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function saveStory() {
    setBusy(true);
    setError("");
    try {
      const story = JSON.parse(storyJson) as ShortStory;
      if (!story.id || !story.title || !story.level || !story.text) {
        setError("La historia necesita id, title, level y text.");
        return;
      }
      story.language = APP_LANGUAGE;
      if (mode === "database") {
        const res = await fetch("/api/admin/content/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story, published: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo guardar");
          return;
        }
      } else {
        setCatalogOverlay(upsertLocalStory(story));
      }
      setEditingStory(null);
      setSelectedStoryId("");
      await loadContent();
    } catch {
      setError("JSON de historia inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLesson(lesson: CourseLesson) {
    if (!confirm(`¿Eliminar la lección «${lesson.title}»?`)) return;
    setBusy(true);
    try {
      if (mode === "database") {
        const res = await fetch(`/api/admin/content/lessons/${lesson.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo eliminar");
          return;
        }
      } else {
        const isBuiltin = courseLessons.some((item) => item.id === lesson.id);
        setCatalogOverlay(deleteLocalLesson(lesson.id, isBuiltin));
      }
      setEditingLesson(null);
      setSelectedLessonId("");
      await loadContent();
    } finally {
      setBusy(false);
    }
  }

  async function removeStory(story: ShortStory) {
    if (!confirm(`¿Eliminar la historia «${story.title}»?`)) return;
    setBusy(true);
    try {
      if (mode === "database") {
        const res = await fetch(`/api/admin/content/stories/${story.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo eliminar");
          return;
        }
      } else {
        const isBuiltin = builtinStories.some((item) => item.id === story.id);
        setCatalogOverlay(deleteLocalStory(story.id, isBuiltin));
      }
      setEditingStory(null);
      setSelectedStoryId("");
      await loadContent();
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  return (
    <div className="min-h-screen">
      <Header showSearch={false} />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Administración</p>
        <h1 className="font-display mt-2 text-4xl tracking-tight">Panel general</h1>
        <p className="mt-2 text-muted">
          Administra usuarios y el contenido de inglés (lecciones, ejercicios, textos/audios) y
          consulta estadísticas. Modo: {mode === "database" ? "nube" : "local"}.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["usuarios", "Usuarios"],
              ["contenido", "Contenido"],
              ["estadisticas", "Estadísticas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === id ? "bg-forest text-white" : "border border-line bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-orange">{error}</p>}

        {tab === "usuarios" && (
          <section className="mt-8">
            {pendingAdmins.length > 0 && (
              <div className="mb-6 rounded-[24px] border border-[#f0d2b0] bg-[#fff8f0] p-5">
                <h2 className="font-semibold">Pendientes de aprobación ({pendingAdmins.length})</h2>
                <ul className="mt-3 space-y-2">
                  {pendingAdmins.map((user) => (
                    <li key={user.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {user.displayName} <span className="text-muted">@{user.username}</span>
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void approve(user)}
                        className="rounded-full bg-[#e8f4ff] px-3 py-1 text-xs font-semibold text-[#1d5f99]"
                      >
                        Aprobar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar usuario…"
                className="min-w-[220px] flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-lime"
              />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm"
              >
                <option value="all">Todos los roles</option>
                <option value="STUDENT">Estudiantes</option>
                <option value="ADMIN">Administradores</option>
              </select>
            </div>

            <ul className="mt-5 space-y-3">
              {filteredUsers.map((user) => (
                <li key={user.id} className="rounded-[24px] border border-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {user.displayName}{" "}
                        <span className="text-sm font-normal text-muted">@{user.username}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {ROLE_LABEL[user.role]} · {user.approved ? "Activo" : "Pendiente"} · nivel{" "}
                        {user.progress.level ?? "—"} · {user.progress.completed} uds ·{" "}
                        {user.progress.knowledge}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(user)}
                        className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
                      >
                        Ver
                      </button>
                      {!user.approved && user.role === "ADMIN" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void approve(user)}
                          className="rounded-full bg-[#e8f4ff] px-3 py-1 text-xs font-semibold text-[#1d5f99]"
                        >
                          Aprobar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeUser(user)}
                        className="rounded-full bg-[#f8e2c8] px-3 py-1 text-xs font-semibold"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {selected && (
              <section className="mt-6 rounded-[28px] border border-line bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">Detalle · {selected.displayName}</h2>
                  <button type="button" className="text-sm text-muted" onClick={() => setSelected(null)}>
                    Cerrar
                  </button>
                </div>
                <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-bg p-4 text-xs">
                  {JSON.stringify(selected.detailState ?? selected.progress, null, 2)}
                </pre>
              </section>
            )}
          </section>
        )}

        {tab === "contenido" && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setContentKind("lecciones");
                  setEditingStory(null);
                  setSelectedStoryId("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  contentKind === "lecciones" ? "bg-forest text-white" : "border border-line"
                }`}
              >
                Lecciones y ejercicios
              </button>
              <button
                type="button"
                onClick={() => {
                  setContentKind("historias");
                  setEditingLesson(null);
                  setSelectedLessonId("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  contentKind === "historias" ? "bg-forest text-white" : "border border-line"
                }`}
              >
                Textos / historias / audio
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm"
              >
                <option value="all">Todos los niveles</option>
                {(["a1", "a2", "b1", "b2"] as LevelId[]).map((level) => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  contentKind === "lecciones" ? openLessonEditor() : openStoryEditor()
                }
                className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
              >
                {contentKind === "lecciones" ? "Crear lección" : "Agregar texto/audio"}
              </button>
            </div>

            <p className="mt-3 text-sm text-muted">
              Contenido solo de inglés. Filtra por nivel y elige un ítem en la lista para editarlo.
              En escucha/historias puedes poner <code className="rounded bg-bg px-1">audioUrl</code>{" "}
              o dejar vacío para usar síntesis de voz.
            </p>

            {contentKind === "lecciones" ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <select
                  value={selectedLessonId}
                  onChange={(event) => {
                    const id = event.target.value;
                    if (!id) {
                      setSelectedLessonId("");
                      setEditingLesson(null);
                      return;
                    }
                    const lesson = filteredLessons.find((item) => item.id === id);
                    if (lesson) openLessonEditor(lesson);
                  }}
                  className="min-w-[280px] flex-1 rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-lime"
                >
                  <option value="">Selecciona una lección… ({filteredLessons.length})</option>
                  {filteredLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.level.toUpperCase()} · {lesson.title} ({lesson.id})
                    </option>
                  ))}
                </select>
                {editingLesson && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeLesson(editingLesson)}
                    className="rounded-full bg-[#f8e2c8] px-4 py-2 text-sm font-semibold"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <select
                  value={selectedStoryId}
                  onChange={(event) => {
                    const id = event.target.value;
                    if (!id) {
                      setSelectedStoryId("");
                      setEditingStory(null);
                      return;
                    }
                    const story = filteredStories.find((item) => item.id === id);
                    if (story) openStoryEditor(story);
                  }}
                  className="min-w-[280px] flex-1 rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-lime"
                >
                  <option value="">Selecciona un texto… ({filteredStories.length})</option>
                  {filteredStories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.level.toUpperCase()} · {story.title} ({story.id})
                    </option>
                  ))}
                </select>
                {editingStory && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeStory(editingStory)}
                    className="rounded-full bg-[#f8e2c8] px-4 py-2 text-sm font-semibold"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}

            {contentKind === "lecciones" && editingLesson && (
              <section className="mt-6 rounded-[28px] border border-line bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Editar lección / ejercicios</h2>
                    <p className="mt-1 text-sm text-muted">
                      {editingLesson.level.toUpperCase()} · {editingLesson.title} · inglés
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted"
                    onClick={() => {
                      setEditingLesson(null);
                      setSelectedLessonId("");
                    }}
                  >
                    Cerrar
                  </button>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Incluye textos de lectura, audios (`audioUrl` en tareas de escucha), prompts y
                  opciones. Campos clave: level, steps[].tasks[].
                </p>
                <textarea
                  value={lessonJson}
                  onChange={(event) => setLessonJson(event.target.value)}
                  className="mt-4 h-96 w-full rounded-2xl border border-line bg-bg p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-lime"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveLesson()}
                  className="mt-4 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Guardar lección
                </button>
              </section>
            )}

            {contentKind === "historias" && editingStory && (
              <section className="mt-6 rounded-[28px] border border-line bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Editar texto / audio</h2>
                    <p className="mt-1 text-sm text-muted">
                      {editingStory.level.toUpperCase()} · {editingStory.title} · inglés
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted"
                    onClick={() => {
                      setEditingStory(null);
                      setSelectedStoryId("");
                    }}
                  >
                    Cerrar
                  </button>
                </div>
                <textarea
                  value={storyJson}
                  onChange={(event) => setStoryJson(event.target.value)}
                  className="mt-4 h-80 w-full rounded-2xl border border-line bg-bg p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-lime"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveStory()}
                  className="mt-4 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Guardar texto
                </button>
              </section>
            )}
          </section>
        )}

        {tab === "estadisticas" && (
          <section className="mt-8">
            {!stats ? (
              <p className="text-muted">Cargando estadísticas…</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Usuarios" value={String(stats.totalUsers)} />
                <StatCard label="Estudiantes" value={String(stats.byRole.STUDENT ?? 0)} />
                <StatCard label="Administradores" value={String(stats.byRole.ADMIN ?? 0)} />
                <StatCard label="Con progreso" value={String(stats.withProgress)} />
                <StatCard label="Evaluación hecha" value={String(stats.placementDone)} />
                <StatCard label="Precisión media" value={`${stats.avgKnowledge}%`} />
                <StatCard label="Lecciones CMS" value={String(stats.content?.lessons ?? lessons.length)} />
                <StatCard label="Historias CMS" value={String(stats.content?.stories ?? stories.length)} />
                <div className="rounded-[24px] border border-line bg-white p-5 sm:col-span-2 lg:col-span-3">
                  <p className="text-sm font-semibold">Distribución por nivel</p>
                  <p className="mt-2 text-sm text-muted">
                    A1 {stats.byLevel.a1 ?? 0} · A2 {stats.byLevel.a2 ?? 0} · B1 {stats.byLevel.b1 ?? 0} ·
                    B2 {stats.byLevel.b2 ?? 0} · Sin nivel {stats.byLevel.none ?? 0}
                  </p>
                  <p className="mt-4 text-sm font-semibold">Lecciones más completadas</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {stats.topLessons.length === 0 && <li>Aún no hay datos.</li>}
                    {stats.topLessons.map((item) => (
                      <li key={item.id}>
                        {item.id} · {item.completions}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGate requirePlacement={false} roles={["ADMIN"]}>
      <AdminInner />
    </AuthGate>
  );
}
