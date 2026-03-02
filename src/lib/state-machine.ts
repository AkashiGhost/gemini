import type {
  GameConfig,
  ArcConfig,
  Phase,
  Beat,
  ChoiceOption,
  EndingCondition,
} from "./types/game-config";
import type {
  StoryState,
  PlayerStyleScores,
  PlayerStyle,
  StoryAction,
} from "./types/story-state";
import { STYLE_TIE_BREAK_ORDER } from "./types/story-state";

// ─────────────────────────────────────────────
// Pure functions — no side effects
// ─────────────────────────────────────────────

/** Create initial game state from config */
export function initState(config: GameConfig): StoryState {
  const elara = config.characters.find(c => c.role === "narrator") ?? config.characters[0];
  const state: StoryState = {
    status: "playing",
    currentPhaseIndex: 0,
    currentBeatIndex: 0,
    elapsedSeconds: 0,
    elara: {
      emotionalState: elara.mutableState.emotionalState,
      trustLevel: elara.mutableState.trustLevel,
      secretsRevealed: [],
      currentPhaseBehavior: config.arc.phases[0].characterBehavior,
      arcStageIndex: 0,
      activeVariant: null,
    },
    playerStyleScores: {
      empathetic: 0,
      analytical: 0,
      nurturing: 0,
      confrontational: 0,
    },
    flags: {},
    choicesMade: {},
    endingId: null,
    revelationVariant: null,
    conversationHistory: [],
    soundsRemoved: [],
  };
  console.log(`[STATE] Init: phase=${state.currentPhaseIndex}, beat=${state.currentBeatIndex}`);
  return state;
}

/** Get current phase from config */
export function getCurrentPhase(
  config: GameConfig,
  state: StoryState,
): Phase {
  return config.arc.phases[state.currentPhaseIndex];
}

/** Get current beat from config */
export function getCurrentBeat(
  config: GameConfig,
  state: StoryState,
): Beat | null {
  const phase = getCurrentPhase(config, state);
  if (state.currentBeatIndex >= phase.beats.length) return null;
  return phase.beats[state.currentBeatIndex];
}

/** Advance to the next beat within the current phase.
 *  NOTE: Does NOT advance the phase — that is game-orchestrator's job via
 *  checkPhaseTransition(). When currentBeatIndex exceeds the phase's beats,
 *  getCurrentBeat() returns null and checkPhaseTransition() fires correctly. */
export function advanceBeat(
  _config: GameConfig,
  state: StoryState,
): StoryState {
  const nextBeatIndex = state.currentBeatIndex + 1;
  console.log(
    `[STATE] Advance: phase ${state.currentPhaseIndex} → ${state.currentPhaseIndex}, ` +
    `beat ${state.currentBeatIndex} → ${nextBeatIndex}`,
  );
  return { ...state, currentBeatIndex: nextBeatIndex };
}

/** Advance to the next phase */
export function advancePhase(
  config: GameConfig,
  state: StoryState,
): StoryState {
  const nextPhaseIndex = state.currentPhaseIndex + 1;

  // Game over — no more phases
  if (nextPhaseIndex >= config.arc.phases.length) {
    console.log(
      `[STATE] Advance: phase ${state.currentPhaseIndex} → ended (no more phases), ` +
      `beat ${state.currentBeatIndex} → 0`,
    );
    return { ...state, status: "ended" };
  }

  const nextPhase = config.arc.phases[nextPhaseIndex];
  // Use narrator character for arc stages (not characters[0] which may be a
  // player avatar without an arc — e.g., the-lighthouse's keeper.yaml)
  const narratorChar = config.characters.find(c => c.role === "narrator") ?? config.characters[0];
  const arcStagesCount = narratorChar?.arc?.stages?.length ?? config.arc.phases.length;
  const nextArcStageIndex = Math.min(nextPhaseIndex, arcStagesCount - 1);

  // Calculate revelation variant at Phase 4 entry (index 3)
  let revelationVariant = state.revelationVariant;
  if (nextPhaseIndex === 3 && !revelationVariant) {
    revelationVariant = calculateRevelationVariant(config, state);
  }

  console.log(
    `[STATE] Advance: phase ${state.currentPhaseIndex} → ${nextPhaseIndex}, ` +
    `beat ${state.currentBeatIndex} → 0`,
  );

  return {
    ...state,
    currentPhaseIndex: nextPhaseIndex,
    currentBeatIndex: 0,
    elara: {
      ...state.elara,
      currentPhaseBehavior: nextPhase.characterBehavior,
      arcStageIndex: nextArcStageIndex,
      activeVariant:
        nextPhaseIndex >= 3 ? revelationVariant : state.elara.activeVariant,
    },
    revelationVariant,
  };
}

/** Resolve a player choice, applying state changes and style scores */
export function resolveChoice(
  state: StoryState,
  beatId: string,
  optionId: string,
  option: ChoiceOption,
): StoryState {
  let newState: StoryState = {
    ...state,
    choicesMade: { ...state.choicesMade, [beatId]: optionId },
  };

  // Apply state changes from the option
  if (option.stateChanges) {
    newState = applyStateChanges(newState, option.stateChanges);
  }

  // Apply style scores from the option
  if (option.styleScore) {
    newState = applyStyleScore(newState, option.styleScore);
  }

  const changes = {
    ...(option.stateChanges ?? {}),
    ...(option.styleScore ? { styleScore: option.styleScore } : {}),
  };
  console.log(
    `[STATE] Choice resolved: beat=${beatId}, option=${optionId}, state changes=${JSON.stringify(changes)}`,
  );

  return newState;
}

/** Apply dot-path state mutations */
export function applyStateChanges(
  state: StoryState,
  changes: Record<string, unknown>,
): StoryState {
  let newState = { ...state };

  for (const [dotPath, value] of Object.entries(changes)) {
    newState = applyDotPathChange(newState, dotPath, value);
  }

  return newState;
}

/** Apply a single dot-path mutation (e.g., "elara.trust_level": "+2") */
function applyDotPathChange(
  state: StoryState,
  dotPath: string,
  value: unknown,
): StoryState {
  // Normalize the path (support both snake_case and camelCase)
  const parts = dotPath.split(".").map((p) =>
    p.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()),
  );

  // Handle known paths directly for type safety
  const path0 = parts[0];
  const path1 = parts[1];

  // elara.mutableState.* — arc.yaml uses "elara.mutable_state.*" which becomes
  // "elara.mutableState.*" after key transformation. Redirect to flat elara fields.
  if (path0 === "elara" && path1 === "mutableState" && parts[2]) {
    const innerPath = parts[2];
    if (innerPath === "trustLevel") {
      const current = state.elara.trustLevel;
      const newVal = resolveDelta(current, value);
      return {
        ...state,
        elara: { ...state.elara, trustLevel: Math.max(0, Math.min(10, newVal)) },
      };
    }
    if (innerPath === "emotionalState") {
      return { ...state, elara: { ...state.elara, emotionalState: String(value) } };
    }
    // Other mutableState fields fall through to flags
    return { ...state, flags: { ...state.flags, [dotPath]: value as boolean | string | number } };
  }

  // elara.trustLevel or elara.trust_level
  if (path0 === "elara" && path1 === "trustLevel") {
    const current = state.elara.trustLevel;
    const newVal = resolveDelta(current, value);
    return {
      ...state,
      elara: {
        ...state.elara,
        trustLevel: Math.max(0, Math.min(10, newVal)),
      },
    };
  }

  // elara.emotionalState
  if (path0 === "elara" && path1 === "emotionalState") {
    return {
      ...state,
      elara: { ...state.elara, emotionalState: String(value) },
    };
  }

  // elara.secretsRevealed (add to array)
  if (path0 === "elara" && path1 === "secretsRevealed") {
    const secretId = String(value);
    if (state.elara.secretsRevealed.includes(secretId)) return state;
    return {
      ...state,
      elara: {
        ...state.elara,
        secretsRevealed: [...state.elara.secretsRevealed, secretId],
      },
    };
  }

  // game.flags.* or flags.*
  if (path0 === "game" && path1 === "flags" && parts[2]) {
    return {
      ...state,
      flags: { ...state.flags, [parts[2]]: value as boolean | string | number },
    };
  }
  if (path0 === "flags" && path1) {
    return {
      ...state,
      flags: { ...state.flags, [path1]: value as boolean | string | number },
    };
  }

  // playerStyleScores.*
  if (path0 === "playerStyleScores" && path1) {
    const key = path1 as PlayerStyle;
    if (key in state.playerStyleScores) {
      const current = state.playerStyleScores[key];
      return {
        ...state,
        playerStyleScores: {
          ...state.playerStyleScores,
          [key]: resolveDelta(current, value),
        },
      };
    }
  }

  // Unknown path — store in flags as fallback
  return {
    ...state,
    flags: { ...state.flags, [dotPath]: value as boolean | string | number },
  };
}

/** Resolve delta expressions: "+1", "-2", "true", or absolute values */
function resolveDelta(current: number, value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value.startsWith("+")) return current + parseInt(value.slice(1), 10);
    if (value.startsWith("-")) return current + parseInt(value, 10);
    if (value === "true") return 1;
    if (value === "false") return 0;
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return current;
}

/** Apply style scores from a choice option */
function applyStyleScore(
  state: StoryState,
  scores: Record<string, number>,
): StoryState {
  const newScores = { ...state.playerStyleScores };
  for (const [style, delta] of Object.entries(scores)) {
    const key = style as PlayerStyle;
    if (key in newScores) {
      newScores[key] += delta;
    }
  }
  return { ...state, playerStyleScores: newScores };
}

/** Calculate which revelation variant to use based on player style scores */
export function calculateRevelationVariant(
  config: GameConfig,
  state: StoryState,
): string {
  const scores = state.playerStyleScores;
  const { revelationLogic } = config.arc;

  // Find dominant style with tie-break order
  const dominant = getDominantStyle(scores);

  // Handle nested mapping format: { trigger, source, mapping: { empathetic: "last_keeper" } }
  // vs flat format: { empathetic: "last_keeper" }
  const nested = (revelationLogic as Record<string, unknown>).mapping as
    | Record<string, string>
    | undefined;
  const lookup = nested ?? revelationLogic;

  return lookup[dominant] ?? lookup[STYLE_TIE_BREAK_ORDER[0]] ?? "shadow_self";
}

/** Get the dominant player style with tie-breaking */
export function getDominantStyle(scores: PlayerStyleScores): PlayerStyle {
  let maxScore = -Infinity;
  let dominant: PlayerStyle = STYLE_TIE_BREAK_ORDER[0];

  for (const style of STYLE_TIE_BREAK_ORDER) {
    if (scores[style] > maxScore) {
      maxScore = scores[style];
      dominant = style;
    }
  }

  return dominant;
}

/** Evaluate ending conditions, returning the first matching ending ID */
export function evaluateEndingCondition(
  config: GameConfig,
  state: StoryState,
): string | null {
  const raw = config.arc.endingConditions;

  // Standard array format (structured EndingCondition[] with trigger objects)
  if (Array.isArray(raw)) {
    for (const condition of raw) {
      if (matchesEndingTrigger(condition, state)) {
        console.log(`[STATE] Ending check: result=${condition.id}`);
        return condition.id;
      }
    }
    console.log(`[STATE] Ending check: result=none`);
    return null;
  }

  // Object/map format — story uses named endings like:
  //   ending_conditions:
  //     acceptance: { primary_path: "final_choice == 'accept'", ... }
  // The final choice beat's state_changes sets flags.endingRoute to the ending name.
  if (raw && typeof raw === "object") {
    const endingRoute = state.flags["endingRoute"] as string | undefined;
    if (endingRoute) {
      console.log(`[STATE] Ending check (map format): endingRoute="${endingRoute}"`);
      return endingRoute;
    }
    console.log(`[STATE] Ending check (map format): no endingRoute flag set yet`);
    return null;
  }

  console.log(`[STATE] Ending check: result=none (no conditions)`);
  return null;
}

/** Check if a single ending condition matches the current state */
function matchesEndingTrigger(
  condition: EndingCondition,
  state: StoryState,
): boolean {
  const { trigger } = condition;

  // Empty trigger = default fallback (always matches)
  if (Object.keys(trigger).length === 0) return true;

  // Check revelation variant
  if (trigger.revelation && trigger.revelation !== state.revelationVariant) {
    return false;
  }

  // Check required choices
  if (trigger.choices) {
    for (const [beatId, requiredOption] of Object.entries(trigger.choices)) {
      if (state.choicesMade[beatId] !== requiredOption) return false;
    }
  }

  // Check trust level range
  if (
    trigger.trustLevelMin !== undefined &&
    state.elara.trustLevel < trigger.trustLevelMin
  ) {
    return false;
  }
  if (
    trigger.trustLevelMax !== undefined &&
    state.elara.trustLevel > trigger.trustLevelMax
  ) {
    return false;
  }

  // Check required secrets
  if (trigger.secretsRevealedIncludes) {
    for (const secretId of trigger.secretsRevealedIncludes) {
      if (!state.elara.secretsRevealed.includes(secretId)) return false;
    }
  }

  return true;
}

/** Reducer for StoryState — can be used with React useReducer */
export function storyReducer(
  state: StoryState,
  action: StoryAction,
): StoryState {
  switch (action.type) {
    case "ADVANCE_BEAT":
      return { ...state, currentBeatIndex: state.currentBeatIndex + 1 };
    case "ADVANCE_PHASE":
      return {
        ...state,
        currentPhaseIndex: state.currentPhaseIndex + 1,
        currentBeatIndex: 0,
      };
    case "RESOLVE_CHOICE":
      return {
        ...state,
        choicesMade: {
          ...state.choicesMade,
          [action.beatId]: action.optionId,
        },
        ...(action.stateChanges
          ? applyStateChanges(state, action.stateChanges)
          : {}),
        ...(action.styleScore
          ? applyStyleScore(state, action.styleScore)
          : {}),
      };
    case "APPLY_STATE_CHANGES":
      return applyStateChanges(state, action.changes);
    case "ADD_CONVERSATION_TURN":
      return {
        ...state,
        conversationHistory: [...state.conversationHistory, action.turn],
      };
    case "SET_REVELATION_VARIANT":
      return {
        ...state,
        revelationVariant: action.variant,
        elara: { ...state.elara, activeVariant: action.variant },
      };
    case "SET_ENDING":
      return { ...state, endingId: action.endingId, status: "ended" };
    case "TICK":
      return { ...state, elapsedSeconds: action.elapsedSeconds };
    case "REMOVE_SOUND":
      return {
        ...state,
        soundsRemoved: state.soundsRemoved.includes(action.soundId)
          ? state.soundsRemoved
          : [...state.soundsRemoved, action.soundId],
      };
    case "SET_STATUS":
      return { ...state, status: action.status };
    default:
      return state;
  }
}
