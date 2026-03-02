/**
 * Sound cue parser — extracts [SOUND:xxx] inline markers from AI narration text.
 * Returns clean text (markers stripped) and an ordered list of cue positions.
 */

export interface ParsedSoundCue {
  soundId: string;
  /** Character position in the clean text where the cue was encountered */
  position: number;
}

export interface ParsedResponse {
  cleanText: string;
  cues: ParsedSoundCue[];
}

/**
 * Parse AI narration text for [SOUND:xxx] inline markers.
 * Strips the markers from the text and returns both the clean text and
 * an ordered list of cues with their positions in the clean text.
 */
export function parseSoundCues(text: string): ParsedResponse {
  const cues: ParsedSoundCue[] = [];
  let cleanText = "";
  let lastIndex = 0;

  const MARKER_RE = /\[SOUND:([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = MARKER_RE.exec(text)) !== null) {
    // Append text segment before this marker
    cleanText += text.slice(lastIndex, match.index);
    cues.push({ soundId: match[1].trim(), position: cleanText.length });
    lastIndex = match.index + match[0].length;
  }

  // Append any remaining text after the last marker
  cleanText += text.slice(lastIndex);

  // Normalise whitespace introduced by stripped markers
  cleanText = cleanText.replace(/  +/g, " ").trim();

  return { cleanText, cues };
}

/**
 * Strip any [SOUND:xxx] markers from text without tracking positions.
 * Convenience helper for display-only use cases.
 */
export function stripSoundMarkers(text: string): string {
  return text.replace(/\[SOUND:[^\]]*\]/g, "").replace(/\s{2,}/g, " ").trim();
}
