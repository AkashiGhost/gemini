import { TRANSCRIPT_INTENT_CUE_RULES, type TranscriptIntentCueRule } from "@/lib/config/audio";

const SPACE_RE = /\s+/g;

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(SPACE_RE, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;
  if (normalizedKeyword.includes(" ")) return text.includes(normalizedKeyword);
  const wordBoundaryPattern = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, "i");
  return wordBoundaryPattern.test(text);
}

export function getTranscriptIntentCueRules(storyId: string): readonly TranscriptIntentCueRule[] {
  return TRANSCRIPT_INTENT_CUE_RULES[storyId] ?? [];
}

export function detectTranscriptIntentCueSoundIds(
  text: string,
  rules: readonly TranscriptIntentCueRule[],
): string[] {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return [];

  const cueIds: string[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (!rule.soundId || seen.has(rule.soundId)) continue;
    const matched = rule.keywords.some((keyword) => matchesKeyword(normalizedText, keyword));
    if (!matched) continue;
    cueIds.push(rule.soundId);
    seen.add(rule.soundId);
  }

  return cueIds;
}

export interface CooldownSelectionResult {
  readyCueIds: string[];
  coolingDownCueIds: string[];
}

export function selectCuesOffCooldown(
  cueIds: readonly string[],
  cooldowns: Map<string, number>,
  options: {
    nowMs: number;
    cooldownMs: number;
  },
): CooldownSelectionResult {
  const readyCueIds: string[] = [];
  const coolingDownCueIds: string[] = [];
  const seen = new Set<string>();

  for (const cueId of cueIds) {
    if (!cueId || seen.has(cueId)) continue;
    seen.add(cueId);

    const lastFiredMs = cooldowns.get(cueId);
    if (lastFiredMs != null && options.nowMs - lastFiredMs < options.cooldownMs) {
      coolingDownCueIds.push(cueId);
      continue;
    }

    cooldowns.set(cueId, options.nowMs);
    readyCueIds.push(cueId);
  }

  return { readyCueIds, coolingDownCueIds };
}
