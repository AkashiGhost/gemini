import { describe, expect, it } from "vitest";
import type { CreatorStoryPack } from "@/lib/config/creator";
import { evaluateCreatorStoryPackQuality } from "@/lib/creator/story-pack-quality";

const STRONG_STORY_PACK: CreatorStoryPack = {
  title: "The Last Beacon",
  logline: "A coastal signal pilot decodes impossible weather broadcasts before the harbor collapses.",
  playerRole: "You are the station's youngest signal pilot, balancing duty and fear.",
  openingLine: "Salt spray needles your face as the warning klaxon rattles the tower glass.",
  phaseOutline: [
    { phase: "Phase 1 - Hook", goal: "Secure the beacon room before the first blackout.", tone: "Uneasy curiosity" },
    { phase: "Phase 2 - Escalation", goal: "Trace a second signal that predicts private memories.", tone: "Mounting dread" },
    { phase: "Phase 3 - Discovery", goal: "Choose which survivor to believe as the floor vibrates underfoot.", tone: "Paranoid urgency" },
    { phase: "Phase 4 - Reckoning", goal: "Confront the source in the flooded turbine shaft.", tone: "High-pressure confrontation" },
    { phase: "Phase 5 - Resolution", goal: "Seal the beacon and live with the consequence at dawn.", tone: "Somber release" },
  ],
  soundPlan: [
    { id: "cue-opening", moment: "Opening blackout", reason: "Anchor the hook with alarm bell distortion." },
    { id: "cue-escalation", moment: "Second signal appears", reason: "Introduce metallic whispers as stakes rise." },
    { id: "cue-climax", moment: "Turbine shaft confrontation", reason: "Drive pulse and sub-bass during the climax choice." },
    { id: "cue-resolution", moment: "Dawn aftermath", reason: "Release tension with sparse rain and distant gulls." },
  ],
  systemPromptDraft:
    "Use second person, escalate phase by phase, and keep sensory details concrete (spray, static, cold steel, ozone smell).",
};

const WEAK_STORY_PACK: CreatorStoryPack = {
  title: "Dark Room",
  logline: "Something felt wrong in a mysterious place.",
  playerRole: "You are maybe involved somehow.",
  openingLine: "It was dark and something felt wrong.",
  phaseOutline: [
    { phase: "Phase 1", goal: "Investigate the room", tone: "tense" },
    { phase: "Phase 2", goal: "Investigate the room", tone: "tense" },
    { phase: "Phase 3", goal: "Investigate the room", tone: "tense" },
    { phase: "Phase 4", goal: "Investigate the room", tone: "tense" },
    { phase: "Phase 5", goal: "Investigate the room", tone: "tense" },
  ],
  soundPlan: [{ id: "cue", moment: "middle", reason: "Maybe tension rises." }],
  systemPromptDraft:
    "I understand. Perhaps the air grew thick. Maybe it could be that something felt wrong and darkness enveloped everything.",
};

describe("evaluateCreatorStoryPackQuality", () => {
  it("returns pass-level checks for a strong story pack", () => {
    const quality = evaluateCreatorStoryPackQuality(STRONG_STORY_PACK);

    expect(quality.version).toBe("rule-based-v1");
    expect(quality.score).toBeGreaterThanOrEqual(70);
    expect(quality.checks).toHaveLength(6);
    expect(quality.checks.every((check) => check.status === "pass")).toBe(true);
    expect(quality.improvementHints).toHaveLength(0);
  });

  it("flags slop and weak escalation with actionable hints", () => {
    const quality = evaluateCreatorStoryPackQuality(WEAK_STORY_PACK);
    const slopCheck = quality.checks.find((check) => check.id === "slop-detection");
    const escalationCheck = quality.checks.find((check) => check.id === "escalation");
    const uniquenessCheck = quality.checks.find((check) => check.id === "uniqueness");

    expect(quality.score).toBeLessThan(60);
    expect(quality.verdict).toBe("fail");
    expect(slopCheck?.status).toBe("fail");
    expect(escalationCheck?.status).not.toBe("pass");
    expect(uniquenessCheck?.status).not.toBe("pass");
    expect(quality.improvementHints.length).toBeGreaterThan(0);
  });
});
