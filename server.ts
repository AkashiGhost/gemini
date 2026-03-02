// ─────────────────────────────────────────────
// server.ts — Cloud Run entry point
// Custom server: WebSocket upgrade + Next.js page serving
// ─────────────────────────────────────────────

// Load .env in development (Node.js 20.6+ built-in, no package needed)
import { existsSync } from "fs";
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import path from "path";

import { loadStory, isLoadError } from "./src/lib/story-loader";
import { GameOrchestrator } from "./src/lib/game-orchestrator";
import { MockStoryEngine, MockIntentParser } from "./src/lib/llm/mock-adapter";
import { GeminiStoryEngine, GeminiIntentParser } from "./src/lib/llm/gemini-adapter";
import type {
  ClientMessage,
  ServerMessage,
  InitPayload,
  ChoiceSelectedPayload,
} from "./src/lib/types/llm";
import type { StoryEngine, IntentParser } from "./src/lib/types/llm";
import type { GameConfig } from "./src/lib/types/game-config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ELARA_VOICE = process.env.ELARA_VOICE || "Aoede";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// ─────────────────────────────────────────────
// Load story config once at startup
// ─────────────────────────────────────────────

const storiesBase = process.env.STORIES_BASE_PATH || path.resolve(process.cwd(), "stories");
const schemasBase = process.env.SCHEMAS_BASE_PATH || path.resolve(process.cwd(), "schemas");

let gameConfig: GameConfig | null = null;

function loadGameConfig(): GameConfig {
  const storyDir = path.join(storiesBase, "the-last-session");
  const result = loadStory(storyDir, schemasBase);

  if (isLoadError(result)) {
    console.error("Failed to load story config:", result.errors);
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn("Story warnings:", result.warnings);
  }

  console.log(`Story loaded: ${result.config.meta.title}`);
  console.log(
    `  ${result.config.arc.phases.length} phases, ` +
      `${result.config.arc.phases.reduce((s, p) => s + p.beats.length, 0)} beats`,
  );

  return result.config;
}

// ─────────────────────────────────────────────
// Start Next.js + WebSocket server
// ─────────────────────────────────────────────

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  gameConfig = loadGameConfig();

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
      return;
    }
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server — handles /ws path on upgrade
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "/", true);

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Track active sessions
  const sessions = new Map<string, GameOrchestrator>();

  wss.on("connection", (ws: WebSocket) => {
    let orchestrator: GameOrchestrator | null = null;
    let sessionId: string | null = null;

    const send = (message: ServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    ws.on("message", async (data: Buffer) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        send({ type: "ERROR", payload: { message: "Invalid JSON" } });
        return;
      }

      switch (msg.type) {
        case "INIT": {
          if (orchestrator) {
            send({
              type: "ERROR",
              payload: { message: "Session already initialized" },
            });
            return;
          }

          if (!gameConfig) {
            send({
              type: "ERROR",
              payload: { message: "Game config not loaded" },
            });
            return;
          }

          const initPayload = msg.payload as InitPayload | undefined;
          sessionId = uuidv4();

          // Create engine based on provider
          const provider = initPayload?.provider ?? (GEMINI_API_KEY ? "gemini" : "mock");
          let storyEngine: StoryEngine;
          let intentParser: IntentParser;

          if (provider === "gemini" && GEMINI_API_KEY) {
            storyEngine = new GeminiStoryEngine(GEMINI_API_KEY, ELARA_VOICE);
            intentParser = new GeminiIntentParser(GEMINI_API_KEY);
            console.log(`[Session ${sessionId}] Using Gemini adapter`);
          } else {
            storyEngine = new MockStoryEngine();
            intentParser = new MockIntentParser();
            console.log(`[Session ${sessionId}] Using Mock adapter`);
          }

          orchestrator = new GameOrchestrator(
            gameConfig,
            storyEngine,
            intentParser,
            send,
            sessionId,
          );
          sessions.set(sessionId, orchestrator);

          try {
            await orchestrator.start();
          } catch (err) {
            send({
              type: "ERROR",
              payload: {
                message: `Failed to start session: ${(err as Error).message}`,
              },
            });
          }
          break;
        }

        case "AUDIO_CHUNK": {
          if (!orchestrator) {
            send({
              type: "ERROR",
              payload: { message: "No active session" },
            });
            return;
          }

          const audioPayload = msg.payload as { text?: string; audio?: string };

          if (audioPayload?.audio) {
            // Real audio — forward to Gemini Live API
            await orchestrator.handlePlayerAudio(audioPayload.audio);
          } else if (audioPayload?.text) {
            // Text fallback (for testing without mic)
            await orchestrator.handlePlayerInput(audioPayload.text);
          }
          break;
        }

        case "CHOICE_SELECTED": {
          if (!orchestrator) {
            send({
              type: "ERROR",
              payload: { message: "No active session" },
            });
            return;
          }

          const choicePayload = msg.payload as ChoiceSelectedPayload;
          if (choicePayload?.beatId && choicePayload?.optionId) {
            await orchestrator.handleChoiceSelected(
              choicePayload.beatId,
              choicePayload.optionId,
            );
          }
          break;
        }

        case "PING": {
          send({ type: "PONG" });
          break;
        }

        default: {
          send({
            type: "ERROR",
            payload: { message: `Unknown message type: ${msg.type}` },
          });
        }
      }
    });

    ws.on("close", async () => {
      if (orchestrator) {
        await orchestrator.destroy();
      }
      if (sessionId) {
        sessions.delete(sessionId);
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  });

  server.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log(`> WebSocket endpoint: ws://${hostname}:${port}/ws`);
  });
});
