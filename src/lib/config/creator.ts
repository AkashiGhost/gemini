export const CREATOR_INTERVIEW_MODEL = "gemini-2.5-flash";
export const CREATOR_IMAGE_MODEL = "imagen-4.0-generate-001";
export const CREATOR_TRACE_HEADER = "x-trace-id";

export const CREATOR_IMAGE_RATE_LIMIT = {
  minIntervalMs: 3_000,
  windowMs: 60 * 1000,
  maxRequests: 20,
} as const;

export const CREATOR_ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;
export type CreatorAspectRatio = (typeof CREATOR_ASPECT_RATIOS)[number];

export interface CreatorSpec {
  title: string;
  audience: string;
  theme: string;
  mood: string;
  visualStyle: string;
  keyElements: string[];
  aspectRatio: CreatorAspectRatio;
  imagePrompt: string;
  notes: string;
}

export interface CreatorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CreatorInterviewRequestBody {
  sessionId?: string;
  messages?: unknown;
  currentSpec?: unknown;
}

export interface CreatorImageRequestBody {
  sessionId?: string;
  prompt?: unknown;
  spec?: unknown;
}

export interface CreatorStoryPackRequestBody {
  sessionId?: string;
  spec?: unknown;
  draftText?: unknown;
}

export interface CreatorStoryPackPhase {
  phase: string;
  goal: string;
  tone: string;
}

export interface CreatorStoryPackSoundCue {
  id: string;
  moment: string;
  reason: string;
}

export interface CreatorStoryPack {
  title: string;
  logline: string;
  playerRole: string;
  openingLine: string;
  phaseOutline: CreatorStoryPackPhase[];
  soundPlan: CreatorStoryPackSoundCue[];
  systemPromptDraft: string;
}

export type CreatorStoryPackQualityStatus = "pass" | "warn" | "fail";

export interface CreatorStoryPackQualityCheck {
  id: "structure" | "escalation" | "sensory-detail" | "uniqueness" | "sound-coverage" | "slop-detection";
  status: CreatorStoryPackQualityStatus;
  score: number;
  summary: string;
}

export interface CreatorStoryPackQuality {
  version: "rule-based-v1";
  score: number;
  verdict: CreatorStoryPackQualityStatus;
  checks: CreatorStoryPackQualityCheck[];
  improvementHints: string[];
}

export interface CreatorStoryPackResponseBody {
  storyPack: CreatorStoryPack;
  quality: CreatorStoryPackQuality;
}

export const CREATOR_STORY_PACK_LIMITS = {
  title: 160,
  logline: 420,
  playerRole: 220,
  openingLine: 240,
  phaseLabel: 60,
  phaseGoal: 260,
  phaseTone: 120,
  cueId: 50,
  cueMoment: 140,
  cueReason: 220,
  systemPromptDraft: 3200,
  draftText: 2400,
} as const;

export type CreatorInterviewChunk =
  | { type: "message"; message: string }
  | { type: "spec_update"; specUpdate: Partial<CreatorSpec> }
  | { type: "image_prompt"; prompt: string }
  | { type: "complete"; complete: true }
  | { type: "error"; error: string };

export const EMPTY_CREATOR_SPEC: CreatorSpec = {
  title: "",
  audience: "",
  theme: "",
  mood: "",
  visualStyle: "",
  keyElements: [],
  aspectRatio: "1:1",
  imagePrompt: "",
  notes: "",
};

export const DEFAULT_CREATOR_STORY_PHASES: CreatorStoryPackPhase[] = [
  {
    phase: "Phase 1 - Hook",
    goal: "Introduce the world and establish the immediate conflict.",
    tone: "Curious with underlying unease.",
  },
  {
    phase: "Phase 2 - Escalation",
    goal: "Raise stakes through friction, uncertainty, and emerging threats.",
    tone: "Tense and atmospheric.",
  },
  {
    phase: "Phase 3 - Discovery",
    goal: "Reveal hidden truths and force a difficult choice.",
    tone: "Mysterious and introspective.",
  },
  {
    phase: "Phase 4 - Reckoning",
    goal: "Confront the central antagonist, fear, or systemic pressure.",
    tone: "Urgent and emotionally charged.",
  },
  {
    phase: "Phase 5 - Resolution",
    goal: "Deliver consequence, closure, and a resonant final beat.",
    tone: "Bittersweet but hopeful.",
  },
];

export const DEFAULT_CREATOR_SOUND_PLAN: CreatorStoryPackSoundCue[] = [
  {
    id: "cue-opening",
    moment: "Opening scene reveal",
    reason: "Establish mood quickly and immerse the player in the setting.",
  },
  {
    id: "cue-pressure",
    moment: "First major setback",
    reason: "Signal rising stakes and emotional pressure.",
  },
  {
    id: "cue-choice",
    moment: "Critical decision point",
    reason: "Emphasize consequence and draw focus to player agency.",
  },
];

export const EMPTY_CREATOR_STORY_PACK: CreatorStoryPack = {
  title: "Untitled Story Pack",
  logline: "A player is drawn into a world where each choice reshapes what survival means.",
  playerRole: "You are the protagonist navigating high-stakes uncertainty.",
  openingLine: "The air hums before dawn, and something in the dark already knows your name.",
  phaseOutline: DEFAULT_CREATOR_STORY_PHASES.map((phase) => ({ ...phase })),
  soundPlan: DEFAULT_CREATOR_SOUND_PLAN.map((cue) => ({ ...cue })),
  systemPromptDraft:
    "You are an interactive story engine. Maintain second-person narration, preserve continuity, and escalate tension through concrete sensory detail.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function sanitizeAspectRatio(value: unknown): CreatorAspectRatio | undefined {
  if (typeof value !== "string") return undefined;
  const typed = value as CreatorAspectRatio;
  return CREATOR_ASPECT_RATIOS.includes(typed) ? typed : undefined;
}

export function sanitizeCreatorSpecPartial(input: unknown): Partial<CreatorSpec> {
  if (!isRecord(input)) return {};

  const next: Partial<CreatorSpec> = {};

  const title = sanitizeText(input.title, 120);
  if (title) next.title = title;

  const audience = sanitizeText(input.audience, 120);
  if (audience) next.audience = audience;

  const theme = sanitizeText(input.theme, 240);
  if (theme) next.theme = theme;

  const mood = sanitizeText(input.mood, 120);
  if (mood) next.mood = mood;

  const visualStyle = sanitizeText(input.visualStyle, 180);
  if (visualStyle) next.visualStyle = visualStyle;

  if (Array.isArray(input.keyElements)) {
    const keyElements = input.keyElements
      .map((item) => sanitizeText(item, 80))
      .filter((item): item is string => Boolean(item))
      .slice(0, 8);

    if (keyElements.length > 0) {
      next.keyElements = Array.from(new Set(keyElements));
    }
  }

  const aspectRatio = sanitizeAspectRatio(input.aspectRatio);
  if (aspectRatio) next.aspectRatio = aspectRatio;

  const imagePrompt = sanitizeText(input.imagePrompt, 1000);
  if (imagePrompt) next.imagePrompt = imagePrompt;

  const notes = sanitizeText(input.notes, 1200);
  if (notes) next.notes = notes;

  return next;
}

export function sanitizeCreatorChatMessages(input: unknown, maxMessages = 24): CreatorChatMessage[] {
  if (!Array.isArray(input)) return [];

  const sanitized = input
    .map((message): CreatorChatMessage | null => {
      if (!isRecord(message)) return null;
      const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
      const content = sanitizeText(message.content, 1400);
      if (!role || !content) return null;
      return { role, content };
    })
    .filter((message): message is CreatorChatMessage => message !== null);

  return sanitized.slice(Math.max(0, sanitized.length - maxMessages));
}

export function sanitizeCreatorStoryDraftText(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ");

  return normalized.slice(0, CREATOR_STORY_PACK_LIMITS.draftText);
}

export function sanitizeCreatorTraceId(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.replace(/[^a-zA-Z0-9_.:-]/g, "");
  if (!normalized) return undefined;
  return normalized.slice(0, 120);
}

export function createCreatorTraceId(prefix = "creator"): string {
  const now = Date.now().toString(36);
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${now}-${random}`;
}

export function resolveCreatorTraceId(input: unknown, prefix = "creator"): string {
  return sanitizeCreatorTraceId(input) ?? createCreatorTraceId(prefix);
}

export function isCreatorInterviewChunk(input: unknown): input is CreatorInterviewChunk {
  if (!isRecord(input) || typeof input.type !== "string") return false;
  if (input.type === "message") return typeof input.message === "string";
  if (input.type === "spec_update") return isRecord(input.specUpdate);
  if (input.type === "image_prompt") return typeof input.prompt === "string";
  if (input.type === "complete") return input.complete === true;
  if (input.type === "error") return typeof input.error === "string";
  return false;
}
