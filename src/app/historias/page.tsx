"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { listEffectiveStories, subscribeCatalog } from "@/lib/catalog";
import { LEVEL_META } from "@/lib/progress";
import { speak } from "@/lib/speech";
import type { LevelId } from "@/lib/types";

function HistoriasInner() {
  const [level, setLevel] = useState<LevelId | "all">("all");
  const [tick, setTick] = useState(0);
  const shortStories = listEffectiveStories();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showEs, setShowEs] = useState(false);

  useEffect(() => subscribeCatalog(() => setTick((value) => value + 1)), []);
  useEffect(() => {
    if (!openId && shortStories[0]) setOpenId(shortStories[0].id);
  }, [shortStories, openId, tick]);

  const stories = useMemo(
    () => (level === "all" ? shortStories : shortStories.filter((story) => story.level === level)),
    [level, shortStories, tick],
  );
  const active = stories.find((story) => story.id === openId) ?? stories[0] ?? null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Lectura</p>
        <h1 className="font-display mt-2 text-4xl tracking-tight">Historias cortas</h1>
        <p className="mt-2 text-muted">
          Lee mini relatos por nivel. También aparecen dentro de los ejercicios de lectura.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLevel("all")}
            className={`rounded-full px-4 py-2 text-sm ${level === "all" ? "bg-forest text-white" : "border border-line"}`}
          >
            Todas
          </button>
          {(["a1", "a2", "b1", "b2"] as LevelId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLevel(id)}
              className={`rounded-full px-4 py-2 text-sm ${level === id ? "bg-forest text-white" : "border border-line"}`}
            >
              {LEVEL_META[id].range}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
          <ul className="space-y-2">
            {stories.map((story) => (
              <li key={story.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(story.id);
                    setShowEs(false);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                    active?.id === story.id ? "border-forest bg-lime/20" : "border-line bg-white"
                  }`}
                >
                  <p className="font-semibold">{story.title}</p>
                  <p className="text-xs text-muted">
                    {LEVEL_META[story.level].range} · {story.minutes} min
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {active && (
            <article className="rounded-[28px] border border-line bg-white p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {LEVEL_META[active.level].range} · {active.titleEs}
              </p>
              <h2 className="font-display mt-2 text-3xl tracking-tight">{active.title}</h2>
              <p className="mt-5 whitespace-pre-line text-lg leading-8">{active.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowEs((value) => !value)}
                  className="rounded-full border border-line px-4 py-2 text-sm"
                >
                  {showEs ? "Ocultar traducción" : "Ver traducción"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (active.audioUrl) {
                      const audio = new Audio(active.audioUrl);
                      void audio.play();
                      return;
                    }
                    speak(active.text);
                  }}
                  className="rounded-full border border-line px-4 py-2 text-sm"
                >
                  Escuchar
                </button>
              </div>
              {showEs && (
                <p className="mt-4 whitespace-pre-line rounded-2xl bg-bg p-4 text-sm text-muted">
                  {active.translation}
                </p>
              )}
              <p className="mt-6 text-sm text-muted">Idea clave: {active.moralEs}</p>
            </article>
          )}
        </div>
      </main>
    </div>
  );
}

export default function HistoriasPage() {
  return (
    <AuthGate requirePlacement={false}>
      <HistoriasInner />
    </AuthGate>
  );
}
