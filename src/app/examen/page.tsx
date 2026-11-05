"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGate } from "@/components/AuthGate";
import { LEVEL_ORDER, canTakeCheckpoint } from "@/lib/progress";
import { useAppState } from "@/lib/useAppState";

function ExamRedirectInner() {
  const router = useRouter();
  const { state } = useAppState();

  useEffect(() => {
    if (!state) return;
    const open = LEVEL_ORDER.find((level) => canTakeCheckpoint(state, level));
    router.replace(open ? `/checkpoint/${open}` : "/nivel");
  }, [router, state]);

  return <p className="p-10 text-muted">Abriendo tu control de nivel...</p>;
}

export default function ExamRedirect() {
  return (
    <AuthGate>
      <ExamRedirectInner />
    </AuthGate>
  );
}
