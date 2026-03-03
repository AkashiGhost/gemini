# InnerPlay — Architecture & Implementation Plan
**Gemini Live Agent Challenge Submission**
**Date**: 2026-03-02
**Target Deadline**: 2026-03-16
**Prepared for**: Codex CLI / GPT Implementation Agent

---

## Table of Contents

1. Executive Summary
2. Architecture Overview
3. Module Specifications
4. Data Schemas
5. UI/UX Specifications
6. Implementation Order (LEGO Pieces)
7. Desired Outputs Per Feature
8. Known Risks and Mitigations
9. Hackathon Demo Script

---

## 1. Executive Summary

InnerPlay is a voice-only interactive game platform where players put on headphones, close their eyes, and enter a story that lives entirely in their imagination. There is no screen to look at during play. The player's voice is their only input. The AI character's voice — generated live by Gemini — is the only output. The experience is designed to be the cleanest possible demonstration that an AI system can break the "text box" paradigm and deliver emotionally resonant, interactive narrative entirely through audio.

The first story, "The Call," places the player as a stranger who answers a phone call from someone trapped underground. The AI (Alex) speaks in real time, responds to the player's voice, and is supported by three simultaneous audio layers: diegetic sound effects triggered by Gemini tool calls with no voice interruption, phase-based ambient loops that shift as the story evolves, and Lyria RealTime adaptive music that steers based on a tension parameter Gemini sets silently. The creator pipeline — a conversational AI interview that generates story structure and real-time visual atmosphere previews — demonstrates that InnerPlay is a platform, not a demo. This combination of Live API voice quality, three-layer sound architecture, and a working creator tool is what wins the Gemini hackathon's Innovation & Multimodal UX criterion (40% of score).

---

## 2. Architecture Overview

```
BROWSER (CLIENT)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  GameContext (React Context + useReducer)                         │   │
│  │  - Session state machine (idle/connecting/playing/ended/error)   │   │
│  │  - Owns: Gemini Live session ref, AudioCapture ref               │   │
│  │  - Emits: phase, isSpeaking, transcript, toolCallEvents          │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │                                               │
│  ┌──────────────────────▼──────────────────────────────────────────┐   │
│  │  VoiceEngine (inside GameContext)                                │   │
│  │  Gemini Live WebSocket (ephemeral token, direct browser→Gemini) │   │
│  │  ├── AudioCapture (AudioWorklet, 16kHz PCM → base64 → WS)       │   │
│  │  ├── AudioPlayback (24kHz PCM chunks → AudioContext)             │   │
│  │  ├── outputAudioTranscription → text stream                      │   │
│  │  ├── inputTranscription → user speech text                       │   │
│  │  ├── Tool call handler (trigger_sound / set_tension / end_game)  │   │
│  │  └── Session resumption token refresh (2h validity)              │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │  toolCallEvents                               │
│  ┌──────────────────────▼──────────────────────────────────────────┐   │
│  │  useSoundEngine (React hook)                                     │   │
│  │  ├── Layer 1: SoundEngine — SFX (tool call → immediate trigger)  │   │
│  │  │   ├── play(id, vol, false) — one-shot                         │   │
│  │  │   └── respond SILENT → Gemini voice never pauses              │   │
│  │  ├── Layer 2: SoundEngine — Ambient (timeline, phase crossfade)  │   │
│  │  │   ├── startTimeline(events) — deterministic at game start     │   │
│  │  │   └── crossfade on phase transitions                          │   │
│  │  └── Layer 3: MusicEngine — Lyria RealTime                       │   │
│  │      ├── WebSocket → Lyria streaming PCM                         │   │
│  │      ├── updateParams({ tension: 0.0–1.0, density, brightness }) │   │
│  │      └── triggered by set_tension tool call from Gemini          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  UI Components                                                   │   │
│  │  ├── OnboardingFlow (scene images → headphones prompt → connect) │   │
│  │  ├── GameSession (breathing dot, transcript, tap controls)       │   │
│  │  ├── BreathingDot (phase-aware animation speed)                  │   │
│  │  ├── StoryCard catalogue (/, browse stories)                     │   │
│  │  └── CreatorFlow (interview + image preview + node builder)      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │  HTTPS / WebSocket
SERVER (Next.js on Cloud Run)
┌─────────────────────────────────▼───────────────────────────────────────┐
│                                                                         │
│  POST /api/live-token                                                   │
│  ├── Validates GEMINI_API_KEY (env)                                     │
│  ├── Fetches story system prompt (story-prompts.ts)                     │
│  ├── Calls ai.authTokens.create() → single-use ephemeral token          │
│  │   (system prompt + tool declarations locked in at mint time)         │
│  └── Returns { token: string }                                          │
│                                                                         │
│  POST /api/lyria-token                                                  │
│  ├── Validates GEMINI_API_KEY                                           │
│  └── Returns ephemeral token scoped to Lyria RealTime only             │
│                                                                         │
│  POST /api/intent                                                       │
│  ├── Body: { playerText, choices, storyId, phase }                      │
│  ├── Calls Gemini Flash Lite with classification prompt                 │
│  └── Returns { matchedChoiceId, confidence, intent }                   │
│                                                                         │
│  GET /api/stories                                                       │
│  └── Returns StoryMeta[] catalogue                                      │
│                                                                         │
│  POST /api/creator/*                                                    │
│  ├── /api/creator/interview — Flash 2.0 conversational story builder    │
│  ├── /api/creator/image — Imagen 3 atmosphere preview                   │
│  └── /api/creator/publish — validates + saves story spec                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
GOOGLE CLOUD
┌─────────────────────────────────▼───────────────────────────────────────┐
│  Gemini Live API (gemini-live-2.5-flash-native-audio)                  │
│  ├── WebSocket — direct browser connection (ephemeral token auth)       │
│  ├── Features active: affectiveDialog, outputAudioTranscription,        │
│  │   sessionResumption, contextWindowCompression, VAD LOW sensitivity   │
│  └── Tool declarations (locked at token mint):                          │
│      ├── trigger_sound(sound_id: string) → NON_BLOCKING / SILENT        │
│      ├── set_tension(level: number) → NON_BLOCKING / SILENT             │
│      └── end_game(reason: string) → NON_BLOCKING                        │
│                                                                         │
│  Lyria RealTime (models/lyria-realtime-exp)                             │
│  ├── Separate WebSocket session (different ephemeral token)             │
│  ├── Streaming PCM → AudioContext mix                                   │
│  └── Weighted prompt parameters steered by set_tension level            │
│                                                                         │
│  Gemini Flash Lite (gemini-2.0-flash-lite)                              │
│  └── Intent classification — /api/intent route                          │
│                                                                         │
│  Imagen 3 (imagen-3.0-generate-001)                                     │
│  └── Creator pipeline atmosphere preview — /api/creator/image           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Specifications

---

### 3.1 VoiceEngine

**File**: `src/context/GameContext.tsx`
**Current status**: Working. Needs tool call handler added.

**Purpose**: Manages the complete Gemini Live session lifecycle — connection, microphone streaming, audio playback, transcript accumulation, tool call dispatch, and session cleanup.

**Inputs**:
- `startSession(storyId: string)` — called by OnboardingFlow when player taps "Begin"
- Real-time PCM audio from `AudioCapture` (AudioWorklet, 16kHz)
- Gemini Live WebSocket messages (audio chunks, transcription fragments, tool calls, session events)

**Outputs**:
- React context values: `phase`, `status`, `isSpeaking`, `transcript`, `lastAiText`, `hasAiSpoken`
- `toolCallEvent` dispatched via a ref-based event emitter to `useSoundEngine`
- `dispatch({ type: "SET_PHASE", phase: N })` when Gemini calls `set_tension` and phase changes

**Exact TypeScript interface**:

```typescript
export interface GameContextValue {
  phase: number;                    // 0-4, maps to story phase
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isSpeaking: boolean;              // Gemini currently outputting audio
  isPaused: boolean;
  transcript: TranscriptEntry[];
  hasAiSpoken: boolean;             // true after first Gemini audio chunk
  lastAiText: string;               // current accumulated AI text (live)
  micMuted: boolean;
  elapsedSeconds: number;
  errorMessage: string | undefined;
  startSession: (storyId: string) => Promise<void>;
  endSession: () => void;
  togglePause: () => void;
  toggleMicMute: () => void;
  // NEW: subscribe to tool call events
  onToolCall: (handler: (call: ToolCallEvent) => void) => () => void;
}

export interface ToolCallEvent {
  name: "trigger_sound" | "set_tension" | "end_game";
  args: Record<string, unknown>;
  respond: () => void; // call to send SILENT acknowledgment
}

export interface TranscriptEntry {
  source: "user" | "ai";
  text: string;
}
```

**Tool declarations to lock into ephemeral token** (these go into `liveConnectConstraints.config.tools` at token mint in `/api/live-token`):

```typescript
const TOOL_DECLARATIONS = [
  {
    name: "trigger_sound",
    description: "Play a sound effect immediately without pausing speech. Use when narrating something that would naturally produce a sound: a door opening, footsteps, a crash.",
    parameters: {
      type: "object",
      properties: {
        sound_id: {
          type: "string",
          description: "Sound identifier. Available: footsteps, door_creak, door_slam, phone_static, phone_ring, pickup_click, keypad_beep, metal_scrape, pipe_clank, heavy_breathing, water_drip, glass_break, distant_scream, disconnect_tone"
        }
      },
      required: ["sound_id"]
    }
  },
  {
    name: "set_tension",
    description: "Set the background music tension level. 0.0 = calm, 0.5 = uneasy, 1.0 = maximum horror. Call silently whenever the emotional tone of the scene changes.",
    parameters: {
      type: "object",
      properties: {
        level: { type: "number", description: "Tension level 0.0 to 1.0" },
        transition_seconds: { type: "number", description: "How many seconds to crossfade. Default 4." }
      },
      required: ["level"]
    }
  },
  {
    name: "end_game",
    description: "Signal that the story has reached an ending. Call when Alex's situation is resolved — rescue, escape, or failure.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", enum: ["rescued", "escaped", "failed", "abandoned"] }
      },
      required: ["reason"]
    }
  }
];
```

**Tool call response behavior**:
- `trigger_sound`: respond with `{ scheduling: "SILENT" }` — Gemini does not pause audio output
- `set_tension`: respond with `{ scheduling: "SILENT" }` — same
- `end_game`: respond with `{ scheduling: "WHEN_IDLE" }`, then dispatch `GAME_OVER` after current audio drains

**Silence nudge**: If `status === "playing"` and `isSpeaking === false` and `isPaused === false` for 12 consecutive seconds, send `session.sendClientContent({ turns: "[The caller waits in silence, their breathing the only sound...]", turnComplete: true })`.

**Session resumption**: `sessionResumption: {}` in config — SDK handles token refresh. Log token updates but take no action.

**Expected behavior when working correctly**:
- Connection establishes in under 3 seconds from `startSession()` call
- First audio from Gemini plays within 1 second of connection (story prompt triggers immediate narration)
- Tool calls `trigger_sound` and `set_tension` fire within the first 30 seconds of play
- Audio never cuts out mid-sentence when a tool call fires
- If browser tab loses focus and reconnects, session resumes from where it left off

**Failure modes and fallbacks**:
- Token fetch fails (500): dispatch `SET_STATUS error` with message from API
- Mic access denied: dispatch error, close session. Player sees error screen with instructions.
- WebSocket closes unexpectedly (non-1000/1001 code): dispatch error, do not retry automatically (player must restart)
- Tool call response send fails: log warning, continue. Do not crash the session.

---

### 3.2 SoundEngine

**File**: `src/lib/sound-engine.ts`
**Current status**: Working. Needs tool call integration path added (currently uses keyword parsing as sole trigger).

**Purpose**: Manages all browser-side audio except Gemini voice output and Lyria music. Handles three responsibilities: (1) one-shot diegetic SFX triggered by Gemini tool calls, (2) ambient loop timeline with crossfades, (3) TTS ducking so ambient sounds lower when Gemini is speaking.

**Inputs**:
- `ToolCallEvent` from VoiceEngine (primary SFX trigger path)
- `parseSoundCues(text)` output from `lastAiText` (fallback SFX trigger path, retained for robustness)
- `startTimeline(events)` called once at game start
- `isSpeaking`, `isPaused` from GameContext

**Outputs**: Web Audio API nodes connected to `AudioContext.destination`

**TypeScript interface additions required**:

```typescript
// Add to existing SoundEngine class:
class SoundEngine {
  // EXISTING methods (do not remove):
  async init(): Promise<void>
  registerBuffer(id: string, buffer: AudioBuffer): void
  async preload(assets: Array<{ id: string; url: string }>): Promise<void>
  play(id: string, volume: number, loop: boolean, fadeInSeconds?: number): void
  stop(id: string, fadeDurationSeconds?: number): void
  setVolume(id: string, targetVolume: number, fadeDurationSeconds?: number): void
  muteAll(fadeDurationSeconds?: number): void
  restoreAll(volumes: Record<string, number>, fadeInSeconds?: number): void
  fadeAllToNothing(fadeDurationSeconds?: number): void
  startDucking(): void
  stopDucking(): void
  startTimeline(events: TimelineEvent[], getGameState?: () => Record<string, unknown>): void
  stopTimeline(): void
  pauseAudio(): void
  resumeAudio(): void
  triggerCue(soundId: string, volume?: number): void
  destroy(): void

  // NEW: Direct tool call handler
  handleToolCall(soundId: string): void
  // Implementation: same as triggerCue() but bypasses cooldown check.
  // Tool calls are already throttled by story logic; no cooldown needed here.
}
```

**Tool call trigger path** (new, primary):
```
Gemini sends toolCall { name: "trigger_sound", args: { sound_id: "footsteps" } }
→ VoiceEngine emits ToolCallEvent
→ useSoundEngine receives via onToolCall subscription
→ soundEngine.handleToolCall("footsteps")
→ soundEngine.play("footsteps", 0.7, false)   // one-shot, no loop
→ VoiceEngine sends SILENT tool response
→ Gemini audio output never interrupted
```

**Fallback trigger path** (existing, keep):
```
lastAiText changes → parseSoundCues(text) → trigger matching sounds with 30s cooldown
```

Both paths coexist. Tool calls are authoritative; keyword parsing catches cases where Gemini forgets to call the tool.

**3-layer audio routing** (all via Web Audio API):
```
Layer 1 (SFX):     BufferSource → StereoPanner → GainNode → MasterGain → destination
Layer 2 (Ambient): BufferSource (loop) → StereoPanner → GainNode → MasterGain → destination
TTS Duck:          MasterGain.gain ramps to (baseVolume * duckMultiplier) when isSpeaking
                   MasterGain.gain ramps back to baseVolume when not isSpeaking
```

Note: Lyria (Layer 3) connects to a SEPARATE GainNode, not MasterGain. Lyria is never ducked.

**Spatial panning map for "the-call"** (from existing `SPATIAL_MAPS`):
```typescript
"the-call": {
  phone_static: { pan: 0 },
  electrical_hum: { pan: 0 },
  sub_bass: { pan: 0 },
  phone_ring: { pan: 0 },
  pickup_click: { pan: 0 },
  disconnect_tone: { pan: 0 },
  footsteps: { pan: -0.2 },
  water_drip: { pan: 0.3 },
  door_creak: { pan: -0.1 },
  keypad_beep: { pan: 0 },
  metal_scrape: { pan: 0.2 },
  pipe_clank: { pan: 0.4 },
  heavy_breathing: { pan: 0 },
  distant_scream: { pan: 0.5 },
}
```

**Expected behavior when working correctly**:
- SFX fires within 100ms of Gemini tool call arriving (tool call response sent before triggering)
- Gemini voice audio does not drop, click, or pause when SFX fires
- Ambient timeline starts within 3 seconds of `status === "playing"`
- TTS ducking smoothly reduces ambient by 6dB in 300ms, restores in 600ms
- All sounds pause and resume correctly when player hits pause button

**Failure modes and fallbacks**:
- Sound file not loaded: log warning, skip silently. Never throw.
- AudioContext suspended by browser: call `ctx.resume()` inside `play()`
- Lyria WebSocket disconnects: MusicEngine handles independently; SoundEngine unaffected

---

### 3.3 MusicEngine (Lyria RealTime)

**File**: `src/lib/music-engine.ts` (NEW — does not exist yet)

**Purpose**: Manages a Lyria RealTime WebSocket session that streams adaptive background music. Gemini steers the music by calling `set_tension(level)`. MusicEngine translates the tension level to Lyria parameters and smoothly transitions.

**Inputs**:
- `updateTension(level: number, transitionSeconds: number)` — called by useSoundEngine when `set_tension` tool call fires
- Ephemeral Lyria token from `/api/lyria-token`

**Outputs**: Streaming PCM audio fed into a dedicated `AudioContext` channel (separate from SoundEngine's MasterGain)

**TypeScript interface**:

```typescript
export interface LyriaParams {
  prompts: Array<{
    text: string;
    weight: number;
  }>;
  density: number;        // 0.0–1.0
  brightness: number;     // 0.0–1.0
  bpm?: number;
}

export class MusicEngine {
  constructor(lyriaGainNode: GainNode, audioContext: AudioContext)

  async connect(ephemeralToken: string): Promise<void>
  // Opens WebSocket to Lyria RealTime endpoint.
  // Sends initial config with story-specific base prompts.
  // Starts streaming PCM chunks to lyriaGainNode.

  updateTension(level: number, transitionSeconds: number): void
  // Maps tension 0.0–1.0 to Lyria parameter set (see tension map below).
  // Sends weighted prompt update to Lyria WebSocket.
  // Does NOT wait for confirmation — fire and forget.

  pause(): void
  resume(): void
  destroy(): void
}
```

**Tension-to-Lyria parameter map**:

```typescript
const TENSION_MAP: Record<number, LyriaParams> = {
  // tension 0.0 — calm, call just started
  0: {
    prompts: [
      { text: "ambient electronic, sparse, minimal, late night, tension building", weight: 1.0 },
      { text: "horror, dissonant", weight: 0.1 }
    ],
    density: 0.2,
    brightness: 0.4,
  },
  // tension 0.3 — player engaged, mystery building
  0.3: {
    prompts: [
      { text: "ambient electronic, sparse, unsettling undertone, suspense", weight: 0.7 },
      { text: "horror, dissonant strings", weight: 0.3 }
    ],
    density: 0.4,
    brightness: 0.3,
  },
  // tension 0.6 — critical decision point
  0.6: {
    prompts: [
      { text: "horror ambient, dissonant, building dread, low drones", weight: 0.5 },
      { text: "orchestral tension, staccato strings", weight: 0.5 }
    ],
    density: 0.6,
    brightness: 0.2,
  },
  // tension 1.0 — climax / crisis
  1.0: {
    prompts: [
      { text: "full horror, dissonant orchestral, chaotic percussion, high tension", weight: 0.8 },
      { text: "ambient electronic, driving rhythm", weight: 0.2 }
    ],
    density: 0.9,
    brightness: 0.1,
  }
};
// Interpolate between nearest two entries for non-integer tension values.
```

**Lyria token endpoint** (`/api/lyria-token`):
```typescript
// POST /api/lyria-token
// Body: {}
// Returns: { token: string }
// Server mints ephemeral token scoped only to Lyria RealTime.
// Token validity: 1 hour.
```

**Connection flow**:
1. `useSoundEngine` calls `musicEngine.connect(token)` after `soundEngine.init()` completes
2. MusicEngine opens WebSocket to Lyria endpoint using token
3. Sends initial config (story-specific base tension = 0.0)
4. PCM chunks stream in → decoded → played through `lyriaGainNode`
5. `lyriaGainNode` base volume: 0.3 (below ambient and SFX)
6. Lyria is never ducked when Gemini speaks (it is already quiet enough)

**Lyria WebSocket endpoint** (from Google GenAI SDK):
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
```
Connect using `ai.live.connect({ model: "models/lyria-realtime-exp", ... })` with audio-only response modality.

**Expected behavior when working correctly**:
- Music starts within 5 seconds of game session open
- Tension transitions are smooth (no clicks, no abrupt stops)
- Music is clearly audible but never louder than Gemini's voice
- Tension 1.0 produces noticeably different, more intense music than tension 0.0
- Music continues playing during silence (player not speaking, Gemini not speaking)

**Failure modes and fallbacks**:
- Lyria WebSocket fails to connect: log error, continue game without music. SFX + ambient still work.
- Lyria token fetch fails: same — skip Lyria, continue.
- WebSocket drops mid-session: attempt one reconnect after 2 seconds. If second attempt fails, abandon Lyria silently.
- Do not surface Lyria failures to the player UI.

---

### 3.4 StoryEngine (Mode Router + Node Executor)

**File**: `src/lib/story-engine.ts` (NEW — does not exist yet as a unified router)

**Purpose**: Routes story execution to the correct mode handler (A/B/C) based on `StoryManifest.mode`. For Mode B (current "The Call"), StoryEngine is a thin layer — Gemini handles narrative autonomously. For Mode C (hybrid), StoryEngine tracks beat position and injects beat hints into Gemini's context.

**Current state**: For the hackathon, only Mode B needs to be fully working. Mode A and C can be stubs that log and fall through to Mode B behavior.

**TypeScript interface**:

```typescript
export type StoryMode = "A" | "B" | "C";

export interface StoryEngineOptions {
  manifest: StoryManifest;
  session: GeminiLiveSession;      // the live session ref from VoiceEngine
  onPhaseChange: (phase: number) => void;
  onBeatChange: (beat: string) => void;
  onEnding: (endingId: string) => void;
}

export class StoryEngine {
  constructor(options: StoryEngineOptions)

  start(): void
  // Mode A: start audio node playback
  // Mode B: do nothing — Gemini runs the story autonomously
  // Mode C: inject first beat hint into Gemini context

  advanceBeat(): void
  // Mode A/C: move to next node, trigger audio/narration
  // Mode B: no-op

  resolveChoice(choiceId: string): void
  // Mode C: inject choice consequence into Gemini context
  // Mode B: no-op (Gemini handles choices via voice intent)

  getCurrentPhase(): number
  getCurrentBeat(): string | null

  destroy(): void
}
```

**Mode B (Live) execution**:
Gemini's system prompt contains the full story structure, phase progression rules, and beat hints. StoryEngine in Mode B only needs to:
1. Track `elapsedSeconds` from GameContext
2. Detect phase changes from `set_tension` tool call args (tension 0.0-0.25 → phase 0, 0.25-0.5 → phase 1, etc.)
3. Dispatch `onPhaseChange(N)` so BreathingDot animation updates

**Phase detection from tension level**:
```typescript
function tensionToPhase(tension: number): number {
  if (tension < 0.2) return 0;
  if (tension < 0.4) return 1;
  if (tension < 0.65) return 2;
  if (tension < 0.85) return 3;
  return 4;
}
```

**Expected behavior when working correctly**:
- BreathingDot phase number matches the story's emotional act
- Phase 0: calm breathing (slow pulse, 4s period)
- Phase 4: rapid, distressed breathing (fast pulse, 0.8s period)

---

### 3.5 IntentClassifier

**File**: `src/app/api/intent/route.ts` (NEW route) + `src/lib/llm/gemini-adapter.ts` (existing `GeminiIntentParser`)

**Purpose**: When a story has explicit choice nodes (Mode A or C), the player's spoken response must be matched to one of 2-4 pre-defined choices. `GeminiIntentParser` calls Gemini Flash Lite with a tight classification prompt and returns the best matching choice ID.

**Note for Mode B ("The Call")**: The IntentClassifier is NOT used. Gemini Live handles intent inline as part of the narrative. The classifier is only needed for Mode A/C decision nodes.

**API route specification**:

```typescript
// POST /api/intent
// Body:
interface IntentRequest {
  playerText: string;
  storyId: string;
  phase: number;
  choices: Array<{
    id: string;
    label: string;
    playerSaysLike: string[];  // example phrases that match this choice
  }>;
}

// Response:
interface IntentResponse {
  matchedChoiceId: string;
  confidence: number;           // 0.0–1.0
  fallbackUsed: boolean;        // true if classifier confidence < 0.4
  rawIntent: string;            // for logging
}
```

**Gemini Flash Lite prompt template**:
```
You are a choice classifier for a voice game. The player must choose between these options.
Match their words to the closest option. Return only valid JSON.

Options:
{{choices as JSON with id, label, example phrases}}

Player said: "{{playerText}}"

Return: { "matchedChoiceId": "...", "confidence": 0.0-1.0 }
```

**Fallback behavior**: If `confidence < 0.4`, return the first choice as fallback with `fallbackUsed: true`. The game should prompt the player to respond again before applying the fallback.

**Latency target**: Flash Lite classification must complete in under 800ms. Set timeout to 2000ms and use fallback on timeout.

**Expected behavior when working correctly**:
- Exact phrase matches confidence > 0.9
- Paraphrased matches confidence > 0.6
- Ambiguous/off-topic input confidence < 0.4 → fallback + re-prompt

---

### 3.6 StoryLoader

**File**: `src/lib/story-loader.ts`
**Current status**: Working (YAML parse + per-file schema validation + snakeToCamel).

**Purpose**: Loads story definition YAML files from `stories/{storyId}/` directory at server startup. Validates each file against its schema. Transforms snake_case keys to camelCase. Caches loaded configs.

**Important invariant**: `snakeToCamel` transforms **keys only, not string values**. The string `"trust_level"` in a YAML value stays `"trust_level"`. Only the key `trust_level: 5` becomes `trustLevel: 5`.

**No changes needed** to existing StoryLoader for hackathon. Document only for agent context.

---

### 3.7 CreatorInterviewAgent

**File**: `src/app/api/creator/interview/route.ts` (NEW)
**Client**: `src/components/creator/CreatorInterview.tsx` (NEW)

**Purpose**: A conversational AI (Gemini Flash 2.0) that interviews a creator about their story idea. As the creator types, the agent asks follow-up questions and builds a structured `CreatorSpec`. Simultaneously, the right panel shows AI-generated atmosphere images (Imagen 3) based on what the creator describes.

**API route specification**:

```typescript
// POST /api/creator/interview
// Body:
interface InterviewRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  currentSpec: Partial<CreatorSpec>;  // accumulated so far
}

// Response (streaming SSE):
interface InterviewChunk {
  type: "message" | "spec_update" | "image_prompt" | "complete";
  content?: string;               // assistant message text (streaming)
  specUpdate?: Partial<CreatorSpec>; // incremental spec fields filled in
  imagePrompt?: string;           // prompt to send to Imagen (client-side)
  finalSpec?: CreatorSpec;        // only on type === "complete"
}
```

**Interview flow** (8-stage conversation):
1. Title + one-sentence hook ("What's the story? Describe it like you'd pitch it to a friend in 10 seconds.")
2. Player role ("Who is the player in this world? What do they do?")
3. Main character ("Describe the main character — surface vs. reality. What are they hiding?")
4. Voice + tone ("How does this character speak? Give me 3 adjectives and one forbidden phrase they'd never say.")
5. Story beats ("Walk me through the beginning, middle, and end. Three sentences max.")
6. Choice points ("Where do players make a decision? What are the 2-3 options?")
7. Sound + atmosphere ("What would you hear in the background? What changes as tension rises?")
8. Ending variants ("What are the 2-4 ways this story can end? What earns each one?")

**System prompt for Gemini Flash 2.0 (interview mode)**:
```
You are a story architect helping someone build a voice-only interactive narrative game.
Ask ONE question at a time. Be brief and direct. When you have enough information to fill
in a field of the story spec, extract it and return it as a spec_update.
Never ask for information you already have. Guide toward a 10-12 minute story with
2-3 choice points and 2-4 endings. When all required fields are filled, return type="complete".
```

**Image generation trigger**: When the creator describes setting or atmosphere, extract a visual prompt and return `type: "image_prompt"`. The client calls `/api/creator/image` with this prompt. Images appear in the right panel in real-time.

**Expected behavior when working correctly**:
- Creator can describe their story idea in natural language
- Agent asks only one focused question at a time
- After 8-12 exchanges, spec is complete
- Images appear in right panel within 5 seconds of descriptive text
- Creator can say "go back" or "change the ending" — agent adapts

---

### 3.8 AssetPipeline

**File**: `src/app/api/creator/image/route.ts` (NEW)
**Purpose**: Generates atmosphere preview images during creator interview using Imagen 3.

**API route specification**:

```typescript
// POST /api/creator/image
// Body: { prompt: string; storyId?: string }
// Returns: { imageUrl: string }  (base64 data URL or signed GCS URL)

// Imagen 3 call:
const response = await ai.models.generateImages({
  model: "imagen-3.0-generate-001",
  prompt: prompt + ", cinematic, dark atmosphere, moody lighting, no text",
  config: {
    numberOfImages: 1,
    aspectRatio: "16:9",
    safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
  }
});
```

**Prompt enhancement**: Always append `, cinematic, dark atmosphere, moody lighting, no text, no people, environmental photography` to creator's raw description before sending to Imagen.

**Rate limiting**: Max 1 request per 3 seconds per session. Queue requests; drop stale ones.

**Expected behavior**: Image appears in right panel within 6 seconds of prompt submission.

---

### 3.9 API Routes Summary

All routes live in `src/app/api/` under `hackathons/gemini/`.

```
POST /api/live-token
  Body: { storyId: string }
  Returns: { token: string }
  Auth: GEMINI_API_KEY (env, server-only)
  Notes: System prompt + tool declarations locked into token at mint time.
         Tool declarations include trigger_sound, set_tension, end_game.
         Single-use token, 1hr expiry.

POST /api/lyria-token
  Body: {}
  Returns: { token: string }
  Auth: GEMINI_API_KEY (env, server-only)
  Notes: Scoped to Lyria RealTime only. Separate from Live token.
         1hr expiry. Single-use.

POST /api/intent
  Body: IntentRequest (see 3.5)
  Returns: IntentResponse (see 3.5)
  Model: gemini-2.0-flash-lite
  Timeout: 2000ms

GET /api/stories
  Returns: StoryMeta[]
  Source: story-data.ts (static, no DB needed)

POST /api/creator/interview
  Body: InterviewRequest
  Returns: SSE stream of InterviewChunk
  Model: gemini-2.0-flash

POST /api/creator/image
  Body: { prompt: string }
  Returns: { imageUrl: string }
  Model: imagen-3.0-generate-001

POST /api/creator/publish
  Body: CreatorSpec
  Returns: { storyId: string; validationErrors: string[] }
  Notes: Validates spec completeness. Saves to stories/ directory.
         Returns errors if spec is incomplete; does not save partial specs.

GET /api/health
  Returns: { status: "ok"; timestamp: string }
  Used by: Cloud Run health check
```

---

## 4. Data Schemas

These are the canonical TypeScript interfaces. All code must use these exact shapes.

```typescript
// ─── Story Manifest ───────────────────────────────────────────────────────────

export type StoryMode = "A" | "B" | "C";
// A = Scripted (pre-recorded audio nodes, AI only classifies intent)
// B = Live (Gemini generates all narration in real-time)
// C = Hybrid (pre-authored spine + live narration between beats)

export interface StoryManifest {
  id: string;                      // "the-call", "the-last-session"
  title: string;
  mode: StoryMode;
  genre: string;
  durationMinutes: number;
  playerRole: string;
  tagline: string;
  contentWarnings: string[];
  characters: CharacterDefinition[];
  phases: StoryPhase[];            // ordered story phases
  sounds: SoundManifest;
  systemPrompt: string;            // injected into Gemini at session mint
}

// ─── Story Node (used in Mode A and C) ────────────────────────────────────────

export type StoryNodeType = "narration" | "decision" | "ending" | "silence";

export interface StoryNode {
  id: string;
  type: StoryNodeType;
  content: NodeContent;
  soundCues: SoundCue[];
  // For narration/silence: what comes next
  nextNodeId?: string;
  // For decision: which choice leads where
  choices?: ChoiceOption[];
}

// NodeContent is discriminated by mode × node type
export type NodeContent =
  | ScriptedNarrationContent    // Mode A narration
  | LiveNarrationContent        // Mode B narration
  | HybridNarrationContent      // Mode C narration
  | DecisionContent             // All modes, decision nodes
  | EndingContent;              // All modes, ending nodes

export interface ScriptedNarrationContent {
  type: "scripted";
  audioUrl: string;             // Pre-recorded/pre-generated audio file
  durationSeconds: number;      // Known duration for sound timing
  transcriptText: string;       // Displayed in transcript
}

export interface LiveNarrationContent {
  type: "live";
  beatHint: string;             // Injected into Gemini context: what this beat should cover
  wordBudget: number;           // Soft cap on response length
  voiceDirection?: string;      // e.g., "speak more urgently here"
}

export interface HybridNarrationContent {
  type: "hybrid";
  openingLine: string;          // First sentence is scripted (Gemini picks up after)
  beatHint: string;
  wordBudget: number;
}

export interface DecisionContent {
  type: "decision";
  prompt: string;               // What Elara/Alex says to present the choice
  choices: ChoiceOption[];
  timeoutSeconds?: number;      // Auto-select first choice if player silent
}

export interface EndingContent {
  type: "ending";
  narrativeText?: string;       // Final words (Live: Gemini generates; Scripted: this field)
  endingId: string;
  musicInstruction: string;     // e.g., "fade to silence over 30 seconds"
}

// ─── Character Definition ─────────────────────────────────────────────────────

export interface CharacterDefinition {
  id: string;
  name: string;
  role: "narrator" | "protagonist" | "antagonist" | "npc";
  voiceId: string;              // Gemini voice name: "Charon", "Aoede", etc.

  surfaceIdentity: string;      // What they appear to be
  trueNature: string;           // What they actually are (may differ radically)

  speechPatterns: string[];     // Behavioral rules: "never raises voice", "uses exact words back"
  forbiddenPhrases: string[];   // Phrases the character must NEVER say
  vocabulary: string;           // Description of word choice style

  memoryBehavior: "full" | "selective" | "amnesiac" | "inverted";
  // full = remembers everything the player says
  // selective = remembers emotionally significant moments only
  // amnesiac = cannot retain conversation history (resets each turn)
  // inverted = deliberately misremembers to gaslight

  knownFacts: string[];         // What the character knows
  secrets: CharacterSecret[];   // Hidden truths, with reveal conditions
}

export interface CharacterSecret {
  id: string;
  content: string;
  revealCondition: string;      // e.g., "after player asks about childhood twice"
  partialHints: string[];       // Foreshadowing phrases before full reveal
}

// ─── Story Phase ──────────────────────────────────────────────────────────────

export interface StoryPhase {
  id: string;
  index: number;                // 0-based
  name: string;
  tensionLevel: number;         // 0.0–1.0, sent to Lyria via set_tension
  purpose: string;
  timeRangeMinutes: [number, number];
  ambientSoundState: {
    active: string[];           // Sound IDs playing during this phase
    removed: string[];          // Sound IDs removed entering this phase
    added: string[];            // Sound IDs added entering this phase
  };
  beats: StoryBeat[];
}

export interface StoryBeat {
  id: string;
  type: "narration" | "choice" | "revelation" | "silence";
  wordBudget: number;
  purpose: string;
  promptHint: string;           // Injected as context to Gemini in Mode B/C
  soundCues: SoundCue[];
  stateChanges: Record<string, unknown>;  // Applied to game state when beat resolves
}

// ─── Sound Schemas ────────────────────────────────────────────────────────────

export interface SoundCue {
  soundId: string;
  trigger: "immediate" | "at_word" | "tool_call" | "timeline";
  volume: number;               // 0.0–1.0
  atWord?: string;              // For trigger="at_word": fires when this word appears in transcript
}

export interface SoundManifest {
  assets: SoundAsset[];
  timeline: SoundTimelineEvent[];
  spatialMap: Record<string, { pan: number }>;
  mixing: {
    ttsDucking: {
      reductionDb: number;
      fadeInMs: number;
      fadeOutMs: number;
    };
    crossfadeDefaultMs: number;
  };
}

export interface SoundAsset {
  id: string;
  description: string;
  assetPath: string | null;     // null = use synth-sounds.ts fallback
  loop: boolean;
  volume: number;
  spatial?: { pan: number };
}

export interface SoundTimelineEvent {
  time: number | string;        // seconds, or "MM:SS" string
  action: string;
  soundId?: string;
  soundIds?: string[];
  fadeDurationSeconds?: number;
  fadeInSeconds?: number;
  targetVolume?: number;
  condition?: string | null;
  restoreVolumes?: Record<string, number>;
}

// ─── Choice Option ────────────────────────────────────────────────────────────

export interface ChoiceOption {
  id: string;
  label: string;
  playerSaysLike: string[];     // Example phrases the player might say for this choice
  consequence: string;          // Human-readable consequence description
  nextNodeId?: string;          // Where this choice leads
  stateChanges: Record<string, unknown>;
  requires?: {
    trustLevelMin?: number;
    secretsRevealed?: string[];
    flags?: Record<string, boolean | string | number>;
  };
  styleScore?: Record<string, number>;  // Contribution to player style tracker
}

// ─── Game Session State ───────────────────────────────────────────────────────

export interface GameSessionState {
  sessionId: string;            // UUID generated at session start
  storyId: string;
  startedAt: number;            // Unix timestamp ms
  status: "connecting" | "playing" | "paused" | "ended" | "error";
  currentPhaseIndex: number;
  currentBeatId: string | null;
  elapsedSeconds: number;

  // Character states (keyed by character ID)
  characterStates: Record<string, RuntimeCharacterState>;

  // Player behavior tracking
  playerStyleScores: {
    empathetic: number;
    analytical: number;
    nurturing: number;
    confrontational: number;
  };
  choicesMade: Record<string, string>;  // beatId → choiceId
  endingId: string | null;
  revelationVariant: string | null;

  // Sound state
  soundsRemoved: string[];
  currentTension: number;

  // Flags set by beat state_changes
  flags: Record<string, boolean | string | number>;

  // Conversation history (for context injection)
  conversationHistory: Array<{
    role: "player" | "ai";
    text: string;
    timestamp: number;
  }>;
}

export interface RuntimeCharacterState {
  emotionalState: string;
  trustLevel: number;
  secretsRevealed: string[];
  currentPhaseBehavior: string;
  arcStageIndex: number;
}

// ─── Creator Spec (output of creator interview) ───────────────────────────────

export interface CreatorSpec {
  // Required fields — spec is incomplete without these
  title: string;
  hook: string;                 // One-sentence pitch
  playerRole: string;
  mode: StoryMode;
  durationMinutes: number;
  contentWarnings: string[];

  // Character
  mainCharacterName: string;
  mainCharacterSurface: string; // What they appear to be
  mainCharacterTruth: string;   // What they actually are
  mainCharacterVoice: string;   // Voice description (maps to Gemini voice)
  speechPatterns: string[];
  forbiddenPhrases: string[];

  // Story structure
  phases: Array<{
    name: string;
    summary: string;
    tensionLevel: number;
    durationMinutes: number;
  }>;

  choicePoints: Array<{
    phase: string;
    prompt: string;             // What the character says to present the choice
    options: Array<{
      label: string;
      consequence: string;
    }>;
  }>;

  endings: Array<{
    id: string;
    name: string;
    triggerCondition: string;   // Plain text description
    finalLines: string;
  }>;

  // Sound palette
  ambientDescription: string;   // What does the background sound like?
  atmosphericNotes: string;     // How does sound change as tension rises?

  // Creator metadata
  authorName: string;
  createdAt: number;            // Unix timestamp ms
}
```

---

## 5. UI/UX Specifications

---

### 5.1 Landing Page (`/`)

**File**: `src/app/page.tsx` (existing, working)

**Current state**: Working. Displays story catalogue. Featured story ("The Call") shown prominently. Navigation to `/play?story=the-call`.

**What must change for hackathon**:
- Remove any reference to "Mistral" or "ElevenLabs" in visible text or comments
- Update GitHub link in footer to point to Gemini repo
- Add "Built with Gemini Live API" badge (subtle, bottom right)
- Demo video embed (if present) must show Gemini version

**What must NOT change**:
- Story card layout
- Story images
- Navigation chrome
- Dark theme, typography tokens
- "InnerPlay" brand name

---

### 5.2 Player Onboarding Flow

**File**: `src/components/game/OnboardingFlow.tsx` (existing, working)

**Expected behavior** (document only — do not change):
1. Player navigates to `/play?story=the-call`
2. `OnboardingFlow` mounts. `GameContext` status = "idle".
3. Scene 1 image + text fades in (0.8s). "Your phone rings..."
4. Player taps/clicks → Scene 2 fades in. "Someone trapped underground..."
5. Player taps/clicks → Scene 3 fades in. "Guide them out. Your voice is all they have."
6. Player taps/clicks → "Put on headphones. Close your eyes." screen appears.
7. Player taps "Begin" button:
   - Button text changes to "Connecting..."
   - `startSession("the-call")` is called
   - Browser requests microphone permission (if not already granted)
   - `GameContext` status transitions: "idle" → "connecting"
8. When status becomes "playing", `OnboardingFlow` unmounts, `GameSession` mounts
9. If mic access denied: error screen with "Allow microphone access and refresh"

**Do not add visual choice overlays during gameplay.** The experience is voice-only once the session begins. "Eyes closed, voice only" is the design principle.

---

### 5.3 Game Session Screen

**File**: `src/components/game/GameSession.tsx` (existing, working)

**Expected behavior during play**:
- Screen is almost entirely black
- Center: `BreathingDot` (20px desktop, 12px mobile) — the only visual feedback
- Bottom 40%: scrolling transcript (AI text in white italic, player text in gray right-aligned)
- Screen is tappable — tap anywhere to reveal controls for 3 seconds

**BreathingDot phase behavior**:
```
phase 0 (tension 0.0–0.2):  slow pulse, 4.0s period, scale 0.8–1.2, opacity 0.4–0.8
phase 1 (tension 0.2–0.4):  medium pulse, 2.5s period, scale 0.8–1.3, opacity 0.5–0.9
phase 2 (tension 0.4–0.65): faster pulse, 1.5s period, scale 0.75–1.4, opacity 0.6–1.0
phase 3 (tension 0.65–0.85): rapid, 1.0s period, scale 0.7–1.5, opacity 0.7–1.0
phase 4 (tension 0.85–1.0): irregular stutter, 0.5–0.8s period, scale 0.6–1.6, opacity 0.8–1.0
```

**When `isSpeaking === true`**:
- BreathingDot size scales up 40% (Gemini voice output is "Elara/Alex breathing")
- No color change

**Controls (tap to reveal, auto-hide after 3s)**:
- "pause" button (border only, no fill)
- "end session" button (lower opacity — discourages accidental clicks)

**Transcript stripping**: `stripSoundMarkers(text)` must be called on all AI transcript entries before display. Players should not see `[SOUND:footsteps]` tags.

**End state**: When status = "ended", show only the last AI text in italic, centered, with a small "return home" link below. No animation. Quiet.

---

### 5.4 Creator Interview Screen

**File**: `src/components/creator/CreatorInterview.tsx` (NEW)

**Layout**: Two-column, full viewport.

```
┌─────────────────────────────────────────────────────────────┐
│  LEFT COLUMN (50%)              RIGHT COLUMN (50%)          │
│                                                             │
│  [AI message in italic]         [Atmosphere image]          │
│                                                             │
│  [Creator's previous message]   [Fades as new image loads]  │
│                                                             │
│  [Text input field]             [Next image fades in]       │
│  [Send button]                                              │
│                                                             │
│  [Progress: step 3 of 8]                                    │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Left: Streaming AI message text appears word by word (SSE stream)
- Right: When AI returns an `image_prompt`, POST `/api/creator/image`, show loading skeleton, crossfade to generated image
- Creator types in the input at the bottom left
- Send on Enter or button click
- Progress indicator shows interview stage (1/8 through 8/8)
- When `type === "complete"`, left column shows summary of filled spec, button "Review & Publish" appears

**Mobile**: Stack vertically (image above, chat below). Image height: 200px.

**Atmosphere image styling**: `border-radius: 4px`, slight vignette overlay, fade-in transition 0.5s.

---

### 5.5 Node Graph Builder

**File**: `src/components/creator/NodeGraph.tsx` (NEW)

**Purpose**: Visual canvas where creators connect story nodes. For hackathon, this is a functional MVP — not polished.

**Required interactions**:
- Pan: click and drag on empty canvas
- Add node: double-click canvas → dialog to pick node type (narration/decision/ending)
- Connect nodes: drag from node's output port to another node's input port
- Edit node: click node → right sidebar shows editable fields
- Delete node: select + Delete key

**Node visual representation**:
```
Narration node:  Rectangle, grey border, dark fill, node title
Decision node:   Diamond shape, amber border, shows 2-4 choice labels
Ending node:     Rectangle, red border, ending name
```

**Data model** (what the graph produces):
```typescript
interface GraphNode {
  id: string;
  type: StoryNodeType;
  position: { x: number; y: number };
  content: Partial<NodeContent>;  // filled as creator edits
}

interface GraphEdge {
  id: string;
  fromNodeId: string;
  fromPort: "default" | string;   // string for choice IDs on decision nodes
  toNodeId: string;
}

interface NodeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeId: string;
}
```

**Library**: Use `react-flow` (`@xyflow/react`) for canvas. It is the standard for this use case. Do not build custom canvas from scratch.

**Hackathon scope**: Basic node creation, connection, and editing. Auto-layout on import from CreatorSpec. Export to CreatorSpec format.

---

### 5.6 Playtest Screen

**File**: `src/components/creator/PlaytestView.tsx` (NEW)

**Purpose**: Creator plays their own story as the player would, but with a debug overlay showing sound cue logs and intent scores.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Game experience (normal GameSession)                       │
│                                                             │
│  DEBUG PANEL (bottom, collapsible, semi-transparent)        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Sound cues: [footsteps t=42s] [door_creak t=58s]      │  │
│  │ Intent: "help me" → matchedChoice="guide_calmly" 0.87 │  │
│  │ Phase: 2 | Tension: 0.61 | Beat: "revelation-hint"    │  │
│  │ Style: empathetic=3, analytical=1, nurturing=0         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Data sources**:
- Sound cue log: subscribe to SoundEngine events (add `onCueFired` callback)
- Intent scores: returned from `/api/intent` responses
- Phase/tension: from GameContext
- Style scores: from StoryState

**Toggle**: "H" key toggles debug panel visibility.

---

### 5.7 Story Catalogue

**File**: `src/app/page.tsx` (existing), `src/lib/story-data.ts` (existing)

**Current state**: Working. 4 stories shown. "The Call" is featured (playable). Others show "coming soon".

**What must change**:
- Add "Creator Portal" link to navbar (→ `/create`)
- Keep all existing story cards and layout unchanged

---

## 6. Implementation Order (LEGO Pieces)

Each piece is independently testable. Build in order. Do not skip ahead.

---

### Piece 1: SILENT tool call response for trigger_sound

**What**: Add tool call handler to GameContext. When Gemini sends `toolCall.functionCalls[].name === "trigger_sound"`, respond with `{ scheduling: "SILENT" }` before triggering the sound. Remove the 3-second audio init delay that was compensating for the old keyword approach.

**Files changed**: `src/context/GameContext.tsx`

**Test**: Open browser console. Play "The Call". Within 60 seconds, you should see `[GameContext] Tool call: trigger_sound { sound_id: "footsteps" }` in the log. Gemini audio must not pause. Simultaneously, `[SOUND] play(footsteps)` must appear in console within 100ms of the tool call log.

**Do not touch**: AudioCapture, AudioPlayback, session connect logic, transcript accumulation.

---

### Piece 2: set_tension tool call → phase update + Lyria trigger

**What**: Add handler for `set_tension` tool call. (1) Map tension to phase number using `tensionToPhase()`. (2) Dispatch `SET_PHASE` if phase changed. (3) Call `musicEngine.updateTension(level, transitionSeconds)`.

**Files changed**: `src/context/GameContext.tsx` (add to tool call handler), `src/lib/music-engine.ts` (new file)

**Test**: Play "The Call". In console: when AI narrates an urgent moment, `[GameContext] Tool call: set_tension { level: 0.7 }` appears. Immediately after: `[MUSIC] updateTension(0.7, 4)`. BreathingDot changes animation speed within 1 second.

---

### Piece 3: MusicEngine — Lyria RealTime connection

**What**: Implement `MusicEngine` class. Fetch Lyria token from `/api/lyria-token`. Open WebSocket. Stream PCM. Apply tension updates via weighted prompt changes.

**Files changed**: `src/lib/music-engine.ts` (new), `src/app/api/lyria-token/route.ts` (new), `src/hooks/useSoundEngine.ts` (instantiate MusicEngine, pass tension updates)

**Test**: Play game. Within 5 seconds of "playing" status, `[MUSIC] Connected to Lyria RealTime` appears. Music is audible in headphones (soft, 30% volume). After a tense moment in the story, music becomes noticeably more intense within 5 seconds of tension update.

---

### Piece 4: Tool declarations locked into live-token

**What**: Update `/api/live-token/route.ts` to include `trigger_sound`, `set_tension`, `end_game` tool declarations in the `liveConnectConstraints.config.tools` array.

**Files changed**: `src/app/api/live-token/route.ts`

**Test**: Restart dev server. POST `/api/live-token` with `{ storyId: "the-call" }`. Inspect the token (decode it if possible) or verify via game session: tool calls appear in console within first 2 minutes of play.

---

### Piece 5: BreathingDot phase animation

**What**: Update `BreathingDot` component to accept `phase: number` (0-4) and animate at phase-appropriate speed and scale per spec in section 5.3.

**Files changed**: `src/components/ui/BreathingDot.tsx`

**Test**: Navigate to `/play?story=the-call`. Start session. Observe breathing dot. It should pulse slowly at start. After a tense moment (tracked via console set_tension calls), it should speed up noticeably.

---

### Piece 6: end_game tool call → graceful session end

**What**: Add handler for `end_game` tool call. Wait for current audio playback to drain (check `isSpeaking === false`), then dispatch `GAME_OVER`, then close session.

**Files changed**: `src/context/GameContext.tsx`

**Test**: In story prompt, add a debug trigger: "If player says 'test end game', call end_game immediately." Say "test end game." Verify session ends gracefully, GameSession shows end state, no error.

---

### Piece 7: /api/lyria-token route

**What**: Implement `POST /api/lyria-token`. Mint ephemeral token scoped to `models/lyria-realtime-exp` only. Identical pattern to `/api/live-token` but for Lyria.

**Files changed**: `src/app/api/lyria-token/route.ts` (new)

**Test**: `curl -X POST http://localhost:3000/api/lyria-token` returns `{ token: "..." }` (non-empty string).

---

### Piece 8: /api/intent route

**What**: Implement intent classification route using `GeminiIntentParser`. Accept `IntentRequest`, call Flash Lite, return `IntentResponse`.

**Files changed**: `src/app/api/intent/route.ts` (new)

**Test**: POST `/api/intent` with `{ playerText: "I'll help you", choices: [{ id: "help", label: "Offer help", playerSaysLike: ["I'll help", "I can help"] }], storyId: "the-call", phase: 0 }`. Response: `{ matchedChoiceId: "help", confidence: >0.7, fallbackUsed: false }`.

---

### Piece 9: Creator Interview UI + API

**What**: Build `CreatorInterview` component and `POST /api/creator/interview` route. SSE streaming. 8-stage interview flow. Spec accumulation.

**Files changed**: `src/components/creator/CreatorInterview.tsx` (new), `src/app/api/creator/interview/route.ts` (new), `src/app/create/page.tsx` (new)

**Test**: Navigate to `/create`. Type "A horror story where a detective is being hunted by the case." Agent responds with follow-up question. After 8-12 exchanges, spec appears complete. Right panel shows at least one atmosphere image.

---

### Piece 10: /api/creator/image route

**What**: Implement Imagen 3 atmosphere image generation. Take prompt, enhance it, call Imagen, return base64 data URL.

**Files changed**: `src/app/api/creator/image/route.ts` (new)

**Test**: POST `/api/creator/image` with `{ prompt: "dark therapy office, late night, rain" }`. Response: `{ imageUrl: "data:image/png;base64,..." }`. Image is visible, atmospheric, dark, no text.

---

### Piece 11: Node Graph Builder

**What**: Install `@xyflow/react`. Build `NodeGraph` component. Connect to CreatorSpec import/export.

**Files changed**: `src/components/creator/NodeGraph.tsx` (new), `package.json`

**Test**: Navigate to creator flow. After interview completes, click "Build Graph." Canvas appears with nodes representing the story phases and beats. Nodes are connected. Creator can drag nodes. Creator can double-click to edit a beat's prompt hint.

---

### Piece 12: Playtest screen

**What**: Build `PlaytestView` — wraps `GameSession` with debug panel overlay.

**Files changed**: `src/components/creator/PlaytestView.tsx` (new), `src/app/create/playtest/page.tsx` (new)

**Test**: Creator clicks "Playtest" from node graph. Story starts. Debug panel shows sound cue events within 5 seconds. Toggle with "H" key works.

---

### Piece 13: Landing page cleanup

**What**: Remove Mistral/ElevenLabs references. Update GitHub link. Add Gemini badge. Add Creator Portal link.

**Files changed**: `src/app/page.tsx`, `src/app/layout.tsx` (if footer is there)

**Test**: Load `/`. No visible text mentioning "Mistral" or "ElevenLabs". "Creator Portal" link in nav. "Built with Gemini" badge visible.

---

### Piece 14: Dockerfile + Cloud Run deployment

**What**: Write `Dockerfile` for the gemini app. Configure for Cloud Run (PORT env var, single container, WebSocket support). Write `cloudbuild.yaml` for one-command deploy.

**Files changed**: `Dockerfile` (in `hackathons/gemini/`), `cloudbuild.yaml` (new)

**Test**: `docker build -t innerplay-gemini .` succeeds. `docker run -p 8080:8080 -e GEMINI_API_KEY=... innerplay-gemini` runs. `curl http://localhost:8080/api/health` returns `{ status: "ok" }`.

---

### Piece 15: Architecture diagram

**What**: Create `docs/architecture-diagram.png` using Excalidraw or similar. Must show: browser → Next.js → Gemini Live + Lyria + Flash Lite + Imagen. Required for hackathon submission.

**Files changed**: `docs/architecture-diagram.png` (new), `docs/architecture-diagram.excalidraw` (source)

**Test**: Image is clear, readable at 1920x1080. All components labeled. Data flows shown with arrows.

---

## 7. Desired Outputs Per Feature

### 7.1 SILENT Tool Call for Sound Effects
"The system is working correctly when: Gemini narrates 'you hear footsteps approaching' and calls `trigger_sound({ sound_id: 'footsteps' })`. The footsteps sound plays in the browser within 100ms. Gemini's voice continues without any pause, click, or interruption. In the browser console, `SET_PHASE` does NOT fire for a trigger_sound call — only `set_tension` triggers phase changes."

### 7.2 Lyria Adaptive Music
"The system is working correctly when: Music begins playing within 5 seconds of game start, at approximately 30% volume (clearly audible but not dominant). When Gemini calls `set_tension({ level: 0.8 })`, the music noticeably changes character within 4 seconds — becoming denser, darker, and more intense. When Gemini calls `set_tension({ level: 0.1 })`, music lightens within 4 seconds. Music never stops completely during play (even during silence). If Lyria fails to connect, the game continues without error or UI notification."

### 7.3 Phase-Aware BreathingDot
"The system is working correctly when: The breathing dot pulses at different speeds across phases 0-4. Phase 0 is a slow, meditative pulse (4s cycle). Phase 4 is rapid and irregular. The transition between phases is smooth — no instant jump. The dot's pulse rate matches the emotional intensity of the current narrative moment."

### 7.4 Intent Classification
"The system is working correctly when: A POST to `/api/intent` with a player phrase that clearly matches one of the choices returns `confidence > 0.75` for that choice within 800ms. An ambiguous phrase returns `confidence < 0.4` and `fallbackUsed: true`. The route never returns a 500 error — it always returns a valid `IntentResponse` (using fallback if Flash Lite fails)."

### 7.5 Creator Interview
"The system is working correctly when: A creator can describe their story idea in 8-12 exchanges with the AI. The right panel shows a relevant atmosphere image after the creator describes the setting. After the final exchange, a complete `CreatorSpec` is returned with all required fields populated. The creator can say 'actually, make the character a doctor instead of a detective' and the spec updates correctly."

### 7.6 Atmosphere Image Generation
"The system is working correctly when: A POST to `/api/creator/image` with a descriptive prompt returns a base64 image within 6 seconds. The image is dark, cinematic, contains no text, and visually matches the described atmosphere. Multiple calls with different prompts produce visually distinct results."

### 7.7 Node Graph Builder
"The system is working correctly when: A creator can import a completed CreatorSpec and see it rendered as connected nodes on a canvas. They can drag nodes to rearrange, double-click to edit beat content, and export the modified spec. The graph accurately represents the story's branching structure."

### 7.8 End-to-End Game Session (The Call)
"The system is working correctly when: A player starts the session. Within 10 seconds, they hear Alex's voice clearly. Within 60 seconds, they hear at least one sound effect (footsteps, static, or breathing) fire precisely as Gemini narrates it. The background music is present and atmospheric. The breathing dot pulses and changes speed as tension rises. The transcript shows both the player's words and Alex's narration. When the player stops talking for 12 seconds, Alex prompts them without the player having to say anything. The session runs for at least 10 minutes without error."

### 7.9 Cloud Run Deployment
"The system is working correctly when: The app is deployed to Cloud Run at a public URL. `/api/health` returns 200. A complete game session (10 minutes, voice + sound + music) runs without timeout or disconnect on the deployed URL. GCP Cloud Logging shows Gemini Live session open/close events."

---

## 8. Known Risks and Mitigations

---

### Risk 1: SILENT tool call not supported or unreliable

**Description**: The `FunctionResponseScheduling.SILENT` field is a v1alpha feature. If the API does not support it, every tool call will pause Gemini's audio output — destroying the immersion.

**Probability**: Medium. v1alpha APIs are experimental.

**Mitigation**:
1. Test on day 1 (Piece 1). If SILENT works, proceed.
2. If SILENT is not respected (voice pauses), fallback: keep keyword parsing as sole trigger. Remove tool calls from the live session. Sound is less precise but story still works.
3. If tool calls fail entirely: keep keyword parsing + add `[SOUND:soundId]` markers to story prompts so Gemini includes them in output text. Parse and strip before display. (This is the current fallback already in place.)

**Detection**: In console, if `trigger_sound` tool call fires but Gemini audio briefly pauses (AudioPlayback stops momentarily), SILENT is not working.

---

### Risk 2: Lyria RealTime API access

**Description**: `models/lyria-realtime-exp` may not be available in the project's API tier, may not support ephemeral tokens, or may have a different WebSocket protocol than expected.

**Probability**: Medium. Experimental model, limited docs.

**Mitigation**:
1. Test Lyria connection on day 1 (before building Pieces 2-3).
2. If Lyria is unavailable: substitute pre-generated ambient music files (MP3s) that fade between 5 pre-authored tracks based on tension level. SoundEngine can handle this natively.
3. If Lyria works but latency is > 10 seconds: use pre-gen files for base music, blend Lyria on top with a lower mix volume.

**Implementation of fallback** (pre-generated tracks):
```typescript
// In useSoundEngine.ts, if MusicEngine.connect() fails:
const tensionTracks = {
  0: "/audio/music/tension-0.mp3",
  1: "/audio/music/tension-3.mp3",
  2: "/audio/music/tension-5.mp3",
  3: "/audio/music/tension-7.mp3",
  4: "/audio/music/tension-10.mp3",
};
// Cross-fade between tracks on tension change.
```

---

### Risk 3: Intent classifier confidence too low

**Description**: Gemini Flash Lite may frequently return `confidence < 0.4` for natural player speech, causing fallbacks and repeated re-prompts that break immersion.

**Probability**: Low. Flash Lite is good at classification with few-shot examples.

**Mitigation**:
1. Calibrate `playerSaysLike` examples in story data. Minimum 5 examples per choice.
2. Lower fallback threshold to 0.3 (accept more uncertain matches).
3. For Mode B ("The Call"), the classifier is not used at all — Gemini Live handles intent inline. Only Mode A/C stories are at risk.
4. If classifier still unreliable: replace with semantic similarity using embeddings. `text-embedding-004` model, cosine similarity against `playerSaysLike` examples. More reliable than generation-based classification.

---

### Risk 4: Session resumption failure mid-demo

**Description**: Gemini Live sessions expire after 10-15 minutes by default. If `contextWindowCompression` doesn't work as expected, the session may hard-close during the demo at exactly the wrong moment.

**Probability**: Low with current config. `contextWindowCompression: { slidingWindow: {} }` + `sessionResumption: {}` should handle this.

**Mitigation**:
1. Test a full 12-minute session end-to-end on day 3. Verify no disconnects.
2. If disconnect happens: implement explicit `GoAway` handler. When `GoAway` message arrives, immediately store the resumption handle, pause audio, reconnect, resume. Player experiences < 2 seconds of silence.
3. For the demo: keep demo session to 3.5 minutes. Well within the 10-minute safe window.

**GoAway handling** (add to GameContext onmessage):
```typescript
const goAway = (msg as Record<string, unknown>)?.goAway as { timeLeft?: number } | undefined;
if (goAway) {
  console.warn("[GameContext] GoAway received, timeLeft:", goAway.timeLeft);
  // If timeLeft < 30s, attempt reconnect
}
```

---

### Risk 5: Imagen 3 content policy rejections

**Description**: Imagen 3's safety filters may reject dark/horror atmosphere prompts. The creator pipeline image preview would fail silently or error.

**Probability**: Low with careful prompt engineering.

**Mitigation**:
1. Always frame prompts as "environmental/architectural photography" rather than character-focused horror.
2. Good prompt: "abandoned late-night therapy office, rain on windows, dim lamp light, cinematic"
3. Avoid: "monster", "blood", "death", "corpse", "violence"
4. If image generation fails (429 or content filter): show a curated set of 10 pre-generated placeholder images based on story genre. Creator still sees something atmospheric.

---

### Risk 6: AudioContext autoplay policy (mobile browsers)

**Description**: Mobile browsers require a user gesture to start AudioContext. The 3-second delay in `useSoundEngine` was designed to mitigate this, but on some iOS versions AudioContext may still refuse to start.

**Probability**: Low on desktop (where the demo will run). Medium on mobile.

**Mitigation**:
1. Call `audioContext.resume()` inside the `play()` method as a defensive measure (already in SoundEngine).
2. Ensure `startSession()` is always called from a direct user click handler (it is — the "Begin" button).
3. For demo: use desktop browser (Chrome), not mobile. Document this in submission.

---

## 9. Hackathon Demo Script

**Duration**: 3 minutes 30 seconds
**Presenter**: 1 person (can be voiceover on video)
**Setup**: Laptop with headphones plugged in, browser open to InnerPlay landing page, screen recording running.

---

### Opening — 0:00 to 0:20

**[Screen: InnerPlay landing page]**

Presenter (voiceover): "This is InnerPlay. Close your screen. Put on headphones. A voice speaks to you. You respond. The story lives entirely in your imagination."

Brief pause.

"Three Google AI models. One WebSocket. Zero visual gameplay."

---

### The Platform — 0:20 to 0:45

**[Screen: Landing page, then pan to story cards]**

Presenter: "InnerPlay is a platform for voice-only interactive stories. Each story is an AI character with a secret, a world built from sound, and choices made entirely through your voice."

**[Screen: Click "The Call" card → OnboardingFlow]**

Presenter: "Tonight we're playing The Call. You're about to answer a phone. Someone is trapped underground. Your voice is their only way out."

---

### The Experience — 0:45 to 2:15

**[Screen: OnboardingFlow scenes advance, presenter puts on headphones]**

Presenter: "Watch what happens when I tap Begin."

**[Action: Click Begin. Wait for connection.]**

**[Audio from headphones is playing — screen shows Gemini audio output text in transcript]**

Alex's voice (live from Gemini): "Hello?? Oh god, someone picked up. Please — please don't hang up. I don't know where I am. I woke up here. There are pipes everywhere..."

**[Console visible, presenter does NOT scroll — let the transcript show naturally]**

Presenter (voiceover): "Alex's voice is Gemini Live — native audio, no TTS pipeline, under 600 milliseconds to first word."

**[Watch for a few seconds of Alex speaking]**

Presenter: "Watch the console."

**[Alex narrates exploring the room — a sound effect fires]**

**[Console shows: "[GameContext] Tool call: trigger_sound { sound_id: 'footsteps' }" and "[SOUND] play(footsteps)"]**

Presenter: "Gemini called a function mid-sentence. The footstep sound fired. Alex's voice never stopped. That's a SILENT function call — the tool call response is invisible to the voice stream."

**[Presenter speaks to Alex aloud]**

Presenter: "Alex, try to find something you can use. Look around."

**[Alex responds. Console shows set_tension being called. BreathingDot speeds up.]**

Presenter (voiceover): "I said one sentence. Gemini heard my voice, understood the intent, and adapted the story. And it called set_tension — which is changing the background music right now."

**[Point to breathing dot]**

Presenter: "That breathing dot is phase 2 now — faster. The music is darker. The sound design is shifting."

---

### The Architecture — 2:15 to 2:45

**[Screen: Architecture diagram (static image)]**

Presenter: "One WebSocket to Gemini Live handles voice in and voice out simultaneously. Gemini calls two silent tools during narration: trigger_sound fires diegetic effects exactly when they're described. set_tension steers Lyria RealTime — Google's adaptive music model — changing the background music's density and mood without any interruption."

**[Diagram highlights the three audio layers]**

"Three audio layers: sound effects, ambient atmosphere, Lyria music. All coordinated by Gemini. The player hears one seamless world."

---

### The Creator Pipeline — 2:45 to 3:15

**[Screen: Navigate to /create]**

Presenter: "But InnerPlay is a platform. Anyone can build a story."

**[Creator interview UI appears]**

Presenter: "You describe your story idea. The AI asks you eight questions. As you answer..."

**[Type a story description — watch image appear on right]**

"...Imagen 3 generates atmosphere previews in real-time. You see your story's vibe before it's written."

**[Show the node graph after a few exchanges]**

"Eight minutes later, you have a structured story with phases, character definition, sound palette, and branching endings. One click to publish."

---

### Close — 3:15 to 3:30

**[Screen: Back to landing page, "Built with Gemini" badge visible]**

Presenter: "InnerPlay breaks the text box. It breaks the screen. Every Google AI model here is doing something that was impossible three years ago — affective voice generation, function calling mid-speech, real-time adaptive music, conversational story authoring."

"Eyes closed. Headphones on. The story is already playing."

**[End]**

---

### Demo Setup Checklist (Before Recording)

- [ ] `GEMINI_API_KEY` set and valid in `.env.local`
- [ ] Dev server running: `npm run dev` in `hackathons/gemini/`
- [ ] Browser: Chrome (latest), microphone permission pre-granted
- [ ] Headphones plugged in and selected as audio output
- [ ] Browser DevTools open, console tab visible (filter: `[GameContext]` + `[SOUND]` + `[MUSIC]`)
- [ ] Story audio files present in `public/audio/` or synth sounds confirmed working
- [ ] Landing page shows no "Mistral" or "ElevenLabs" text
- [ ] Test run: do a complete 5-minute session privately before recording final take
- [ ] Architecture diagram image ready at `docs/architecture-diagram.png`
- [ ] Screen recording software ready (OBS or Loom), 1080p, 30fps

---

---

## Appendix A: SFX Asset Pipeline — Vendor Selection

### Requirement
Pre-generate a library of ~50-100 horror/thriller sound effects before launch. Must be affordable, high quality, and usable in a real product.

### Ranked Options

**#1 Recommended: ElevenLabs Sound Effects (Free Tier)**
- Free tier: 10,000 credits/month
- 1 SFX = ~200 credits → **50 SFX free per month**
- $5/month = 100,000 credits → **500 SFX for $5**
- Quality: Best-in-class AI SFX, text-to-sound with excellent prompt adherence
- API: `POST https://api.elevenlabs.io/v1/sound-generation`
- Output: MP3, 44.1kHz
- Verdict: Use this for all diegetic SFX in "The Call". 10k free credits covers the full SFX library.

**#2 Backup: Stable Audio Open (via Replicate)**
- ~$0.02-0.04 per clip (Replicate inference cost)
- $2-4 for 100 clips
- Open-source weights (Stable Audio Open), can self-host
- Quality: Good for ambient/textural sounds, weaker on precise diegetic SFX
- Verdict: Fallback if ElevenLabs rate-limits or changes free tier.

**#3 Freesound.org (CC0 library)**
- Free, zero cost, instant access
- 600,000+ creative commons sounds
- Quality varies — requires manual curation
- Verdict: Use for generic sounds (phone ringing, door creak, footsteps) where AI generation is overkill.

**#4 Skip: ElevenLabs paid SFX API at scale**
- $0.05/1,000 chars of prompt ≈ $0.50-2.00 per 100 SFX at medium usage
- Too expensive at real-time generation scale. Pre-generation only.

### Implementation Strategy
1. Identify all `soundId` values in "The Call" story YAML (target: 20-30 distinct cues)
2. Write prompts for each (`"phone ringing old landline, distant, fading"`)
3. Batch-generate via ElevenLabs API script (run once, store in `public/audio/sfx/`)
4. Supplement with Freesound CC0 for generic cues
5. File naming: `{soundId}.mp3` matching the `soundId` in YAML exactly

### Budget Estimate for Hackathon
- ElevenLabs free tier: 10,000 credits = ~50 unique SFX: **$0**
- Replicate backup for 20 ambient textures: **~$0.80**
- Total: **under $1 to fully populate the SFX library**

---

## Appendix B: Competitive Landscape Analysis

### Platforms Analyzed (13 total)
Earplay, Sound Realms, TWIST Tales, Volley (Alexa games), Goalhanger Podcasts (interactive audio), AudioTale, Artemis, HearYou, StoryTell, Audio Alchemy, Nox app (radio dramas), LORE (horror podcast games), Narrativa.

### Market Gaps InnerPlay Owns (6 simultaneous — no competitor holds all 6)

| Gap | What It Means | Who Comes Closest |
|-----|--------------|------------------|
| **1. Voice-in + voice-out + eyes-closed triangle** | True eyes-closed play where player speaks and AI speaks back with no screen fallback. | No competitor — all require screen for choice display or progress |
| **2. AI narration inside authored arc** | Gemini generates sentences live, constrained by a pre-authored story graph (tension, phases, endings). Neither fully scripted nor fully freeform. | Earplay (scripted only), ChatGPT (freeform only) — none in between |
| **3. Headphone-first binaural in interactive fiction** | Designed assuming headphones: left/right panning, 3D placement, phase-aware music. Not an afterthought. | Sound Realms (rich audio, but choose-your-own-adventure, no AI voice) |
| **4. Player psychological style tracking** | The ending the player reaches depends on how they responded emotionally throughout — not just what they chose at binary forks. | No competitor tracks *how* the player speaks, only *what* they choose |
| **5. Open creator platform for voice games** | A pipeline where creators can build new stories without writing code. | No platform offers this with AI assistance. All are closed content libraries. |
| **6. Horror/thriller as primary genre in audio-only interactive** | The category exists (escape room podcasts, horror audio dramas) but none are voice-interactive with live AI. | LORE (horror, but passive listening), Sound Realms (adventure, not horror) |

### Category Position
InnerPlay is not competing with podcasts (passive), audiobooks (passive), or voice assistants (utility). The correct competitive frame is:
**"If Disco Elysium and a therapy chatbot had a child that lived entirely in your ears."**

This framing is useful for the hackathon demo script — judges will immediately understand what category InnerPlay is creating, not joining.

### Validator: Why These Gaps Are Real
- **qForge** won €10K at ElevenLabs hackathon 2024 with a voice storytelling engine (validates our category is valued by judges)
- **GibberLink** won with concept clarity at <100 lines of code (validates that novelty > complexity for hackathon judges)
- **No voice-interactive horror game** appears in the top 100 of any major app store. The category is vacant.

---

## Appendix C: Pending Tasks (Updated 2026-03-03)

### P0 - Runtime Stability
1. Add live-session fallback telemetry (selected model, fallback used, close code distribution).
2. Add one-click runtime diagnostics endpoint for live token/model health.
3. Add bounded reconnect policy for transient close codes (`1011`, network reset) with strict cap.
4. Improve user-facing errors for model-not-found vs quota vs auth vs microphone.

### P1 - Directional Sound
1. Introduce world-space audio entities (`entityId`, `x`, `y`, `velocity`, `bus`, `gain`, `pan`).
2. Add moving cue support (e.g., footsteps left-to-right over time) with interpolation.
3. Add zone/occlusion rules so off-room voices sound physically separated.
4. Add deterministic tests for pan, attenuation, and occlusion behavior.

### P1 - Multi-Agent Story + Voice
1. Add orchestrator/director loop (speaker arbitration, overlap policy, pacing budget).
2. Add per-character agent roles/goals with shared blackboard world state.
3. Add per-character voice config and bus routing (`main_voice`, `npc_voice`, `ambient`, `sfx`).
4. Add background utterance mode for secondary characters (short diegetic lines).

### P1 - Map and World State
1. Maintain canonical player position + character positions each turn.
2. Feed world snapshot to all character agents before action selection.
3. Add 2-5 second deterministic event scheduler for speech/SFX ordering.
4. Log every decision (`speakerId`, `position`, `reason`, `causalChain`) for replay/debug.

### P1 - Closed-Loop Verification
1. Extend scenario suite for multi-speaker overlaps and positional audio assertions.
2. Add checks for tool-call vs fallback precedence invariants.
3. Add CLI verification command covering orchestrator + audio routing correctness.

---

*End of Architecture & Implementation Plan*
*Document version: 1.2 — 2026-03-03 (Appendix C pending tasks added)*
