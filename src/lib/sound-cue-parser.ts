// ─────────────────────────────────────────────
// Sound Cue Parser
// Extracts [SOUND:identifier] markers from LLM text output
// ─────────────────────────────────────────────

export interface ParsedSoundCue {
  /** Sound ID from cue-map.yaml */
  soundId: string;
  /** Character position in the ORIGINAL text where the marker appeared */
  position: number;
}

export interface ParsedResponse {
  /** Text with all [SOUND:x] markers removed — ready for TTS */
  cleanText: string;
  /** Extracted sound cues in order of appearance */
  cues: ParsedSoundCue[];
}

const SOUND_CUE_REGEX = /\[SOUND:([a-z][a-z0-9_]*)\]/g;

/**
 * Parse LLM response text, extracting sound cue markers and returning
 * clean text for TTS along with an ordered list of cues.
 */
export function parseSoundCues(text: string): ParsedResponse {
  const cues: ParsedSoundCue[] = [];
  let match: RegExpExecArray | null;

  // Create fresh regex instance per call
  const regex = new RegExp(SOUND_CUE_REGEX.source, SOUND_CUE_REGEX.flags);

  while ((match = regex.exec(text)) !== null) {
    cues.push({
      soundId: match[1],
      position: match.index,
    });
  }

  // Remove all markers from text
  const cleanText = text
    .replace(new RegExp(SOUND_CUE_REGEX.source, "g"), "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleanText, cues };
}
