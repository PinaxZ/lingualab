"use client";

type SpeechAlternative = { transcript: string };
type SpeechResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternative;
};
type SpeechResultEvent = { results: ArrayLike<SpeechResult> };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type ListenHandle = {
  stop: () => void;
};

const ERRORS: Record<string, string> = {
  "not-allowed":
    "El navegador bloqueó el micrófono. Permite el acceso en la barra de dirección y vuelve a intentar.",
  "service-not-allowed":
    "Este navegador no permite reconocimiento de voz. Ábrelo en Chrome o Edge.",
  "audio-capture": "No encontré un micrófono. Revisa que esté conectado y habilitado.",
  network:
    "No pude conectar el reconocimiento de voz. Chrome necesita internet para escucharte.",
  "no-speech": "No escuché tu voz. Habla más cerca del micrófono e inténtalo de nuevo.",
  aborted: "",
};

function recognitionCtor() {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canUseSpeechRecognition() {
  return typeof window !== "undefined" && Boolean(recognitionCtor());
}

export function speak(text: string, rate = 1) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export async function ensureMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Este navegador no puede usar el micrófono.";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch {
    return "Permite el micrófono para practicar la pronunciación.";
  }
}

export function startListening(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (message: string) => void,
  onEnd?: () => void,
): ListenHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
  let stoppedByUser = false;

  recognition.onresult = (event) => {
    let finalText = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) finalText += `${transcript} `;
      else interim += transcript;
    }
    const text = `${finalText}${interim}`.replace(/\s+/g, " ").trim();
    if (text) onTranscript(text, interim.length === 0 && finalText.trim().length > 0);
  };

  recognition.onerror = (event) => {
    const message = ERRORS[event.error] ?? "No pude grabar tu voz. Inténtalo otra vez.";
    if (message) onError?.(message);
  };

  recognition.onend = () => {
    if (!stoppedByUser) onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    onError?.("No pude iniciar el micrófono. Inténtalo otra vez.");
    return null;
  }

  return {
    stop: () => {
      stoppedByUser = true;
      recognition.stop();
    },
  };
}
