const LEAKED_TOOL_PREFIX_RE =
  /^[\s\d.,:{}[\]'"()-]*\b(?:trigger_sound|set_tension|end_game)\b[^A-Za-z\n]*[}\])]*\s*/i;

const EMBEDDED_TOOL_BLOCK_RE =
  /[{\[][^{}\n]*(?:trigger_sound|set_tension|end_game)[^{}\n]*[}\]]/gi;

export function sanitizeModelDisplayText(text: string): string {
  return text
    .replace(EMBEDDED_TOOL_BLOCK_RE, " ")
    .replace(LEAKED_TOOL_PREFIX_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
