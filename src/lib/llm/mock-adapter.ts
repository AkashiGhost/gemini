// ─────────────────────────────────────────────
// Mock Adapter — enables full pipeline testing without API keys
// Implements StoryEngine and IntentParser with canned responses
// ─────────────────────────────────────────────

import type { StoryEngine, IntentParser, LLMTurn } from "../types/llm";
import type { IntentResult, EmotionalRegister } from "../types/intent";

// ─────────────────────────────────────────────
// Mock Story Engine
// ─────────────────────────────────────────────

const BEAT_RESPONSES: Record<string, string[]> = {
  narration: [
    "The rain hasn't changed since you sat down. [SOUND:rain] But the room feels different now. Smaller, maybe.",
    "You notice your hands have been still for a while. That is unusual for you.",
    "The light from the desk lamp catches something in my expression you cannot name.",
  ],
  choice: [
    "There is something I should tell you. But first — I need to know. [SOUND:clock_slow] What do you think is happening here?",
    "You have been very careful with your questions. I wonder what you are afraid of finding.",
  ],
  revelation: [
    "[SOUND:silence_2s] [SOUND:low_tone] I have been in this room longer than you know. The building remembers everything that was ever confessed inside it.",
    "[SOUND:silence_2s] [SOUND:low_tone] I am the part of you that sits in this chair when you go home.",
  ],
  silence: [""],
};

export class MockStoryEngine implements StoryEngine {
  private initialized = false;
  private callCount = 0;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async generateResponse(
    playerText: string,
    stateSnapshot: Record<string, unknown>,
  ): Promise<LLMTurn> {
    if (!this.initialized) {
      throw new Error("MockStoryEngine not initialized");
    }

    this.callCount++;

    // Determine beat type from state snapshot
    const beatType = (stateSnapshot.beat_type as string) || "narration";
    const responses = BEAT_RESPONSES[beatType] ?? BEAT_RESPONSES.narration;
    const text = responses[this.callCount % responses.length];

    // If player mentions something specific, mirror it
    const mirrored = playerText.length > 10
      ? ` You said "${playerText.slice(0, 30)}..." — I heard that.`
      : "";

    return {
      text: text + mirrored,
      isFallback: false,
    };
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }
}

// ─────────────────────────────────────────────
// Mock Intent Parser
// ─────────────────────────────────────────────

/** Simple keyword-based intent classification for testing */
export class MockIntentParser implements IntentParser {
  async parse(playerText: string): Promise<IntentResult> {
    const lower = playerText.toLowerCase().trim();

    // Detect intent from keywords
    const intent = detectIntent(lower);
    const emotionalRegister = detectRegister(lower);

    return {
      intent,
      emotionalRegister,
      keyPhrase: extractKeyPhrase(playerText),
      challengeLevel: emotionalRegister === "confrontational" ? "high" : "low",
      rawInput: playerText,
    };
  }
}

function detectIntent(text: string): IntentResult["intent"] {
  if (!text || text.length === 0) return "silence";
  if (text.includes("leave") || text.includes("door") || text.includes("go"))
    return "try_to_leave";
  if (text.includes("phone") || text.includes("call"))
    return "try_phone";
  if (text.includes("help") || text.includes("scream"))
    return "try_call_help";
  if (text.includes("done") || text.includes("over") || text.includes("end"))
    return "try_end_session";
  if (text.includes("stand") || text.includes("get up"))
    return "stand_up";
  if (text.includes("look") || text.includes("around"))
    return "look_around";
  if (text.includes("?")) return "ask_question";
  if (
    text.includes("feel") ||
    text.includes("scared") ||
    text.includes("afraid") ||
    text.includes("angry")
  )
    return "express_emotion";
  return "speak_to_elara";
}

function detectRegister(text: string): EmotionalRegister {
  if (
    text.includes("feel") ||
    text.includes("understand") ||
    text.includes("must be hard")
  )
    return "empathetic";
  if (
    text.includes("why") ||
    text.includes("how") ||
    text.includes("explain") ||
    text.includes("exactly")
  )
    return "analytical";
  if (
    text.includes("help") ||
    text.includes("okay") ||
    text.includes("safe") ||
    text.includes("care")
  )
    return "nurturing";
  if (
    text.includes("stop") ||
    text.includes("tell me") ||
    text.includes("truth") ||
    text.includes("lying")
  )
    return "confrontational";
  return "neutral";
}

function extractKeyPhrase(text: string): string {
  // Take the most emotionally loaded fragment (heuristic: longest sentence)
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  if (sentences.length === 0) return text;
  return sentences.reduce((a, b) => (a.length > b.length ? a : b)).trim();
}
