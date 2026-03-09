# plan.md

This file is the active milestone controller for closed-loop recovery of the live game runtime.

## Rules

1. Review-first: inspect target runtime code, tests, and current production behavior before editing.
2. Stop-and-fix: after each milestone, run its validation command. If it fails, repair before continuing.
3. Close-the-loop: every production-facing milestone needs local verification plus hosted verification where applicable.
4. Do not mark a milestone `done` until its acceptance criteria and validation command both pass.

## Milestones

| Milestone | Scope | Acceptance Criteria | Validation Command | Status | Notes |
|---|---|---|---|---|---|
| M1 | Prompt/runtime alignment for live stories | Tool instructions are absent when live runtime tools are disabled; live stories enforce short opening constraints | `npx vitest run tests/unit/story-runtime.test.ts tests/unit/story-prompts.test.ts && npm run build` | done | Implemented runtime profiles and mode-aware prompt generation. |
| M2 | Opening-turn stability | `the-call` and `the-last-session` reach player control without startup lock; first response is detected reliably | `npx vitest run tests/unit/opening-turn-state.test.ts tests/unit/session-timing.test.ts && npm run build` | done | Opening-turn state machine and timing instrumentation already deployed. |
| M3 | Transcript integrity and player-facing copy | No leaked tool syntax in visible AI text; player transcript commits on finalized transcription; waiting states are specific instead of generic | `npx vitest run tests/unit/live-text-selection.test.ts tests/unit/play-error-classification.test.ts tests/unit/model-text-sanitizer.test.ts && npx eslint src/context/GameContext.tsx src/lib/live-text-selection.ts src/app/play/page.tsx src/components/game/GameSession.tsx src/lib/play-error-classification.ts && npm run build` | done | Visible text now prefers the cleaner live source and streamed chunks are joined without collapsing words. |
| M4 | Transient live-service recovery | Tokenizer/inference failures are classified as transient and trigger a safe one-shot reconnect path without duplicate audio/transcripts | `npx vitest run tests/unit/live-retry-policy.test.ts tests/unit/play-error-classification.test.ts && npm run build` | done | Added one-shot retry policy plus startup-only reconnect guards in `GameContext`. |
| M5 | End-to-end hosted verification | Cloud Run stays healthy, `the-call` and `the-last-session` pass CLI browser checks, no critical console/runtime failures remain in tested paths | `python scripts/e2e_test.py` | done | Verified locally and on Cloud Run with a real multi-turn Playwright conversation on `the-call` using the query-gated debug text injector. |
| M6 | Global sound-system wiring and coverage | Shared sound preference reaches the engine, ambience is initialized across the catalogue, and the in-game sound toggle works on the hosted site | `npx eslint src/lib/sound-preferences.ts src/lib/sound-engine.ts src/hooks/useSoundEngine.ts src/components/ui/NavigationChrome.tsx src/components/game/GameSession.tsx && npm run build` | done | Verified locally across all four stories and on Cloud Run for `the-last-session`, `the-call`, and the live sound toggle path. |
| M7 | Creator playtest publish path | A creator can generate a Story Pack, launch it into `/play`, and hear a published draft through the existing live runtime without manual payload editing | `npx vitest run tests/unit/published-story.test.ts tests/unit/published-story-play.test.ts tests/unit/play-story-selection.test.ts && npm run build && python scripts/creator_playtest_e2e.py && python scripts/creator_roundtrip_e2e.py` | done | Verified locally on `127.0.0.1:3004` and on Cloud Run revision `innerplay-gemini-00031-rl2` with both direct published-draft loading and full creator roundtrip browser runs. |
| M8 | Catalog-wide transient startup recovery | Pre-opening Gemini Live session closes with transient `1008`/unsupported-operation reasons are classified as retryable, retried once, and no longer surface as immediate hard failures during hosted catalog sweeps | `npx vitest run tests/unit/live-retry-policy.test.ts tests/unit/play-error-classification.test.ts && npm run build` | in_progress | Root-cause evidence from hosted Playwright sweep: `the-lighthouse` intermittently closed with reason `Operation is not implemented, or supported, or enabled.` before first transcript. |
| M9 | Debug-text turn gating for browser verification | Debug text turns only send when the session has actually returned control to the player, so browser-driven multi-turn sweeps do not race playback drain and trigger false protocol closes | `npx vitest run tests/unit/debug-turn-policy.test.ts tests/unit/live-retry-policy.test.ts tests/unit/play-error-classification.test.ts && npm run build` | in_progress | Root-cause evidence from hosted catalog sweep: `room-4b` accepted a debug turn before the previous AI turn finished draining, then the session closed with `1008`. |
| M10 | Flagship published story via creator pipeline | A creator-built flagship story is shareable by direct URL, survives fresh-browser loading without localStorage, and produces materially different hosted branches for compliant, curious, compassionate, and defiant playstyles | `npx vitest run tests/unit/model-text-sanitizer.test.ts tests/unit/published-story-play.test.ts tests/unit/play-story-selection.test.ts && npm run build && python -u .tmp_published_exit_branch.py compliant .tmp_published_compliant_v2.json && python -u .tmp_published_exit_branch.py curious .tmp_published_curious_v3.json && python -u .tmp_published_exit_branch.py compassionate .tmp_published_compassionate_v4.json && python -u .tmp_published_exit_branch.py defiant .tmp_published_defiant_v4.json` | done | Implemented bundled published-story fallback, tightened output sanitization, and iterated the `Exit Interview` prompt on live Cloud Run until the four behavior branches diverged convincingly on the actual published URL. |

## Usage

When starting a new task:
1. Add a milestone row with acceptance criteria.
2. Define the narrowest validation command that proves the milestone.
3. Run the command immediately after edits.
4. If a command fails, stop and repair before moving to the next milestone.
