type TranscriptLikeEntry = {
  source: "user" | "ai";
  text: string;
};

export function getLatestTranscriptEntryBySource<T extends TranscriptLikeEntry>(
  transcript: readonly T[],
  source: T["source"],
): T | undefined {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const entry = transcript[index];
    if (entry?.source === source) return entry;
  }
  return undefined;
}

export function getTranscriptSequenceForSource<T extends TranscriptLikeEntry>(
  transcript: readonly T[],
  source: T["source"],
): number {
  let count = 0;
  for (const entry of transcript) {
    if (entry?.source === source) count += 1;
  }
  return count;
}
