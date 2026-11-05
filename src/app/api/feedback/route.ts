import { NextResponse } from "next/server";

export type FeedbackRequest = {
  skill: string;
  prompt: string;
  answer: string;
  expected: string;
  correct: boolean;
  localFeedback?: string;
  level?: string;
};

function localCoach(body: FeedbackRequest) {
  const lines: string[] = [];
  if (body.correct) {
    lines.push("Buen trabajo: tu respuesta cubre la idea pedida.");
    lines.push("Sigue practicando la misma estructura en otra unidad para fijarla.");
  } else {
    lines.push("Vamos a corregir el error sin revelar la respuesta.");
    if (body.prompt) lines.push(`Recuerda la consigna: ${body.prompt}`);
    if (body.answer) lines.push(`Tu intento fue: «${body.answer}».`);
    lines.push(
      "Consejo: revisa tiempo verbal, orden sujeto–verbo–complemento y si tu frase expresa toda la idea pedida.",
    );
    if (body.localFeedback) lines.push(body.localFeedback);
  }
  return lines.join(" ");
}

export async function POST(request: Request) {
  let body: FeedbackRequest;
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json({
      source: "local",
      feedback: localCoach(body),
      note: "Sin OPENAI_API_KEY: se usó el coach local. Añade la clave en .env.local para IA.",
    });
  }

  const system = `Eres un tutor de inglés amable para estudiantes hispanohablantes (CEFR A1–B2).
Responde en español, máximo 90 palabras. Explica el error o acierto y da 1 tip concreto.
Si la respuesta es incorrecta, NO reveles la solución completa ni copies la respuesta esperada; guía con pistas.
No inventes reglas falsas. No uses markdown.`;

  const user = JSON.stringify({
    skill: body.skill,
    level: body.level ?? "a1",
    prompt: body.prompt,
    learnerAnswer: body.answer,
    expected: body.expected,
    wasCorrect: body.correct,
    systemHint: body.localFeedback ?? "",
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({
        source: "local",
        feedback: localCoach(body),
        note: `La API de IA falló (${response.status}). Se usó el coach local.`,
        detail: errText.slice(0, 200),
      });
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const feedback = data.choices?.[0]?.message?.content?.trim() || localCoach(body);
    return NextResponse.json({ source: "ai", feedback });
  } catch {
    return NextResponse.json({
      source: "local",
      feedback: localCoach(body),
      note: "No se pudo contactar al modelo. Se usó el coach local.",
    });
  }
}
