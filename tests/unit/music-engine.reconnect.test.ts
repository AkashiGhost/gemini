import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.fn();

vi.mock("@google/genai", () => {
  class GoogleGenAI {
    live = {
      connect: connectMock,
    };
  }

  return {
    GoogleGenAI,
    Modality: {
      AUDIO: "AUDIO",
    },
  };
});

import { MusicEngine } from "@/lib/music-engine";

function createAudioHarness() {
  const gainNode = {
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
  } as unknown as GainNode;

  const audioContext = {
    currentTime: 0,
    createBufferSource: vi.fn(),
    decodeAudioData: vi.fn(),
    createBuffer: vi.fn(),
  } as unknown as AudioContext;

  return { gainNode, audioContext };
}

describe("MusicEngine reconnect behavior", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
    connectMock.mockReset();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "ephemeral-token" }),
    } as unknown as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it("stops requesting new tokens after reconnect attempts are exhausted", async () => {
    const maxForcedCloses = 4;
    let forcedCloseCount = 0;

    connectMock.mockImplementation(async ({ callbacks }: { callbacks: { onclose?: (event: CloseEvent) => void } }) => {
      if (callbacks.onclose && forcedCloseCount < maxForcedCloses) {
        forcedCloseCount += 1;
        setTimeout(() => {
          callbacks.onclose?.({
            code: 1011,
            reason: "upstream closed immediately",
            wasClean: false,
          } as CloseEvent);
        }, 0);
      }

      return {
        close: vi.fn(),
        sendClientContent: vi.fn(),
      };
    });

    const { audioContext, gainNode } = createAudioHarness();
    const musicEngine = new MusicEngine({
      audioContext,
      gainNode,
      config: {
        reconnectAttempts: 1,
        transitionSeconds: 0,
      },
    });

    await musicEngine.connect();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();

    // reconnectAttempts=1 should allow one reconnect after the initial connect.
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    musicEngine.destroy();
  });
});
