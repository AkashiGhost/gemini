import { isTransientLiveServiceErrorMessage } from "@/lib/play-error-classification";

type LiveRetryPolicyInput = {
  errorMessage?: string;
  retryAttempts: number;
  maxRetryAttempts: number;
  hasAiSpoken: boolean;
  transcriptCount: number;
};

export function shouldAutoRetryLiveSession({
  errorMessage,
  retryAttempts,
  maxRetryAttempts,
  hasAiSpoken,
  transcriptCount,
}: LiveRetryPolicyInput): boolean {
  if (retryAttempts >= maxRetryAttempts) return false;
  if (hasAiSpoken) return false;
  if (transcriptCount > 0) return false;
  return isTransientLiveServiceErrorMessage(errorMessage);
}
