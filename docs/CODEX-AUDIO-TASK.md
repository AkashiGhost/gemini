# Codex Task: Diagnose and Fix Missing Background Audio

## Symptom
Background audio (water sounds, ambient room noise, footsteps, tension layers) stopped playing during "The Call" gameplay. AI voice works fine. The ambient/SFX layer is silent.

This was working before the recent session startup refactor commits.

## What Changed (since commit 8b029a36)
Files modified by recent commits that could affect audio:
- `src/context/GameContext.tsx` — major session lifecycle refactor (opening turn mic arm, commitPendingUserTranscript, SET_USER_TEXT)
- `src/lib/audio/the-call-state-director.ts` — added `this.lastAiNarrationKey = "";` in `applyLoopReset()`
- `src/lib/config/live-tools.ts` — changed `silenceDurationMs: 1200 → 2000`
- `src/app/api/live-token/route.ts` — referenced `LIVE_RUNTIME_CONFIG.realtimeInputSilenceDurationMs`

Files NOT modified (audio pipeline itself):
- `src/hooks/useSoundEngine.ts` — UNCHANGED
- `src/lib/audio/sound-manifests.ts` — UNCHANGED
- `src/lib/audio/audio-architecture-registry.ts` — UNCHANGED
- `public/audio/*` — UNCHANGED

## Audio Architecture Overview

The audio pipeline for "the-call" uses `state_director_v2_candidate`:

1. `useSoundEngine.ts` initializes the `SoundEngine` and loads sound buffers from `public/audio/`
2. It creates a `TheCallStateDirector` when `soundProfileId === "the-call"`
3. The state director receives `lastAiTranscriptText` and `lastAiTranscriptSeq` from `GameSession.tsx`
4. It parses the AI narration text for location/movement/tension keywords
5. It triggers ambient loops, footsteps, water sounds via the `SoundEngine`

Tools are DISABLED (`enableTools: false`). The state director drives ALL audio — not tool calls.

## Diagnostic Steps

### Step 1: Verify sound engine initializes
Add console log or check existing logs for:
```
[sound.init_complete]
[sound.the_call_state_director.ready]
```
If these don't appear, the engine isn't loading.

### Step 2: Verify `lastAiTranscriptText` reaches the state director
In `useSoundEngine.ts` around line 572 (the `applyAiNarration` effect), add a temporary log:
```typescript
console.log("[DEBUG:applyAiNarration]", { lastAiTranscriptText, lastAiTranscriptSeq, directorReady: !!director });
```

If this never fires or `director` is null, the state director isn't receiving transcripts.

### Step 3: Verify the timeline starts
In `useSoundEngine.ts` around line 175, check that `engine.startTimeline(manifest.timeline)` is called. The timeline drives the initial ambient room sound.

### Step 4: Check if the `status` prop reaches useSoundEngine correctly
The sound engine has guards on `status === "playing"`. If the session startup refactor changed when `status` transitions to "playing", the engine might never start.

### Step 5: Check the `sessionId` dependency
The sound engine's init effect depends on `sessionId`. If the session lifecycle changes caused `sessionId` to update differently, the engine might re-initialize and lose its loaded buffers.

## Most Likely Root Cause

The session startup refactor in `GameContext.tsx` changed the timing of state transitions. The sound engine depends on:
- `status` being "playing"
- `sessionId` being set
- `lastAiTranscriptText` updating

If any of these changed timing due to the opening turn mic arm refactor, the sound engine's useEffect hooks may not fire correctly.

## Fix Constraints
- Do NOT change the audio architecture or state director logic — those work
- Do NOT re-enable tools (enableTools must stay false)
- Focus on ensuring the props flow correctly from GameContext → GameSession → useSoundEngine
- The timeline ambient sound should start immediately when the session opens
- The state director should fire on every committed AI transcript entry

## Also: "Operation is not implemented" Error
This is a KNOWN transient Gemini Live API error. Already handled correctly:
- Classified in `play-error-classification.ts:12`
- Auto-retry with `maxRetryAttempts: 1` in `GameContext.tsx`
- Not a quota issue, not a code bug
- No fix needed — just retry the session
