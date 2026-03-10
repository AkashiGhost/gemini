"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  type CreatorChatMessage,
  type CreatorInterviewChunk,
  type CreatorSpec,
  type CreatorStoryPack,
  type CreatorStoryPackPhase,
  type CreatorStoryPackSoundCue,
  EMPTY_CREATOR_SPEC,
  isCreatorInterviewChunk,
} from "@/lib/config/creator";
import { createPublishedStoryManifest } from "@/lib/published-story";
import { savePublishedStory } from "@/lib/published-story-play";
import { PlayerProfileBuilder } from "@/components/profile/PlayerProfileBuilder";
import {
  buildGameProfileContext,
  loadPlayerProfile,
  type PlayerProfileV1,
} from "@/lib/player-profile";

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
.creator-input-compact {
  min-height: 86px;
}
.creator-text-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--white);
  padding: 0.55rem 0.65rem;
  font: inherit;
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
.creator-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-sm);
}
.creator-status-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 0.2rem 0.55rem;
  font-family: var(--font-ui);
  font-size: var(--type-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--white);
}
.creator-status-badge.idle {
  color: var(--muted);
}
.creator-status-badge.running {
  color: var(--accent);
  border-color: rgba(232, 148, 60, 0.55);
}
.creator-status-badge.success {
  color: #7fd3a7;
  border-color: rgba(127, 211, 167, 0.6);
}
.creator-status-badge.error {
  color: var(--error);
  border-color: rgba(255, 96, 96, 0.65);
}
.creator-debug-log {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: var(--space-sm);
  display: grid;
  gap: var(--space-sm);
}
.creator-debug-item {
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: var(--space-xs) var(--space-sm);
}
.creator-debug-json {
  margin: 6px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--muted);
  font-size: var(--type-caption);
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
.creator-story-pack {
  margin-top: var(--space-md);
  padding-top: var(--space-sm);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.creator-story-subgrid {
  display: grid;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}
.creator-story-pre {
  display: block;
  margin-top: 6px;
  white-space: pre-wrap;
  word-break: break-word;
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
  error?: unknown;
}

interface StoryPackApiResponse {
  storyPack?: unknown;
  title?: unknown;
  logline?: unknown;
  playerRole?: unknown;
  player_role?: unknown;
  openingLine?: unknown;
  opening_line?: unknown;
  phaseOutline?: unknown;
  phase_outline?: unknown;
  soundPlan?: unknown;
  sound_plan?: unknown;
  systemPromptDraft?: unknown;
  system_prompt_draft?: unknown;
  error?: unknown;
}

type PipelineState = "idle" | "running" | "success" | "error";

interface PipelineStepStatus {
  state: PipelineState;
  detail: string;
  updatedAt: number | null;
  runCount: number;
  lastRequestId: string;
}

interface CreatorDebugEvent {
  id: number;
  timestamp: number;
  event: string;
  details: Record<string, unknown>;
}

type StoryPackTextField = "title" | "logline" | "playerRole" | "openingLine" | "systemPromptDraft";

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

function createInitialStepStatus(detail: string): PipelineStepStatus {
  return {
    state: "idle",
    detail,
    updatedAt: null,
    runCount: 0,
    lastRequestId: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(input: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function normalizePhaseEntry(item: unknown, index: number): CreatorStoryPackPhase | null {
  if (typeof item === "string") {
    const goal = item.trim();
    if (!goal) return null;
    return { phase: `Phase ${index + 1}`, goal, tone: "" };
  }

  if (!isRecord(item)) return null;
  const phase = readStringField(item, ["phase", "label"]);
  const goal = readStringField(item, ["goal", "beat", "summary", "description"]);
  const tone = readStringField(item, ["tone", "mood"]);
  if (!phase && !goal && !tone) return null;
  return { phase: phase || `Phase ${index + 1}`, goal, tone };
}

function normalizePhaseOutline(value: unknown): CreatorStoryPackPhase[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => normalizePhaseEntry(item, index))
    .filter((phase): phase is CreatorStoryPackPhase => phase !== null);
}

function normalizeSoundEntry(item: unknown, index: number): CreatorStoryPackSoundCue | null {
  if (typeof item === "string") {
    const moment = item.trim();
    if (!moment) return null;
    return { id: `cue-${index + 1}`, moment, reason: "" };
  }

  if (!isRecord(item)) return null;
  const id = readStringField(item, ["id"]) || `cue-${index + 1}`;
  const moment = readStringField(item, ["moment", "at"]);
  const reason = readStringField(item, ["reason", "purpose"]);
  if (!moment && !reason) return null;
  return { id, moment, reason };
}

function normalizeSoundPlan(value: unknown): CreatorStoryPackSoundCue[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => normalizeSoundEntry(item, index))
    .filter((cue): cue is CreatorStoryPackSoundCue => cue !== null);
}

export function normalizeStoryPackPayload(payload: unknown): CreatorStoryPack | null {
  if (!isRecord(payload)) return null;
  const storyPack = isRecord(payload.storyPack) ? payload.storyPack : payload;

  const normalized: CreatorStoryPack = {
    title: readStringField(storyPack, ["title"]),
    logline: readStringField(storyPack, ["logline"]),
    playerRole: readStringField(storyPack, ["playerRole", "player_role"]),
    openingLine: readStringField(storyPack, ["openingLine", "opening_line"]),
    phaseOutline: normalizePhaseOutline(storyPack.phaseOutline ?? storyPack.phase_outline),
    soundPlan: normalizeSoundPlan(storyPack.soundPlan ?? storyPack.sound_plan),
    systemPromptDraft: readStringField(storyPack, ["systemPromptDraft", "system_prompt_draft"]),
  };

  const hasAnyValue =
    normalized.title ||
    normalized.logline ||
    normalized.playerRole ||
    normalized.openingLine ||
    normalized.phaseOutline.length > 0 ||
    normalized.soundPlan.length > 0 ||
    normalized.systemPromptDraft;

  return hasAnyValue ? normalized : null;
}

function formatStatusTime(timestamp: number | null): string {
  if (!timestamp) return "Not run yet";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<CreatorChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [spec, setSpec] = useState<CreatorSpec>(EMPTY_CREATOR_SPEC);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [storyDraft, setStoryDraft] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isGeneratingStoryPack, setIsGeneratingStoryPack] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageState | null>(null);
  const [storyPack, setStoryPack] = useState<CreatorStoryPack | null>(null);
  const [interviewStatus, setInterviewStatus] = useState<PipelineStepStatus>(() =>
    createInitialStepStatus("Waiting for your interview response."),
  );
  const [imageStatus, setImageStatus] = useState<PipelineStepStatus>(() =>
    createInitialStepStatus("Image generation has not started."),
  );
  const [storyPackStatus, setStoryPackStatus] = useState<PipelineStepStatus>(() =>
    createInitialStepStatus("Story Pack generation has not started."),
  );
  const [playerProfile, setPlayerProfile] = useState<PlayerProfileV1 | null>(null);
  const [useApprovedProfile, setUseApprovedProfile] = useState<boolean>(true);
  const [debugEvents, setDebugEvents] = useState<CreatorDebugEvent[]>([]);
  const countersRef = useRef({
    interview: 0,
    image: 0,
    storyPack: 0,
    event: 0,
  });

  useEffect(() => {
    setSessionId(createSessionId());
  }, []);

  useEffect(() => {
    setPlayerProfile(loadPlayerProfile());
  }, []);

  const ensureSessionId = useCallback((): string => {
    if (sessionId) return sessionId;
    const generated = createSessionId();
    setSessionId(generated);
    return generated;
  }, [sessionId]);

  const effectiveImagePrompt = useMemo(() => {
    return imagePrompt || spec.imagePrompt || "";
  }, [imagePrompt, spec.imagePrompt]);

  const logClientEvent = useCallback(
    (event: string, details: Record<string, unknown> = {}) => {
      const eventId = ++countersRef.current.event;
      const payload = { event, sessionId: sessionId || "pending-session", ...details };

      console.info(JSON.stringify(payload));
      setDebugEvents((prev) => [{ id: eventId, timestamp: Date.now(), event, details }, ...prev].slice(0, 40));
    },
    [sessionId],
  );

  const handleClearOutputs = useCallback(() => {
    setGeneratedImage(null);
    setStoryPack(null);
    setError("");

    setImageStatus((prev) => ({
      ...prev,
      state: "idle",
      detail: "Image output cleared. Edit prompt and rerun.",
      updatedAt: Date.now(),
    }));
    setStoryPackStatus((prev) => ({
      ...prev,
      state: "idle",
      detail: "Story Pack output cleared. Edit draft and rerun.",
      updatedAt: Date.now(),
    }));

    logClientEvent("creator.ui.outputs.cleared");
  }, [logClientEvent]);

  const handleInterviewSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || isSending) return;

    const activeSessionId = ensureSessionId();
    const requestId = `int-${++countersRef.current.interview}`;
    const updatedMessages = [...messages, { role: "user", content: message } satisfies CreatorChatMessage];
    setMessages(updatedMessages);
    setInput("");
    setError("");
    setIsSending(true);
    setInterviewStatus((prev) => ({
      ...prev,
      state: "running",
      detail: "Streaming interview response...",
      updatedAt: Date.now(),
      runCount: prev.runCount + 1,
      lastRequestId: requestId,
    }));
    logClientEvent("creator.ui.interview.submit", { requestId, messageLength: message.length });

    try {
      const response = await fetch("/api/creator/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
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

      let streamError = "";
      let assistantChunkCount = 0;
      await consumeSse(response.body, (chunk) => {
        if (chunk.type === "message") {
          assistantChunkCount += 1;
          setMessages((prev) => [...prev, { role: "assistant", content: chunk.message }]);
          logClientEvent("creator.ui.interview.chunk_message", {
            requestId,
            messageLength: chunk.message.length,
          });
          return;
        }

        if (chunk.type === "spec_update") {
          setSpec((prev) => ({ ...prev, ...chunk.specUpdate }));
          if (typeof chunk.specUpdate.imagePrompt === "string") {
            setImagePrompt(chunk.specUpdate.imagePrompt);
          }
          logClientEvent("creator.ui.interview.chunk_spec_update", {
            requestId,
            fields: Object.keys(chunk.specUpdate),
          });
          return;
        }

        if (chunk.type === "image_prompt") {
          setImagePrompt(chunk.prompt);
          logClientEvent("creator.ui.interview.chunk_image_prompt", {
            requestId,
            promptLength: chunk.prompt.length,
          });
          return;
        }

        if (chunk.type === "error") {
          streamError = chunk.error;
          setError(chunk.error);
          logClientEvent("creator.ui.interview.chunk_error", { requestId });
          return;
        }

        if (chunk.type === "complete") {
          logClientEvent("creator.ui.interview.chunk_complete", { requestId });
        }
      });

      if (streamError) {
        setInterviewStatus((prev) => ({
          ...prev,
          state: "error",
          detail: streamError,
          updatedAt: Date.now(),
        }));
        return;
      }

      setInterviewStatus((prev) => ({
        ...prev,
        state: "success",
        detail: `Interview complete (${assistantChunkCount} assistant updates).`,
        updatedAt: Date.now(),
      }));
    } catch (requestError) {
      const messageFromError =
        requestError instanceof Error ? requestError.message : "Interview request failed unexpectedly";
      setError(messageFromError);
      setInterviewStatus((prev) => ({
        ...prev,
        state: "error",
        detail: messageFromError,
        updatedAt: Date.now(),
      }));
      logClientEvent("creator.ui.interview.failed", { requestId, message: messageFromError });
    } finally {
      setIsSending(false);
    }
  }, [ensureSessionId, input, isSending, logClientEvent, messages, spec]);

  const handleGenerateImage = useCallback(async () => {
    if (isGeneratingImage) return;

    const prompt = effectiveImagePrompt.trim();
    if (!prompt) {
      const message = "No image prompt yet. Continue the interview or edit prompt to generate one.";
      setError(message);
      setImageStatus((prev) => ({
        ...prev,
        state: "error",
        detail: message,
        updatedAt: Date.now(),
      }));
      return;
    }

    const activeSessionId = ensureSessionId();
    const requestId = `img-${++countersRef.current.image}`;
    setError("");
    setIsGeneratingImage(true);
    setImageStatus((prev) => ({
      ...prev,
      state: "running",
      detail: "Generating image from current prompt...",
      updatedAt: Date.now(),
      runCount: prev.runCount + 1,
      lastRequestId: requestId,
    }));
    logClientEvent("creator.ui.image.submit", { requestId, promptLength: prompt.length });

    try {
      const response = await fetch("/api/creator/image", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": activeSessionId },
        body: JSON.stringify({
          sessionId: activeSessionId,
          prompt,
          spec,
        }),
      });

      const parsed = (await response.json()) as ImageApiResponse;
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
      setImageStatus((prev) => ({
        ...prev,
        state: "success",
        detail: `Image ready (${parsed.mimeType}). Edit prompt and rerun any time.`,
        updatedAt: Date.now(),
      }));
      logClientEvent("creator.ui.image.success", { requestId, mimeType: parsed.mimeType });
    } catch (requestError) {
      const messageFromError =
        requestError instanceof Error ? requestError.message : "Image generation failed unexpectedly";
      setError(messageFromError);
      setImageStatus((prev) => ({
        ...prev,
        state: "error",
        detail: messageFromError,
        updatedAt: Date.now(),
      }));
      logClientEvent("creator.ui.image.failed", { requestId, message: messageFromError });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [effectiveImagePrompt, ensureSessionId, isGeneratingImage, logClientEvent, spec]);

  const handleGenerateStoryPack = useCallback(async () => {
    if (isGeneratingStoryPack) return;

    const activeSessionId = ensureSessionId();
    const requestId = `sp-${++countersRef.current.storyPack}`;
    const draftText = storyDraft.trim();

    setError("");
    setIsGeneratingStoryPack(true);
    setStoryPackStatus((prev) => ({
      ...prev,
      state: "running",
      detail: "Generating Story Pack from current context...",
      updatedAt: Date.now(),
      runCount: prev.runCount + 1,
      lastRequestId: requestId,
    }));
    logClientEvent("creator.ui.story_pack.submit", {
      requestId,
      hasDraftText: draftText.length > 0,
      draftLength: draftText.length,
      usingProfile: Boolean(
        useApprovedProfile &&
        playerProfile?.review.userConfirmed &&
        playerProfile.consent.personalizedGamesApproved,
      ),
    });

    const approvedProfileContext =
      useApprovedProfile &&
      playerProfile?.review.userConfirmed &&
      playerProfile.consent.personalizedGamesApproved
        ? buildGameProfileContext(playerProfile)
        : undefined;

    try {
      const response = await fetch("/api/creator/story-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": activeSessionId },
        body: JSON.stringify({
          sessionId: activeSessionId,
          draftText: draftText || undefined,
          spec,
          playerProfileContext: approvedProfileContext,
        }),
      });

      const parsed = (await response.json()) as StoryPackApiResponse;
      if (!response.ok) {
        const messageFromServer =
          typeof parsed.error === "string" ? parsed.error : `Story Pack generation failed (${response.status})`;
        throw new Error(messageFromServer);
      }

      const normalized = normalizeStoryPackPayload(parsed);
      if (!normalized) {
        throw new Error("Invalid story pack response");
      }

      setStoryPack(normalized);
      setStoryPackStatus((prev) => ({
        ...prev,
        state: "success",
        detail: `Story Pack ready (${normalized.phaseOutline.length} phases, ${normalized.soundPlan.length} sound cues).`,
        updatedAt: Date.now(),
      }));
      logClientEvent("creator.ui.story_pack.success", {
        requestId,
        phaseCount: normalized.phaseOutline.length,
        cueCount: normalized.soundPlan.length,
      });
    } catch (requestError) {
      const messageFromError =
        requestError instanceof Error ? requestError.message : "Story Pack generation failed unexpectedly";
      setError(messageFromError);
      setStoryPackStatus((prev) => ({
        ...prev,
        state: "error",
        detail: messageFromError,
        updatedAt: Date.now(),
      }));
      logClientEvent("creator.ui.story_pack.failed", {
        requestId,
        message: messageFromError,
      });
    } finally {
      setIsGeneratingStoryPack(false);
    }
  }, [ensureSessionId, isGeneratingStoryPack, logClientEvent, playerProfile, spec, storyDraft, useApprovedProfile]);

  const handleStoryPackFieldChange = useCallback((field: StoryPackTextField, value: string) => {
    setStoryPack((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const handleStoryPackPhaseChange = useCallback((index: number, field: keyof CreatorStoryPackPhase, value: string) => {
    setStoryPack((prev) => {
      if (!prev) return prev;
      const phaseOutline = prev.phaseOutline.map((phase, phaseIndex) =>
        phaseIndex === index ? { ...phase, [field]: value } : phase,
      );
      return { ...prev, phaseOutline };
    });
  }, []);

  const handleStoryPackSoundCueChange = useCallback(
    (index: number, field: keyof CreatorStoryPackSoundCue, value: string) => {
      setStoryPack((prev) => {
        if (!prev) return prev;
        const soundPlan = prev.soundPlan.map((cue, cueIndex) => (cueIndex === index ? { ...cue, [field]: value } : cue));
        return { ...prev, soundPlan };
      });
    },
    [],
  );

  const handleUseSystemPromptAsDraft = useCallback(() => {
    if (!storyPack) return;
    setStoryDraft(storyPack.systemPromptDraft);
    logClientEvent("creator.ui.story_pack.seed_draft_from_system_prompt", {
      length: storyPack.systemPromptDraft.length,
    });
  }, [logClientEvent, storyPack]);

  const handlePublishAndPlay = useCallback(() => {
    if (!storyPack) return;

    try {
      const coverImage = generatedImage
        ? `data:${generatedImage.mimeType};base64,${generatedImage.base64}`
        : undefined;
      const manifest = createPublishedStoryManifest(storyPack, { coverImage });
      savePublishedStory(manifest);
      logClientEvent("creator.ui.story_pack.published", {
        storyId: manifest.id,
        title: manifest.title,
        hasCoverImage: Boolean(coverImage),
      });
      window.location.assign(`/play?published=${encodeURIComponent(manifest.id)}`);
    } catch (publishError) {
      const messageFromError =
        publishError instanceof Error ? publishError.message : "Could not publish this story pack";
      setError(messageFromError);
      logClientEvent("creator.ui.story_pack.publish_failed", {
        message: messageFromError,
      });
    }
  }, [logClientEvent, storyPack]);

  const stepStatusRows = useMemo(
    () => [
      { label: "Interview", value: interviewStatus },
      { label: "Image", value: imageStatus },
      { label: "Story Pack", value: storyPackStatus },
    ],
    [imageStatus, interviewStatus, storyPackStatus],
  );

  return (
    <main className="creator-shell">
      <style dangerouslySetInnerHTML={{ __html: CREATOR_PAGE_CSS }} />

      <h1 className="creator-title">Creator Interview</h1>
      <p className="creator-subtitle">
        Run a guided creative interview, iteratively refine prompts and story output, and rerun generation with clear
        status plus debug context.
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
            <label className="creator-muted" htmlFor="creator-story-draft">
              Story draft (optional)
            </label>
            <textarea
              id="creator-story-draft"
              className="creator-input"
              value={storyDraft}
              onChange={(event) => setStoryDraft(event.target.value)}
              placeholder="Paste narrative direction, scene concepts, or constraints to steer Story Pack generation..."
              disabled={isGeneratingStoryPack}
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
              <button
                type="button"
                className="creator-btn"
                onClick={() => {
                  void handleGenerateStoryPack();
                }}
                disabled={isGeneratingStoryPack}
              >
                {isGeneratingStoryPack ? "Generating..." : "Generate Story Pack"}
              </button>
            </div>

            <section aria-label="Creator pipeline status">
              <h3 className="creator-panel-title">Pipeline Status</h3>
              <div className="creator-status-grid">
                {stepStatusRows.map((step) => (
                  <div key={step.label} className="creator-spec-item">
                    <span className="creator-spec-label">{step.label}</span>
                    <span className={`creator-status-badge ${step.value.state}`}>{step.value.state}</span>
                    <span className="creator-spec-value">{step.value.detail}</span>
                    <p className="creator-muted">
                      Runs: {step.value.runCount}
                      {step.value.lastRequestId ? ` · ${step.value.lastRequestId}` : ""}
                    </p>
                    <p className="creator-muted">Updated: {formatStatusTime(step.value.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="creator-actions">
              <button
                type="button"
                className="creator-btn"
                onClick={handleClearOutputs}
                disabled={!generatedImage && !storyPack && !error}
              >
                Reset Generated Outputs
              </button>
              <button
                type="button"
                className="creator-btn"
                onClick={() => setDebugEvents([])}
                disabled={debugEvents.length === 0}
              >
                Clear Debug Log
              </button>
            </div>

            <p className="creator-muted">Session ID: {sessionId || "Initializing..."}</p>
            {error ? (
              <p className="creator-error" role="alert">
                {error}
              </p>
            ) : null}

            <section aria-label="Creator debug events">
              <h3 className="creator-panel-title">Debug Log</h3>
              <div className="creator-debug-log">
                {debugEvents.length === 0 ? (
                  <p className="creator-muted">No client events yet.</p>
                ) : (
                  debugEvents.map((event) => (
                    <article key={event.id} className="creator-debug-item">
                      <p className="creator-muted">
                        {formatStatusTime(event.timestamp)} · {event.event}
                      </p>
                      <pre className="creator-debug-json">{JSON.stringify(event.details, null, 2)}</pre>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="creator-panel" aria-label="Creative spec">
          <PlayerProfileBuilder
            key={playerProfile?.id ?? "new-player-profile"}
            initialProfile={playerProfile}
            onProfileSave={(profile) => {
              setPlayerProfile(profile);
              setUseApprovedProfile(true);
              logClientEvent("creator.ui.profile.saved", {
                candidateSelves: profile.castSeed.candidateSelves.map((self) => self.name),
              });
            }}
            onProfileClear={() => {
              setPlayerProfile(null);
              setUseApprovedProfile(false);
              logClientEvent("creator.ui.profile.cleared");
            }}
          />

          <div className="creator-spec-item" style={{ marginTop: "var(--space-md)" }}>
            <label className="creator-muted" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={useApprovedProfile}
                onChange={(event) => setUseApprovedProfile(event.target.checked)}
                disabled={!playerProfile?.review.userConfirmed}
              />
              Use approved player profile when generating Story Pack
            </label>
            <p className="creator-muted" style={{ marginTop: "0.5rem" }}>
              {playerProfile?.review.userConfirmed
                ? `Profile ready with selves: ${playerProfile.castSeed.candidateSelves.map((self) => self.name).join(", ")}`
                : "No approved profile yet. Story generation will use only the creator interview until you save one."}
            </p>
          </div>

          <h2 className="creator-panel-title" style={{ marginTop: "var(--space-md)" }}>Live Spec</h2>
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
              <label className="creator-spec-label" htmlFor="creator-image-prompt">
                Image Prompt (editable)
              </label>
              <textarea
                id="creator-image-prompt"
                className="creator-input creator-input-compact"
                value={effectiveImagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="Refine image prompt, then rerun image generation..."
                disabled={isGeneratingImage}
              />
              <p className="creator-muted">Edit prompt text to iterate without rerunning the interview.</p>
            </div>
          </div>

          <div className="creator-image-wrap">
            {generatedImage ? (
              <Image
                src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                alt="Generated creator concept"
                className="creator-image"
                width={1200}
                height={675}
                unoptimized
              />
            ) : (
              <p className="creator-muted">No image generated yet.</p>
            )}
          </div>

          <section className="creator-story-pack" aria-label="Generated story pack" aria-live="polite">
            <h3 className="creator-panel-title">Story Pack</h3>
            {storyPack ? (
              <div className="creator-spec-grid">
                <div className="creator-spec-item">
                  <label className="creator-spec-label" htmlFor="story-pack-title">
                    Title
                  </label>
                  <input
                    id="story-pack-title"
                    className="creator-text-input"
                    value={storyPack.title}
                    onChange={(event) => handleStoryPackFieldChange("title", event.target.value)}
                  />
                </div>
                <div className="creator-spec-item">
                  <label className="creator-spec-label" htmlFor="story-pack-logline">
                    Logline
                  </label>
                  <textarea
                    id="story-pack-logline"
                    className="creator-input creator-input-compact"
                    value={storyPack.logline}
                    onChange={(event) => handleStoryPackFieldChange("logline", event.target.value)}
                  />
                </div>
                <div className="creator-spec-item">
                  <label className="creator-spec-label" htmlFor="story-pack-opening-line">
                    Opening Line
                  </label>
                  <textarea
                    id="story-pack-opening-line"
                    className="creator-input creator-input-compact"
                    value={storyPack.openingLine}
                    onChange={(event) => handleStoryPackFieldChange("openingLine", event.target.value)}
                  />
                </div>
                <div className="creator-spec-item">
                  <label className="creator-spec-label" htmlFor="story-pack-player-role">
                    Player Role
                  </label>
                  <textarea
                    id="story-pack-player-role"
                    className="creator-input creator-input-compact"
                    value={storyPack.playerRole}
                    onChange={(event) => handleStoryPackFieldChange("playerRole", event.target.value)}
                  />
                </div>
                <div className="creator-spec-item">
                  <span className="creator-spec-label">Phase Outline</span>
                  <div className="creator-story-subgrid">
                    {storyPack.phaseOutline.map((phase, index) => (
                      <div key={`${phase.phase}-${index}`} className="creator-spec-item">
                        <label className="creator-spec-label" htmlFor={`story-phase-label-${index}`}>
                          Phase {index + 1} Label
                        </label>
                        <input
                          id={`story-phase-label-${index}`}
                          className="creator-text-input"
                          value={phase.phase}
                          onChange={(event) => handleStoryPackPhaseChange(index, "phase", event.target.value)}
                        />
                        <label className="creator-spec-label" htmlFor={`story-phase-goal-${index}`}>
                          Goal
                        </label>
                        <textarea
                          id={`story-phase-goal-${index}`}
                          className="creator-input creator-input-compact"
                          value={phase.goal}
                          onChange={(event) => handleStoryPackPhaseChange(index, "goal", event.target.value)}
                        />
                        <label className="creator-spec-label" htmlFor={`story-phase-tone-${index}`}>
                          Tone
                        </label>
                        <textarea
                          id={`story-phase-tone-${index}`}
                          className="creator-input creator-input-compact"
                          value={phase.tone}
                          onChange={(event) => handleStoryPackPhaseChange(index, "tone", event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="creator-spec-item">
                  <span className="creator-spec-label">Sound Plan</span>
                  <div className="creator-story-subgrid">
                    {storyPack.soundPlan.map((cue, index) => (
                      <div key={`${cue.id}-${index}`} className="creator-spec-item">
                        <label className="creator-spec-label" htmlFor={`story-cue-id-${index}`}>
                          Cue ID
                        </label>
                        <input
                          id={`story-cue-id-${index}`}
                          className="creator-text-input"
                          value={cue.id}
                          onChange={(event) => handleStoryPackSoundCueChange(index, "id", event.target.value)}
                        />
                        <label className="creator-spec-label" htmlFor={`story-cue-moment-${index}`}>
                          Moment
                        </label>
                        <textarea
                          id={`story-cue-moment-${index}`}
                          className="creator-input creator-input-compact"
                          value={cue.moment}
                          onChange={(event) => handleStoryPackSoundCueChange(index, "moment", event.target.value)}
                        />
                        <label className="creator-spec-label" htmlFor={`story-cue-reason-${index}`}>
                          Reason
                        </label>
                        <textarea
                          id={`story-cue-reason-${index}`}
                          className="creator-input creator-input-compact"
                          value={cue.reason}
                          onChange={(event) => handleStoryPackSoundCueChange(index, "reason", event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="creator-spec-item">
                  <label className="creator-spec-label" htmlFor="story-pack-system-prompt">
                    System Prompt Draft
                  </label>
                  <textarea
                    id="story-pack-system-prompt"
                    className="creator-input"
                    value={storyPack.systemPromptDraft}
                    onChange={(event) => handleStoryPackFieldChange("systemPromptDraft", event.target.value)}
                  />
                  <span className="creator-spec-value creator-story-pre">
                    Editable output lets you refine prompt quality before the next run.
                  </span>
                </div>
              </div>
            ) : (
              <p className="creator-muted">No story pack generated yet.</p>
            )}
            <div className="creator-actions">
              <button
                type="button"
                className="creator-btn"
                onClick={() => {
                  void handleGenerateStoryPack();
                }}
                disabled={isGeneratingStoryPack}
              >
                {isGeneratingStoryPack ? "Generating..." : "Rerun Story Pack"}
              </button>
              <button
                type="button"
                className="creator-btn"
                onClick={handleUseSystemPromptAsDraft}
                disabled={!storyPack}
              >
                Use System Prompt as Draft
              </button>
              <button
                type="button"
                className="creator-btn"
                onClick={handlePublishAndPlay}
                disabled={!storyPack}
              >
                Publish &amp; Play
              </button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
