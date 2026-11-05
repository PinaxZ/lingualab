export type AiFeedbackPayload = {
  skill: string;
  prompt: string;
  answer: string;
  expected: string;
  correct: boolean;
  localFeedback?: string;
  level?: string;
};

export type AiFeedbackResult = {
  source: "ai" | "local";
  feedback: string;
  note?: string;
};

export async function requestAiFeedback(payload: AiFeedbackPayload): Promise<AiFeedbackResult> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return {
      source: "local",
      feedback: payload.localFeedback || "No se pudo obtener feedback adicional.",
      note: "Error de red o del servidor.",
    };
  }
  return (await response.json()) as AiFeedbackResult;
}
