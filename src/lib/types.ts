export type Skill = "lectura" | "escucha" | "escritura" | "habla";

export type LevelId = "a1" | "a2" | "b1" | "b2";

export type UserRole = "ADMIN" | "STUDENT";

export type UserProfile = {
  username: string;
  name: string;
  email: string;
  initials: string;
  role?: UserRole;
  approved?: boolean;
};

export type SkillStat = {
  correct: number;
  total: number;
};

export type ActivityRecord = {
  id: string;
  at: string;
  lessonId: string;
  lessonTitle: string;
  level: LevelId;
  skill: Skill;
  correct: boolean;
  prompt: string;
  answer: string;
  expected: string;
  feedback: string;
};

export type AppState = {
  user: UserProfile;
  level: LevelId;
  xp: number;
  completedLessonIds: string[];
  skillScores: Record<Skill, number>;
  skillStats: Record<Skill, SkillStat>;
  lastLessonId: string | null;
  knowledge: number;
  answersCorrect: number;
  answersTotal: number;
  unlockedLevels: LevelId[];
  bandStats: Record<LevelId, SkillStat>;
  checkpointScores: Partial<Record<LevelId, number>>;
  examScore: number | null;
  examPassed: boolean;
  history: ActivityRecord[];
  /** RF-04: true when the user finished or skipped the placement test. */
  placementDone: boolean;
  placementSkipped: boolean;
  placementLevel: LevelId | null;
  placementScore: number | null;
};

export type ReadingTask = {
  skill: "lectura";
  passage: string;
  translation: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  hint: string;
  /** Optional short-story framing for richer reading practice. */
  storyTitle?: string;
};

export type WritingTask = {
  skill: "escritura";
  promptEs: string;
  accepted: string[];
  preferred: string;
  hint: string;
  vocab: string;
};

export type SpeakingTask = {
  skill: "habla";
  promptEs: string;
  targetPhrase: string;
};

export type ListeningTask = {
  skill: "escucha";
  transcript: string;
  sentenceParts: string[];
  blanks: string[];
  bank: string[];
  hints: string[];
  /** Optional uploaded/hosted audio; TTS is used when missing. */
  audioUrl?: string;
};

export type Task = ReadingTask | WritingTask | SpeakingTask | ListeningTask;

export type LessonStep = {
  tasks: Task[];
};

export type CourseLesson = {
  id: string;
  level: LevelId;
  title: string;
  situation: string;
  minutes: number;
  steps: LessonStep[];
  book: string;
  unit: number;
  grammar: string;
  /** Always English in LinguaLab. */
  language?: "en";
};

export type ShortStory = {
  id: string;
  level: LevelId;
  title: string;
  titleEs: string;
  minutes: number;
  text: string;
  translation: string;
  moralEs: string;
  language?: "en";
  /** Optional audio for the story text. */
  audioUrl?: string;
};
