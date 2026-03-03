# InnerPlay Gemini — Backlog & Future Tasks

This file tracks pending features, architectural ideas, and future work items for the InnerPlay Gemini hackathon project. Items are grouped by theme. Items marked **[POST-HACK]** are explicitly deferred after the March 16 deadline.

> Canonical pending-task file: track all remaining work in this document only. Other docs may reference this file but should not keep independent pending-task lists.

---

## Active Priority Queue (Current)

### P0 - Runtime Stability
- Add live-session fallback telemetry (selected model, fallback used, close code distribution).
- Add one-click runtime diagnostics endpoint for live token/model health.
- Add bounded reconnect policy for transient close codes (`1011`, network reset) with strict cap.
- Improve user-facing errors for model-not-found vs quota vs auth vs microphone.

### P1 - Directional Sound
- Introduce world-space audio entities (`entityId`, `x`, `y`, `velocity`, `bus`, `gain`, `pan`).
- Add moving cue support (e.g., footsteps left-to-right over time) with interpolation.
- Add zone/occlusion rules so off-room voices sound physically separated.
- Add deterministic tests for pan, attenuation, and occlusion behavior.

### P1 - Multi-Agent Story + Voice
- Add orchestrator/director loop (speaker arbitration, overlap policy, pacing budget).
- Add per-character agent roles/goals with shared blackboard world state.
- Add per-character voice config and bus routing (`main_voice`, `npc_voice`, `ambient`, `sfx`).
- Add background utterance mode for secondary characters (short diegetic lines).

### P1 - Map and World State
- Maintain canonical player position + character positions each turn.
- Feed world snapshot to all character agents before action selection.
- Add 2-5 second deterministic event scheduler for speech/SFX ordering.
- Log every decision (`speakerId`, `position`, `reason`, `causalChain`) for replay/debug.

### P1 - Closed-Loop Verification
- Extend scenario suite for multi-speaker overlaps and positional audio assertions.
- Add checks for tool-call vs fallback precedence invariants.
- Add CLI verification command covering orchestrator + audio routing correctness.

---

## Multi-Agent Spatial Audio Architecture

These two approaches define how multiple AI characters (agents) would coexist in a scene, each with their own voice, position, and behavior.

---

### Approach A: Orchestrator-Based (Simple / Hackathon MVP)

- Central Gemini Flash orchestrator polls every N seconds
- Decides which agent speaks, routes player mic to addressed agent
- Each agent is a separate Gemini Live session with its own voice preset (Charon, Puck, Kore, etc.)
- Audio mixer in browser assigns per-agent GainNode + StereoPanner
- Orchestrator updates world state (positions, phase, threat)

**Pros:** Simple to implement, predictable pacing
**Cons:** LLM in scheduling path = non-deterministic pacing, ~300ms latency per decision, hard to debug

---

### Approach B: Utility Scoring (Preferred / Production Architecture)

The hybrid algorithm:

1. Update `WorldState` each tick (`playerPos`, `agentPos`, `phase`, `threat`, `recentEvents`)
2. Each character agent emits 0..N `IntentCandidates` (`speak`, `move`, `call_out`, `sfx`)
3. Score each candidate with a utility function:
   ```
   score = roleWeight × narrativeNeed × proximity × audibility × novelty × cooldownPenalty
   ```
4. Director resolves conflicts:
   - Pick one foreground speaker
   - Allow limited background utterances (short cues only)
   - Reject anything violating pacing or overlap rules
5. Scheduler builds a short timeline (next 2–5 seconds)
6. Audio engine renders each event with spatial positioning

**Pros:** Deterministic scheduling, debuggable (log score breakdown), emergent behavior, industry-standard (The Sims, XCOM, Halo, Left 4 Dead Director)
**Cons:** More complex to implement, requires tuning

**Refinements to add when building:**

- **Interruption handling**: Player speaks → cancel timeline → route to highest-proximity agent → others react in next tick
- **Emotional contagion**: Tension propagates at "sound speed" — closest characters react first, far ones don't know yet

---

### Verdict

Approach B is the production architecture. Approach A is the hackathon shortcut for 2-character demos. For the hackathon, implement B with a simplified Director (one foreground speaker + one background) — defer the full timeline scheduler to post-hackathon.

---

## Spatial Audio & Character Voice

- **Directional/spatial audio** — Dynamic panning for moving characters. Extend `trigger_sound` tool with `{ pan: -1.0 to 1.0 }`. Engine already has `StereoPanner` per channel, so this is a small addition.
- **Multiple characters with distinct voices** — Each character gets its own Gemini Live session + voice preset. Audio mixer routes each to a separate `GainNode`. Required prerequisite for Approach A or B above.

---

## Story Engine & State

- **Style tracker → ending selection** — Track player psychological style (analytical / empathetic / uncertain) and use it to select which ending fires. `style-tracker.ts` exists but the connection to the ending decision is currently unimplemented.
- **Multi-character memory** — Different characters use conversation memory differently (some remember all, some twist events, some forget). Relevant once multi-agent is live.

---

## Player Experience

- **Volume control via voice** — Player says "speak louder" / "be quieter" → `conversation.setVolume()` adjusts. Simple to implement; high UX value.
- **Gyroscope head tracking** [POST-HACK] — Shift 3D audio panning based on head orientation. Requires headphone with gyro hardware. Revisit after hackathon.

---

## Creator Tools

- **Node Graph Builder (Piece #11)** [POST-HACK] — Visual story graph editor for creators. Not yet built.
- **Playtest screen (Piece #12)** [POST-HACK] — `/create/playtest` page for testing a story inside the Creator UI. Not yet built.
- **Surface quality scoring in Creator UI** — `story-pack-quality.ts` runs server-side but the client currently drops the result. Surface the score and improvement hints in the Creator Interview panel.

---

## User-Generated Content

- **User-generated stories** [POST-HACK] — Players create their own stories; sounds are pre-generated in the background; the platform decides when to play them.

---

## Hackathon Submission Blockers

These items are required for or directly support the March 16 Devpost submission:

- **Architecture diagram** — Required for submission. Must be a visual image (not text) showing Gemini Live ↔ backend ↔ frontend data flow. Not yet created.
- **Demo video** — New video showing Gemini-specific features: affective dialog, Lyria adaptive music, function-calling tool events. Must be public on YouTube/Vimeo, under 4 minutes.
- **Cloud Build trigger** — Auto-deploy on `git push` to main. Currently deployment is manual (`gcloud run deploy`). Adds +0.2 bonus points toward final score.

---

## Code Quality & Tech Debt

- **Dead code cleanup** — The following files from the original pipeline architecture are likely unused after the ElevenLabs-based refactor. Audit and remove if confirmed dead:
  - `game-orchestrator.ts`
  - `gemini-adapter.ts`
  - `mock-adapter.ts`
  - `rules-engine.ts`
  - `state-machine.ts`
  - `context-builder.ts`
  - `sound-cue-parser.ts`
  - `style-tracker.ts`
- **Rename `elevenlabsVoiceId`** — Stale field name in `game-config.ts`. Rename to `geminiVoiceName` to match current provider.

---

## Deployment & Infrastructure

- **Cloud Build trigger** — (Also listed under Submission Blockers above.) Infrastructure-as-code or Cloud Build config in repo qualifies for the +0.2 bonus point.
