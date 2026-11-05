"use client";

import { useEffect, useState } from "react";

export function AboutButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Acerca de"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-[#1d5f99]"
      >
        i
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Acerca de"
            className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-lg">Lecciones de Evolve 1 a 4.</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 rounded-full bg-[#2b8de6] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
