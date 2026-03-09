import { describe, expect, it, afterEach, vi } from "vitest";
import {
  PLAYER_PROFILE_STORAGE_KEY,
  buildGameProfileContext,
  clearPlayerProfile,
  createPlayerProfileDraft,
  loadPlayerProfile,
  normalizeGameProfileContext,
  normalizePlayerProfile,
  savePlayerProfile,
} from "../../src/lib/player-profile";

type MockStorage = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

function installMockWindow(initialValue?: string): MockStorage {
  let store = initialValue;
  const storage: MockStorage = {
    getItem: vi.fn((key: string) => (key === PLAYER_PROFILE_STORAGE_KEY ? store ?? null : null)),
    setItem: vi.fn((key: string, value: string) => {
      if (key === PLAYER_PROFILE_STORAGE_KEY) {
        store = value;
      }
    }),
    removeItem: vi.fn((key: string) => {
      if (key === PLAYER_PROFILE_STORAGE_KEY) {
        store = undefined;
      }
    }),
  };

  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });

  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { window?: Window }).window;
});

describe("player-profile", () => {
  it("creates a normalized local-first player profile draft", () => {
    const profile = createPlayerProfileDraft({
      selfDescription: "I am driven, impatient, and usually overthink after conflict.",
      currentLifeStage: "Building a company while trying not to lose myself.",
      coreValues: ["freedom", "truth", "impact", "truth"],
      recurringGoals: ["Build something meaningful", "Feel calmer"],
      importedMemory: "Cancelled move to Berlin\nFelt guilty after leaving a team behind",
      importedMemoryProvider: "chatgpt",
      conflictStyle: "analyze",
      pressureTolerance: "high",
      roastTolerance: "medium",
      attachmentTendency: "mixed",
      dominantEmotions: ["anxiety", "anger"],
      avoidedEmotions: ["grief"],
      emotionalHotspots: ["being ignored", "public failure"],
      unfinishedDecisions: ["Move abroad", "End a relationship cleanly"],
      desiredIdentities: ["calm leader"],
      fearedIdentities: ["coward"],
      hardLimits: ["family trauma"],
    });

    expect(profile.version).toBe(1);
    expect(profile.identitySummary.coreValues).toEqual(["freedom", "truth", "impact"]);
    expect(profile.source.importedMemory).toBe(true);
    expect(profile.castSeed.candidateSelves.map((self) => self.name)).toContain("The Strategist");
    expect(profile.castSeed.candidateSelves.map((self) => self.name)).toContain("The Alarm");
  });

  it("normalizes unsafe input and preserves reviewable structure", () => {
    const profile = normalizePlayerProfile({
      id: "profile-123",
      source: { questionnaire: true, importedMemory: true, importedMemoryProvider: "claude", generatedAt: "2026-03-09T08:00:00.000Z" },
      consent: { profileApproved: true, personalizedGamesApproved: true },
      identitySummary: { selfDescription: "  Wants to be seen  ", currentLifeStage: "Mid-transition", coreValues: ["care", "care"], recurringGoals: ["heal"] },
      behavioralProfile: { conflictStyle: "appease", pressureTolerance: "low", roastTolerance: "low", attachmentTendency: "anxious" },
      emotionalMap: { dominantEmotions: ["shame"], avoidedEmotions: ["anger"], emotionalHotspots: ["abandonment"] },
      narrativeProfile: { unfinishedDecisions: ["leave"], recurringConflicts: ["staying too long"], ambitions: ["peace"], regrets: ["silence"], fearedIdentities: ["selfish"], desiredIdentities: ["steady"], selfStoryFragments: ["old note"] },
      safety: { hardLimits: ["self-harm"], protectedTopics: ["mother"] },
      review: { userConfirmed: true },
    });

    expect(profile).not.toBeNull();
    expect(profile?.behavioralProfile.conflictStyle).toBe("appease");
    expect(profile?.consent.profileApproved).toBe(true);
    expect(profile?.review.userConfirmed).toBe(true);
    expect(profile?.castSeed.candidateSelves.map((self) => self.name)).toContain("The Diplomat");
  });

  it("builds a bounded runtime context from the full profile", () => {
    const profile = createPlayerProfileDraft({
      dominantEmotions: ["fear", "shame", "anger", "grief", "envy"],
      avoidedEmotions: ["joy", "grief", "dependency"],
      unfinishedDecisions: ["leave the company", "call my father", "move city"],
      desiredIdentities: ["writer", "calmer partner"],
      fearedIdentities: ["fraud"],
      roastTolerance: "high",
      hardLimits: ["self-harm", "medical trauma"],
    });

    const runtime = buildGameProfileContext(profile);

    expect(runtime.dominantEmotions).toEqual(["fear", "shame", "anger", "grief"]);
    expect(runtime.hardLimits).toEqual(["self-harm", "medical trauma"]);
    expect(runtime.candidateSelves.length).toBeGreaterThan(0);
    expect(runtime.roastTolerance).toBe("high");
  });

  it("normalizes runtime context payloads defensively", () => {
    const runtime = normalizeGameProfileContext({
      dominantEmotions: ["fear", "fear", "shame"],
      avoidedEmotions: ["grief"],
      unfinishedDecisions: ["leave", "leave"],
      desiredIdentities: ["steady"],
      fearedIdentities: ["fraud"],
      candidateSelves: ["The Alarm", "The Witness", "The Alarm"],
      hardLimits: ["family trauma"],
      roastTolerance: "low",
    });

    expect(runtime).toEqual({
      dominantEmotions: ["fear", "shame"],
      avoidedEmotions: ["grief"],
      unfinishedDecisions: ["leave"],
      desiredIdentities: ["steady"],
      fearedIdentities: ["fraud"],
      candidateSelves: ["The Alarm", "The Witness"],
      hardLimits: ["family trauma"],
      roastTolerance: "low",
    });
  });

  it("round-trips a saved profile through local storage", () => {
    const storage = installMockWindow();
    const profile = createPlayerProfileDraft({
      selfDescription: "Trying to become less defended.",
      roastTolerance: "high",
      dominantEmotions: ["fear"],
      unfinishedDecisions: ["leave"],
    });

    savePlayerProfile(profile);
    const loaded = loadPlayerProfile();

    expect(storage.setItem).toHaveBeenCalledWith(PLAYER_PROFILE_STORAGE_KEY, expect.any(String));
    expect(loaded?.id).toBe(profile.id);
    expect(loaded?.identitySummary.selfDescription).toBe("Trying to become less defended.");
    expect(loaded?.behavioralProfile.roastTolerance).toBe("high");
  });

  it("returns null for malformed stored profile payloads", () => {
    installMockWindow("{not-json");

    expect(loadPlayerProfile()).toBeNull();
  });

  it("is safe to call storage helpers without a browser window", () => {
    const profile = createPlayerProfileDraft({ selfDescription: "No window available." });

    expect(() => savePlayerProfile(profile)).not.toThrow();
    expect(loadPlayerProfile()).toBeNull();
    expect(() => clearPlayerProfile()).not.toThrow();
  });

  it("clears the stored profile", () => {
    const storage = installMockWindow(JSON.stringify(createPlayerProfileDraft({ selfDescription: "Persist me." })));

    clearPlayerProfile();

    expect(storage.removeItem).toHaveBeenCalledWith(PLAYER_PROFILE_STORAGE_KEY);
    expect(loadPlayerProfile()).toBeNull();
  });
});
