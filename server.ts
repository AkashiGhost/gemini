// ─────────────────────────────────────────────
// server.ts — Cloud Run entry point
// Custom server: WebSocket upgrade + Next.js page serving
// ─────────────────────────────────────────────

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import path from "path";

import { loadStory, isLoadError } from "./src/lib/story-loader";
import { GameOrchestrator } from "./src/lib/game-orchestrator";
import { MockStoryEngine, MockIntentParser } from "./src/lib/llm/mock-adapter";
import type {
  ClientMessage,
  ServerMessage,
  InitPayload,
  ChoiceSelectedPayload,
} from "./src/lib/types/llm";
import type { GameConfig } from "./src/lib/types/game-config";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// ─────────────────────────────────────────────
// Load story config once at startup
// ─────────────────────────────────────────────

const storiesBase = process.env.STORIES_BASE_PATH || path.resolve(__dirname, "../stories");
const schemasBase = process.env.SCHEMAS_BASE_PATH || path.resolve(__dirname, "../schemas");

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

          // Create engine based on provider (only mock for now)
          const storyEngine = new MockStoryEngine();
          const intentParser = new MockIntentParser();

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
          // For text-based testing, payload may contain a 'text' field
          if (!orchestrator) {
            send({
              type: "ERROR",
              payload: { message: "No active session" },
            });
            return;
          }

          const audioPayload = msg.payload as { text?: string; audio?: string };
          const text = audioPayload?.text ?? "";

          if (text) {
            await orchestrator.handlePlayerInput(text);
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
