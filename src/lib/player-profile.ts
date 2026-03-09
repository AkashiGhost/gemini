export type PlayerProfileProvider = "chatgpt" | "claude" | "gemini" | "other";
export type AttachmentTendency = "secure" | "anxious" | "avoidant" | "mixed" | "unknown";
export type ConflictStyle = "avoid" | "appease" | "attack" | "analyze" | "mixed";
export type ToleranceLevel = "low" | "medium" | "high";

export interface PlayerProfileIdentitySummary {
  selfDescription: string;
  currentLifeStage: string;
  coreValues: string[];
  recurringGoals: string[];
}

export interface PlayerProfileBehavioralProfile {
  conflictStyle: ConflictStyle;
  pressureTolerance: ToleranceLevel;
  roastTolerance: ToleranceLevel;
  attachmentTendency: AttachmentTendency;
}

export interface PlayerProfileEmotionalMap {
  dominantEmotions: string[];
  avoidedEmotions: string[];
  emotionalHotspots: string[];
  shameTriggers: string[];
  griefPoints: string[];
  angerPatterns: string[];
}

export interface PlayerProfileNarrativeProfile {
  unfinishedDecisions: string[];
  recurringConflicts: string[];
  selfStoryFragments: string[];
  ambitions: string[];
  regrets: string[];
  fearedIdentities: string[];
  desiredIdentities: string[];
}

export interface PlayerProfileCandidateSelf {
  name: string;
  function: string;
  emotionFamily: string;
  primaryFear: string;
  primaryDesire: string;
  triggerTopics: string[];
}

export interface PlayerProfileSafety {
  hardLimits: string[];
  softLimits: string[];
  protectedTopics: string[];
  protectedRelationships: string[];
}

export interface PlayerProfileV1 {
  id: string;
  version: 1;
  source: {
    questionnaire: boolean;
    importedMemory: boolean;
    importedMemoryProvider?: PlayerProfileProvider;
    generatedAt: string;
  };
  consent: {
    profileApproved: boolean;
    personalizedGamesApproved: boolean;
    roastModeApproved: boolean;
    importedMemoryApproved: boolean;
  };
  identitySummary: PlayerProfileIdentitySummary;
  behavioralProfile: PlayerProfileBehavioralProfile;
  emotionalMap: PlayerProfileEmotionalMap;
  narrativeProfile: PlayerProfileNarrativeProfile;
  castSeed: {
    candidateSelves: PlayerProfileCandidateSelf[];
  };
  safety: PlayerProfileSafety;
  review: {
    userConfirmed: boolean;
    userEdited: boolean;
    lastReviewedAt?: string;
  };
}

export interface GameProfileContext {
  dominantEmotions: string[];
  avoidedEmotions: string[];
  unfinishedDecisions: string[];
  desiredIdentities: string[];
  fearedIdentities: string[];
  candidateSelves: string[];
  hardLimits: string[];
  roastTolerance: ToleranceLevel;
}

export interface PlayerProfileDraftInput {
  id?: string;
  selfDescription?: string;
  currentLifeStage?: string;
  coreValues?: string[];
  recurringGoals?: string[];
  importedMemory?: string;
  importedMemoryProvider?: PlayerProfileProvider;
  conflictStyle?: ConflictStyle;
  pressureTolerance?: ToleranceLevel;
  roastTolerance?: ToleranceLevel;
  attachmentTendency?: AttachmentTendency;
  dominantEmotions?: string[];
  avoidedEmotions?: string[];
  emotionalHotspots?: string[];
  shameTriggers?: string[];
  griefPoints?: string[];
  angerPatterns?: string[];
  unfinishedDecisions?: string[];
  recurringConflicts?: string[];
  ambitions?: string[];
  regrets?: string[];
  fearedIdentities?: string[];
  desiredIdentities?: string[];
  hardLimits?: string[];
  softLimits?: string[];
  protectedTopics?: string[];
  protectedRelationships?: string[];
}

export const PLAYER_PROFILE_STORAGE_KEY = "innerplay.player-profile:v1";

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function uniqueList(values: unknown, itemMaxLength = 120, maxItems = 8): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const cleaned = sanitizeText(value, itemMaxLength);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
    if (output.length >= maxItems) break;
  }
  return output;
}

function uniqueListFromTextBlock(value: string, itemMaxLength = 120, maxItems = 8): string[] {
  return value
    .split(/\r?\n|[;|]/g)
    .map((item) => sanitizeText(item, itemMaxLength))
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, maxItems);
}

function ensureIsoTimestamp(value?: string): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function fallbackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `profile-${Date.now().toString(36)}`;
}

function pickConflictStyle(value: unknown): ConflictStyle {
  return value === "avoid" || value === "appease" || value === "attack" || value === "analyze" || value === "mixed"
    ? value
    : "mixed";
}

function pickTolerance(value: unknown): ToleranceLevel {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function pickAttachment(value: unknown): AttachmentTendency {
  return value === "secure" || value === "anxious" || value === "avoidant" || value === "mixed" || value === "unknown"
    ? value
    : "unknown";
}

function deriveFragments(importedMemory: string): string[] {
  return uniqueListFromTextBlock(importedMemory, 160, 6);
}

function buildCandidateSelves(input: {
  dominantEmotions: string[];
  avoidedEmotions: string[];
  conflictStyle: ConflictStyle;
  unfinishedDecisions: string[];
  desiredIdentities: string[];
  fearedIdentities: string[];
  emotionalHotspots: string[];
}): PlayerProfileCandidateSelf[] {
  const selves: PlayerProfileCandidateSelf[] = [
    {
      name: "The Witness",
      function: "Observes the conflict without taking the wheel.",
      emotionFamily: "clarity",
      primaryFear: "Losing perspective completely.",
      primaryDesire: "See the inner system honestly.",
      triggerTopics: input.emotionalHotspots.slice(0, 3),
    },
  ];

  if (input.dominantEmotions.some((emotion) => /fear|panic|anx/i.test(emotion))) {
    selves.push({
      name: "The Alarm",
      function: "Scans for threat and moves first under uncertainty.",
      emotionFamily: "fear",
      primaryFear: "Being caught unprepared.",
      primaryDesire: "Keep the player safe before anything else.",
      triggerTopics: input.emotionalHotspots.slice(0, 3),
    });
  }

  if (input.dominantEmotions.some((emotion) => /shame|guilt/i.test(emotion))) {
    selves.push({
      name: "The Prosecutor",
      function: "Uses shame to enforce standards and prevent exposure.",
      emotionFamily: "shame",
      primaryFear: "Public failure or humiliation.",
      primaryDesire: "Keep the player above reproach.",
      triggerTopics: input.fearedIdentities.slice(0, 3),
    });
  }

  if (input.conflictStyle === "appease") {
    selves.push({
      name: "The Diplomat",
      function: "Preserves belonging by smoothing conflict and absorbing tension.",
      emotionFamily: "attachment",
      primaryFear: "Losing connection or approval.",
      primaryDesire: "Keep the room calm and relationships intact.",
      triggerTopics: input.desiredIdentities.slice(0, 3),
    });
  }

  if (input.conflictStyle === "avoid" || input.avoidedEmotions.length > 0) {
    selves.push({
      name: "The Ghost",
      function: "Withdraws, numbs, or disappears when inner heat rises.",
      emotionFamily: "avoidance",
      primaryFear: "Being overwhelmed by emotion.",
      primaryDesire: "Reduce exposure and intensity.",
      triggerTopics: input.avoidedEmotions.slice(0, 3),
    });
  }

  if (input.conflictStyle === "attack" || input.dominantEmotions.some((emotion) => /anger|rage/i.test(emotion))) {
    selves.push({
      name: "The Hunger",
      function: "Pushes for power, momentum, and control when pressure rises.",
      emotionFamily: "anger",
      primaryFear: "Helplessness.",
      primaryDesire: "Win, seize ground, and not be diminished.",
      triggerTopics: input.unfinishedDecisions.slice(0, 3),
    });
  }

  if (input.conflictStyle === "analyze") {
    selves.push({
      name: "The Strategist",
      function: "Turns pain into plans, frameworks, and analysis.",
      emotionFamily: "control",
      primaryFear: "Chaos and uncertainty.",
      primaryDesire: "Restore order through explanation.",
      triggerTopics: input.unfinishedDecisions.slice(0, 3),
    });
  }

  return selves.filter(
    (self, index, all) => all.findIndex((candidate) => candidate.name === self.name) === index,
  );
}

export function createPlayerProfileDraft(input: PlayerProfileDraftInput): PlayerProfileV1 {
  const importedMemory = sanitizeText(input.importedMemory, 4_000);
  const selfDescription = sanitizeText(input.selfDescription, 320);
  const currentLifeStage = sanitizeText(input.currentLifeStage, 160);
  const dominantEmotions = uniqueList(input.dominantEmotions, 60, 6);
  const avoidedEmotions = uniqueList(input.avoidedEmotions, 60, 6);
  const emotionalHotspots = uniqueList(input.emotionalHotspots, 120, 6);
  const unfinishedDecisions = uniqueList(input.unfinishedDecisions, 160, 6);
  const desiredIdentities = uniqueList(input.desiredIdentities, 120, 6);
  const fearedIdentities = uniqueList(input.fearedIdentities, 120, 6);

  return {
    id: sanitizeText(input.id, 120) || fallbackId(),
    version: 1,
    source: {
      questionnaire: true,
      importedMemory: importedMemory.length > 0,
      importedMemoryProvider: importedMemory.length > 0 ? input.importedMemoryProvider ?? "other" : undefined,
      generatedAt: ensureIsoTimestamp(),
    },
    consent: {
      profileApproved: false,
      personalizedGamesApproved: false,
      roastModeApproved: false,
      importedMemoryApproved: false,
    },
    identitySummary: {
      selfDescription,
      currentLifeStage,
      coreValues: uniqueList(input.coreValues, 80, 6),
      recurringGoals: uniqueList(input.recurringGoals, 120, 6),
    },
    behavioralProfile: {
      conflictStyle: pickConflictStyle(input.conflictStyle),
      pressureTolerance: pickTolerance(input.pressureTolerance),
      roastTolerance: pickTolerance(input.roastTolerance),
      attachmentTendency: pickAttachment(input.attachmentTendency),
    },
    emotionalMap: {
      dominantEmotions,
      avoidedEmotions,
      emotionalHotspots,
      shameTriggers: uniqueList(input.shameTriggers, 120, 6),
      griefPoints: uniqueList(input.griefPoints, 120, 6),
      angerPatterns: uniqueList(input.angerPatterns, 120, 6),
    },
    narrativeProfile: {
      unfinishedDecisions,
      recurringConflicts: uniqueList(input.recurringConflicts, 160, 6),
      selfStoryFragments: importedMemory ? deriveFragments(importedMemory) : [],
      ambitions: uniqueList(input.ambitions, 120, 6),
      regrets: uniqueList(input.regrets, 120, 6),
      fearedIdentities,
      desiredIdentities,
    },
    castSeed: {
      candidateSelves: buildCandidateSelves({
        dominantEmotions,
        avoidedEmotions,
        conflictStyle: pickConflictStyle(input.conflictStyle),
        unfinishedDecisions,
        desiredIdentities,
        fearedIdentities,
        emotionalHotspots,
      }),
    },
    safety: {
      hardLimits: uniqueList(input.hardLimits, 120, 6),
      softLimits: uniqueList(input.softLimits, 120, 6),
      protectedTopics: uniqueList(input.protectedTopics, 120, 6),
      protectedRelationships: uniqueList(input.protectedRelationships, 120, 6),
    },
    review: {
      userConfirmed: false,
      userEdited: false,
    },
  };
}

export function normalizePlayerProfile(input: unknown): PlayerProfileV1 | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const source = record.source && typeof record.source === "object" && !Array.isArray(record.source)
    ? (record.source as Record<string, unknown>)
    : {};
  const consent = record.consent && typeof record.consent === "object" && !Array.isArray(record.consent)
    ? (record.consent as Record<string, unknown>)
    : {};
  const identitySummary = record.identitySummary && typeof record.identitySummary === "object" && !Array.isArray(record.identitySummary)
    ? (record.identitySummary as Record<string, unknown>)
    : {};
  const behavioralProfile = record.behavioralProfile && typeof record.behavioralProfile === "object" && !Array.isArray(record.behavioralProfile)
    ? (record.behavioralProfile as Record<string, unknown>)
    : {};
  const emotionalMap = record.emotionalMap && typeof record.emotionalMap === "object" && !Array.isArray(record.emotionalMap)
    ? (record.emotionalMap as Record<string, unknown>)
    : {};
  const narrativeProfile = record.narrativeProfile && typeof record.narrativeProfile === "object" && !Array.isArray(record.narrativeProfile)
    ? (record.narrativeProfile as Record<string, unknown>)
    : {};
  const safety = record.safety && typeof record.safety === "object" && !Array.isArray(record.safety)
    ? (record.safety as Record<string, unknown>)
    : {};
  const review = record.review && typeof record.review === "object" && !Array.isArray(record.review)
    ? (record.review as Record<string, unknown>)
    : {};

  const normalized = createPlayerProfileDraft({
    id: sanitizeText(record.id, 120),
    selfDescription: sanitizeText(identitySummary.selfDescription, 320),
    currentLifeStage: sanitizeText(identitySummary.currentLifeStage, 160),
    coreValues: Array.isArray(identitySummary.coreValues) ? (identitySummary.coreValues as string[]) : [],
    recurringGoals: Array.isArray(identitySummary.recurringGoals) ? (identitySummary.recurringGoals as string[]) : [],
    importedMemory: Array.isArray(narrativeProfile.selfStoryFragments)
      ? (narrativeProfile.selfStoryFragments as string[]).join("\n")
      : "",
    importedMemoryProvider:
      source.importedMemoryProvider === "chatgpt" ||
      source.importedMemoryProvider === "claude" ||
      source.importedMemoryProvider === "gemini" ||
      source.importedMemoryProvider === "other"
        ? source.importedMemoryProvider
        : undefined,
    conflictStyle: pickConflictStyle(behavioralProfile.conflictStyle),
    pressureTolerance: pickTolerance(behavioralProfile.pressureTolerance),
    roastTolerance: pickTolerance(behavioralProfile.roastTolerance),
    attachmentTendency: pickAttachment(behavioralProfile.attachmentTendency),
    dominantEmotions: Array.isArray(emotionalMap.dominantEmotions) ? (emotionalMap.dominantEmotions as string[]) : [],
    avoidedEmotions: Array.isArray(emotionalMap.avoidedEmotions) ? (emotionalMap.avoidedEmotions as string[]) : [],
    emotionalHotspots: Array.isArray(emotionalMap.emotionalHotspots) ? (emotionalMap.emotionalHotspots as string[]) : [],
    shameTriggers: Array.isArray(emotionalMap.shameTriggers) ? (emotionalMap.shameTriggers as string[]) : [],
    griefPoints: Array.isArray(emotionalMap.griefPoints) ? (emotionalMap.griefPoints as string[]) : [],
    angerPatterns: Array.isArray(emotionalMap.angerPatterns) ? (emotionalMap.angerPatterns as string[]) : [],
    unfinishedDecisions: Array.isArray(narrativeProfile.unfinishedDecisions) ? (narrativeProfile.unfinishedDecisions as string[]) : [],
    recurringConflicts: Array.isArray(narrativeProfile.recurringConflicts) ? (narrativeProfile.recurringConflicts as string[]) : [],
    ambitions: Array.isArray(narrativeProfile.ambitions) ? (narrativeProfile.ambitions as string[]) : [],
    regrets: Array.isArray(narrativeProfile.regrets) ? (narrativeProfile.regrets as string[]) : [],
    fearedIdentities: Array.isArray(narrativeProfile.fearedIdentities) ? (narrativeProfile.fearedIdentities as string[]) : [],
    desiredIdentities: Array.isArray(narrativeProfile.desiredIdentities) ? (narrativeProfile.desiredIdentities as string[]) : [],
    hardLimits: Array.isArray(safety.hardLimits) ? (safety.hardLimits as string[]) : [],
    softLimits: Array.isArray(safety.softLimits) ? (safety.softLimits as string[]) : [],
    protectedTopics: Array.isArray(safety.protectedTopics) ? (safety.protectedTopics as string[]) : [],
    protectedRelationships: Array.isArray(safety.protectedRelationships) ? (safety.protectedRelationships as string[]) : [],
  });

  return {
    ...normalized,
    source: {
      questionnaire: source.questionnaire !== false,
      importedMemory: source.importedMemory === true,
      importedMemoryProvider: normalized.source.importedMemory ? normalized.source.importedMemoryProvider : undefined,
      generatedAt: ensureIsoTimestamp(typeof source.generatedAt === "string" ? source.generatedAt : undefined),
    },
    consent: {
      profileApproved: consent.profileApproved === true,
      personalizedGamesApproved: consent.personalizedGamesApproved === true,
      roastModeApproved: consent.roastModeApproved === true,
      importedMemoryApproved: consent.importedMemoryApproved === true,
    },
    review: {
      userConfirmed: review.userConfirmed === true,
      userEdited: review.userEdited === true,
      lastReviewedAt: typeof review.lastReviewedAt === "string" ? ensureIsoTimestamp(review.lastReviewedAt) : undefined,
    },
  };
}

export function buildGameProfileContext(profile: PlayerProfileV1): GameProfileContext {
  return {
    dominantEmotions: profile.emotionalMap.dominantEmotions.slice(0, 4),
    avoidedEmotions: profile.emotionalMap.avoidedEmotions.slice(0, 4),
    unfinishedDecisions: profile.narrativeProfile.unfinishedDecisions.slice(0, 4),
    desiredIdentities: profile.narrativeProfile.desiredIdentities.slice(0, 4),
    fearedIdentities: profile.narrativeProfile.fearedIdentities.slice(0, 4),
    candidateSelves: profile.castSeed.candidateSelves.map((self) => self.name).slice(0, 6),
    hardLimits: profile.safety.hardLimits.slice(0, 6),
    roastTolerance: profile.behavioralProfile.roastTolerance,
  };
}

export function normalizeGameProfileContext(input: unknown): GameProfileContext | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  return {
    dominantEmotions: uniqueList(record.dominantEmotions, 60, 4),
    avoidedEmotions: uniqueList(record.avoidedEmotions, 60, 4),
    unfinishedDecisions: uniqueList(record.unfinishedDecisions, 160, 4),
    desiredIdentities: uniqueList(record.desiredIdentities, 120, 4),
    fearedIdentities: uniqueList(record.fearedIdentities, 120, 4),
    candidateSelves: uniqueList(record.candidateSelves, 80, 6),
    hardLimits: uniqueList(record.hardLimits, 120, 6),
    roastTolerance: pickTolerance(record.roastTolerance),
  };
}

export function savePlayerProfile(profile: PlayerProfileV1): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function loadPlayerProfile(): PlayerProfileV1 | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizePlayerProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPlayerProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PLAYER_PROFILE_STORAGE_KEY);
}
