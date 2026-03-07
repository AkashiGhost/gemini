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

## Usage

When starting a new task:
1. Add a milestone row with acceptance criteria.
2. Define the narrowest validation command that proves the milestone.
3. Run the command immediately after edits.
4. If a command fails, stop and repair before moving to the next milestone.
