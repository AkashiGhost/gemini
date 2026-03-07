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

  const lastChar = existingText.at(-1) ?? "";
  const firstChar = nextChunk[0] ?? "";

  const needsSpace =
    !/\s/.test(lastChar) &&
    /[A-Za-z0-9("'[]/.test(firstChar);

  return needsSpace ? `${existingText} ${nextChunk}` : `${existingText}${nextChunk}`;
}
