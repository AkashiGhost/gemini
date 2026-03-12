# InnerPlay Audio V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move sound behavior to explicit story metadata and authored manifests, then migrate `Me and Mes` to the new Audio V2 structure.

**Architecture:** Published stories carry explicit `soundProfileId` metadata. A new authored sound-manifest layer owns volumes, panning, timelines, and cue mappings. An `AudioDirector` translates runtime events into engine actions, while `useSoundEngine` becomes infrastructure instead of a content dump.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing Web Audio sound engine, Playwright/browser verification on Cloud Run.

---

### Task 1: Add explicit sound-profile metadata to published stories

**Files:**
- Modify: `src/lib/published-story.ts`
- Modify: `src/lib/published-story-catalog.ts`
- Modify: `src/components/creator/CreatorInterview.tsx`
- Modify: `src/app/play/page.tsx`
- Modify: `src/lib/sound-profile.ts`
- Test: `tests/unit/published-story.test.ts`
- Test: `tests/unit/sound-profile.test.ts`

**Step 1: Write the failing tests**
- Add a test that preserves `soundProfileId` through normalization.
- Add a test that prefers explicit manifest `soundProfileId` over title matching.

**Step 2: Run tests to verify they fail**

Run:
`npx vitest run tests/unit/published-story.test.ts tests/unit/sound-profile.test.ts`

**Step 3: Write minimal implementation**
- Extend `PublishedStoryManifest` with `soundProfileId?: string`.
- Normalize and persist `soundProfileId` in published stories.
- Publish `Me and Mes` with explicit `soundProfileId: "me-and-mes"`.
- Update play-page sound-profile resolution to pass manifest metadata, not just title.

**Step 4: Run tests to verify they pass**

Run:
`npx vitest run tests/unit/published-story.test.ts tests/unit/sound-profile.test.ts`

---

### Task 2: Extract authored sound manifests

**Files:**
- Create: `src/lib/audio/sound-manifests.ts`
- Modify: `src/hooks/useSoundEngine.ts`
- Test: `tests/unit/sound-manifests.test.ts`

**Step 1: Write the failing tests**
- Add tests for loading the `me-and-mes` manifest.
- Add tests for fallback to the default built-in manifest.

**Step 2: Run test to verify it fails**

Run:
`npx vitest run tests/unit/sound-manifests.test.ts`

**Step 3: Write minimal implementation**
- Move timeline, spatial map, and default volume data into `sound-manifests.ts`.
- Export helpers to fetch a manifest by `soundProfileId`.
- Update `useSoundEngine` to consume manifest data instead of hardcoded constants.

**Step 4: Run test to verify it passes**

Run:
`npx vitest run tests/unit/sound-manifests.test.ts`

---

### Task 3: Introduce the audio-director layer

**Files:**
- Create: `src/lib/audio/audio-director.ts`
- Modify: `src/hooks/useSoundEngine.ts`
- Test: `tests/unit/audio-director.test.ts`

**Step 1: Write the failing tests**
- Add tests that map `Me and Mes` runtime events to authored sound cues.
- Add tests for no-op behavior when a profile has no cue for an event.

**Step 2: Run test to verify it fails**

Run:
`npx vitest run tests/unit/audio-director.test.ts`

**Step 3: Write minimal implementation**
- Create `AudioDirector` with methods for handling runtime events.
- Route the current `Me and Mes` threshold / first-ai / ending special cases through the director.
- Remove direct story-specific imperative sound branching from the hook where replaced.

**Step 4: Run test to verify it passes**

Run:
`npx vitest run tests/unit/audio-director.test.ts`

---

### Task 4: Verify regression safety for the current sound path

**Files:**
- Modify: `tests/unit/sound-profile.test.ts`
- Modify: `tests/unit/sound-manifests.test.ts`
- Modify: `tests/unit/audio-director.test.ts`
- Optionally modify: `tests/unit/story-runtime.test.ts`

**Step 1: Add regression checks**
- `Me and Mes` creator-published stories resolve the correct profile through metadata.
- Default stories still resolve correctly.
- Unknown stories still fall back safely.

**Step 2: Run targeted suite**

Run:
`npx vitest run tests/unit/published-story.test.ts tests/unit/sound-profile.test.ts tests/unit/sound-manifests.test.ts tests/unit/audio-director.test.ts tests/unit/story-runtime.test.ts`

**Step 3: Fix failures until green**

**Step 4: Re-run targeted suite**

Run:
`npx vitest run tests/unit/published-story.test.ts tests/unit/sound-profile.test.ts tests/unit/sound-manifests.test.ts tests/unit/audio-director.test.ts tests/unit/story-runtime.test.ts`

---

### Task 5: Full build and hosted verification

**Files:**
- No required code changes unless verification finds issues.

**Step 1: Run build**

Run:
`npm run build`

**Step 2: If build passes, deploy using the existing Cloud Run workflow**

**Step 3: Verify on the hosted website**
- open `/play?published=published-me-and-mes`
- confirm onboarding still loads
- confirm session still starts
- confirm no published-story sound-profile regression

**Step 4: Stop-and-fix**
- if any browser/runtime failure appears, patch and rerun tests/build/hosted verification before moving on.

---

Plan complete and saved to `docs/plans/2026-03-12-innerplay-audio-v2-design.md` and `docs/plans/2026-03-12-innerplay-audio-v2-implementation.md`.
