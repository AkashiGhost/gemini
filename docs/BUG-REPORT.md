# InnerPlay Bug Report

Updated on 2026-03-16 after a systematic debugging pass with parallel review.

---

## Summary

The original report overstated the symptom.

What was reproduced against the live site:
- AI text was visible.
- Player text was not reliably visible in the right places.
- The bottom transcript could show player text, but it was too dim.
- The VoiceOrb could show stale or low-signal player text because the UI had no dedicated listening state.
- Player speech could also be dropped when Gemini did not send a clean `inputTranscription.finished` commit signal before a turn boundary or teardown path.

This was not a single bug. It was a runtime commit problem plus a UI state/contrast problem.

---

## Confirmed Root Cause

### 1. User transcription was only committed too late
File: `src/context/GameContext.tsx`

Before the fix:
- `inputTranscription.text` only updated an internal pending ref.
- Visible player text depended on `inputTranscription.finished`.
- If Gemini reached `generationComplete`, `turnComplete`, `interrupted`, session reset, close, or end-session before a clean `finished` frame, the player's words could be lost or never surfaced.

### 2. The VoiceOrb had no listening state
File: `src/components/game/VoiceOrb.tsx`

Before the fix:
- Orb states were only `waiting`, `ai-speaking`, and `player-turn`.
- As soon as AI speech ended, the orb jumped to the player state even if the player had not spoken yet.
- That made stale text and misleading "You" labeling more visible.

### 3. Player transcript styling was too dim
File: `src/components/game/GameSession.tsx`

Before the fix:
- User-side transcript label and text used muted colors that were materially less legible than the AI transcript on the black overlay.

---

## Fix Implemented

### Runtime fixes
File: `src/context/GameContext.tsx`

Implemented:
- Added `SET_USER_TEXT` state updates for live player transcript text.
- Added `commitPendingUserTranscript()` to centralize safe user-transcript commits.
- Commit now happens on:
  - `inputTranscription.finished`
  - `generationComplete`
  - `turnComplete`
  - `interrupted`
  - session reset / teardown paths
  - end-session / close / error / start-failed paths
- Cleared stale live player text when AI turn finalizes.
- Upgraded the "meaningful transcript" check to Unicode-aware matching so non-Latin speech is not silently dropped.

### UI fixes
File: `src/components/game/VoiceOrb.tsx`

Implemented:
- Added a real `listening` state.
- Orb now distinguishes:
  - waiting
  - listening
  - AI speaking
  - player speaking
- Brightened player-side label and live text.

File: `src/components/game/GameSession.tsx`

Implemented:
- Increased player transcript label contrast.
- Increased player transcript text contrast.
- Added a live pending player line in the bottom transcript overlay so player speech is visible there even before Gemini emits a final commit boundary.

---

## What Was Not Changed

The following hypotheses from the original report were not part of this patch:
- `onopen` kickoff race
- redundant `SET_SPEAKING` dispatches
- `the-call` loop reset / `lastAiNarrationKey`
- error classification ordering in `play-error-classification.ts`

Those may still be worth separate review, but they are not the primary cause of the reproduced player-text visibility problem.

---

## Verification Status

Verified:
- Production build completed successfully.
- Cloud Run redeployed successfully.
- Active live revision: `innerplay-gemini-00071-mtf`
- Health check passed:
  - `https://innerplay-gemini-443171020325.us-central1.run.app/api/health`
- Post-deploy Playwright fake-mic replay was run against the live site.

Live verification result:
- Player text is visible in the orb.
- Player text is also visible in the bottom transcript overlay.
- The orb no longer falls back to the old stale/junk-only waiting behavior; it uses the dedicated listening/player-side path.

Notes on the automated replay:
- The browser fake-mic transcription quality was imperfect in automation (`x` in the final replay).
- That does not change the UI verification result: the same player text was visible in both places on the live site.

---

## Files Changed

- `src/context/GameContext.tsx`
- `src/components/game/VoiceOrb.tsx`
- `src/components/game/GameSession.tsx`

---

## FIXED: User Text Accumulation Bug

Fixed by switching from raw replace to `appendLiveDisplayText()` in `GameContext.tsx:1587`.
User text now accumulates like AI text. TypeScript clean.

---

## NOT A BUG: "Live service interrupted — Operation is not implemented"

Known transient Gemini Live API error. NOT a quota issue. Already handled:
- Classified correctly in `play-error-classification.ts:12`
- Auto-retry with `maxRetryAttempts: 1` in `GameContext.tsx:1057-1096`

---

## OPEN: Remaining Bugs for Codex

### 1. `onopen` kickoff race (Confidence: 95%)
File: `src/context/GameContext.tsx:1473-1475`
`sessionRef.current` is null when `onopen` fires before the await resolves. Should use the closure `session` variable instead. Not a visible failure (fallback at line ~1763 works) but a reliability hazard.

### 2. Redundant `SET_SPEAKING` dispatches (Confidence: 88%)
File: `src/context/GameContext.tsx:1521-1528`
`SET_SPEAKING true` dispatched N+1 times per audio message. Remove inner-loop dispatch, simplify post-loop to `if (hadAudio)`.

### 3. `applyLoopReset` doesn't clear `lastAiNarrationKey` (Confidence: 88%)
File: `src/lib/audio/the-call-state-director.ts:494-506`
Second time loop gets no audio reset because dedup guard rejects identical narration. Add `this.lastAiNarrationKey = "";` inside `applyLoopReset()`.

### 4. Error classification ordering (Confidence: 88%)
File: `src/lib/play-error-classification.ts:70-84`
`has401` check is shadowed by `msg.includes("server")` catch-all. Move `has401` before the server block.
