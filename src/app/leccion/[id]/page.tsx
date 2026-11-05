"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { getCourseLesson } from "@/data/lessons";

function LessonRoute() {
  const params = useParams<{ id: string }>();
  const lesson = getCourseLesson(params.id);
  if (!lesson) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <p>Lección no encontrada.</p>
          <Link href="/inicio" className="mt-4 inline-block text-sm text-[#1d5f99]">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }
  return <LessonPlayer lesson={lesson} />;
}

export default function LessonPage() {
  return (
    <AuthGate>
      <LessonRoute />
    </AuthGate>
  );
}
