# Player Profile Schema Design

Date: 2026-03-09
Status: Approved direction for v1 planning
Scope: Local-first player profile system for personalized InnerPlay games without a database

## Goal

Define a `PlayerProfile` system that works without a database in v1, supports future cross-game personalization, and feeds a flagship personalized game (`Me and Mes`) without over-inferring from user data.

---

## Product Position

This is not a diagnostic system.

It is:

1. a personalization layer for interactive fiction
2. a structured memory layer for game generation
3. a user-reviewed self-model for story conditioning

It is not:

1. a psychological diagnosis
2. a hidden inference engine
3. a raw memory dump passed into every runtime prompt

---

## v1 Principles

1. `Local-first`
- no database required in v1
- browser/local storage is enough for proof

2. `Questionnaire-first`
- v1 should not depend on imported external AI memory
- imported memory can be added after the review loop is stable

3. `User-reviewed`
- every inferred profile must be editable
- nothing psychologically sensitive should be silently locked in

4. `Bounded runtime context`
- games should consume only a small profile slice
- never send the full raw profile or imported transcript into runtime prompts

5. `Portable to future DB`
- the schema should be easy to persist in Postgres/JSON later

---

## Recommended v1 Schema

```ts
type PlayerProfileV1 = {
  id: string;
  version: 1;
  source: {
    questionnaire: boolean;
    importedMemory: boolean;
    importedMemoryProvider?: "chatgpt" | "claude" | "gemini" | "other";
    generatedAt: string;
  };
  consent: {
    profileApproved: boolean;
    personalizedGamesApproved: boolean;
    roastModeApproved: boolean;
    importedMemoryApproved: boolean;
  };
  identitySummary: {
    selfDescription: string;
    currentLifeStage: string;
    coreValues: string[];
    recurringGoals: string[];
  };
  behavioralProfile: {
    conflictStyle: "avoid" | "appease" | "attack" | "analyze" | "mixed";
    pressureTolerance: "low" | "medium" | "high";
    roastTolerance: "low" | "medium" | "high";
    attachmentTendency: "secure" | "anxious" | "avoidant" | "mixed" | "unknown";
  };
  emotionalMap: {
    dominantEmotions: string[];
    avoidedEmotions: string[];
    emotionalHotspots: string[];
    shameTriggers: string[];
    griefPoints: string[];
    angerPatterns: string[];
  };
  narrativeProfile: {
    unfinishedDecisions: string[];
    recurringConflicts: string[];
    selfStoryFragments: string[];
    ambitions: string[];
    regrets: string[];
    fearedIdentities: string[];
    desiredIdentities: string[];
  };
  castSeed: {
    candidateSelves: Array<{
      name: string;
      function: string;
      emotionFamily: string;
      primaryFear: string;
      primaryDesire: string;
      triggerTopics: string[];
    }>;
  };
  safety: {
    hardLimits: string[];
    softLimits: string[];
    protectedTopics: string[];
    protectedRelationships: string[];
  };
  review: {
    userConfirmed: boolean;
    userEdited: boolean;
    lastReviewedAt?: string;
  };
};
```

---

## Why This Schema

It is small enough for v1, but already supports:

1. story conditioning
2. emotional cast generation
3. safety boundaries
4. future DB storage
5. future cross-game persistence

It avoids the biggest failure mode:

1. storing a huge blob of psychologically loaded text and pretending it is a reliable player model

---

## Input Flows

## Flow A: In-Product Questionnaire

This is the primary v1 path.

The questionnaire should use situational prompts, not generic trait labels.

Good domains:

1. rejection / ambiguity
2. conflict / boundary violation
3. failure / shame
4. closeness / dependence
5. success / visibility
6. regret / roads not taken

Output:

1. draft `PlayerProfileV1`
2. user review/edit screen
3. approved profile

## Flow B: Imported Memory

This should exist in the architecture, but can be postponed operationally until after v1.

If enabled later:

1. accept pasted text first
2. parse into draft profile fields
3. require manual user review
4. never pass raw imported memory directly into runtime

---

## Review and Edit Step

This is mandatory.

The user must be able to:

1. rewrite self-summary
2. delete inferred triggers
3. remove candidate selves
4. mark topics off-limits
5. set confrontation intensity
6. disable profile use per game if desired

Suggested UI sections:

1. `This seems true`
2. `This seems wrong`
3. `Do not use these topics`
4. `Possible selves we found`
5. `How intense should this get`

---

## Profile Slice For Runtime

Games should not receive the full profile.

Instead, each game should receive a bounded subset such as:

```ts
type GameProfileContext = {
  dominantEmotions: string[];
  avoidedEmotions: string[];
  unfinishedDecisions: string[];
  desiredIdentities: string[];
  fearedIdentities: string[];
  candidateSelves: string[];
  hardLimits: string[];
  roastTolerance: "low" | "medium" | "high";
};
```

This keeps prompts:

1. faster
2. safer
3. easier to debug

---

## Current Integration Points

Best places to extend:

1. [CreatorInterview.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/components/creator/CreatorInterview.tsx)
- add profile entry, import, and review UI

2. [config/creator.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/config/creator.ts)
- add profile-aware types and request payloads

3. [published-story.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/published-story.ts)
- add optional profile metadata for stories

4. [GameContext.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/context/GameContext.tsx)
- hand bounded profile slice into session kickoff and game state

5. [story-runtime.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/story-runtime.ts)
- extend runtime modes for profile-conditioned play

---

## Risks

1. `Over-inference`
- the game will feel fake or invasive if it claims too much certainty

2. `Prompt bloat`
- profile stuffing will hurt latency and output quality

3. `Trust failure`
- roast/confrontation without clear consent will damage the product

4. `Schema sprawl`
- too many fields too early will slow everything down

---

## v1 Recommendation

Ship profile v1 as:

1. local-only
2. questionnaire-first
3. reviewed and editable
4. bounded profile slice at runtime
5. no DB dependency
6. no raw imported memory dependency

That is the cleanest foundation for `Me and Mes`.

