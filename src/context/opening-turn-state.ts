export interface OpeningTurnState {
  locked: boolean;
  responseReceived: boolean;
  completed: boolean;
}

export function beginOpeningTurn(): OpeningTurnState {
  return {
    locked: true,
    responseReceived: false,
    completed: false,
  };
}

export function markOpeningTurnResponseReceived(state: OpeningTurnState): OpeningTurnState {
  if (state.completed || state.responseReceived) return state;
  return {
    ...state,
    responseReceived: true,
  };
}

export function markOpeningTurnCompleted(state: OpeningTurnState): OpeningTurnState {
  if (!state.responseReceived) return state;
  if (state.completed && !state.locked) return state;
  return {
    locked: false,
    responseReceived: true,
    completed: true,
  };
}

export function handleOpeningTurnInterrupted(
  state: OpeningTurnState,
): { next: OpeningTurnState; shouldRetryOpening: boolean } {
  if (!state.locked || state.completed) {
    return { next: state, shouldRetryOpening: false };
  }

  return {
    next: {
      ...state,
      responseReceived: false,
    },
    shouldRetryOpening: true,
  };
}

export function shouldSendOpeningFallback(state: OpeningTurnState): boolean {
  return state.locked && !state.responseReceived && !state.completed;
}

export function shouldFailOpeningTurn(state: OpeningTurnState): boolean {
  return state.locked && !state.responseReceived && !state.completed;
}
