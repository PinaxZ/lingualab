"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AboutButton } from "@/components/AboutButton";
import { Logo } from "@/components/Logo";
import { listEffectiveLessons, subscribeCatalog } from "@/lib/catalog";
import { LEVEL_META, lessonPath } from "@/lib/progress";
import { clearState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";

export function Header({
  showSearch = true,
}: {
  showSearch?: boolean;
}) {
  const { state } = useAppState();
  const [query, setQuery] = useState("");
  const [openUser, setOpenUser] = useState(false);
  const [catalogTick, setCatalogTick] = useState(0);

  useEffect(() => subscribeCatalog(() => setCatalogTick((value) => value + 1)), []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return listEffectiveLessons().filter((lesson) =>
      `${lesson.title} ${lesson.situation} ${lesson.level}`.toLowerCase().includes(q),
    );
  }, [query, catalogTick]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/inicio" className="shrink-0">
          <Logo />
        </Link>

        {showSearch && (
          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una lección..."
              className="w-full rounded-full border border-line bg-white py-2.5 pl-11 pr-4 text-sm outline-none ring-lime/40 placeholder:text-muted focus:ring-2"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              ⌕
            </span>
            {query && (
              <div className="absolute mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
                {matches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">Sin resultados</p>
                ) : (
                  matches.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={lessonPath(lesson.id)}
                      onClick={() => setQuery("")}
                      className="block px-4 py-3 text-sm hover:bg-lime/20"
                    >
                      <span className="text-muted">{LEVEL_META[lesson.level].title}</span>
                      <span className="mx-2 text-line">·</span>
                      {lesson.title}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <AboutButton />
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted md:flex"
            aria-label="Notificaciones"
          >
            ○
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenUser((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3d5c8] text-xs font-semibold">
                {state?.user.initials ?? "LM"}
              </span>
              <span className="hidden text-sm font-medium sm:block">
                {state?.user.name ?? "Lucía M."}
              </span>
              <span className="text-muted">▾</span>
            </button>
            {openUser && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
                <Link
                  href="/inicio"
                  className="block px-4 py-2.5 text-sm hover:bg-lime/20"
                  onClick={() => setOpenUser(false)}
                >
                  Inicio
                </Link>
                {state?.user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2.5 text-sm hover:bg-lime/20"
                    onClick={() => setOpenUser(false)}
                  >
                    Administración
                  </Link>
                )}
                <Link
                  href="/historial"
                  className="block px-4 py-2.5 text-sm hover:bg-lime/20"
                  onClick={() => setOpenUser(false)}
                >
                  Historial
                </Link>
                <Link
                  href="/historias"
                  className="block px-4 py-2.5 text-sm hover:bg-lime/20"
                  onClick={() => setOpenUser(false)}
                >
                  Historias
                </Link>
                <Link
                  href="/habilidades"
                  className="block px-4 py-2.5 text-sm hover:bg-lime/20"
                  onClick={() => setOpenUser(false)}
                >
                  Unidades
                </Link>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-lime/20"
                  onClick={async () => {
                    await clearState();
                    window.location.href = "/";
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
          <Link
            href="/inicio"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted md:flex"
            aria-label="Menú"
          >
            ▦
          </Link>
        </div>
      </div>
    </header>
  );
}
