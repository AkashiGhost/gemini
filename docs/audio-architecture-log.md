# InnerPlay Audio Architecture Log

Date: 2026-03-14
Status: Canonical log for tried, active, and candidate audio architectures
Scope: Prevent repeated failures, preserve fallback paths, and keep experiment history explicit.

## Rules

1. Never delete the current working architecture before a replacement passes hosted acceptance checks.
2. Run new audio-architecture experiments on `the-call` first unless a later doc explicitly changes scope.
3. If an experiment fails, switch back to the fallback architecture selector. Do not erase the failed path from this log.
4. Every new architecture or major change must update this file and the related experiment plan.

---

## Architecture List

| ID | Status | Scope | Core Idea | Keep / Drop Decision |
|----|--------|-------|-----------|----------------------|
| `llm_tool_director_v0` | Historical | Live stories | Gemini Live emits direct structured sound/tension/end tool calls. | Keep as a reference pattern only. Do not use as the primary low-level SFX driver. |
| `authored_timeline_v1` | Active | Scripted stories | Deterministic authored timeline starts ambience and timed transitions locally. | Keep active for scripted stories. Reliable and testable. |
| `hybrid_fallback_v1` | Active | Current live stories, including `the-call` | Local authored ambience plus transcript/narration cue detection and local state logic. | Keep as the production fallback while testing anything new. |
| `state_director_v2_candidate` | Candidate | `the-call` only | Local audio director maps canonical world state to loops, stems, and one-shots. | Evaluate against `hybrid_fallback_v1`. Promote only if it is clearly more reliable and immersive. |

---

## Notes By Architecture

### `llm_tool_director_v0`

**Summary**

The original target architecture let Gemini Live handle spoken dialogue and emit silent tool calls like `trigger_sound`, `set_tension`, and `end_game` out-of-band.

**What was good**

- Clean separation between dialogue and control signals.
- Reasonable for high-level semantic events.

**What failed**

- Live native-audio tool delivery was not stable enough for low-level foley timing.
- Interruptions and runtime instability made direct sound-command reliance too brittle.
- The repo currently keeps Live tools disabled for this path.

**Lesson**

Do not make live tool calls the only source of truth for concrete SFX timing in `the-call`.

### `authored_timeline_v1`

**Summary**

Ambient layers and timed transitions are authored locally in manifests and started by the client.

**What was good**

- Predictable.
- Easy to test.
- Good for baseline atmosphere.

**What failed**

- Not sufficient alone for reactive live conversation stories.

**Lesson**

Deterministic ambience should remain part of the stack even when reactive layers get smarter.

### `hybrid_fallback_v1`

**Summary**

This is the current production path for `the-call`. The client starts authored ambience, inspects narration or transcript text for cue intent, and applies local story-specific state changes like flood escalation.

**What was good**

- Survives missing Live tool calls.
- Supports persistent environmental escalation such as `water_leak_loop` and `water_rising_loop`.
- Already works on hosted `the-call`.

**Weak points**

- Keyword and phrasing dependence can still miss intent or fire late.
- Story-specific logic can drift into hook code.

**Lesson**

This is the baseline to beat, not something to remove prematurely.

### `state_director_v2_candidate`

**Summary**

Voice stays live, but sound is driven by canonical local state such as:

- `location`
- `waterLevel`
- `tension`
- `interactionFocus`
- `loopIndex`
- `threatMode`

The local audio director maps that state into loops, stems, snapshots, and one-shots.

**Why test it**

- Better match for persistent danger and escalation.
- Less dependence on exact dialogue phrasing.
- More game-like and more debuggable than direct cue inference.

**Risk**

- More implementation complexity.
- Requires a clean state model to avoid replacing one brittle system with another.

---

## Promotion Gate For Any New Audio Architecture

Promote a candidate only if it passes all of the following on hosted `the-call`:

1. Keypad interactions are heard consistently.
2. Water escalation persists and intensifies across turns without requiring repeated lucky wording.
3. Dialogue tails are not clipped by the audio lifecycle.
4. Failure handling is better than or equal to `hybrid_fallback_v1`.
5. Debug logs make state transitions and audio actions easier to reason about than the current system.

If any of these fail, revert selection to `hybrid_fallback_v1` and record the failure here.

---

## Current Decision

- Production fallback stays: `hybrid_fallback_v1`
- Experiment target stays narrow: `the-call`
- Active experiment selection for `the-call`: `state_director_v2_candidate`
- Candidate under evaluation: `state_director_v2_candidate`
