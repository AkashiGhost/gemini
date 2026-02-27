// ─────────────────────────────────────────────
// Game Config Types — mirrors schemas/*.json
// All keys are camelCase (transformed from snake_case YAML at load time)
// ─────────────────────────────────────────────

// === Top-level composite (game-schema.json) ===

export interface GameConfig {
  meta: GameMeta;
  world: WorldConfig;
  characters: CharacterConfig[];
  arc: ArcConfig;
  prompts: PromptsConfig;
  sounds: SoundsConfig;
  evaluation: EvaluationConfig;
}

// === Meta ===

export interface GameMeta {
  id: string;
  title: string;
  genre: string;
  durationTargetMinutes: number;
  playerRole: string;
  tagline?: string;
  contentWarnings?: string[];
  version?: string;
  author?: string;
  language?: string;
  // Extensions from meta.yaml
  subgenre?: string;
  tone?: string[];
  settingSummary?: string;
  wordBudget?: number;
  choicePoints?: number;
  endingVariants?: number;
  revelationVariants?: number;
  charactersCount?: number;
  narrator?: string;
  contentRating?: string;
  tags?: string[];
  tropesAsFoundation?: string[];
}

// === World (world-schema.json) ===

export interface WorldConfig {
  id: string;
  title?: string;
  setting: WorldSetting;
  locations: Location[];
  physics: Physics;
  playerCan: string[];
  playerCannot: string[];
  constraintRedirects: Record<string, string>;
  ambientBaseline: AmbientSound[];
  durationTargetMinutes: number;
  // Extensions
  horrorDesignNotes?: HorrorDesignNotes;
  temperatureProgression?: string;
}

export interface WorldSetting {
  description: string;
  time: string;
  location: string;
  atmosphere: string;
  temperatureProgression?: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  connections: string[];
  notes?: string;
  dangerLevel?: number;
  firstVisitNarration?: string;
  ambientSounds?: string[];
}

export interface Physics {
  type: "realistic" | "low-magic" | "high-magic" | "sci-fi";
  rules: string[];
  sensoryAvailable?: Array<"sight" | "sound" | "smell" | "touch" | "taste">;
}

export interface AmbientSound {
  id: string;
  name: string;
  description: string;
  loop: boolean;
  defaultVolume: number;
  assetPath?: string;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  spatial?: string;
  persistsThrough?: string;
  removesAt?: string;
  playbackIntervalSeconds?: number;
  playbackIntervalVarianceSeconds?: number;
}

export interface HorrorDesignNotes {
  principle: string;
  keyMoment: string;
  soundPsychology: string;
  forbidden: string;
  removalSequence: Array<{
    time: string;
    sound: string;
    playerEffect: string;
  }>;
  elaraAsHorror?: string;
}

// === Arc (arc-schema.json) ===

export interface ArcConfig {
  storyId: string;
  centralConflict: string;
  theme: string;
  phases: Phase[];
  revelationLogic: Record<string, string>;
  endingConditions: EndingCondition[];
}

export interface Phase {
  id: string;
  name: string;
  timeRange: string;
  purpose: string;
  soundState: SoundState;
  characterBehavior: string;
  beats: Beat[];
  entryCondition?: string;
}

export interface SoundState {
  active: string[];
  removed: string[];
  added: string[];
  volumeAdjustments?: Record<string, number>;
}

export interface Beat {
  id: string;
  type: "narration" | "choice" | "revelation" | "silence";
  wordBudget: number;
  purpose: string;
  promptHint?: string;
  soundCues?: SoundCue[];
  stateChanges?: Record<string, unknown>;
  options?: ChoiceOption[];
  silenceDurationSeconds?: number;
}

export interface SoundCue {
  soundId: string;
  trigger: string;
  volume?: number;
}

export interface ChoiceOption {
  id: string;
  label: string;
  playerSaysLike: string[];
  consequence: string;
  stateChanges: Record<string, unknown>;
  requires?: ChoiceRequires;
  styleScore?: Record<string, number>;
}

export interface ChoiceRequires {
  trustLevelMin?: number;
  secretsRevealed?: string[];
  flags?: Record<string, unknown>;
}

export interface EndingCondition {
  id: string;
  trigger: EndingTrigger;
  endingFile: string;
  endingName?: string;
}

export interface EndingTrigger {
  revelation?: string;
  choices?: Record<string, string>;
  trustLevelMin?: number;
  trustLevelMax?: number;
  secretsRevealedIncludes?: string[];
}

// === Character (character-schema.json) ===

export interface CharacterConfig {
  id: string;
  name: string;
  role: "narrator" | "npc" | "antagonist" | "guide";
  identity: CharacterIdentity;
  voice: CharacterVoice;
  knowledge: CharacterKnowledge;
  personality: CharacterPersonality;
  arc: CharacterArc;
  mutableState: CharacterMutableState;
  // Extensions
  story?: string;
  elevenlabsVoiceId?: string;
}

export interface CharacterIdentity {
  surface: string;
  functional: string;
  trueNature: string | string[];
}

export interface CharacterVoice {
  description: string;
  speechPatterns: string[];
  vocabulary: string;
  emotionalRange: string;
  maxSentencesPerResponse: number;
  dialogueStyle: "spoken" | "written";
  forbiddenPhrases?: string[];
}

export interface CharacterKnowledge {
  knownFacts: string[];
  unknownFacts: string[];
  secrets: CharacterSecret[];
}

export interface CharacterSecret {
  id: string;
  content: string;
  revealCondition: string;
  partialHints?: string[];
}

export interface CharacterPersonality {
  motivation: string;
  internalConflict: string;
  attitudeTowardPlayer: string;
  fear?: string;
  copingMechanism?: string;
  selfAwareness?: string;
  relationshipToTherapy?: string;
}

export interface CharacterArc {
  stages: string[];
  progression: string;
  regressionTrigger?: string;
}

export interface CharacterMutableState {
  emotionalState: string;
  trustLevel: number;
  secretsRevealed: string[];
  currentPhaseBehavior: string;
  arcStageIndex?: number;
  playerStyleScores?: Record<string, number>;
  activeVariant?: string | null;
}

// === Prompts ===

export interface PromptsConfig {
  system: SystemPromptConfig;
  phaseOverrides: Record<string, PhaseOverride>;
}

export interface SystemPromptConfig {
  baseInstruction: string;
  responseLengthConstraint: string;
  soundMarkerFormat: string;
  fallbackResponse: string;
  contextLayerOrder: string[];
  intentClassifierPrompt: string;
}

export interface PhaseOverride {
  override: string;
}

// === Sounds ===

export interface SoundsConfig {
  cueMap: CueMap;
  timeline: TimelineEvent[];
  mixing: MixingConfig;
}

export interface CueMap {
  ambient: Record<string, CueMapEntry>;
  intermittent: Record<string, CueMapEntry>;
  transitions: Record<string, CueMapEntry>;
  atmospheric: Record<string, CueMapEntry>;
  endings: Record<string, CueMapEntry>;
}

export interface CueMapEntry {
  name: string;
  description: string;
  assetPath: string | null;
  volume: number | null;
  loop: boolean;
  spatial?: { pan: number; vertical?: number };
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  fadeDurationSeconds?: number;
  triggerType?: string;
  targetChannel?: string;
  targetChannels?: string[];
  triggeredAt?: string;
  introducedAt?: string;
  removesAt?: string;
  playbackIntervalSeconds?: number;
  playbackIntervalVarianceSeconds?: number;
  persistsThrough?: string;
  usedInEndings?: string[];
  restoreVolumes?: Record<string, number>;
  tag?: string | null;
  generationPrompt?: string | null;
  generationTool?: string;
  designNote?: string;
}

export interface TimelineEvent {
  time: string;
  action: string;
  soundId?: string;
  soundIds?: string[];
  fadeDurationSeconds?: number;
  fadeInSeconds?: number;
  condition?: string | null;
  description?: string;
  targetVolume?: number;
  restoreVolumes?: Record<string, number>;
}

export interface MixingConfig {
  ttsDucking: {
    ambientReductionDb: number;
    fadeInDurationMs: number;
    fadeOutDurationMs: number;
  };
  crossfadeDefaultMs: number;
  spatialMap: Record<string, { pan: number; vertical?: number; notes?: string }>;
  preloadOrder?: string[];
}

// === Evaluation ===

export interface EvaluationConfig {
  qualityChecklist: QualityCheckItem[];
  metrics?: Record<string, MetricDefinition>;
  goldenPath?: GoldenPath;
}

export interface QualityCheckItem {
  id: string;
  criterion: string;
  evaluationMethod?: "automatic" | "llm-judge" | "human";
  priority?: "blocking" | "important" | "minor";
}

export interface MetricDefinition {
  description: string;
  source?: string;
  targetRange?: { min?: number; max?: number };
}

export interface GoldenPath {
  description: string;
  choiceSequence: Array<{ beatId: string; optionId: string }>;
  expectedEndingId: string;
}
