"use client";

import { useEffect } from "react";
import { apiGetCatalog, detectStorageMode } from "@/lib/cloud";
import { setCatalogOverlay } from "@/lib/catalog";
import { readLocalContent } from "@/lib/contentLocal";

/** Loads CMS overlays so student pages see admin-edited lessons/stories. */
export function CatalogBoot() {
  useEffect(() => {
    let alive = true;
    (async () => {
      const mode = await detectStorageMode();
      if (!alive) return;
      if (mode === "database") {
        const data = await apiGetCatalog();
        if (!alive) return;
        setCatalogOverlay({
          lessons: data.lessons ?? [],
          stories: data.stories ?? [],
          deletedLessonIds: data.deletedLessonIds ?? [],
          deletedStoryIds: data.deletedStoryIds ?? [],
        });
        return;
      }
      setCatalogOverlay(readLocalContent());
    })();
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
