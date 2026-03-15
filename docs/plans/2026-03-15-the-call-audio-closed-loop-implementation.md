# The Call Audio Closed-Loop Implementation Plan

Date: 2026-03-15
Status: Proposed
Target story: `the-call`
Target environment: `dev`
Max execution rounds before escalation: `2`

## Approach

Build `the-call` on the deterministic single-cast path that already matches the story's needs: one protected Gemini Live voice plus a local state-driven sound director. Keep Gemini responsible for Alex's dialogue and emotional pacing, but move timing-critical sound execution to explicit local events and state transitions. Deliver this in a closed loop: test-first, browser-verified, CLI-verifiable, and reversible through the existing runtime architecture selector.

## Why This Is The Right Architecture For `the-call`

`the-call` is a one-cast story. It does not need multi-character floor arbitration. The best architecture for it is the existing `state_director_v2_candidate` path, completed and hardened, not the broader multi-cast `foreground_live_hybrid_cast_v4`.

This path fits the story because it can deterministically control:

- movement and footsteps
- keypad and panel interactions
- door attempts and forced impacts
- water escalation as persistent environmental threat
- breathing/tension escalation
- room-based ambience and loop layering

It also keeps rollback safe because `hybrid_fallback_v1` already exists as the fallback architecture selector.

## Current Truth

Already in repo:

- `the-call` is already configured to use `state_director_v2_candidate`
- authored `the-call` sound assets already exist
- `TheCallStateDirector` already handles part of the event/state mapping
- unit tests already cover some state-director behavior
- browser verification and CLI verification infrastructure already exist

Still missing or incomplete:

- full coverage of all relevant `the-call` interactions using existing sounds
- clean separation between authoritative `the-call` state logic and transcript fallback heuristics
- deterministic runtime trace proving why each sound fired
- CLI/browser verification dedicated to `the-call` audio behavior
- closed-loop DoD proving the story is stable enough for ear testing

## Available `the-call` Sound Assets

Ambient / loops:

- `call_bed`
- `room_ambience`
- `electrical_hum`
- `phone_static`
- `sub_bass`
- `water_leak_loop`
- `water_rising_loop`
- `water_slosh_loop`

One-shots / SFX:

- `anxious_breathing`
- `disconnect_tone`
- `door_creak`
- `door_slam`
- `footsteps`
- `footsteps_fast`
- `heavy_breathing`
- `keypad_beep`
- `keypad_confirm`
- `keypad_invalid`
- `metal_scrape`
- `pickup_click`
- `pipe_clank`
- `water_drip`

## Definition Of Done

The task is only complete when all of the following are true:

1. `the-call` runs on a deterministic state-driven audio path for all core environmental and interaction sounds.
2. The story uses existing `the-call` file assets for those sounds where available.
3. Core interactions have explicit sound coverage:
   - movement
   - fast movement
   - keypad/panel attempt
   - keypad success
   - keypad failure
   - cautious door attempt
   - forced door attempt
   - water probe
   - water escalation
   - breathing/tension escalation
   - restart/reset after death loop
4. `the-call` no longer depends on generic transcript keyword fallback for its primary sound behavior except for an explicitly documented guarded fallback path.
5. A deterministic debug trace shows `event -> state change -> sound action -> sound id`.
6. Unit tests prove the state director behavior.
7. A CLI verification command proves the expected audio-event routing for canonical `the-call` scenarios.
8. A browser verification flow proves the story still starts and runs in `dev`.
9. Rollback to `hybrid_fallback_v1` remains one configuration change.

## Execution Skills

Planning / scope:

- `brainstorming`
- `concise-planning`
- `closed-loop-delivery`

Implementation:

- `test-driven-development`
- `architect-review`

Verification:

- `verification-before-completion`
- `playwright`

## Scope

In:

- `the-call` only
- deterministic single-cast audio behavior
- use of existing `the-call` authored sounds
- event/state mapping improvements
- runtime debug trace and verification tooling
- additive and reversible changes

Out:

- multi-character audio architecture
- full Gemini emotion/prompt redesign
- new generative music system
- unrelated story migrations
- production deploy

## Action Items

- [ ] Freeze the runtime boundary for `the-call`: keep `state_director_v2_candidate` as the target path and preserve `hybrid_fallback_v1` as rollback in `src/lib/story-runtime.ts`.
- [ ] Create a full `the-call` event-to-sound matrix from existing assets, documenting which interaction or state transition triggers which sound and which cases intentionally have no sound.
- [ ] Extend `TheCallStateDirector` to cover the complete `the-call` interaction/state surface using high-level events and explicit state transitions rather than raw file-name pushes.
- [ ] Refactor `useSoundEngine` so `the-call` uses the director as the authoritative path and generic transcript fallback is either bypassed or demoted to guarded telemetry-only fallback for this story.
- [ ] Add deterministic runtime tracing for `the-call` audio decisions so every triggered sound can be explained by event, state, and reason.
- [ ] Expand unit coverage around the state director, sound asset coverage, reset behavior, and any new routing logic using TDD.
- [ ] Add a dedicated CLI verification script for canonical `the-call` audio scenarios that asserts ordered sound actions and failure diagnostics.
- [ ] Add browser-level verification for `the-call` in `dev`, reusing Playwright/Python automation to assert startup, live session readiness, and presence of runtime audio trace markers.
- [ ] Run the closed-loop verification stack: targeted unit tests, new CLI audio verification, existing scenario checks, build, and browser verification.
- [ ] Compare the deterministic path against the fallback path on `the-call`, keep the selector reversible, and only then treat the story as ready for manual ear validation.

## Verification Commands To Add Or Use

Existing:

- `npx vitest run tests/unit/the-call-state-director.test.ts`
- `npx vitest run tests/unit/sound-assets.test.ts tests/unit/story-runtime.test.ts`
- `npx tsx scripts/closed-loop-scenario.ts`
- `python scripts/verify_loop.py`
- `npm run build`

New planned verification:

- `npx tsx scripts/verify-the-call-audio.ts`
- `APP_URL=http://127.0.0.1:<port> PLAY_STORY=the-call python scripts/e2e_test.py`

## Order Of Execution

Phase 1: Lock the sound contract

- inventory sounds
- define the event/state matrix
- define the missing coverage

Phase 2: Make the director authoritative

- route `the-call` through explicit event/state updates
- remove reliance on generic heuristic timing for core sounds

Phase 3: Add proof

- unit tests
- CLI scenario verification
- debug trace

Phase 4: Run the closed loop

- local verification
- browser verification
- fallback comparison
- manual ear pass by user

## Risks

- Some moments in `the-call` may still be too semantically vague for perfect automatic inference from free-form narration alone.
- Existing assets may not cover every desired interaction; in those cases the plan must explicitly mark "no sound" or reuse an intentional nearby cue rather than inventing new behavior.
- Browser verification cannot prove perceived audio quality by itself; it can only prove event routing and runtime behavior. Final ear validation remains necessary.

## Blockers That Would Stop Implementation

- Missing or broken `the-call` asset files
- inability to observe runtime audio decisions in browser automation
- a regression that makes rollback to `hybrid_fallback_v1` non-trivial

## Success Evidence Expected At The End

- passing targeted unit tests
- passing `verify-the-call-audio` CLI output
- passing browser verification on `the-call`
- build passes
- debug trace shows deterministic reasons for sound events
- user ear test confirms sounds happen at the right time and place
