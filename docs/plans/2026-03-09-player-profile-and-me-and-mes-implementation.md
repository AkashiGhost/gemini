# Player Profile And Me and Mes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-first player profile system and use it to create and validate the first personalized flagship game, `Me and Mes`, through the actual creator pipeline and hosted Playwright loop.

**Architecture:** Add a reviewed local `PlayerProfileV1` layer, integrate a bounded profile slice into creator/runtime inputs, then build `Me and Mes` as a single-live-voice cast-illusion game. Validate with creator UI, published route, and debugText/Playwright branch tests on the hosted site.

**Tech Stack:** Next.js App Router, React, current creator pipeline, published-story manifest flow, Gemini Live, browser local storage, Playwright/debugText test loop, Vitest.

---

### Task 1: Define profile types and local storage contract

**Files:**
- Create: `src/lib/player-profile.ts`
- Create: `tests/unit/player-profile.test.ts`
- Modify: `src/lib/config/creator.ts`

**Step 1: Write the failing test**

Cover:
- create/normalize `PlayerProfileV1`
- validate required fields
- derive bounded `GameProfileContext`

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/player-profile.test.ts`

**Step 3: Write minimal implementation**

Implement:
- `PlayerProfileV1` type
- normalization helpers
- `buildGameProfileContext(profile)`
- local storage key helpers

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/player-profile.test.ts`

**Step 5: Commit**

```bash
git add src/lib/player-profile.ts tests/unit/player-profile.test.ts src/lib/config/creator.ts
git commit -m "feat(profile): add local player profile types"
```

### Task 2: Add questionnaire-first profile UI

**Files:**
- Create: `src/components/profile/PlayerProfileBuilder.tsx`
- Create: `tests/unit/PlayerProfileBuilder.test.tsx`
- Modify: `src/components/creator/CreatorInterview.tsx`

**Step 1: Write the failing test**

Cover:
- situational questions render
- draft profile is created
- review state appears

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/PlayerProfileBuilder.test.tsx`

**Step 3: Write minimal implementation**

Implement:
- questionnaire UI
- review/edit step
- local save/load
- handoff into creator state

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/PlayerProfileBuilder.test.tsx`

**Step 5: Commit**

```bash
git add src/components/profile/PlayerProfileBuilder.tsx tests/unit/PlayerProfileBuilder.test.tsx src/components/creator/CreatorInterview.tsx
git commit -m "feat(profile): add questionnaire and review flow"
```

### Task 3: Thread profile context into creator story-pack generation

**Files:**
- Modify: `src/app/api/creator/story-pack/route.ts`
- Modify: `src/lib/config/creator.ts`
- Create: `tests/contract/creator-story-pack.profile.route.test.ts`

**Step 1: Write the failing test**

Cover:
- story-pack request accepts bounded profile context
- output stays valid when profile is present

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contract/creator-story-pack.profile.route.test.ts`

**Step 3: Write minimal implementation**

Implement:
- request type additions
- profile-conditioned prompt assembly
- keep prompt bounded and safety-limited

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/contract/creator-story-pack.profile.route.test.ts`

**Step 5: Commit**

```bash
git add src/app/api/creator/story-pack/route.ts src/lib/config/creator.ts tests/contract/creator-story-pack.profile.route.test.ts
git commit -m "feat(creator): accept bounded player profile context"
```

### Task 4: Extend published-story metadata for profile-aware play

**Files:**
- Modify: `src/lib/published-story.ts`
- Modify: `src/lib/published-story-play.ts`
- Modify: `src/lib/play-story-selection.ts`
- Create: `tests/unit/published-story.profile.test.ts`

**Step 1: Write the failing test**

Cover:
- profile-aware manifest fields normalize safely
- profile metadata survives publish/load path

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/published-story.profile.test.ts`

**Step 3: Write minimal implementation**

Implement optional fields like:
- `profileMode`
- `profileSummary`
- `castMode`

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/published-story.profile.test.ts`

**Step 5: Commit**

```bash
git add src/lib/published-story.ts src/lib/published-story-play.ts src/lib/play-story-selection.ts tests/unit/published-story.profile.test.ts
git commit -m "feat(play): add profile-aware published story metadata"
```

### Task 5: Add onboarding Back / Exit / Skip intro

**Files:**
- Modify: `src/components/game/OnboardingFlow.tsx`
- Create: `tests/unit/onboarding-navigation.test.tsx`
- Modify: `src/app/play/page.tsx`

**Step 1: Write the failing test**

Cover:
- previous scene navigation
- clean exit before session start
- skip intro path

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/onboarding-navigation.test.tsx`

**Step 3: Write minimal implementation**

Implement:
- `Back`
- `Exit`
- `Skip intro`

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/onboarding-navigation.test.tsx`

**Step 5: Commit**

```bash
git add src/components/game/OnboardingFlow.tsx src/app/play/page.tsx tests/unit/onboarding-navigation.test.tsx
git commit -m "feat(play): add onboarding navigation controls"
```

### Task 6: Create Me and Mes through the real creator pipeline

**Files:**
- Modify: `src/lib/published-story-catalog.ts` only if needed for a hosted fallback
- Create temp automation only if it materially speeds iteration

**Step 1: Draft the creator inputs**

Prepare:
- facilitator-led concept prompt
- opening line
- phase outline
- sound plan
- strict system prompt

**Step 2: Use the real `/create` UI**

Required:
- create story pack
- review fields manually
- publish

**Step 3: Validate that the published route opens**

Use the hosted URL, not localhost.

**Step 4: Commit**

Commit any durable creator/published-story changes only.

### Task 7: Build the hosted Playwright evaluation loop for Me and Mes

**Files:**
- Create: `scripts/me_and_mes_eval.py`
- Possibly modify: existing debugText helper scripts

**Step 1: Write the evaluation script**

Test personas:
- skeptical first-time user
- shame-dominant user
- anger-first user
- avoidant/intellectualizing user

**Step 2: Run it against the hosted site**

Expected:
- concept clear by turn 2
- selves distinct by turn 4
- player knows what to say next

**Step 3: Fail on ambiguity**

Explicit fail markers:
- unclear premise
- interchangeable selves
- no next-action affordance
- generic therapy filler

**Step 4: Commit**

```bash
git add scripts/me_and_mes_eval.py
git commit -m "test(play): add Me and Mes hosted evaluation loop"
```

### Task 8: Iterate on Me and Mes until branch quality is real

**Files:**
- Creator-generated pack and any durable fallback manifest files
- Prompt files only if runtime-level fixes are required

**Step 1: Run hosted evaluation**

Run:
- creator publish
- hosted debugText loop

**Step 2: Tighten content**

Fix in this order:
1. opening clarity
2. phase structure
3. self functional distinctness
4. ending consequence

**Step 3: Re-run hosted evaluation**

Repeat until:
- all personas pass
- concept is clear
- branch differences are meaningful

**Step 4: Commit**

Commit content/runtime changes only after hosted proof.

### Task 9: Add imported memory as a postponed follow-up

**Files:**
- Create later after v1 is proven

**Step 1: Do not implement this inside v1**

Leave this explicitly out of the first milestone unless the questionnaire-first loop already works.

---

## Final Verification

Before claiming completion, run:

```bash
npx vitest run tests/unit/player-profile.test.ts tests/unit/PlayerProfileBuilder.test.tsx tests/unit/published-story.profile.test.ts tests/unit/onboarding-navigation.test.tsx tests/unit/model-text-sanitizer.test.ts tests/unit/published-story-play.test.ts tests/unit/play-story-selection.test.ts
npm run build
python -u scripts/me_and_mes_eval.py
```

Expected:

1. tests pass
2. build passes
3. hosted Me and Mes evaluation passes against the real website

---

Plan complete and saved to `docs/plans/2026-03-09-player-profile-and-me-and-mes-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?

