import type {
  CreatorStoryPack,
  CreatorStoryPackPhase,
  CreatorStoryPackSoundCue,
} from "@/lib/config/creator";
import type { StoryRuntimeMode } from "@/lib/story-runtime";

export type PublishedStorySoundStrategy = "ambient_first_live" | "timeline_scripted";

export interface PublishedStoryManifest {
  id: string;
  title: string;
  logline: string;
  playerRole: string;
  openingLine: string;
  coverImage?: string;
  phaseOutline: CreatorStoryPackPhase[];
  soundPlan: CreatorStoryPackSoundCue[];
  systemPromptDraft: string;
  characterName: string;
  runtimeMode: StoryRuntimeMode;
  soundStrategy: PublishedStorySoundStrategy;
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function sanitizeCoverImage(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return "";
}

function normalizeCueId(value: unknown, index: number): string {
  const raw = sanitizeText(value, 50)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return raw || `cue-${index + 1}`;
}

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function inferCharacterName(title: string): string {
  const firstWord = title.split(/\s+/)[0]?.trim();
  if (!firstWord) return "Guide";
  if (firstWord.length <= 2) return "Guide";
  return "Guide";
}

function normalizePhaseOutline(input: unknown): CreatorStoryPackPhase[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((phase): CreatorStoryPackPhase | null => {
      if (!phase || typeof phase !== "object" || Array.isArray(phase)) return null;
      const record = phase as Record<string, unknown>;
      const phaseLabel = sanitizeText(record.phase, 60);
      const goal = sanitizeText(record.goal, 260);
      const tone = sanitizeText(record.tone, 120);
      if (!phaseLabel && !goal && !tone) return null;
      return {
        phase: phaseLabel || "Phase",
        goal,
        tone,
      };
    })
    .filter((phase): phase is CreatorStoryPackPhase => phase !== null);
}

function normalizeSoundPlan(input: unknown): CreatorStoryPackSoundCue[] {
  if (!Array.isArray(input)) return [];
  const usedIds = new Set<string>();
  return input
    .map((cue, index): CreatorStoryPackSoundCue | null => {
      if (!cue || typeof cue !== "object" || Array.isArray(cue)) return null;
      const record = cue as Record<string, unknown>;
      const moment = sanitizeText(record.moment, 140);
      const reason = sanitizeText(record.reason, 220);
      if (!moment && !reason) return null;

      let id = normalizeCueId(record.id, index);
      if (/^\d/.test(id)) {
        id = `cue-${id}`;
      }
      while (usedIds.has(id)) {
        id = `${id}-${index + 1}`;
      }
      usedIds.add(id);

      return {
        id,
        moment,
        reason,
      };
    })
    .filter((cue): cue is CreatorStoryPackSoundCue => cue !== null);
}

export function normalizePublishedStoryInput(input: unknown): PublishedStoryManifest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;

  const title = sanitizeText(record.title, 160);
  const logline = sanitizeText(record.logline, 420);
  const playerRole = sanitizeText(record.playerRole, 220);
  const openingLine = sanitizeText(record.openingLine, 240);
  const coverImage = sanitizeCoverImage(record.coverImage);
  const systemPromptDraft = sanitizeText(record.systemPromptDraft, 3200);
  const characterName = sanitizeText(record.characterName, 80) || inferCharacterName(title);
  const runtimeMode = record.runtimeMode === "scripted" ? "scripted" : "live";
  const soundStrategy = record.soundStrategy === "timeline_scripted"
    ? "timeline_scripted"
    : "ambient_first_live";
  const phaseOutline = normalizePhaseOutline(record.phaseOutline);
  const soundPlan = normalizeSoundPlan(record.soundPlan);
  const rawId = sanitizeText(record.id, 80);
  const id = rawId
    ? rawId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
    : "";

  if (!title || !logline || !playerRole || !openingLine || !systemPromptDraft) {
    return null;
  }

  return {
    id: id || `published-${slugifyTitle(title) || "story"}`,
    title,
    logline,
    playerRole,
    openingLine,
    ...(coverImage ? { coverImage } : {}),
    phaseOutline,
    soundPlan,
    systemPromptDraft,
    characterName,
    runtimeMode,
    soundStrategy,
  };
}

export function createPublishedStoryManifest(
  storyPack: CreatorStoryPack,
  options?: { coverImage?: string },
): PublishedStoryManifest {
  const title = sanitizeText(storyPack.title, 160) || "Untitled Story";
  const baseId = slugifyTitle(title) || "story";
  const coverImage = sanitizeCoverImage(options?.coverImage);

  return {
    id: `published-${baseId}-${Date.now().toString(36)}`,
    title,
    logline: sanitizeText(storyPack.logline, 420),
    playerRole: sanitizeText(storyPack.playerRole, 220),
    openingLine: sanitizeText(storyPack.openingLine, 240),
    ...(coverImage ? { coverImage } : {}),
    phaseOutline: normalizePhaseOutline(storyPack.phaseOutline),
    soundPlan: normalizeSoundPlan(storyPack.soundPlan),
    systemPromptDraft: sanitizeText(storyPack.systemPromptDraft, 3200),
    characterName: inferCharacterName(title),
    runtimeMode: "live",
    soundStrategy: "ambient_first_live",
  };
}

export function buildPublishedStoryPrompt(story: PublishedStoryManifest): string {
  const phaseOutline = story.phaseOutline.length > 0
    ? story.phaseOutline
      .map((phase, index) => `${index + 1}. ${phase.phase}: ${phase.goal} (${phase.tone || "tense"})`)
      .join("\n")
    : "1. Opening: establish the scenario and ask the player for help.";

  const soundPlan = story.soundPlan.length > 0
    ? story.soundPlan.map((cue) => `- ${cue.id}: ${cue.moment} — ${cue.reason}`).join("\n")
    : "- Keep the ambience subtle and let the spoken scene lead.";

  return [
    `You are ${story.characterName}.`,
    `Story title: ${story.title}.`,
    `Logline: ${story.logline}`,
    `Player role: ${story.playerRole}`,
    `Opening line anchor: ${story.openingLine}`,
    "",
    "Story structure:",
    phaseOutline,
    "",
    "Sound texture references:",
    soundPlan,
    "",
    "Runtime instructions:",
    story.systemPromptDraft,
    "- First response after connection must be one short line, then stop and wait for the player.",
    "- Keep every response short, playable, and natural for live voice.",
    "- Never speak tool syntax, sound IDs, or production markers out loud.",
  ].join("\n");
}
