"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type CreatorChatMessage,
  type CreatorInterviewChunk,
  type CreatorSpec,
  EMPTY_CREATOR_SPEC,
  isCreatorInterviewChunk,
} from "@/lib/config/creator";

const CREATOR_PAGE_CSS = `
.creator-shell {
  min-height: 100dvh;
  padding: var(--space-lg);
  background:
    radial-gradient(circle at 5% 5%, rgba(232, 148, 60, 0.09), rgba(0, 0, 0, 0) 35%),
    radial-gradient(circle at 95% 20%, rgba(232, 148, 60, 0.06), rgba(0, 0, 0, 0) 40%),
    var(--black);
}
.creator-title {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  font-size: clamp(2rem, 4.5vw, 3.2rem);
  color: var(--white);
}
.creator-subtitle {
  margin: var(--space-xs) 0 0;
  font-family: var(--font-literary);
  font-style: italic;
  font-size: var(--type-body);
  color: var(--muted);
  max-width: 760px;
}
.creator-grid {
  margin-top: var(--space-lg);
  display: grid;
  gap: var(--space-md);
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
}
.creator-panel {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(11, 11, 11, 0.75);
  padding: var(--space-md);
}
.creator-panel-title {
  margin: 0 0 var(--space-sm);
  font-family: var(--font-display);
  letter-spacing: 0.07em;
  font-size: var(--type-section);
  color: var(--white);
}
.creator-messages {
  border: 1px solid rgba(255, 255, 255, 0.12);
  max-height: min(60dvh, 640px);
  min-height: 360px;
  overflow-y: auto;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.creator-message {
  max-width: 90%;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid rgba(255, 255, 255, 0.16);
  white-space: pre-wrap;
  line-height: 1.5;
}
.creator-message.user {
  align-self: flex-end;
  border-color: rgba(232, 148, 60, 0.55);
  color: var(--accent);
}
.creator-message.assistant {
  align-self: flex-start;
  color: var(--white);
}
.creator-form {
  margin-top: var(--space-sm);
  display: grid;
  gap: var(--space-sm);
}
.creator-input {
  width: 100%;
  min-height: 120px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--white);
  resize: vertical;
  padding: var(--space-sm);
  font: inherit;
  line-height: 1.5;
}
.creator-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
.creator-btn {
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0 var(--space-md);
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.06em;
  font-family: var(--font-display);
  font-size: var(--type-ui);
  transition: background var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}
.creator-btn:hover:enabled {
  background: var(--accent);
  color: var(--black);
}
.creator-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.creator-muted {
  font-family: var(--font-ui);
  font-size: var(--type-ui);
  color: var(--muted);
}
.creator-error {
  margin-top: var(--space-sm);
  color: var(--error);
  font-family: var(--font-ui);
  font-size: var(--type-ui);
}
.creator-spec-grid {
  display: grid;
  gap: var(--space-sm);
}
.creator-spec-item {
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: var(--space-xs) var(--space-sm);
}
.creator-spec-label {
  display: block;
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: var(--type-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.creator-spec-value {
  display: block;
  margin-top: 6px;
  color: var(--white);
  font-family: var(--font-literary);
  font-size: var(--type-body);
  font-style: italic;
  line-height: 1.45;
  min-height: 1.2em;
}
.creator-image-wrap {
  margin-top: var(--space-sm);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.45);
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
}
.creator-image {
  width: 100%;
  height: auto;
  object-fit: cover;
}
@media (max-width: 1024px) {
  .creator-shell {
    padding: var(--space-md) var(--space-sm);
  }
  .creator-grid {
    grid-template-columns: 1fr;
  }
  .creator-messages {
    max-height: 48dvh;
    min-height: 260px;
  }
}
`;

const INITIAL_MESSAGE =
  "Describe the visual you want to create. Include subject, mood, audience, and where you plan to use it.";

interface GeneratedImageState {
  base64: string;
  mimeType: string;
  prompt: string;
}

interface ImageApiResponse {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  model?: string;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseSseChunk(rawChunk: string): CreatorInterviewChunk | null {
  const lines = rawChunk.split(/\r?\n/);
  const dataLines = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
  if (dataLines.length === 0) return null;

  try {
    const parsed: unknown = JSON.parse(dataLines.join("\n"));
    return isCreatorInterviewChunk(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function consumeSse(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: CreatorInterviewChunk) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex >= 0) {
        const rawChunk = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);

        const parsed = parseSseChunk(rawChunk);
        if (parsed) onChunk(parsed);

        boundaryIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function CreatorInterview() {
  const [sessionId] = useState<string>(() => createSessionId());
  const [messages, setMessages] = useState<CreatorChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [spec, setSpec] = useState<CreatorSpec>(EMPTY_CREATOR_SPEC);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageState | null>(null);

  const effectiveImagePrompt = useMemo(() => {
    return imagePrompt || spec.imagePrompt || "";
  }, [imagePrompt, spec.imagePrompt]);

  const logClientEvent = useCallback(
    (event: string, details: Record<string, unknown> = {}) => {
      console.info(JSON.stringify({ event, sessionId, ...details }));
    },
    [sessionId],
  );

  const handleInterviewSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || isSending) return;

    const updatedMessages = [...messages, { role: "user", content: message } satisfies CreatorChatMessage];
    setMessages(updatedMessages);
    setInput("");
    setError("");
    setIsSending(true);
    logClientEvent("creator.ui.interview.submit", { messageLength: message.length });

    try {
      const response = await fetch("/api/creator/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: updatedMessages,
          currentSpec: spec,
        }),
      });

      if (!response.ok) {
        let messageFromServer = `Interview request failed (${response.status})`;
        try {
          const parsed = (await response.json()) as { error?: unknown };
          if (typeof parsed.error === "string") messageFromServer = parsed.error;
        } catch {
          // ignore parse failures
        }
        throw new Error(messageFromServer);
      }

      if (!response.body) {
        throw new Error("Interview stream is unavailable");
      }

      await consumeSse(response.body, (chunk) => {
        if (chunk.type === "message") {
          setMessages((prev) => [...prev, { role: "assistant", content: chunk.message }]);
          logClientEvent("creator.ui.interview.chunk_message");
          return;
        }

        if (chunk.type === "spec_update") {
          setSpec((prev) => ({ ...prev, ...chunk.specUpdate }));
          if (typeof chunk.specUpdate.imagePrompt === "string") {
            setImagePrompt(chunk.specUpdate.imagePrompt);
          }
          logClientEvent("creator.ui.interview.chunk_spec_update", {
            fields: Object.keys(chunk.specUpdate),
          });
          return;
        }

        if (chunk.type === "image_prompt") {
          setImagePrompt(chunk.prompt);
          logClientEvent("creator.ui.interview.chunk_image_prompt", {
            promptLength: chunk.prompt.length,
          });
          return;
        }

        if (chunk.type === "error") {
          setError(chunk.error);
          logClientEvent("creator.ui.interview.chunk_error");
          return;
        }

        if (chunk.type === "complete") {
          logClientEvent("creator.ui.interview.chunk_complete");
        }
      });
    } catch (requestError) {
      const messageFromError =
        requestError instanceof Error ? requestError.message : "Interview request failed unexpectedly";
      setError(messageFromError);
      logClientEvent("creator.ui.interview.failed", { message: messageFromError });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, sessionId, spec, logClientEvent]);

  const handleGenerateImage = useCallback(async () => {
    if (isGeneratingImage) return;

    const prompt = effectiveImagePrompt.trim();
    if (!prompt) {
      setError("No image prompt yet. Continue the interview to generate one.");
      return;
    }

    setError("");
    setIsGeneratingImage(true);
    logClientEvent("creator.ui.image.submit", { promptLength: prompt.length });

    try {
      const response = await fetch("/api/creator/image", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({
          sessionId,
          prompt,
          spec,
        }),
      });

      const parsed = (await response.json()) as Partial<ImageApiResponse> & { error?: unknown };
      if (!response.ok) {
        const messageFromServer =
          typeof parsed.error === "string" ? parsed.error : `Image generation failed (${response.status})`;
        throw new Error(messageFromServer);
      }

      if (
        typeof parsed.imageBase64 !== "string" ||
        typeof parsed.mimeType !== "string" ||
        typeof parsed.prompt !== "string"
      ) {
        throw new Error("Invalid image response");
      }

      setGeneratedImage({
        base64: parsed.imageBase64,
        mimeType: parsed.mimeType,
        prompt: parsed.prompt,
      });
      setImagePrompt(parsed.prompt);
      logClientEvent("creator.ui.image.success", { mimeType: parsed.mimeType });
    } catch (requestError) {
      const messageFromError =
        requestError instanceof Error ? requestError.message : "Image generation failed unexpectedly";
      setError(messageFromError);
      logClientEvent("creator.ui.image.failed", { message: messageFromError });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [effectiveImagePrompt, isGeneratingImage, logClientEvent, sessionId, spec]);

  return (
    <main className="creator-shell">
      <style dangerouslySetInnerHTML={{ __html: CREATOR_PAGE_CSS }} />

      <h1 className="creator-title">Creator Interview</h1>
      <p className="creator-subtitle">
        Run a guided creative interview, auto-build a structured brief, then generate a first visual concept.
      </p>

      <section className="creator-grid" aria-label="Creator interview workspace">
        <div className="creator-panel">
          <h2 className="creator-panel-title">Interview</h2>
          <div className="creator-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`creator-message ${message.role}`}
                aria-label={message.role === "assistant" ? "Assistant message" : "Your message"}
              >
                {message.content}
              </article>
            ))}
          </div>

          <div className="creator-form">
            <label className="creator-muted" htmlFor="creator-input">
              Your response
            </label>
            <textarea
              id="creator-input"
              className="creator-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Add details on subject, format, mood, and visual direction..."
              disabled={isSending}
            />
            <div className="creator-actions">
              <button
                type="button"
                className="creator-btn"
                onClick={() => {
                  void handleInterviewSubmit();
                }}
                disabled={isSending || input.trim().length === 0}
              >
                {isSending ? "Sending..." : "Send Response"}
              </button>
              <button
                type="button"
                className="creator-btn"
                onClick={() => {
                  void handleGenerateImage();
                }}
                disabled={isGeneratingImage || effectiveImagePrompt.trim().length === 0}
              >
                {isGeneratingImage ? "Generating..." : "Generate Image"}
              </button>
            </div>
            <p className="creator-muted">Session ID: {sessionId}</p>
            {error ? <p className="creator-error">{error}</p> : null}
          </div>
        </div>

        <aside className="creator-panel" aria-label="Creative spec">
          <h2 className="creator-panel-title">Live Spec</h2>
          <div className="creator-spec-grid">
            <div className="creator-spec-item">
              <span className="creator-spec-label">Title</span>
              <span className="creator-spec-value">{spec.title || "..."}</span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Audience</span>
              <span className="creator-spec-value">{spec.audience || "..."}</span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Theme</span>
              <span className="creator-spec-value">{spec.theme || "..."}</span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Mood</span>
              <span className="creator-spec-value">{spec.mood || "..."}</span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Visual Style</span>
              <span className="creator-spec-value">{spec.visualStyle || "..."}</span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Key Elements</span>
              <span className="creator-spec-value">
                {spec.keyElements.length > 0 ? spec.keyElements.join(", ") : "..."}
              </span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Aspect Ratio</span>
              <span className="creator-spec-value">{spec.aspectRatio}</span>
            </div>
            <div className="creator-spec-item">
              <span className="creator-spec-label">Image Prompt</span>
              <span className="creator-spec-value">{effectiveImagePrompt || "..."}</span>
            </div>
          </div>

          <div className="creator-image-wrap">
            {generatedImage ? (
              <img
                src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                alt="Generated creator concept"
                className="creator-image"
              />
            ) : (
              <p className="creator-muted">No image generated yet.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

