import { unitsA1 } from "@/data/unitsA1";
import { unitsA2 } from "@/data/unitsA2";
import { unitsB1 } from "@/data/unitsB1";
import { unitsB2 } from "@/data/unitsB2";

export const courseLessons = [...unitsA1, ...unitsA2, ...unitsB1, ...unitsB2];

export function getCourseLesson(id: string) {
  return courseLessons.find((lesson) => lesson.id === id);
}
