const LEAKED_TOOL_PREFIX_RE =
  /^[\s\d.,:{}[\]'"()-]*\b(?:trigger_sound|set_tension|end_game)\b[^A-Za-z\n]*[}\])]*\s*/i;

const EMBEDDED_TOOL_BLOCK_RE =
  /[{\[][^{}\n]*(?:trigger_sound|set_tension|end_game)[^{}\n]*[}\]]/gi;

const PARENTHETICAL_CUE_RE = /[\[(](?:[a-z0-9]+(?:[-_][a-z0-9]+){1,4})[\])]/gi;
const DANGLING_SENTENCE_CUE_RE =
  /(^|[.!?]\s+)\((?:[a-z0-9]+(?:[-_\s][a-z0-9]+){0,3})\)?\s+(?=[A-Z])/g;

export function sanitizeModelDisplayText(text: string): string {
  return text
    .replace(EMBEDDED_TOOL_BLOCK_RE, " ")
    .replace(LEAKED_TOOL_PREFIX_RE, "")
    .replace(DANGLING_SENTENCE_CUE_RE, "$1")
    .replace(PARENTHETICAL_CUE_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
