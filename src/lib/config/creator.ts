export const CREATOR_INTERVIEW_MODEL = "gemini-2.0-flash";
export const CREATOR_IMAGE_MODEL = "imagen-3.0-generate-001";

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

export function isCreatorInterviewChunk(input: unknown): input is CreatorInterviewChunk {
  if (!isRecord(input) || typeof input.type !== "string") return false;
  if (input.type === "message") return typeof input.message === "string";
  if (input.type === "spec_update") return isRecord(input.specUpdate);
  if (input.type === "image_prompt") return typeof input.prompt === "string";
  if (input.type === "complete") return input.complete === true;
  if (input.type === "error") return typeof input.error === "string";
  return false;
}
