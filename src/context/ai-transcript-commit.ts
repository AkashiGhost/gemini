export function shouldCommitAiTranscript(aiText: string, lastCommittedAiText: string): boolean {
  const nextText = aiText.trim();
  if (!nextText) return false;
  return nextText !== lastCommittedAiText.trim();
}
