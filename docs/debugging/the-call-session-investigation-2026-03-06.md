# The Call Session Investigation

Date: 2026-03-06
Target URL: `https://innerplay-gemini-443171020325.us-central1.run.app/play?story=the-call`
Latest ready Cloud Run revision during investigation: `innerplay-gemini-00025-2n9`

## Question

Why does the user sometimes hear the first ring, then see a blank screen, then see `preparing the session...` for a long time before hearing the first voice line?

## Confirmed Facts

### 1. `preparing the session...` currently hides two different states

- In [src/app/play/page.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/app/play/page.tsx), it is shown while `status === "connecting"`.
- In [src/components/game/GameSession.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/components/game/GameSession.tsx), it is also shown while `status === "playing"` but `hasAiSpoken === false`.

Consequence:
- The UI does not distinguish "connecting to Gemini" from "connected, but still waiting for first output."

### 2. `the-call` has intentional startup delay before Gemini is even asked to speak

Relevant code:
- [src/components/game/OnboardingFlow.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/components/game/OnboardingFlow.tsx)

Measured/confirmed gates:
- Three onboarding scene steps with delayed continue buttons
- Countdown phase: about `3s`
- `ringing` phase for `the-call`: about `4s`

Consequence:
- A noticeable portion of the wait is designed into the story flow.

### 3. Cloud Run token minting is fast and is not the minute-scale bottleneck

Measured `/api/live-token` latency:
- about `696 ms`
- about `322 ms`
- about `285 ms`
- about `284 ms`
- about `293 ms`

Relevant code:
- [src/app/api/live-token/route.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/app/api/live-token/route.ts)

Consequence:
- Cloud Run is not the main explanation for a `30-60s` wait.

### 4. Runtime request capture shows the page startup path only calls `/api/live-token`

Observed API requests during a live `the-call` startup:
- `POST /api/live-token`

Not observed:
- `POST /api/lyria-token`

Consequence:
- The remote Lyria/music token endpoint is not being called on the normal startup path for this page.

### 5. Lyria/adaptive music is disabled by default

Relevant code:
- [src/lib/config/lyria.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/config/lyria.ts)
- [src/hooks/useSoundEngine.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/hooks/useSoundEngine.ts)
- [src/components/game/OnboardingFlow.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/components/game/OnboardingFlow.tsx)

Important details:
- `NEXT_PUBLIC_ENABLE_LYRIA_REALTIME` defaults to `false`
- `enableAdaptiveMusic` starts as `false`
- onboarding UI labels adaptive music as `Unavailable` when disabled

Consequence:
- A remote music-generation API call is not the default cause of the wait on this page.

### 6. Healthy `the-call` runs still take around 12 seconds from `BEGIN` to first response

Measured timings from a healthy automated run:
- `session.open`: about `0.94s` after `BEGIN`
- `session.kickoff_sent`: about `7.64s`
- `session.first_response_received`: about `11.77s`
- `mic.streaming_enabled`: about `20.02s`

Relevant code:
- [src/context/GameContext.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/context/GameContext.tsx)

Consequence:
- Even healthy behavior on `the-call` has a built-in delay:
  - intentional onboarding/ring delay
  - then Gemini first-turn latency

### 7. A real hosted failure was reproduced and traced to the opening-turn state machine

Observed pre-fix bad run on the hosted URL:
- `session.open`: about `1.75s`
- `session.kickoff_sent`: about `8.32s`
- no `session.first_response_received`
- `session.first_response_completed_without_payload`: about `19.63s`
- repeated `mic.streaming_deferred`
- blank body with no transcript

Relevant code:
- [src/context/GameContext.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/context/GameContext.tsx)
- [src/context/opening-turn-state.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/context/opening-turn-state.ts)
- [tests/unit/opening-turn-state.test.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/tests/unit/opening-turn-state.test.ts)

Root cause:
- `finalizeAiTurn(...)` tries to unlock the opening turn when Gemini signals completion
- but `markOpeningTurnCompleted(...)` previously refused to unlock unless `responseReceived === true`
- if Gemini completed the turn without a transcript/audio payload, the opening turn stayed locked forever
- then `enableMicStreaming(...)` kept logging `mic.streaming_deferred`, so the player never got control

Consequence:
- this was a real logic bug, not just a slow network/model issue
- it explains the blank or stuck startup state after ringing in at least one class of failures

### 8. Client-side stage timing now measures the full hosted startup path

Added timing stages:
- `begin_clicked`
- `start_session_enter`
- `live_token_request_start`
- `live_token_request_end`
- `live_connect_start`
- `session_open`
- `kickoff_sent`
- `first_response_received`
- `first_audio_chunk_played`
- `generation_complete`
- `turn_complete`
- `first_turn_finalized`

Consequence:
- startup delay is now measurable on the hosted app instead of inferred from generic logs

## Strongly Supported Conclusions

### A. The long wait is not mainly caused by Cloud Run

Reason:
- `/api/live-token` is consistently sub-second
- after token mint, the browser talks directly to Gemini Live

### B. The long wait is not currently supported by evidence that the music API is the blocker

Reason:
- Lyria is disabled by default
- `/api/lyria-token` is not called on startup
- sound timeline activity is not the same thing as a remote music-generation API call

### C. The user is likely experiencing multiple waits collapsed into one feeling

Likely sequence:
1. onboarding timing
2. ring/blank screen for `the-call`
3. Gemini Live connection
4. kickoff send
5. wait for first model response/audio

## Remaining Hypotheses

### Hypothesis 1: Gemini first-turn latency remains highly variable after kickoff

Why it remains plausible:
- post-fix hosted runs still varied materially:
  - `kickoff_sent -> first_response_received`: about `4.5s`
  - `kickoff_sent -> first_response_received`: about `6.0s`
  - `kickoff_sent -> first_response_received`: about `8.1s`
- `kickoff_sent -> turn_complete` ranged from about `15.9s` to `24.6s`

What would prove it:
- more repeated runs showing whether these spikes are model-side, browser-side, or content-length-driven

### Hypothesis 2: Playback duration and turn-complete timing still create a long first-turn wait even when things work

Why it remains plausible:
- healthy hosted runs showed:
  - `generation_complete -> turn_complete`: about `7.2s`
  - `generation_complete -> turn_complete`: about `10.7s`
  - `generation_complete -> turn_complete`: about `11.3s`
- the user cannot speak until after playback drain and first-turn finalization

What would prove it:
- measuring whether the opening line is too long and whether `turnComplete` consistently arrives late relative to `generationComplete`

### Hypothesis 3: Local sound-engine CPU/audio-thread pressure may amplify latency, but is not the root API cause

Why it remains plausible:
- [src/hooks/useSoundEngine.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/hooks/useSoundEngine.ts) initializes synthetic sounds and starts a local timeline once status becomes `playing`
- that could create pressure on the client audio thread

What is not proven:
- that this is the main cause of the long waits
- that it is related to remote Lyria/music API calls

## Verified Fix

Code change:
- [src/context/opening-turn-state.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/context/opening-turn-state.ts)

Behavior change:
- completion now unlocks the opening turn even if Gemini produced no first payload
- that prevents the permanent `mic.streaming_deferred` lockup on no-payload completion

Regression test:
- [tests/unit/opening-turn-state.test.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/tests/unit/opening-turn-state.test.ts)

Verification:
- targeted unit tests passed: `12/12`
- `npm run build` passed
- post-fix hosted measurement runs: `3/3` successful transcript starts
- post-fix hosted timings showed full startup stage traces and `first_turn_finalized` in every run

## What Still Needs Improvement

Even after the lockup fix, the first-turn UX is still slow.

Hosted post-fix runs showed roughly:
- `BEGIN -> session_open`: about `0.8s` to `1.8s`
- `session_open -> kickoff_sent`: about `6.0s` to `6.7s`
- `kickoff_sent -> first_response_received`: about `4.5s` to `8.1s`
- `first_response_received -> turn_complete`: about `10.3s` to `16.5s`
- `BEGIN -> first_turn_finalized`: about `23.9s` to `32.2s`

That means the app is now more reliable, but the first-turn wait is still too long for a good UX.

The next optimization target is no longer "why is it stuck forever?".
It is:
- why the first generated opening turn is so long
- why `turnComplete` arrives so late after `generationComplete`
- whether the opening line should be shorter for `the-call`

## Bottom Line

Current evidence supports this:
- some delay is intentional story UX
- some delay is normal Gemini Live first-turn latency
- a real stuck-startup bug existed in the opening-turn completion state machine and has been fixed
- the remaining problem is latency/UX length, not the same permanent lockup

Current evidence does not support this:
- "Cloud Run is slow"
- "Lyria/music API is the default startup blocker"
