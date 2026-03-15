export type AudioArchitectureId =
  | "llm_tool_director_v0"
  | "authored_timeline_v1"
  | "hybrid_fallback_v1"
  | "state_director_v2_candidate"
  | "belief_scene_reconciler_v3"
  | "clocked_cast_scene_graph_v4"
  | "foreground_live_hybrid_cast_v4";

export type AudioArchitectureStatus = "historical" | "active" | "candidate" | "proposed";

export interface AudioArchitectureDescriptor {
  id: AudioArchitectureId;
  status: AudioArchitectureStatus;
  scope: string;
  summary: string;
  strengths: string[];
  failureModes: string[];
  antiPatternsAvoided?: string[];
  designPrinciples?: string[];
  researchBasis?: string[];
  proofGates?: string[];
  currentKnownBlockers?: string[];
}

/**
 * Architecture notes:
 *
 * The first three live-story ideas fail in predictable ways:
 * 1. letting the model fire low-level audio directly,
 * 2. coupling cue choice to exact transcript phrasing,
 * 3. collapsing continuous ambience and discrete foley into one monolithic policy.
 *
 * The proposed v3 architecture below is deliberately more structured:
 * - observation bus -> belief state -> expert ensemble -> scene planner -> render reconciler
 * - the model never directly "plays sound"; it updates hypotheses and priorities
 * - the audio engine only executes a desired-state diff, not fire-and-forget guesses
 *
 * The proposed v4 architecture goes one level further:
 * - belief core -> cast graph -> floor arbiter -> clocked scheduler -> scene graph mixer -> capability ladder
 * - this is the first architecture here that treats "who gets the floor" and
 *   "which execution mode is safe right now" as first-class runtime problems
 * - it is designed for the actual player requirement: eyes-closed clarity without
 *   glitching, even as stories move from one live voice to controlled multi-character scenes
 *
 * The practical next step after falsification is narrower:
 * - one protected live foreground voice
 * - hybrid cast inserts for secondary characters
 * - floor-aware interruptions and scene-graph routing
 * - no assumption of true simultaneous multi-live dialogue until the transport,
 *   authoring model, and browser routing are all reworked and proven
 *
 * Research basis:
 * - PRISM-WM (Li et al., 2025): hybrid systems need discrete/continuous mode separation
 * - Tru-POMDP (Tang et al., 2025): ambiguous environments benefit from explicit hypothesis trees
 * - PoE-World (Piriyakulkij et al., 2025): compositional experts generalize better than one giant model
 * - UoT (Hu et al., 2024): uncertainty should trigger information-seeking / safe fallback, not overconfident action
 * - Stable Audio / timing-conditioned audio diffusion (Evans et al., 2024): keep control-time and render-time separate
 */
const AUDIO_ARCHITECTURE_REGISTRY: Record<AudioArchitectureId, AudioArchitectureDescriptor> = {
  llm_tool_director_v0: {
    id: "llm_tool_director_v0",
    status: "historical",
    scope: "Live voice stories",
    summary: "Gemini Live emits direct tool calls for sound, tension, and ending control.",
    strengths: [
      "Clean conceptual split between spoken dialogue and sound commands.",
      "Good fit for high-level semantic control if tools are reliable.",
    ],
    failureModes: [
      "Too fragile for low-level foley when Live tool delivery is unstable.",
      "Interruptions and native-audio runtime issues make direct sound timing unreliable.",
    ],
  },
  authored_timeline_v1: {
    id: "authored_timeline_v1",
    status: "active",
    scope: "Scripted stories",
    summary: "Deterministic authored manifest drives ambient layers and timed transitions.",
    strengths: [
      "Reliable and testable.",
      "Good for controlled pacing and seamless background beds.",
    ],
    failureModes: [
      "Not reactive enough on its own for live back-and-forth stories.",
    ],
  },
  hybrid_fallback_v1: {
    id: "hybrid_fallback_v1",
    status: "active",
    scope: "Current live-story runtime, including the-call",
    summary: "Authored ambient timeline plus transcript/narration cue detection and local story logic.",
    strengths: [
      "Works without depending on Live tool calls.",
      "Supports local stateful escalation like the-call flood layers.",
    ],
    failureModes: [
      "Cue timing can still depend on phrasing.",
      "Story-specific logic can accumulate inside the client runtime.",
    ],
  },
  state_director_v2_candidate: {
    id: "state_director_v2_candidate",
    status: "candidate",
    scope: "the-call experiment only",
    summary: "Voice stays live, but a local director maps canonical world state into audio actions.",
    strengths: [
      "More reliable than direct sound tool calls.",
      "Better fit for persistent threats, escalation, and adaptive mix control.",
    ],
    failureModes: [
      "Needs additional state modeling and tuning work.",
      "More moving pieces than the current hybrid system.",
    ],
  },
  belief_scene_reconciler_v3: {
    id: "belief_scene_reconciler_v3",
    status: "proposed",
    scope: "Next-generation live stories with persistent threats, ambiguity, and replayable loops",
    summary: "Event-sourced belief state plus compositional expert scoring and an idempotent render reconciler. The LLM contributes observations and hypotheses, but only the reconciler commits sound.",
    strengths: [
      "Separates continuous scene beds from discrete foley, so ambience and one-shots stop fighting each other.",
      "Tracks uncertainty explicitly, allowing the system to stay conservative when location or hazard is ambiguous.",
      "Replaces phrase-trigger matching with belief updates over location, threat, interaction, pacing, and reveal state.",
      "Uses compositional experts instead of one giant rule blob, reducing cross-coupled regressions as stories get more complex.",
      "Makes audio execution deterministic via desired-state reconciliation, leases, and contradiction-aware cancellation.",
      "Supports offline simulation, paraphrase sweeps, and adversarial replay because the planner consumes structured events rather than raw prose alone.",
    ],
    failureModes: [
      "Higher upfront schema cost: stories need observation vocabularies, scene contracts, and expert calibration data.",
      "Poor extractors can still poison belief updates if confidence scoring is weak or untested.",
      "More operational complexity than v2 if the reconciler, expert weights, and belief pruning are not instrumented well.",
    ],
    antiPatternsAvoided: [
      "No direct LLM-to-audio fire path for low-level timing-critical cues.",
      "No single 'current state' committed too early when evidence is partial or contradictory.",
      "No monolithic if/else director that owns every location, threat, and reveal rule in one place.",
      "No infinite loop sounds without leases, expiry, or contradiction-triggered teardown.",
      "No irreversible cue commits from weak text heuristics when the system should instead wait, ask, or stay with safe ambience.",
    ],
    designPrinciples: [
      "Observation Bus: normalize transcript spans, authored beats, timers, tool results, and engine callbacks into timestamped atomic observations with confidence.",
      "Belief Graph: maintain a small tree of hypotheses for location, threat stage, objective, and reveal state instead of collapsing to a single guess immediately.",
      "Programmatic Expert Ensemble: independent experts score location, hazard, interaction, pacing, and narrative-reveal dimensions, then combine via weighted product / veto logic.",
      "Scene Planner: output a scene contract containing ambient stems, allowed micro-foley classes, forbidden cues, tension budget, and expiry leases.",
      "Render Reconciler: run a control-rate diff loop that compares desired scene state versus actual engine state and applies start/stop/volume changes idempotently.",
      "Speculative Lookahead: simulate the next few beats before committing high-salience cues, so the system avoids mode errors at narrative boundaries.",
      "Uncertainty Fence: when confidence is below threshold, stay on safe ambience and request more evidence rather than hallucinating a specific cue.",
      "Replay Harness: validate each story with paraphrase fuzzing, contradiction injection, interruption tests, and loop-reset regression traces.",
    ],
    researchBasis: [
      "PRISM-WM (arXiv:2512.08411, Dec 9 2025): hybrid planners fail when continuous and discrete modes are blurred; we therefore split ambience-state from discrete cue-state.",
      "Tru-POMDP (arXiv:2506.02860, Jun 3 2025): ambiguous tasks benefit from a Tree of Hypotheses and belief-space planning; we therefore keep multiple narrative/audio hypotheses alive until evidence resolves them.",
      "PoE-World (arXiv:2505.10819, May 16 2025): compositional programmatic experts generalize better than a single monolith; we therefore factor audio inference into experts rather than one rule blob.",
      "Uncertainty of Thoughts (arXiv:2402.03271, Nov 13 2024 v3): uncertainty should drive information-seeking and conservative action; we therefore use safe ambience under low confidence instead of guessing specific foley.",
      "Fast Timing-Conditioned Latent Audio Diffusion / Stable Audio (ICML 2024; arXiv:2402.04825): render-time audio generation should be conditioned by explicit timing/control inputs; we therefore keep planning/control separate from rendering.",
    ],
  },
  clocked_cast_scene_graph_v4: {
    id: "clocked_cast_scene_graph_v4",
    status: "proposed",
    scope: "Production eyes-closed stories spanning single-live voice, cast illusion, hybrid inserts, and future validated multi-voice play",
    summary:
      "A superset runtime built on the v3 belief core, adding a cast graph, conversational-floor arbitration, a deadline-aware timeline scheduler, a spatial scene graph mixer, and a capability ladder that degrades before glitches reach the player.",
    strengths: [
      "Subsumes earlier approaches: authored timelines remain valid, hybrid fallback remains a safety rung, the v2 state director becomes a local policy, and v3 belief reconciliation remains the world-state core.",
      "Optimizes for what the player actually perceives with eyes closed: one stable foreground floor, tightly budgeted background voices, and spatial separation instead of chaotic overlap.",
      "Treats each character, voice insert, ambience bed, and foley cue as a typed audio object with a bus, position, priority, deadline, and teardown rule.",
      "Supports practical rollout: rung 0 = single live voice, rung 1 = cast illusion, rung 2 = hybrid inserts, rung 3 = multi-live only when transport and latency budgets prove safe.",
      "Uses explicit voice budgets, culling, and graceful deactivation rather than hoping virtualization alone will preserve CPU headroom or mix clarity.",
      "Allows speculative preparation during player speech so likely next cues, voices, and room transitions are already warmed when the floor changes.",
      "Makes interruptions safer because barge-in is a first-class scheduler event, not an accidental side effect of transport timing.",
    ],
    failureModes: [
      "Requires stronger runtime telemetry: utterance duration estimates, live-session health, mixer load, and scheduler miss rates must all be measured.",
      "Needs disciplined authoring of cast roles, room topology, and overlap permissions; otherwise the scheduler has poor material to work with.",
      "If the capability ladder thresholds are tuned poorly, the system can either downshift too eagerly and feel flat or hold high-risk modes too long and glitch.",
      "True many-speaker free improvisation is still not the target; the architecture is designed for controlled conversational floors, not open-mic chaos.",
    ],
    antiPatternsAvoided: [
      "No fantasy assumption that every character can hold a fully live, simultaneous, equal-priority voice channel at all times.",
      "No schedule-free overlap where multiple voices fight for the same perceptual slot and destroy intelligibility.",
      "No master-bus ducking as the only coordination mechanism; routing, focus, and preemption are decided before render time.",
      "No treating virtualization as a culling system or as a substitute for hard voice budgets.",
      "No hard dependency on one transport mode; if live multi-voice is unstable, the runtime steps down a rung without changing the story contract.",
    ],
    designPrinciples: [
      "Belief Core Reuse: keep the v3 observation bus and belief graph as the canonical world-state layer.",
      "Cast Graph: represent every speaking entity with role, voice mode, priority band, room/zone, interruption rights, and allowed overlap classes.",
      "Conversational Floor Arbitration: maintain one foreground floor plus a tightly budgeted background floor, using turn-taking prediction rather than silence timeouts.",
      "Clocked Timeline Scheduler: schedule the next 2-5 seconds of speech and sound as deadline-bearing events with preemption classes and expiry leases.",
      "Capability Ladder: run the same story contract across multiple execution modes, from single-live voice to hybrid cast to validated multi-live.",
      "Spatial Scene Graph Mixer: route each audio object through room-aware buses with panning, attenuation, occlusion, sends, and focus rules.",
      "Voice Budget Policy: reserve protected foreground channels, apply explicit culling for low-value objects, and virtualize only where resumability matters.",
      "Predict-then-Commit: prepare likely utterances, stems, and transitions while the user is still talking, then commit only when floor ownership is clear.",
      "Barge-in Guardrails: interruption triggers cancel or reshape the short-horizon plan immediately, then re-resolve the floor on the next tick.",
      "Replay + Chaos Harness: validate with overlap injections, network degradation, missed deadlines, paraphrase fuzzing, and loop-reset traces.",
    ],
    researchBasis: [
      "Triadic Multi-party Voice Activity Projection for Turn-taking in Spoken Dialogue Systems (arXiv:2507.07518, Jul 10 2025): multi-party spoken systems need explicit turn-taking prediction; we therefore arbitrate conversational floors instead of relying on crude silence timers.",
      "Speak or Stay Silent? Context-Aware Turn-Taking and Silence Prediction in Spoken Dialogue Systems (arXiv:2603.11409, Mar 12 2026): floor control depends on context, not silence alone; we therefore gate speaker changes with conversational state rather than raw VAD gaps.",
      "SE-DiCoW (arXiv:2601.19194, Jan 27 2026) and TVTSyn (arXiv:2602.09389, Feb 10 2026): overlapped speech still needs explicit speaker conditioning and visualization; we therefore track who-spoke-when as a first-class signal for routing and interruption logic.",
      "Towards Robust Overlapping Speech Detection (arXiv:2505.23207, May 29 2025): overlap detection should be modeled directly; we therefore budget and police overlap instead of allowing incidental multi-speaker collisions.",
      "Spatial Audio Question Answering and Reasoning on Dynamic Source Movements (arXiv:2602.16334, Feb 18 2026), Seeing Speech and Sound (arXiv:2503.18880, Mar 24 2025), and Sonic4D (arXiv:2506.15759, Jun 18 2025): mixed speech and non-speech sources are better handled as distinct, localizable objects; we therefore use a scene-graph mixer rather than one undifferentiated audio policy.",
      "SHANKS (arXiv:2510.06917, Oct 8 2025) and STITCH (arXiv:2507.15375, Jul 21 2025): real-time spoken systems improve when they think while listening; we therefore pre-plan likely next events during the player's turn instead of waiting for turn end.",
      "CTC-TTS (arXiv:2602.19574, Feb 23 2026), VoXtream (arXiv:2509.15969, Sep 19 2025), SyncSpeech (arXiv:2502.11094, Feb 16 2025), and SimulTron (arXiv:2406.02133, Jun 4 2024): low-latency audio systems win by chunked streaming and fixed-delay control; we therefore treat inserts and fallback voices as streaming-capable scheduled assets, not blocking afterthoughts.",
    ],
    proofGates: [
      "Do not promote above rung 1 until a measurable foreground-floor policy exists and is validated on interruption-heavy sessions.",
      "Do not promote to hybrid or multi-live cast until scheduler missed-deadline rate, overlap intelligibility, and barge-in recovery time are instrumented and tested on target browsers.",
      "Do not promote to multi-live cast until per-character voice routing can be configured without breaking the single-session stability guarantees of the current runtime.",
      "Do not promote any rung if the capability ladder cannot downshift cleanly under transport jitter, CPU pressure, or browser audio-routing regressions.",
    ],
    currentKnownBlockers: [
      "The current live token path embeds one prebuilt voice config per token, which makes true simultaneous per-character live voices a new server/runtime problem rather than a manifest-only change.",
      "The current browser runtime connects through one Live session path and one session ref, so multi-live cast is not a drop-in extension of the existing control flow.",
      "A prior browser TTS fallback broke Chrome/WebRTC audio routing on Windows, which is direct evidence that careless multi-voice layering can regress the core voice path even before narrative logic is considered.",
    ],
  },
  foreground_live_hybrid_cast_v4: {
    id: "foreground_live_hybrid_cast_v4",
    status: "candidate",
    scope: "Next implementable multi-character runtime for this repo: one live foreground voice plus hybrid cast inserts and spatialized audio objects",
    summary:
      "Keep one protected Gemini Live foreground speaker, reuse the v3 belief core for world/audio inference, and render secondary characters through scheduled hybrid inserts, diegetic side channels, and scene-graph routing. This gives multi-character immersion without pretending the current runtime can safely run open multi-live cast.",
    strengths: [
      "Matches the actual repo constraints: one live token, one live session path, and one protected foreground voice remain the invariant.",
      "Supports multiple characters in a way players will still feel with eyes closed: whispers, radios, echoes, internal voices, overhead announcements, and short interjections can all live around the main speaker.",
      "Reduces glitch risk because the most fragile part of the system, the live voice transport, is not asked to solve every cast problem at once.",
      "Creates a truthful bridge from today's single-live stories to future richer scenes by adding floor control, scene-graph routing, and hybrid inserts before attempting full multi-live.",
      "Aligns with existing planning work that already recommends single live voice, cast illusion, and hybrid multi-speaker inserts before true full multi-voice runtime.",
    ],
    failureModes: [
      "Cannot deliver a fully improvised many-speaker debate; one speaker still owns the foreground floor at any given moment.",
      "Secondary-character inserts need strong style matching or they can feel editorially separate from the live foreground speaker.",
      "Authors must write for explicit floor changes and side-channel moments instead of assuming any character can speak freely at any time.",
    ],
    antiPatternsAvoided: [
      "No claim that true simultaneous multi-live cast is already practical in this runtime.",
      "No assumption that the existing story contract can stay unchanged once cast mode is introduced.",
      "No globally destructive interruption model that clears every voice object just because the player barged into one foreground line.",
      "No mixing of cast design, world-state inference, and browser transport into one opaque hook-level state machine.",
    ],
    designPrinciples: [
      "One Protected Live Floor: the foreground conversational channel always belongs to exactly one live speaker.",
      "Hybrid Cast Inserts: secondary voices arrive as scheduled streaming/TTS inserts, diegetic devices, or authored micro-scenes rather than free-running live sessions.",
      "Explicit Voice Contract: published stories must declare `voiceMode`, `characters[]`, and speaker attribution instead of assuming one implicit narrator shape.",
      "Floor-Aware Interruptions: barge-in cancels or reshapes only the active foreground plan, not the entire audio scene indiscriminately.",
      "Scene-Graph Routing: every non-foreground voice and cue is routed by room/zone/bus so off-room or in-head voices sound physically distinct.",
      "Promotion Gates: only after this hybrid mode is stable should the system attempt validated multi-live transport experiments.",
    ],
    researchBasis: [
      "Speak or Stay Silent? Context-Aware Turn-Taking and Silence Prediction in Spoken Dialogue Systems (arXiv:2603.11409, Mar 12 2026): the system should decide who owns the floor from context, not from silence alone; we therefore keep one protected live floor and make handoffs explicit.",
      "CTC-TTS (arXiv:2602.19574, Feb 23 2026), VoXtream (arXiv:2509.15969, Sep 19 2025), and SyncSpeech (arXiv:2502.11094, Feb 16 2025): low-latency streamed speech is practical for short inserts and side channels; we therefore use hybrid inserts for secondary characters instead of forcing everything through live transport.",
      "Spatial Audio Question Answering and Reasoning on Dynamic Source Movements (arXiv:2602.16334, Feb 18 2026), Seeing Speech and Sound (arXiv:2503.18880, Mar 24 2025), and Sonic4D (arXiv:2506.15759, Jun 18 2025): speech and non-speech sources should be treated as distinct, localizable objects; we therefore spatialize side voices as scene objects.",
      "SE-DiCoW (arXiv:2601.19194, Jan 27 2026), TVTSyn (arXiv:2602.09389, Feb 10 2026), and Towards Robust Overlapping Speech Detection (arXiv:2505.23207, May 29 2025): overlap remains a first-class problem; we therefore constrain overlap budgets and do not let multiple foreground voices compete.",
      "SHANKS (arXiv:2510.06917, Oct 8 2025) and STITCH (arXiv:2507.15375, Jul 21 2025): real-time spoken systems improve when they plan while listening; we therefore pre-stage likely inserts and transitions during the player's turn.",
    ],
    proofGates: [
      "Add explicit cast metadata to the story/publish contract before claiming hybrid cast is supported.",
      "Replace global interrupt clearing with floor-aware interruption logic before adding secondary voice objects.",
      "Add scheduler/object-lease semantics to the audio runtime before layering multiple speech-like sources around the live floor.",
      "Validate that secondary inserts do not regress the foreground live voice path on target browsers, especially Windows/Chrome.",
    ],
    currentKnownBlockers: [
      "Published story data is still centered on one character/runtime shape, so hybrid cast needs schema work before it is content-safe.",
      "The runtime still has one global Live session path and one global speaking state, so floor ownership is implicit rather than modeled.",
      "The current sound engine and director do not yet have object leases, preemption classes, or room-aware routing for speech-like secondary sources.",
    ],
  },
};

export function getAudioArchitectureDescriptor(
  architectureId: AudioArchitectureId,
): AudioArchitectureDescriptor {
  return AUDIO_ARCHITECTURE_REGISTRY[architectureId];
}

export function listAudioArchitectureDescriptors(): AudioArchitectureDescriptor[] {
  return Object.values(AUDIO_ARCHITECTURE_REGISTRY);
}
