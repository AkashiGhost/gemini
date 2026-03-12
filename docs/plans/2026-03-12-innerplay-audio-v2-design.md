# InnerPlay Audio V2 Design

Date: 2026-03-12
Status: Approved direction, ready for implementation
Scope: Replace brittle title-based and hook-hardcoded sound behavior with explicit authored sound metadata and a reusable audio-director layer.

## Goal

Make the sound system intentionally designable per game instead of inferred from story titles and hardcoded inside React hooks.

---

## Problems In The Current System

1. Sound identity is inferred from `storyId` and sometimes from `publishedStory.title`.
2. `useSoundEngine.ts` owns too much: timelines, panning, default volumes, story-specific exceptions, and runtime cue logic.
3. Published stories do not carry explicit sound-profile metadata, so creator-generated variants are brittle.
4. The runtime shape hints at `ambient_first_live` vs `timeline_scripted`, but the implementation still routes through a generic sound engine with story constants embedded in the hook.
5. Test coverage validates mapping logic, not authored audio behavior.

---

## Design

### 1. Explicit Sound Metadata

Published stories should carry explicit sound metadata.

Add to `PublishedStoryManifest`:
- `soundProfileId?: string`

Behavior:
- Built-in stories use their known profile ids.
- Bundled published stories set `soundProfileId` explicitly.
- Creator-published stories can set `soundProfileId` at publish time.
- Runtime resolves sound identity from manifest metadata first, never from title matching.

### 2. Authored Sound Manifests

Move story-specific sound design out of `useSoundEngine.ts` into a separate authored manifest file.

Create a new module:
- `src/lib/audio/sound-manifests.ts`

Each manifest defines:
- `profileId`
- `defaultVolumes`
- `spatialMap`
- `timeline`
- `phaseCueRules`
- optional `assetStrategy`

This allows story sound design to be edited as content, not as hook logic.

### 3. Audio Director Layer

Introduce a separate layer that maps runtime events to authored cues.

Create:
- `src/lib/audio/audio-director.ts`

Responsibilities:
- consume authored manifest
- translate semantic runtime events into engine actions
- keep special-case story logic out of the React hook

Initial events:
- `session_started`
- `first_ai_turn`
- `threshold_entered`
- `ending_reached`

For `Me and Mes`, this gives a controlled sleep-to-room journey without story-specific imperative code embedded in `useSoundEngine`.

### 4. Simpler Hook Responsibilities

`useSoundEngine.ts` should only:
- initialize the engine
- load the authored manifest
- wire runtime events into `AudioDirector`
- handle generic pause/resume/ducking concerns

It should not own large story content tables.

### 5. Backward-Compatible Content Path

Do not require real external audio assets in this first refactor.

Phase 1 behavior:
- keep generated/synth buffers as the fallback sound source
- route them through the authored manifest + director architecture

That gives us the right architecture now without blocking on a full asset library.

### 6. First Game To Migrate

Migrate `Me and Mes` first.

Why:
- strongest flagship fit
- already has a dedicated sound identity
- easiest place to prove the sleep-to-room design

---

## Testing Strategy

1. Unit tests for sound-profile resolution from explicit metadata
2. Unit tests for authored manifest loading and fallback behavior
3. Unit tests for audio-director event mapping
4. Hosted browser verification on Cloud Run to confirm:
- published `Me and Mes` still loads
- sound profile selection uses manifest metadata
- no title-based mapping regression

---

## Non-Goals For This Pass

1. Replace the engine with Howler in the same refactor
2. Add a full external sound asset library
3. Rebuild all stories at once
4. Reintroduce Lyria into the critical path

---

## Expected Outcome

After this pass:
- sound behavior is keyed by metadata, not title hacks
- story sound design is authored in a dedicated manifest layer
- `useSoundEngine` becomes infrastructure, not content storage
- `Me and Mes` becomes the first properly migrated Audio V2 story
