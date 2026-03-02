// ─────────────────────────────────────────────
// Game Orchestrator
// Session-scoped class wiring the full pipeline:
//   playerInput → IntentParser → RulesEngine → ContextBuilder
//   → StoryEngine → SoundCueParser → client events
// ─────────────────────────────────────────────

import type { GameConfig, Beat, ChoiceOption } from "./types/game-config";
import type { StoryState } from "./types/story-state";
import type {
  StoryEngine,
  IntentParser,
  ServerMessage,
  SoundCuePayload,
  ChoicePromptPayload,
  PhaseTransitionPayload,
  GameOverPayload,
  SessionReadyPayload,
} from "./types/llm";

import {
  initState,
  getCurrentPhase,
  getCurrentBeat,
  advanceBeat,
  advancePhase,
  resolveChoice,
  applyStateChanges,
  evaluateEndingCondition,
  calculateRevelationVariant,
} from "./state-machine";
import { evaluateIntent, getAvailableOptions } from "./rules-engine";
import { buildContext } from "./llm/context-builder";
import { parseSoundCues } from "./sound-cue-parser";
import { applyIntentScore } from "./style-tracker";

export type EventSender = (message: ServerMessage) => void;

export class GameOrchestrator {
  private config: GameConfig;
  private state: StoryState;
  private storyEngine: StoryEngine;
  private intentParser: IntentParser;
  private send: EventSender;
  private sessionId: string;
  private startTime: number = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: GameConfig,
    storyEngine: StoryEngine,
    intentParser: IntentParser,
    send: EventSender,
    sessionId: string,
  ) {
    this.config = config;
    this.storyEngine = storyEngine;
    this.intentParser = intentParser;
    this.send = send;
    this.sessionId = sessionId;
    this.state = initState(config);
  }

  /** Start the game session */
  async start(): Promise<void> {
    // Initialize LLM engine
    const phase = getCurrentPhase(this.config, this.state);
    const beat = getCurrentBeat(this.config, this.state);
    const { systemPrompt } = buildContext(this.config, this.state, phase, beat);
    await this.storyEngine.initialize(systemPrompt);

    this.startTime = Date.now();
    this.state = { ...this.state, status: "playing" };

    // Start elapsed time ticker
    this.tickInterval = setInterval(() => {
      this.state = {
        ...this.state,
        elapsedSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      };
    }, 1000);

    // Send SESSION_READY
    const payload: SessionReadyPayload = {
      sessionId: this.sessionId,
      gameMeta: {
        title: this.config.meta.title,
        genre: this.config.meta.genre,
        playerRole: this.config.meta.playerRole,
        durationTargetMinutes: this.config.meta.durationTargetMinutes,
      },
    };
    this.send({ type: "SESSION_READY", payload });

    // Send initial state
    this.sendStateUpdate();

    // Process the first beat (usually narration — Elara's opening)
    await this.processCurrentBeat();
  }

  /** Handle player text input */
  async handlePlayerInput(text: string): Promise<void> {
    if (this.state.status !== "playing") return;

    // 1. Parse intent
    const intent = await this.intentParser.parse(text);

    // 2. Apply intent-based style scoring
    this.state = applyIntentScore(this.state, intent.emotionalRegister);

    // 3. Check rules
    const rulesResult = evaluateIntent(this.config, this.state, intent);

    if (!rulesResult.allowed && rulesResult.redirectText) {
      // Blocked action — send redirect narration as Elara's response
      this.addConversationTurn("player", text);
      this.addConversationTurn("elara", rulesResult.redirectText);

      const parsed = parseSoundCues(rulesResult.redirectText);
      for (const cue of parsed.cues) {
        this.send({
          type: "SOUND_CUE",
          payload: { soundId: cue.soundId, position: cue.position } satisfies SoundCuePayload,
        });
      }

      // Send text for TTS on client (no LLM call needed)
      this.send({
        type: "AUDIO_CHUNK",
        payload: { text: parsed.cleanText, isFallback: true },
      });
      return;
    }

    // 4. Add to conversation history
    this.addConversationTurn("player", text);

    // 5. Generate LLM response
    await this.generateAndSendResponse(text);
  }

  /** Handle raw audio from player — forward to Live API */
  async handlePlayerAudio(audioBase64: string): Promise<void> {
    if (this.state.status !== "playing") return;
    if (!this.storyEngine.generateAudioResponse) {
      // Engine doesn't support audio — ignore
      return;
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const stateSnapshot = {
      beat_type: getCurrentBeat(this.config, this.state)?.type ?? "narration",
      phase_id: getCurrentPhase(this.config, this.state).id,
      trust_level: this.state.elara.trustLevel,
      elapsed_seconds: this.state.elapsedSeconds,
    };

    try {
      for await (const chunk of this.storyEngine.generateAudioResponse(
        audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength),
        stateSnapshot,
      )) {
        // User barged in — stop audio immediately
        if (chunk.interrupted) {
          this.send({ type: "INTERRUPTED", payload: {} });
          break;
        }

        // Parse sound cues from text portions
        if (chunk.text) {
          const parsed = parseSoundCues(chunk.text);
          for (const cue of parsed.cues) {
            this.send({
              type: "SOUND_CUE",
              payload: { soundId: cue.soundId, position: cue.position } satisfies SoundCuePayload,
            });
          }
          if (parsed.cleanText) {
            this.addConversationTurn("elara", parsed.cleanText);
          }
        }

        // Forward audio chunks to client
        if (chunk.audioChunks && chunk.audioChunks.length > 0) {
          for (const ab of chunk.audioChunks) {
            this.send({
              type: "AUDIO_CHUNK",
              payload: {
                audio: Buffer.from(ab).toString("base64"),
                sampleRate: 24000,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("[Orchestrator] Audio stream error:", err);
    }
  }

  /** Handle player choosing an option at a choice beat */
  async handleChoiceSelected(beatId: string, optionId: string): Promise<void> {
    if (this.state.status !== "playing") return;

    const beat = getCurrentBeat(this.config, this.state);
    if (!beat || beat.id !== beatId || beat.type !== "choice") return;

    const option = beat.options?.find((o) => o.id === optionId);
    if (!option) return;

    // Resolve the choice
    this.state = resolveChoice(this.state, beatId, optionId, option);

    // Send state update
    this.sendStateUpdate();

    // Advance to next beat
    this.state = advanceBeat(this.config, this.state);
    await this.checkPhaseTransition();

    // Generate response reflecting the choice
    await this.generateAndSendResponse(`[Player chose: ${option.label}]`);
  }

  /** Get current state (for external inspection) */
  getState(): StoryState {
    return this.state;
  }

  /** Clean up resources */
  async destroy(): Promise<void> {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    await this.storyEngine.destroy();
  }

  // ─────────────────────────────────────────────
  // Internal pipeline
  // ─────────────────────────────────────────────

  private async processCurrentBeat(): Promise<void> {
    const beat = getCurrentBeat(this.config, this.state);
    if (!beat) {
      // No more beats — check ending
      await this.checkGameEnd();
      return;
    }

    switch (beat.type) {
      case "narration":
      case "revelation": {
        // Seed the first narration with the beat's purpose so Gemini knows what to generate
        const beatHint = beat.promptHint ?? beat.purpose ?? "";
        const seed = this.state.conversationHistory.length === 0
          ? `[BEGIN SESSION. ${beatHint}]`
          : "";
        await this.generateAndSendResponse(seed);
        break;
      }

      case "choice":
        await this.presentChoice(beat);
        break;

      case "silence":
        // Wait for silence duration, then advance
        await this.handleSilenceBeat(beat);
        break;
    }
  }

  private async generateAndSendResponse(playerText: string): Promise<void> {
    const phase = getCurrentPhase(this.config, this.state);
    const beat = getCurrentBeat(this.config, this.state);
    const { systemPrompt, userPrefix } = buildContext(
      this.config,
      this.state,
      phase,
      beat,
    );

    const stateSnapshot = {
      beat_type: beat?.type ?? "narration",
      phase_id: phase.id,
      trust_level: this.state.elara.trustLevel,
      elapsed_seconds: this.state.elapsedSeconds,
    };

    try {
      const response = await this.storyEngine.generateResponse(
        userPrefix + playerText,
        stateSnapshot,
      );

      // Parse sound cues from response
      const parsed = parseSoundCues(response.text);

      // Send sound cues
      for (const cue of parsed.cues) {
        this.send({
          type: "SOUND_CUE",
          payload: { soundId: cue.soundId, position: cue.position } satisfies SoundCuePayload,
        });
      }

      // Concatenate all audio chunks into one buffer before sending.
      // Gemini returns ~50 small chunks per response — sending them individually
      // through React state would lose all but the last due to batching.
      let combinedAudio: string | null = null;
      if (response.audioChunks && response.audioChunks.length > 0) {
        const totalBytes = response.audioChunks.reduce((n, ab) => n + ab.byteLength, 0);
        const combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const ab of response.audioChunks) {
          combined.set(new Uint8Array(ab), offset);
          offset += ab.byteLength;
        }
        combinedAudio = Buffer.from(combined).toString("base64");
      }

      this.send({
        type: "AUDIO_CHUNK",
        payload: {
          text: parsed.cleanText,
          audio: combinedAudio,
          sampleRate: 24000,
        },
      });

      // Add to conversation history
      this.addConversationTurn("elara", parsed.cleanText);

      // Apply beat state changes
      if (beat?.stateChanges) {
        this.state = applyStateChanges(this.state, beat.stateChanges);
      }

      // Advance beat (except for choice beats — those wait for player)
      if (beat && beat.type !== "choice") {
        this.state = advanceBeat(this.config, this.state);
        await this.checkPhaseTransition();
      }

      this.sendStateUpdate();
    } catch {
      // Fallback response
      const fallback =
        this.config.prompts.system.fallbackResponse ??
        "... I'm sorry. I lost my train of thought. What were you asking?";
      this.send({
        type: "AUDIO_CHUNK",
        payload: { text: fallback, audio: null, isFallback: true },
      });
      this.addConversationTurn("elara", fallback);
    }
  }

  private async presentChoice(beat: Beat): Promise<void> {
    if (!beat.options) return;

    const available = getAvailableOptions(beat.options, this.state);

    // First generate the narration leading into the choice
    await this.generateAndSendResponse("");

    // Then send choice prompt to client
    const payload: ChoicePromptPayload = {
      beatId: beat.id,
      options: available.map((o) => ({ id: o.id, label: o.label })),
    };
    this.send({ type: "CHOICE_PROMPT", payload });
  }

  private async handleSilenceBeat(beat: Beat): Promise<void> {
    // Apply any state changes
    if (beat.stateChanges) {
      this.state = applyStateChanges(this.state, beat.stateChanges);
    }

    // Advance after silence (actual timing handled client-side)
    this.state = advanceBeat(this.config, this.state);
    await this.checkPhaseTransition();
    this.sendStateUpdate();
  }

  private async checkPhaseTransition(): Promise<void> {
    const phase = getCurrentPhase(this.config, this.state);
    const beat = getCurrentBeat(this.config, this.state);

    // If beat is null, we've exhausted the current phase
    if (!beat) {
      const nextPhaseIndex = this.state.currentPhaseIndex + 1;
      if (nextPhaseIndex >= this.config.arc.phases.length) {
        await this.checkGameEnd();
        return;
      }

      // Calculate revelation variant at Phase 4 entry
      if (nextPhaseIndex === 3 && !this.state.revelationVariant) {
        const variant = calculateRevelationVariant(this.config, this.state);
        this.state = {
          ...this.state,
          revelationVariant: variant,
          elara: { ...this.state.elara, activeVariant: variant },
        };
      }

      this.state = advancePhase(this.config, this.state);

      const newPhase = getCurrentPhase(this.config, this.state);
      const payload: PhaseTransitionPayload = {
        phaseIndex: this.state.currentPhaseIndex,
        phaseId: newPhase.id,
        phaseName: newPhase.name,
      };
      this.send({ type: "PHASE_TRANSITION", payload });
      this.sendStateUpdate();

      // Process the first beat of the new phase
      await this.processCurrentBeat();
    }
  }

  private async checkGameEnd(): Promise<void> {
    const endingId = evaluateEndingCondition(this.config, this.state);

    if (endingId) {
      this.state = { ...this.state, endingId, status: "ended" };

      const condition = this.config.arc.endingConditions.find(
        (c) => c.id === endingId,
      );
      const payload: GameOverPayload = {
        endingId,
        endingName: condition?.endingName,
      };
      this.send({ type: "GAME_OVER", payload });
      this.sendStateUpdate();

      // Cleanup
      await this.destroy();
    }
  }

  private sendStateUpdate(): void {
    this.send({
      type: "STATE_UPDATE",
      payload: {
        phaseIndex: this.state.currentPhaseIndex,
        beatIndex: this.state.currentBeatIndex,
        elapsedSeconds: this.state.elapsedSeconds,
        trustLevel: this.state.elara.trustLevel,
        playerStyleScores: this.state.playerStyleScores,
        soundsRemoved: this.state.soundsRemoved,
        status: this.state.status,
      },
    });
  }

  private addConversationTurn(role: "player" | "elara", text: string): void {
    this.state = {
      ...this.state,
      conversationHistory: [
        ...this.state.conversationHistory,
        { role, text, timestamp: this.state.elapsedSeconds },
      ],
    };
  }
}
