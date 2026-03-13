import { sanitizeModelDisplayText } from "@/lib/model-text-sanitizer";

type SelectLiveDisplayTextInput = {
  modelText?: string;
  outputTranscriptionText?: string;
};

export function selectLiveDisplayText({
  modelText,
  outputTranscriptionText,
}: SelectLiveDisplayTextInput): string {
  const sanitizedModelText = sanitizeModelDisplayText(modelText ?? "");
  if (sanitizedModelText) {
    return sanitizedModelText;
  }

  return sanitizeModelDisplayText(outputTranscriptionText ?? "");
}

export function appendLiveDisplayText(existingText: string, nextChunk: string): string {
  if (!nextChunk) return existingText;
  if (!existingText) return nextChunk;
  if (existingText === nextChunk) return existingText;
  if (existingText.endsWith(nextChunk)) return existingText;
  if (nextChunk.startsWith(existingText)) return nextChunk;

  const maxOverlap = Math.min(existingText.length, nextChunk.length);
  const MIN_OVERLAP_LENGTH = 2;
  for (let overlapLength = maxOverlap; overlapLength >= MIN_OVERLAP_LENGTH; overlapLength -= 1) {
    const suffix = existingText.slice(-overlapLength);
    const prefix = nextChunk.slice(0, overlapLength);
    if (suffix === prefix) {
      return `${existingText}${nextChunk.slice(overlapLength)}`;
    }
  }

  const lastChar = existingText.at(-1) ?? "";
  const firstChar = nextChunk[0] ?? "";

  const needsSpace =
    !/\s/.test(lastChar) &&
    /[A-Za-z0-9("'[]/.test(firstChar);

  return needsSpace ? `${existingText} ${nextChunk}` : `${existingText}${nextChunk}`;
}
