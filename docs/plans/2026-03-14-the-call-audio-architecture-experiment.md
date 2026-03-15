# The Call Audio Architecture Experiment

Date: 2026-03-14
Status: Proposed experiment
Scope: Test a new audio architecture on `the-call` only while preserving the current production fallback.

## Constraint

Do not remove or replace the working `hybrid_fallback_v1` path. The experiment must be additive and reversible.

## Why `the-call`

`the-call` is the best stress test because it has:

- persistent environmental threat
- repeated tactile interactions like keypad and doors
- loop/retry pressure
- clear immersion failures when sound is mistimed or absent

## Current Baseline

Current active architecture:

- `hybrid_fallback_v1`

Current baseline behavior:

- authored ambient timeline starts locally
- transcript and narration cues trigger local SFX
- custom local logic escalates water from cue to persistent loop layers

## Candidate

Candidate architecture:

- `state_director_v2_candidate`

## Design

### 1. Keep Gemini Live Focused On Voice

Gemini Live should keep doing:

- Alex dialogue
- emotional pacing
- conversational adaptation

It should stop being the primary low-level SFX scheduler.

### 2. Introduce Canonical Story State

Maintain a local state object for `the-call`:

- `location`
- `visibleOptions`
- `waterLevel`
- `tension`
- `interactionFocus`
- `loopIndex`
- `threatMode`
- `lastHazard`

### 3. Add A State Update Layer

After each turn, compute or infer state updates from:

- player instruction
- Alex response
- deterministic rules

This can be rule-based first. It does not need a second model in the first experiment pass.

### 4. Move Sound Decisions Into An Audio Director

The audio director should map state to:

- persistent beds
- escalation layers
- one-shots
- volume targets
- crossfades

Examples:

- `waterLevel: 0 -> 1` starts distant leak layer
- `waterLevel: 2` adds rising water loop
- `interactionFocus: keypad` triggers keypad press family
- `threatMode: immediate` raises tension stem and breathing gain

### 5. Use High-Level Events, Not Raw Sound IDs, As The Narrative Boundary

Prefer:

- `keypad_attempt`
- `door_forced`
- `water_rises`
- `route_locked`

Avoid letting narrative logic push raw file names directly.

## Acceptance Criteria

The experiment is good enough only if it beats or matches `hybrid_fallback_v1` on hosted `the-call`:

1. Keypad feedback is reliably audible when keypad interaction happens.
2. Water behaves like a real environmental threat, not an isolated mention cue.
3. Ambient and escalation layers survive turn interruptions cleanly.
4. Debug output explains why a sound happened in terms of state, not only keywords.
5. Rollback to `hybrid_fallback_v1` remains one selector change, not a code recovery project.

## Rollback

If the candidate underperforms:

1. Keep the candidate code in the repo.
2. Switch active selection back to `hybrid_fallback_v1`.
3. Record the failure mode in `docs/audio-architecture-log.md`.

## Implementation Order

1. Add architecture selector plumbing without changing current behavior.
2. Add canonical `the-call` state schema.
3. Move water escalation onto state transitions.
4. Move keypad and route interactions onto high-level events.
5. Compare hosted behavior against baseline.
