import { normalizeAnswer, spokenWords } from "@/lib/storage";

function wordCountHint(expected: string, given: string) {
  const want = spokenWords(expected).length;
  const got = spokenWords(given).length;
  if (got === 0) return "Empieza con una frase completa.";
  if (got < want) return "Tu respuesta se siente corta: quizá falte alguna palabra o detalle.";
  if (got > want) return "Tu respuesta se siente larga: revisa si sobra alguna palabra.";
  return "La longitud está bien; revisa el orden y la forma de las palabras.";
}

/** RF-10 / RF-13: feedback de escritura sin revelar la respuesta. */
export function writingFeedback(input: string, accepted: string[], preferred: string, hint: string) {
  const normalized = normalizeAnswer(input);
  if (!normalized) {
    return {
      correct: false,
      summary: "Escribe una respuesta antes de comprobar.",
      detail: "Necesitas una frase completa en inglés para evaluar la idea.",
    };
  }

  if (accepted.includes(normalized)) {
    return {
      correct: true,
      summary: "Correcto. La oración comunica la idea esperada.",
      detail: "Buen uso del vocabulario y la estructura pedida.",
    };
  }

  const expectedWords = spokenWords(preferred);
  const givenWords = spokenWords(input);
  const expectedSet = new Set(expectedWords);
  const givenSet = new Set(givenWords);
  const missingCount = expectedWords.filter((word) => !givenSet.has(word)).length;
  const extraCount = givenWords.filter((word) => !expectedSet.has(word)).length;

  const parts = [`Pista: ${hint}`];
  parts.push(wordCountHint(preferred, input));
  if (missingCount > 0) {
    parts.push(
      missingCount === 1
        ? "Falta al menos una idea clave."
        : `Faltan varias ideas clave (${missingCount}).`,
    );
  }
  if (extraCount > 0) {
    parts.push("Hay palabras que no encajan con lo pedido; prueba otra combinación.");
  }
  parts.push("Relee la consigna y el vocabulario, luego reformula sin copiar un modelo.");

  return {
    correct: false,
    summary: "Todavía no es la idea completa.",
    detail: parts.join(" "),
  };
}

export function readingFeedback(correct: boolean, hint: string, _correctOption: string) {
  if (correct) {
    return {
      summary: "Correcto. Comprendiste la idea del texto.",
      detail: "Puedes seguir con la siguiente actividad.",
    };
  }
  return {
    summary: "Esa opción no responde la pregunta.",
    detail: `Vuelve al texto y busca la pista: ${hint}. Descarta lo que el pasaje no menciona.`,
  };
}

export function listeningFeedback(
  correct: boolean,
  hints: string[],
  blanks: string[],
  fills: (string | null)[],
) {
  if (correct) {
    return {
      summary: "Correcto. Identificaste las palabras escuchadas.",
      detail: "La escucha y el vocabulario coinciden.",
    };
  }

  const wrongIndexes = blanks
    .map((blank, index) => (fills[index] === blank ? -1 : index))
    .filter((index) => index >= 0);

  const parts: string[] = [];
  if (wrongIndexes.length === 1) {
    parts.push(`Revisa el hueco ${wrongIndexes[0] + 1}.`);
  } else if (wrongIndexes.length > 1) {
    parts.push(`Revisa los huecos ${wrongIndexes.map((i) => i + 1).join(", ")}.`);
  }
  for (const index of wrongIndexes.slice(0, 2)) {
    const hint = hints[index] ?? hints[0];
    if (hint) parts.push(`Hueco ${index + 1}: ${hint}`);
  }
  parts.push("Vuelve a escuchar el audio y elige otra palabra del banco.");

  return {
    summary: "Hay huecos por corregir.",
    detail: parts.join(" "),
  };
}

export function speakingFeedback(passed: boolean, score: number, missing: string[]) {
  if (passed) {
    return {
      summary: `Coincidiste (${score}%).`,
      detail: "Tu pronunciación cubrió las palabras clave de la frase.",
    };
  }

  const parts = [
    `Aún no alcanza el 75% (obtuviste ${score}%).`,
    missing.length > 0
      ? `Se detectaron ${missing.length} palabra${missing.length === 1 ? "" : "s"} clave${missing.length === 1 ? "" : "s"} incompleta${missing.length === 1 ? "" : "s"}.`
      : "Intenta decir la frase completa con más claridad.",
    "Habla un poco más despacio y mira la frase modelo en pantalla.",
    "Si no puedes usar el micrófono, cambia a lectura o escritura.",
  ];

  return {
    summary: "Sigue practicando la frase.",
    detail: parts.join(" "),
  };
}
