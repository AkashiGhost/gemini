# InnerPlay — Devpost Submission

**Category:** Live Agents
**Deployed at:** https://innerplay.app
**Tech:** Gemini 2.5 Flash Native Audio · Google Cloud Run · Next.js 16 · Web Audio API

---

## Inspiration

Every immersive experience I have tried — VR, AR, escape rooms, audio dramas — still asks you to look at something. A screen. A headset lens. A room. The technology becomes the object of attention, and the experience shrinks to fit around it.

There is a better engine available: the human imagination. When you close your eyes in a dark room, your brain does not go quiet. It renders. Give it a compelling voice, spatially placed sound, and a character that reacts to you, and it builds something no GPU can match.

We spend billions of dollars building visual displays while ignoring the most powerful rendering engine on earth. Eight billion people carry it around, and most of the time we use it to scroll.

InnerPlay started from one design constraint: remove the screen entirely. If a player must open their eyes to interact with the game, the experience has failed. What remained after that constraint was something that did not exist yet — a voice-only game that is designed to be played in the dark.

---

## What It Does

InnerPlay is the first game designed to be played with your eyes closed.

Players put on headphones, speak the command "begin," and enter a ten-minute story powered by a live Gemini voice agent. There is no interface to navigate, no text to read, no controller to hold. The AI character responds to what you say, how you say it, the length of your pauses, and a player profile that captures your emotional self-portrait — your life stage, values, recurring fears, and conflict style. No two sessions sound the same.

Stories are not branching trees. They are living conversations constrained by arc structure. The AI holds a narrative direction and tension level while staying genuinely responsive to the specific player in the room. If you challenge the character, the story escalates. If you go quiet, the silence becomes part of the experience.

The current catalogue includes:

- **The Call** — a thriller. You answer a phone. The person on the other end knows more about you than they should.
- **The Last Session** — psychological horror. Your therapist has scheduled one final appointment.
- **The Lighthouse** — cosmic horror. Something has been watching from offshore for a very long time.
- **Room 4B** — body horror. You wake up in a medical facility with no memory of checking in.
- **Exit Interview** — corporate horror. The HR rep at the end of the table is not reviewing your performance. She is reviewing your choices.
- **Me and Mes** — inner dialogue. A neutral facilitator maps your functional selves: what reacts first, what protects second, what gets buried, what secretly wants control.

Three layers of spatial audio run continuously: ambient environment, adaptive music, and the character's live voice. The technology is supposed to disappear. The goal is a ten-minute window where the player forgets there is a machine involved.

---

## How We Built It

### Gemini Live API as the Core Loop

The runtime is built around persistent Gemini Live WebSocket sessions using `gemini-live-2.5-flash-native-audio` via the Google GenAI SDK (`@google/genai`). Every story opens a native audio session: the browser streams microphone audio directly to Gemini, and Gemini streams synthesized voice audio back in real time. No intermediate speech-to-text or text-to-speech pipeline sits in between — the model handles both ends natively.

Each session is initialized with a system prompt that encodes the character's persona, the story's current phase, the tension target, and a bounded slice of the player's profile. A custom story engine translates YAML-defined story packs into session configuration at runtime.

### Story Engine and YAML Story Packs

Stories are defined as YAML documents validated against AJV schemas. Each pack specifies character name, persona description, phase sequence (assessment → revelation → climax → resolution), sound cue triggers, and tension parameters. The runtime converts these into prompt instructions and tool call schemas that govern when the AI can advance the story phase, trigger ambient sounds, or adjust the tension register.

Gemini produces inline tool calls (`trigger_sound`, `set_tension`, `end_game`) embedded in its output stream. A sanitization layer strips these from the visible transcript before display, so the player only sees clean dialogue — not model mechanics.

### Player Profile Personalization

Before playing personalized stories, players complete a questionnaire that produces a `PlayerProfile` stored in `localStorage`. The profile captures identity summary, behavioral patterns (conflict style, pressure tolerance, attachment tendency), emotional map (dominant emotions, avoided emotions, shame triggers), narrative fragments (unfinished decisions, feared identities, desired identities), and safety limits.

At session start, a bounded `GameProfileContext` slice — not the full profile — is injected into the system prompt. The profile conditions how the character opens, what it notices, and where the story applies pressure. The "Me and Mes" experience goes further: the live character uses calibration questions to identify which functional self the player leads with (The Alarm, The Prosecutor, The Diplomat, The Ghost) and then surfaces those selves in the dialogue.

### Three-Layer Spatial Audio

The Web Audio API manages three independent audio layers:

1. **Ambient** — continuous environment sound (ringing telephone, hospital hum, ocean static)
2. **Music** — tension-aware background scored to the current phase. Lyria experimental adaptive music is available behind a feature flag.
3. **Voice** — Gemini's live audio stream, positioned spatially in the stereo field relative to the character's presence

Sound cues parsed from Gemini's tool call stream trigger ambient transitions in real time. The sound layer is player-togglable and degrades gracefully to voice-only on low-end connections.

### Creator Pipeline

InnerPlay ships a full story creation flow at `/create`. A creator describes their story concept in a multi-turn conversation with a Gemini-powered interview agent (`gemini-2.5-flash`). The agent extracts the premise, character, tone, phase structure, and opening line, then produces a validated Story Pack JSON. The creator can publish directly from the interface; the story is available on a shareable URL immediately, using the same live runtime as the catalogue stories.

The "Exit Interview" and "Me and Mes" stories were built entirely through this creator pipeline, then iterated on the hosted site with a Playwright-based branch verification tool that ran four playstyle personas (compliant, curious, compassionate, defiant) against each published draft until the branches diverged convincingly.

### Backend: Google Cloud Run

The Next.js application runs on Google Cloud Run behind a custom server built with `tsx` to support persistent WebSocket connections (which the default Next.js server does not handle). The `/api/live-token` endpoint mints short-lived ephemeral tokens for Gemini Live sessions, keeping API keys off the client. Average token mint latency in production is under 350ms. The Docker container is deployed to `us-central1` and scales to zero between sessions to keep costs low.

---

## Challenges We Ran Into

### Opening-Turn Lockup

The first and most damaging bug: when Gemini completed an opening turn without producing any audio or text payload (a valid model behavior), the opening-turn state machine refused to release the microphone. The `markOpeningTurnCompleted` function required `responseReceived === true` before unlocking — but Gemini had already signaled completion without a payload. The mic stayed permanently deferred, the player heard silence, and the session was dead with no error message.

This was not immediately obvious because the symptom — a stuck "preparing the session..." state — looked like a network problem. We instrumented 11 startup timing stages (`begin_clicked` through `first_turn_finalized`) before the real cause became visible in the traces.

### Transient 1008 WebSocket Closes

Gemini Live sessions occasionally close with a 1008 policy violation before the first transcript arrives, with reason strings like `Operation is not implemented, or supported, or enabled.` These are transient inference-side failures, not client errors. The fix was a classification layer that distinguishes retryable transient closes from permanent configuration errors, then executes a single reconnect attempt with guard logic preventing duplicate audio or duplicate transcript entries. The one-shot constraint was important: an unbounded retry loop would amplify the latency problems it was trying to solve.

### Sanitizing Tool Syntax from the Transcript

Gemini embeds tool calls inline in its output stream. Without sanitization, the visible transcript would include raw function call syntax (`trigger_sound({ "name": "phone_ring" })`) mixed into the story dialogue. We built a streaming sanitizer that detects and strips tool call blocks from transcript chunks in real time without splitting words across chunk boundaries, because naive sanitization collapsed adjacent words when chunks landed mid-sentence.

### Structured Arc vs. Freeform Generation

The hardest product problem: how to constrain an open-ended model to follow a narrative arc without making it feel scripted. The solution was phase-gated instruction injection. The system prompt describes the current phase's emotional target and permitted actions, not a script. When the tension level or story phase changes, the session does not restart — the in-context instructions update and the model self-corrects. This required careful tuning per story, because the horror stories needed the model to maintain dread without the player explicitly setting the tone.

### Debug-Turn Race Conditions

Browser-driven multi-turn verification tests (Playwright injecting debug text to simulate player turns) occasionally triggered 1008 closes when a debug turn was sent before the previous AI audio had finished draining. The platform now gates debug turns behind a strict player-control check — a turn is only accepted when the session has actually returned control to the player, not just when the audio generation signal has arrived.

---

## Accomplishments That We're Proud Of

**A working eyes-closed game.** This sounds simple but it took every layer of the system working correctly together: reliable session startup, voice-first interaction, spatial audio, and a story engine that holds narrative tension without a visible UI. The demo works. You close your eyes and you are somewhere else.

**The creator pipeline.** A storyteller with no coding background can describe a story concept, have a multi-turn conversation with an interview agent, and publish a playable live-voice story in under twenty minutes. The pipeline does not require manual JSON editing or prompt engineering. The "Exit Interview" story — a four-branch experience with genuinely different AI behavior per playstyle — was built entirely through it.

**Player profile personalization without a database.** The `PlayerProfile` system provides meaningful story conditioning from `localStorage` alone. The profile is questionnaire-generated, user-reviewed, and bounds the context injected at session start to a small slice. No raw psychological data is sent to the model without the player approving it first.

**Measurable branch quality.** The Playwright verification loop with fixed personas (compliant, curious, compassionate, defiant) gave us an objective signal for whether the story was actually branching. Before this, iteration was subjective. After, we could see when two personas produced indistinguishable outputs and keep iterating until they diverged.

**Zero-UI positioning.** Every design decision — no loading spinners, no progress bars, no chat bubbles during play — pushed the technology into the background. The sound layers fade in before the first word is spoken. By the time the character talks, the player is already in the room.

---

## What We Learned

**The live API's failure modes are subtle.** The most dangerous issues were not crashes — they were silent hangs. Gemini completing a turn without payload, sessions closing with ambiguous status codes, audio draining longer than `turnComplete` signals suggested. The instrumentation we added (11 timing stages, per-session startup traces) turned invisible problems into measurable ones.

**Voice-first design requires different constraints than text-first.** In a text interface, a player can re-read a confusing line. In a voice interface, confusion is permanent — the moment is gone. This meant every opening line, every phase transition, and every tool call trigger had to be tuned for one-shot comprehension at audio speed.

**Constraints are creative fuel.** Removing the screen did not limit what InnerPlay could do. It forced every element to earn its place. The spatial audio system exists because there was no visual layer to carry atmosphere. The player profile exists because there was no visual customization to make people feel seen. The creator pipeline exists because the format needed more stories faster than a single team could write them.

**Short-form is the right format for this medium.** Ten minutes is not a limitation — it is the design. A player can commit to ten minutes of darkness in a way they cannot commit to a hundred hours. The session end is part of the experience, not a failure state.

**The brain is the best rendering engine.** Every session that worked confirmed the original hypothesis. Players described seeing things they knew were not there — a hospital corridor, a lightkeeper's silhouette, a boardroom table. Gemini's voice did not describe those things in detail. The player's imagination did. The voice just gave it permission.

---

## What's Next for InnerPlay

**More stories.** The catalogue needs depth across genres — mystery, romance, existential comedy, sci-fi. The creator pipeline makes this tractable without building each story manually.

**Multiplayer voice sessions.** Two players, one story, one AI narrator managing both. The tension of having another person's reactions visible to the AI — and invisible to you — is a design space that does not exist anywhere else.

**Community creator tools.** A public creator mode where storytellers can publish, share, and iterate on story packs. The "Exit Interview" creator pipeline is the proof of concept.

**Mobile-native release.** The core experience already works on mobile browsers. A dedicated app would unlock offline play, tighter audio hardware integration, and session history.

**Lyria adaptive music at full fidelity.** The experimental adaptive music integration is in the codebase behind a feature flag. When the API reaches production stability, the music layer will respond to tension in real time rather than switching between preset ambient tracks.

**Cross-session memory.** Player profiles are currently session-local. A cloud sync layer would let the AI remember how you played "The Call" when you walk into "Me and Mes" — and use that memory purposefully.

---

## Built With

`gemini-live-2.5-flash-native-audio` · `gemini-2.5-flash` · `google-genai-sdk` · `google-cloud-run` · `nextjs-16` · `react-19` · `typescript` · `web-audio-api` · `docker` · `yaml` · `ajv` · `vitest` · `playwright` · `lyria-experimental`
