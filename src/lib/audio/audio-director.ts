import type {
  AuthoredSoundManifest,
  SoundDirectorAction,
  SoundDirectorEvent,
} from "@/lib/audio/sound-manifests";

export interface AudioDirectorEngine {
  triggerCue(soundId: string, volume?: number): void;
  handleToolCall(soundId: string, volume?: number, loop?: boolean, fadeInSeconds?: number): void;
  fadeAllToNothing(fadeDurationSeconds?: number): void;
}

export interface AudioDirectorOptions {
  engine: AudioDirectorEngine;
  manifest: AuthoredSoundManifest;
  schedule?: (run: () => void, delayMs: number) => unknown;
  cancel?: (handle: unknown) => void;
}

function applyAction(engine: AudioDirectorEngine, action: SoundDirectorAction): void {
  if (action.kind === "triggerCue") {
    engine.triggerCue(action.soundId, action.volume);
    return;
  }

  if (action.kind === "handleToolCall") {
    engine.handleToolCall(action.soundId, action.volume, action.loop, action.fadeInSeconds);
    return;
  }

  engine.fadeAllToNothing(action.fadeDurationSeconds);
}

export class AudioDirector {
  private readonly engine: AudioDirectorEngine;
  private readonly manifest: AuthoredSoundManifest;
  private readonly schedule: (run: () => void, delayMs: number) => unknown;
  private readonly cancel: (handle: unknown) => void;
  private readonly dispatchedEvents = new Set<SoundDirectorEvent>();
  private readonly pendingHandles: unknown[] = [];

  constructor(options: AudioDirectorOptions) {
    this.engine = options.engine;
    this.manifest = options.manifest;
    this.schedule = options.schedule ?? ((run, delayMs) => setTimeout(run, delayMs));
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }

  dispatch(event: SoundDirectorEvent): boolean {
    if (this.dispatchedEvents.has(event)) return false;
    const actions = this.manifest.eventActions?.[event];
    if (!actions || actions.length === 0) return false;
    this.dispatchedEvents.add(event);

    for (const action of actions) {
      if (action.delayMs && action.delayMs > 0) {
        const handle = this.schedule(() => applyAction(this.engine, action), action.delayMs);
        this.pendingHandles.push(handle);
        continue;
      }

      applyAction(this.engine, action);
    }

    return true;
  }

  reset(): void {
    for (const handle of this.pendingHandles) {
      this.cancel(handle);
    }
    this.pendingHandles.length = 0;
    this.dispatchedEvents.clear();
  }
}
