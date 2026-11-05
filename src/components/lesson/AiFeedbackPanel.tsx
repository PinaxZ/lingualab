"use client";

import { useEffect, useState } from "react";
import { requestAiFeedback, type AiFeedbackPayload } from "@/lib/aiFeedback";

export function AiFeedbackPanel({
  payload,
  active,
}: {
  payload: AiFeedbackPayload | null;
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState<"ai" | "local" | null>(null);
  const [note, setNote] = useState<string | undefined>();

  useEffect(() => {
    if (!active || !payload) {
      setText("");
      setSource(null);
      setNote(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setText("");
    setNote(undefined);

    requestAiFeedback(payload)
      .then((result) => {
        if (cancelled) return;
        setText(result.feedback);
        setSource(result.source);
        setNote(result.note);
      })
      .catch(() => {
        if (cancelled) return;
        setText(payload.localFeedback || "No se pudo cargar el feedback de IA.");
        setSource("local");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, payload]);

  if (!active || !payload) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#cfe3f7] bg-[#f4f9ff] px-4 py-3 text-sm text-[#1d5f99]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
        Feedback IA {source === "ai" ? "· modelo" : source === "local" ? "· coach local" : ""}
      </p>
      {loading ? (
        <p className="mt-2 text-muted">Analizando tu respuesta…</p>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap">{text}</p>
          {note && <p className="mt-2 text-xs text-muted">{note}</p>}
        </>
      )}
    </div>
  );
}
