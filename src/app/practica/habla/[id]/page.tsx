"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacySpeakingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/leccion/a1-u1");
  }, [router]);
  return <p className="p-10 text-muted">Abriendo la lección...</p>;
}
