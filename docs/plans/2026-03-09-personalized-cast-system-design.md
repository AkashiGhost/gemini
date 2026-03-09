# Personalized Cast System Design

Date: 2026-03-09
Status: Planning only
Scope: Product direction, platform architecture, research findings, creator-loop workflow, and backlog

## Goal

Define the next major InnerPlay system:

1. A personalized game pipeline that can generate games from a user profile or imported chat history.
2. A runtime architecture that supports:
   - single-character live voice games
   - multi-character illusion games
   - hybrid cast games with scripted multi-speaker segments
3. A flagship concept to build next through the actual creator UI and then validate in a closed loop on the live site.

This document is planning-only. It does not authorize implementation yet.

---

## Executive Summary

The strongest near-term direction is not a full true multi-voice live cast. It is a hybrid architecture:

1. `Live core`: one Gemini Live conversational voice per session.
2. `Cast illusion`: multiple internal characters simulated through emotional style shifts, transcript framing, pacing changes, and sound design.
3. `Scripted cast inserts`: optional multi-speaker TTS segments for scene transitions, interruptions, flashbacks, or confrontations.
4. `Personalization layer`: a structured user profile that conditions which characters appear, what they want, and how they pressure the player.

This is the best route for the deadline because it aligns with both:

1. the current InnerPlay runtime
2. the actual behavior of Gemini’s Live and speech-generation products

---

## Research Findings

## 1. Gemini Live API

What matters:

1. Gemini Live is the correct low-latency path for live conversation.
2. Voice is configured in the session setup path via `speechConfig` / `voiceConfig`.
3. InnerPlay’s current runtime already assumes one active live voice per session.

Implication:

1. A single live session should be treated as one primary speaking voice.
2. True per-turn cast switching inside one live session is not the clean default architecture.
3. If we want multiple distinct voices, we should not assume that “just swapping voices live” will be stable enough for the deadline.

Official sources:

1. Gemini Live guide: https://ai.google.dev/gemini-api/docs/live
2. Gemini Live API reference: https://ai.google.dev/api/live

## 2. Gemini Speech Generation / TTS

What matters:

1. Gemini supports speech generation outside the Live loop.
2. Speech generation is the better fit for fixed, directed, multi-speaker scenes.
3. This is the correct technical basis for cast inserts, cutscenes, narrated flashbacks, or “podcast-like” sequences.

Implication:

1. Multi-character voice moments are feasible now as scripted audio generation.
2. This should be used as a complement to the live conversational voice, not a replacement for it.

Official source:

1. Speech generation guide: https://ai.google.dev/gemini-api/docs/speech-generation

## 3. NotebookLM-style podcast behavior

What matters:

1. NotebookLM’s audio overview behavior is fundamentally closer to a scripted or semi-scripted multi-speaker generation system than a single low-latency conversational session.
2. Interactive podcast-style intervention should be treated as a hybrid mode:
   - generated multi-speaker scene
   - user interrupt/intervene
   - hand back to live conversational engine

Implication:

1. If InnerPlay wants “two hosts speaking and the user can interrupt”, the right architecture is not “force this into one plain Gemini Live voice”.
2. The right architecture is:
   - scripted multi-speaker scene generation
   - pause/intervention boundaries
   - live takeover when the user speaks

Relevant public references:

1. NotebookLM support overview: https://support.google.com/notebooklm
2. Google announcements on Audio Overviews / interactive audio overview behavior

Note:

The exact consumer implementation details of NotebookLM are not exposed as a product architecture reference. We should treat it as a product pattern, not a directly copyable API surface.

---

## What The Current InnerPlay Architecture Already Supports

Confirmed from the codebase:

1. `runtimeMode` already exists:
   - `live`
   - `scripted`
2. `soundStrategy` already exists:
   - `ambient_first_live`
   - `timeline_scripted`
3. Published stories currently assume one main visible speaker:
   - `characterName`
4. Creator output supports:
   - `title`
   - `logline`
   - `playerRole`
   - `openingLine`
   - `phaseOutline`
   - `soundPlan`
   - `systemPromptDraft`
5. The runtime already supports debug text mode for deterministic browser testing.

Relevant files:

1. [story-runtime.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/story-runtime.ts)
2. [published-story.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/published-story.ts)
3. [published-story-play.ts](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/lib/published-story-play.ts)
4. [GameContext.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/context/GameContext.tsx)
5. [CreatorInterview.tsx](/C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/src/components/creator/CreatorInterview.tsx)

This means the next system should extend the current architecture, not replace it.

---

## Product Recommendation

## Recommended Next Flagship

Build a personalized game based on the concept:

`Me and Mes`

Working description:

1. The player enters a guided inner chamber.
2. A neutral, almost monotone voice begins as an assessor or facilitator.
3. Through questions, it learns who the player is.
4. The player is then introduced to emotional selves:
   - Anger
   - Grief
   - Ambition
   - Shame
   - Tenderness
   - Avoidance
5. Which selves appear depends on the player’s profile.
6. These selves are “other versions” of the player, not random NPCs.

Why this is the best next game:

1. It fits one-live-voice architecture very well.
2. It can create the illusion of multiple characters without requiring a full cast engine first.
3. It gets much stronger with personalization.
4. It stress-tests the creator pipeline and platform in a meaningful way.

---

## Approach Options

## Option A: True multi-voice live cast

Description:

1. Multiple different characters with genuinely different synthetic voices.
2. One runtime dynamically switches speaking characters during the session.

Pros:

1. Highest surface-level wow factor.
2. Most obvious “cast” effect.

Cons:

1. Highest technical risk.
2. Hardest to maintain low latency.
3. Hard transcript attribution, interruptions, and audio routing problems.
4. Not well aligned with current deadline.

Verdict:

Do not do this first.

## Option B: Single live voice with cast illusion

Description:

1. One live voice engine.
2. Multiple “characters” expressed through style, emotion, transcript labels, and sound cues.

Pros:

1. Lowest runtime risk.
2. Fastest path.
3. Fits the “emotional shards of the self” concept naturally.

Cons:

1. Less literal voice differentiation.
2. Requires good writing and sound design to sell the illusion.

Verdict:

Best near-term option for the flagship “inner room” game.

## Option C: Hybrid cast

Description:

1. One live voice for the main conversation.
2. Scripted TTS inserts or multi-speaker scenes for secondary characters.
3. User can interrupt and return to live play.

Pros:

1. Best balance of product ambition and technical realism.
2. Supports future “NotebookLM-like” sequences.
3. Gives real multi-voice moments without making the whole runtime fragile.

Cons:

1. More complex authoring model.
2. Requires explicit scene boundaries and interruption handling.

Verdict:

This should be the platform target. Build toward this, but start the next game with Option B and prepare for Option C.

Recommendation:

1. Build the platform around Option C.
2. Build the next flagship game initially using Option B.

---

## Proposed Platform Architecture

## Layer 1: User Profile System

Purpose:

Create a reusable personalization layer for all future games.

Inputs:

1. Imported chat history from ChatGPT or other AI tools
2. Manual self-description
3. Guided questionnaire
4. Optional direct gameplay-derived signals later

Output:

A structured `Player Profile`, not raw chat blobs.

Suggested schema:

1. `identity_summary`
2. `core_traits`
3. `attachment_style`
4. `conflict_style`
5. `coping_patterns`
6. `ambitions`
7. `regrets`
8. `unfinished_decisions`
9. `sensitive_topics`
10. `humor_tolerance`
11. `roast_tolerance`
12. `pressure_tolerance`
13. `emotional_hotspots`
14. `self-story_fragments`
15. `safety_boundaries`

Best practice:

1. Always normalize into structured fields.
2. Always let the user confirm/edit the profile before using it.
3. Never rely on unconstrained raw imported conversation text at runtime.

## Layer 2: Persona-to-Cast Generator

Purpose:

Turn the player profile into a cast of selves.

Example generated cast:

1. `The Loyal Child`
2. `The One Who Left`
3. `The Achiever`
4. `The Mourner`
5. `The Accuser`
6. `The Comedian`

Each cast member should have:

1. `name`
2. `emotion_family`
3. `function`
4. `speech_style`
5. `primary accusation`
6. `primary desire`
7. `trigger topics`
8. `what they want admitted`
9. `what ending they want`

## Layer 3: Runtime Mode Selection

Every game should explicitly declare:

1. `runtimeMode`
   - `live_single`
   - `live_cast_illusion`
   - `hybrid_cast`
   - `scripted_timeline`
2. `voiceMode`
   - `single_live_voice`
   - `single_live_plus_tts_cast`
   - `prebaked_multi_speaker`

This becomes the platform-level architecture switch.

## Layer 4: Story Generation Pipeline

Recommended flow:

1. User creates or imports profile
2. System generates cast/persona set
3. Creator pipeline drafts story pack
4. Human or AI edits the pack
5. Publish to live route
6. Test via browser and debug text mode
7. Iterate until branch quality is acceptable

## Layer 5: Runtime Playback

For `live_cast_illusion`:

1. one live voice
2. multiple emotional identities
3. audio texture changes per persona
4. transcript labeling and narrative framing

For `hybrid_cast`:

1. one live conversational voice
2. inserted TTS clips or generated cast scenes
3. explicit handoff points for user interruption

---

## The Creator Closed Loop We Should Standardize

This should become the default authoring workflow for flagship games.

## Step 1: Research and concept design

Before using the creator UI:

1. define target user persona
2. define intended emotional arc
3. define branch promises
4. define what “good” means

## Step 2: Build via the actual `/create` GUI

Use the real creator UI first, not a local hidden path.

Why:

1. it validates the actual product
2. it exposes creator UX gaps early
3. it prevents designing around implementation-only affordances

## Step 3: Publish and play via live site

Required:

1. normal onboarding pass
2. debug text mode pass
3. branch playthroughs for target player personas

## Step 4: Evaluate as a new user

For each candidate game, evaluate:

1. Is the concept understandable in the first minute?
2. Is the first response strong?
3. Is the branch distinction real?
4. Does the player understand what kind of game this is?
5. Does the player know what to say?
6. Does the game become more specific, not more generic, as it continues?

## Step 5: Iterate until the game is genuinely good

Not just “working”.

---

## Evaluation Persona For Testing

For the next flagship game, test with at least one explicit synthetic user persona.

Suggested baseline persona:

`Maya, 29`

1. first-time InnerPlay user
2. uses ChatGPT regularly
3. emotionally articulate but skeptical
4. curious about introspection but impatient with vagueness
5. dislikes generic therapy language
6. wants the game to become personal fast
7. expects to understand what kind of experience this is within the first two turns

Questions Maya will naturally ask:

1. What is this voice?
2. What kind of game am I in?
3. Why should I trust this?
4. Is this just therapy theater or does it actually react to me?
5. Why are there multiple selves here?
6. What am I trying to achieve?
7. What happens if I refuse?

This persona should be used for creator-loop testing.

---

## Proposed Next Flagship Concept

Title:

`Me and Mes`

Core setup:

1. A neutral inner voice greets the player.
2. It asks a few identity/probing questions.
3. The player is led into a room where emotional selves are waiting.
4. Which selves appear depends on the player profile.
5. The player chooses who to hear, who to avoid, and who to integrate.

Why it works:

1. personalization has a real gameplay function
2. one-voice illusion is artistically justified
3. future hybrid cast upgrades slot in cleanly

What must be true for it to work:

1. the emotional selves need distinct goals
2. the player must feel personally recognized early
3. there must be consequence, not just dialogue
4. the ending must reflect what the player integrated, denied, or sacrificed

---

## Backlog: Things We Still Need To Do

This section is intentionally broad. It is the running platform backlog, not just the next game backlog.

## A. Product / Game Design

1. Design the full `Player Profile` schema.
2. Design the `Emotion Cast` schema.
3. Define the first personalized flagship game in more detail.
4. Define when a game should be:
   - single-character live
   - cast illusion
   - hybrid cast
   - scripted timeline
5. Decide whether roast/challenge mode is a separate game type or a difficulty dial.

## B. Creator Pipeline

1. Add explicit support for `runtimeMode` selection in the creator flow.
2. Add explicit support for cast-based games in the creator flow.
3. Add authoring support for:
   - character cast
   - persona roles
   - handoff scenes
   - TTS insert moments
4. Add stronger quality checks for creator-generated packs.
5. Add creator support for user-personalized prompts and profile-conditioned generation.

## C. Runtime Architecture

1. Extend published-story schema from single `characterName` to optional `characters[]`.
2. Add `voiceMode` to story manifests.
3. Add explicit scene boundaries for hybrid cast playback.
4. Add transcript attribution for multiple speakers.
5. Add support for switching between live and scripted segments.
6. Add reliable interruption rules when user cuts into scripted multi-speaker segments.

## D. Personalization System

1. Build profile ingestion from pasted chats.
2. Build structured questionnaire flow.
3. Build profile normalization and edit/approval UI.
4. Add privacy/safety boundaries and opt-in levels.
5. Build per-game conditioning rules from the player profile.

## E. Testing / Closed Loop

1. Standardize creator-loop testing scripts for:
   - create
   - publish
   - live debug-text play
   - branch evaluation
2. Add a reusable evaluator for “new user clarity”.
3. Add branch-difference scoring for flagship games.
4. Add a text-to-text live test harness for faster iteration when audio is not required.

## F. UX Issues Already Noticed

1. Add `Back` in onboarding.
2. Add `Exit` in onboarding.
3. Add `Skip intro` for repeat players.
4. Allow users to review previous onboarding image/text before starting.
5. Make creator flow easier to recover if the user misses a page or wants to revisit generated assets.

## G. Existing Platform Work Still Open

1. Full generation/upload pipeline audit beyond the currently validated creator roundtrip.
2. Longer multi-turn soak testing across all story types.
3. Turn-latency improvements after user speech.
4. Transcript quality polish.
5. True hybrid cast runtime after the personalization layer is defined.

---

## Recommended Order Of Work

## Phase 0: Planning only

1. Finalize this architecture direction.
2. Confirm the flagship concept.
3. Confirm whether personalization import is in scope before the deadline or immediately after.

## Phase 1: Design the personalization foundation

1. `Player Profile` schema
2. ingestion paths
3. edit/approve UI

## Phase 2: Extend story architecture

1. add `voiceMode`
2. add optional `characters[]`
3. add runtime mode selection in creator and manifest

## Phase 3: Build the next flagship via creator loop

1. research
2. design target persona
3. use actual creator UI
4. publish and play via live site
5. iterate until the game is good

## Phase 4: UX cleanup

1. onboarding back
2. onboarding exit
3. repeat-player skip

## Phase 5: Hybrid cast R&D

1. proof-of-concept multi-speaker TTS insert
2. interruption handoff into live voice
3. first hybrid cast game

---

## Recommendation Summary

1. The “voice in the head / room of emotional selves” idea is strong.
2. We should build it as the next flagship concept.
3. We should not start with true full multi-voice live cast.
4. We should build a platform that supports:
   - single live voice
   - cast illusion
   - hybrid multi-speaker inserts
5. We should add onboarding `Back` and `Exit` as real UX fixes.

---

## Immediate Next Planning Deliverables

Before implementation starts, the next planning docs should be:

1. `Player Profile Schema`
2. `Emotion Cast Schema`
3. `The Room of Selves` flagship design
4. `Hybrid Cast Runtime` technical spec
5. `Onboarding Navigation UX` spec
