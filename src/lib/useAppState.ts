"use client";

import { useEffect, useState } from "react";
import { hydrateFromServer, loadState } from "@/lib/storage";
import type { AppState } from "@/lib/types";

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const syncLocal = () => {
      if (!alive) return;
      setState(loadState());
    };

    (async () => {
      const remote = await hydrateFromServer();
      if (!alive) return;
      setState(remote);
      setReady(true);
    })();

    window.addEventListener("storage", syncLocal);
    window.addEventListener("lingualab-state", syncLocal);
    return () => {
      alive = false;
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener("lingualab-state", syncLocal);
    };
  }, []);

  return { state, ready };
}
