import type {
  CreatorStoryPack,
  CreatorStoryPackQuality,
  CreatorStoryPackQualityCheck,
  CreatorStoryPackQualityStatus,
} from "@/lib/config/creator";

type IssueSeverity = Exclude<CreatorStoryPackQualityStatus, "pass">;

interface CheckIssue {
  severity: IssueSeverity;
  message: string;
}

interface EvaluatedCheck extends CreatorStoryPackQualityCheck {
  issues: CheckIssue[];
}

const SENSORY_TERMS = [
  "sound",
  "whisper",
  "whispers",
  "echo",
  "echoes",
  "static",
  "hum",
  "hums",
  "drone",
  "pulse",
  "bass",
  "alarm",
  "klaxon",
  "ring",
  "rattle",
  "rattles",
  "rain",
  "spray",
  "wind",
  "cold",
  "warm",
  "hot",
  "chill",
  "temperature",
  "shiver",
  "texture",
  "rough",
  "grit",
  "grain",
  "smell",
  "ozone",
  "metal",
  "salt",
  "steam",
  "fog",
  "flooded",
  "vibrate",
  "vibrates",
  "glass",
  "steel",
  "gulls",
];

const ESCALATION_KEYWORDS: Array<{ token: string; weight: number }> = [
  { token: "uneasy", weight: 0.4 },
  { token: "suspicious", weight: 0.5 },
  { token: "tense", weight: 0.6 },
  { token: "dread", weight: 0.8 },
  { token: "pressure", weight: 0.7 },
  { token: "danger", weight: 0.8 },
  { token: "urgent", weight: 1 },
  { token: "reckoning", weight: 1 },
  { token: "confront", weight: 1.1 },
  { token: "collapse", weight: 1.1 },
  { token: "paranoid", weight: 0.9 },
  { token: "fear", weight: 1.2 },
  { token: "climax", weight: 1.2 },
  { token: "resolution", weight: 0.2 },
];

const FORBIDDEN_PHRASES = [
  "i understand",
  "that's interesting",
  "let me explain",
  "perhaps",
  "it seems like",
  "i think maybe",
  "it could be that",
  "shrouded in",
  "echoed through",
  "a shiver ran down",
  "an eerie silence",
  "darkness enveloped",
  "the air grew thick",
  "something felt wrong",
  "inexplicable feeling",
];

const HEDGING_WORDS = ["maybe", "perhaps", "might", "could", "seems", "probably", "somewhat", "kind of", "sort of"];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "into",
  "from",
  "your",
  "you",
  "are",
  "but",
  "was",
  "were",
  "has",
  "have",
  "had",
  "will",
  "then",
  "when",
  "where",
  "what",
  "while",
  "over",
  "under",
  "after",
  "before",
  "through",
  "about",
  "just",
  "very",
]);

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function withStatus(
  id: CreatorStoryPackQualityCheck["id"],
  issues: CheckIssue[],
  summary: string,
  baseScore = 100,
): EvaluatedCheck {
  const failCount = issues.filter((issue) => issue.severity === "fail").length;
  const warnCount = issues.filter((issue) => issue.severity === "warn").length;
  const status: CreatorStoryPackQualityStatus = failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass";
  const score = clampScore(baseScore - failCount * 32 - warnCount * 12);

  return { id, status, score, summary, issues };
}

function evaluateStructure(storyPack: CreatorStoryPack): EvaluatedCheck {
  const issues: CheckIssue[] = [];
  if (storyPack.phaseOutline.length !== 5) {
    issues.push({ severity: "fail", message: "Phase outline must contain exactly 5 phases." });
  }

  const malformedPhases = storyPack.phaseOutline.filter(
    (phase) => !phase.phase.trim() || !phase.goal.trim() || !phase.tone.trim(),
  ).length;
  if (malformedPhases > 0) {
    issues.push({ severity: "fail", message: `${malformedPhases} phase entries are missing labels, goals, or tones.` });
  }

  if (storyPack.soundPlan.length === 0) {
    issues.push({ severity: "fail", message: "Sound plan is empty." });
  } else if (storyPack.soundPlan.length < 3) {
    issues.push({ severity: "warn", message: "Sound plan has fewer than 3 cues." });
  } else if (storyPack.soundPlan.length > 8) {
    issues.push({ severity: "warn", message: "Sound plan has more than 8 cues and may be noisy." });
  }

  const normalizedIds = storyPack.soundPlan.map((cue) => normalizeText(cue.id));
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    issues.push({ severity: "fail", message: "Sound cue IDs are not unique." });
  }

  if (!normalizeText(storyPack.systemPromptDraft).includes("second person")) {
    issues.push({ severity: "warn", message: "System prompt draft does not explicitly require second-person narration." });
  }

  return withStatus(
    "structure",
    issues,
    `Found ${storyPack.phaseOutline.length} phases and ${storyPack.soundPlan.length} sound cues.`,
  );
}

function phaseIntensity(text: string): number {
  const normalized = normalizeText(text);
  let score = 1;
  for (const keyword of ESCALATION_KEYWORDS) {
    if (normalized.includes(keyword.token)) {
      score += keyword.weight;
    }
  }

  return score;
}

function evaluateEscalation(storyPack: CreatorStoryPack): EvaluatedCheck {
  const issues: CheckIssue[] = [];
  const phaseText = storyPack.phaseOutline.map((phase) => `${phase.phase} ${phase.goal} ${phase.tone}`);
  if (phaseText.length < 4) {
    issues.push({ severity: "fail", message: "Escalation requires at least 4 phases to evaluate." });
    return withStatus("escalation", issues, "Insufficient phase detail to evaluate escalation.");
  }

  const intensity = phaseText.map((phase) => phaseIntensity(phase));
  const openingToReckoning = intensity.slice(0, 4);
  let rises = 0;
  let drops = 0;
  for (let index = 0; index < openingToReckoning.length - 1; index += 1) {
    if (openingToReckoning[index + 1] > openingToReckoning[index]) rises += 1;
    if (openingToReckoning[index + 1] < openingToReckoning[index]) drops += 1;
  }

  if (openingToReckoning[3] <= openingToReckoning[0]) {
    issues.push({ severity: "fail", message: "Phase 4 does not feel more intense than Phase 1." });
  }

  if (rises < 2) {
    issues.push({ severity: "fail", message: "Escalation trend is too flat across phases 1-4." });
  }

  if (drops > 1) {
    issues.push({ severity: "warn", message: "Escalation regresses in more than one transition." });
  }

  const distinctGoals = new Set(storyPack.phaseOutline.map((phase) => normalizeText(phase.goal))).size;
  if (distinctGoals < 4) {
    issues.push({ severity: "warn", message: "Phase goals are repetitive and reduce escalation contrast." });
  }

  return withStatus(
    "escalation",
    issues,
    `Intensity trend: ${intensity.map((value) => value.toFixed(1)).join(" -> ")}.`,
  );
}

function hasSensoryDetail(text: string): boolean {
  const normalized = normalizeText(text);
  return SENSORY_TERMS.some((term) => normalized.includes(term));
}

function evaluateSensoryDetail(storyPack: CreatorStoryPack): EvaluatedCheck {
  const issues: CheckIssue[] = [];
  const segments = [
    storyPack.logline,
    storyPack.openingLine,
    ...storyPack.phaseOutline.map((phase) => phase.goal),
    ...storyPack.soundPlan.map((cue) => cue.reason),
  ].filter((segment) => segment.trim().length > 0);

  const sensorySegments = segments.filter((segment) => hasSensoryDetail(segment)).length;
  const promptMentionsSensory = /sensory|texture|temperature|smell|sound/i.test(storyPack.systemPromptDraft);
  const coverage = segments.length === 0 ? 0 : sensorySegments / segments.length;

  if (coverage < 0.3) {
    issues.push({ severity: "fail", message: "Too few lines contain concrete sensory details." });
  } else if (coverage < 0.5) {
    issues.push({ severity: "warn", message: "Sensory detail coverage is present but thin." });
  }

  if (!promptMentionsSensory) {
    issues.push({ severity: "warn", message: "System prompt draft does not reinforce sensory writing constraints." });
  }

  return withStatus(
    "sensory-detail",
    issues,
    `Sensory detail coverage: ${Math.round(coverage * 100)}% (${sensorySegments}/${segments.length} segments).`,
    promptMentionsSensory ? 100 : 95,
  );
}

function getRepeatedBigramCount(units: string[]): number {
  const counts = new Map<string, number>();
  for (const unit of units) {
    const tokens = tokenize(unit).filter((token) => !STOP_WORDS.has(token));
    for (let index = 0; index < tokens.length - 1; index += 1) {
      const bigram = `${tokens[index]} ${tokens[index + 1]}`;
      counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
    }
  }

  return Array.from(counts.values()).filter((count) => count >= 3).length;
}

function evaluateUniqueness(storyPack: CreatorStoryPack): EvaluatedCheck {
  const issues: CheckIssue[] = [];
  const units = [
    storyPack.logline,
    storyPack.openingLine,
    ...storyPack.phaseOutline.flatMap((phase) => [phase.goal, phase.tone]),
    ...storyPack.soundPlan.flatMap((cue) => [cue.moment, cue.reason]),
  ].filter((unit) => unit.trim().length > 0);

  const normalizedUnits = units.map((unit) => normalizeText(unit));
  const uniqueUnitRatio = normalizedUnits.length === 0 ? 0 : new Set(normalizedUnits).size / normalizedUnits.length;

  const allTokens = tokenize(normalizedUnits.join(" "));
  const lexicalDiversity = allTokens.length === 0 ? 0 : new Set(allTokens).size / allTokens.length;
  const repeatedBigrams = getRepeatedBigramCount(units);

  if (uniqueUnitRatio < 0.7) {
    issues.push({ severity: "fail", message: "Too many repeated lines across phases/cues." });
  } else if (uniqueUnitRatio < 0.9) {
    issues.push({ severity: "warn", message: "Some repeated lines reduce uniqueness." });
  }

  if (lexicalDiversity < 0.35) {
    issues.push({ severity: "warn", message: "Lexical diversity is low." });
  }

  if (repeatedBigrams >= 4) {
    issues.push({ severity: "warn", message: "Repeated phrasing appears in multiple beats." });
  }

  return withStatus(
    "uniqueness",
    issues,
    `Unique line ratio ${Math.round(uniqueUnitRatio * 100)}%, lexical diversity ${lexicalDiversity.toFixed(2)}.`,
  );
}

function evaluateSoundCoverage(storyPack: CreatorStoryPack): EvaluatedCheck {
  const issues: CheckIssue[] = [];

  const soundBuckets = {
    opening: /\b(open|opening|hook|arrival|intro|start)\b/i,
    escalation: /\b(escalat|warning|danger|pressure|setback|chase|rises?)\b/i,
    climax: /\b(climax|reckoning|confront|core|turn|choice|reveal|decision)\b/i,
    resolution: /\b(resolution|ending|aftermath|closing|dawn|release|epilogue)\b/i,
  };

  const coverage = new Set<keyof typeof soundBuckets>();
  for (const cue of storyPack.soundPlan) {
    const text = `${cue.moment} ${cue.reason}`;
    for (const [bucket, matcher] of Object.entries(soundBuckets) as Array<[keyof typeof soundBuckets, RegExp]>) {
      if (matcher.test(text)) coverage.add(bucket);
    }
  }

  if (storyPack.soundPlan.length < 3) {
    issues.push({ severity: "warn", message: "Add more sound cues to cover key beats." });
  }

  if (coverage.size < 2) {
    issues.push({ severity: "fail", message: "Sound cues do not cover enough narrative moments." });
  } else if (coverage.size < 3) {
    issues.push({ severity: "warn", message: "Sound cues cover only part of the narrative arc." });
  }

  const shortReasons = storyPack.soundPlan.filter((cue) => cue.reason.trim().split(/\s+/).length < 4).length;
  if (shortReasons > 0) {
    issues.push({ severity: "warn", message: `${shortReasons} cue reasons are too short to be production-useful.` });
  }

  return withStatus(
    "sound-coverage",
    issues,
    `Sound coverage hits ${coverage.size}/4 narrative buckets with ${storyPack.soundPlan.length} cues.`,
  );
}

function evaluateSlopDetection(storyPack: CreatorStoryPack): EvaluatedCheck {
  const issues: CheckIssue[] = [];
  const combinedText = normalizeText(
    [
      storyPack.title,
      storyPack.logline,
      storyPack.playerRole,
      storyPack.openingLine,
      storyPack.systemPromptDraft,
      ...storyPack.phaseOutline.flatMap((phase) => [phase.phase, phase.goal, phase.tone]),
      ...storyPack.soundPlan.flatMap((cue) => [cue.moment, cue.reason]),
    ].join(" "),
  );

  const forbiddenHits = FORBIDDEN_PHRASES.filter((phrase) => combinedText.includes(phrase));
  const hedgingHits = HEDGING_WORDS.filter((word) => combinedText.includes(word));
  const clicheMatches = combinedText.match(/\b(mysterious|ominous|haunting|eerie|macabre)\b/g) ?? [];

  if (forbiddenHits.length > 0) {
    issues.push({
      severity: "fail",
      message: `Forbidden/cliche phrases detected: ${forbiddenHits.slice(0, 4).join(", ")}.`,
    });
  }

  if (hedgingHits.length >= 3) {
    issues.push({ severity: "warn", message: "Hedging language is overused." });
  }

  if (clicheMatches.length >= 3) {
    issues.push({ severity: "warn", message: "Genre cliches are overused." });
  }

  return withStatus(
    "slop-detection",
    issues,
    forbiddenHits.length > 0
      ? `Detected ${forbiddenHits.length} blocked phrase hits.`
      : `No blocked phrase hits. Hedging markers: ${hedgingHits.length}.`,
  );
}

function buildHint(check: EvaluatedCheck): string | null {
  if (check.status === "pass") return null;

  if (check.id === "structure") {
    return "Keep exactly 5 complete phases and 3-6 uniquely keyed sound cues; enforce second-person narration in the draft prompt.";
  }

  if (check.id === "escalation") {
    return "Increase stakes phase-by-phase through phases 1-4 so each goal is sharper, riskier, and more consequential than the previous beat.";
  }

  if (check.id === "sensory-detail") {
    return "Add concrete sensory anchors (sound, texture, temperature, smell) to the opening, phase goals, and cue reasons.";
  }

  if (check.id === "uniqueness") {
    return "Replace repeated goals/tones with distinct beats and avoid reusing identical phrasing across the outline.";
  }

  if (check.id === "sound-coverage") {
    return "Map cue moments across opening, escalation, climax, and resolution so audio evolves with the story arc.";
  }

  if (check.id === "slop-detection") {
    return "Remove hedging and banned filler phrases; prefer specific, assertive prose over generic suspense language.";
  }

  return null;
}

export function evaluateCreatorStoryPackQuality(storyPack: CreatorStoryPack): CreatorStoryPackQuality {
  const checks: EvaluatedCheck[] = [
    evaluateStructure(storyPack),
    evaluateEscalation(storyPack),
    evaluateSensoryDetail(storyPack),
    evaluateUniqueness(storyPack),
    evaluateSoundCoverage(storyPack),
    evaluateSlopDetection(storyPack),
  ];

  const qualityScore = clampScore(checks.reduce((total, check) => total + check.score, 0) / checks.length);
  const hasFailure = checks.some((check) => check.status === "fail");
  const hasWarning = checks.some((check) => check.status === "warn");

  const verdict: CreatorStoryPackQualityStatus = hasFailure ? "fail" : hasWarning ? "warn" : "pass";
  const improvementHints = Array.from(new Set(checks.map((check) => buildHint(check)).filter((hint): hint is string => !!hint)));

  return {
    version: "rule-based-v1",
    score: qualityScore,
    verdict,
    checks: checks.map(({ id, status, score, summary }) => ({ id, status, score, summary })),
    improvementHints,
  };
}
