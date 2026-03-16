export interface TheCallAudioDirectorEngine {
  triggerCue(soundId: string, volume?: number): void;
  handleToolCall(soundId: string, volume?: number, loop?: boolean, fadeInSeconds?: number): void;
  setVolume(soundId: string, targetVolume: number, fadeDurationSeconds?: number): void;
  stop(soundId: string, fadeDurationSeconds?: number): void;
}

export type TheCallLocation =
  | "starting_room"
  | "corridor"
  | "junction"
  | "left_path"
  | "right_path"
  | "generator_room"
  | "unknown";

export type TheCallInteractionFocus =
  | "none"
  | "movement"
  | "keypad"
  | "panel"
  | "vent"
  | "pipe"
  | "door"
  | "water";

export interface TheCallAudioState {
  location: TheCallLocation;
  waterLevel: 0 | 1 | 2 | 3;
  tensionLevel: 0 | 1 | 2 | 3;
  interactionFocus: TheCallInteractionFocus;
  keypadState: "unknown" | "probing" | "invalid" | "accepted";
}

export interface TheCallAudioAction {
  type: string;
  soundId?: string;
  state: TheCallAudioState;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasMovementIntent(text: string): boolean {
  return hasAny(text, ["left", "right", "stairs", "corridor", "junction", "go ", "move", "walk", "run", "hurry", "head "]);
}

const THE_CALL_MOVEMENT_CUE_VOLUMES = {
  slow: 0.78,
  fast: 0.86,
} as const;

function hasForceDoorIntent(text: string): boolean {
  return hasAny(text, [
    "force the door",
    "slam the door",
    "shut the door",
    "bang the door",
    "kick the door",
    "ram the door",
    "break the door",
    "bash the door",
  ]);
}

function hasDoorManipulationIntent(text: string): boolean {
  return hasAny(text, [
    "try the door",
    "open the door",
    "push the door",
    "crack the door",
    "ease the door",
    "door",
    "open",
    "push",
    "crack",
  ]);
}

function hasPanelIntent(text: string): boolean {
  return hasAny(text, [
    "panel",
    "control panel",
    "override",
    "switch",
    "switches",
    "gauges",
    "console",
  ]);
}

function hasGasReleaseNarration(text: string): boolean {
  return hasAny(text, [
    "can't breathe",
    "cannot breathe",
    "i cant breathe",
    "gas",
    "alarm",
    "smell",
    "choking",
    "air burns",
  ]);
}

function hasDisconnectNarration(text: string): boolean {
  return hasAny(text, [
    "line just went dead",
    "the line went dead",
    "went dead",
    "call dropped",
    "line cut out",
    "can't hear anything",
    "cannot hear anything",
    "dead line",
    "disconnect",
    "disconnected",
    "phone went silent",
  ]);
}

function inferLocation(text: string, previous: TheCallLocation): TheCallLocation {
  if (hasAny(text, ["generator room", "secondary exit"])) return "generator_room";
  if (hasAny(text, ["junction", "split"])) return "junction";
  if (hasAny(text, ["stairs", "right corridor", "lower level"])) return "right_path";
  if (hasAny(text, ["mechanical room", "yellow stripe", "heavy door"])) return "left_path";
  if (hasAny(text, ["corridor", "passage"])) return "corridor";
  if (hasAny(text, ["concrete room", "bolted phone", "vent near the ceiling", "woke up in this room", "found this phone"])) return "starting_room";
  return previous;
}

function inferWaterTarget(text: string, current: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  if (!hasAny(text, ["water", "drip", "leak", "flood", "sloshing", "feet wet"])) return current;
  if (hasAny(text, ["surging", "floodwater", "rising fast", "rising rapidly", "sloshing"])) return 3;
  if (hasAny(text, ["louder now", "getting louder", "rising", "ankle", "feet", "flood"])) return 2;
  return Math.max(current, 1) as 0 | 1 | 2 | 3;
}

function inferTensionTarget(text: string, current: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  if (hasAny(text, ["panic", "panicked", "heart's going", "heart is going", "shaking", "freezing"])) {
    return Math.max(current, 2) as 0 | 1 | 2 | 3;
  }
  if (hasAny(text, ["please don't hang up", "please", "machinery", "danger", "trapped"])) {
    return Math.max(current, 1) as 0 | 1 | 2 | 3;
  }
  return current;
}

function isLoopResetNarration(text: string): boolean {
  return hasAny(text, [
    "hello? is",
    "i just woke up in this room",
    "i found this phone",
    "your number was the only one that connected",
    "i die and i wake up back here",
    "this keeps happening",
  ]);
}

function inferMovementNarrationCue(
  text: string,
  previousLocation: TheCallLocation,
  nextLocation: TheCallLocation,
  interactionFocus: TheCallInteractionFocus,
): "footsteps" | "footsteps_fast" | null {
  const hasMovementLanguage = hasAny(text, [
    "i'm moving",
    "im moving",
    "i'm walking",
    "im walking",
    "i'm heading",
    "im heading",
    "i'm going",
    "im going",
    "down the stairs",
    "into the corridor",
    "through the corridor",
    "toward the door",
    "towards the door",
    "i turn",
    "i'm turning",
    "im turning",
    "i run",
    "i'm running",
    "im running",
    "i hurry",
    "i'm hurrying",
    "im hurrying",
  ]);
  const locationShifted = previousLocation !== nextLocation;
  if (!hasMovementLanguage && !(interactionFocus === "movement" && locationShifted)) {
    return null;
  }

  const fast = hasAny(text, [
    "run",
    "running",
    "sprint",
    "hurry",
    "hurrying",
    "rush",
    "rushing",
    "bolt",
    "bolting",
  ]);
  return fast ? "footsteps_fast" : "footsteps";
}

export class TheCallStateDirector {
  private readonly engine: TheCallAudioDirectorEngine;
  private state: TheCallAudioState = {
    location: "starting_room",
    waterLevel: 0,
    tensionLevel: 0,
    interactionFocus: "none",
    keypadState: "unknown",
  };
  private lastUserTranscriptSeq = -1;
  private lastAiNarrationKey = "";
  private readonly loopedSoundIds = new Set<string>();
  private lastAppliedLocation: TheCallLocation | null = null;

  constructor(engine: TheCallAudioDirectorEngine) {
    this.engine = engine;
  }

  reset(): void {
    this.state = {
      location: "starting_room",
      waterLevel: 0,
      tensionLevel: 0,
      interactionFocus: "none",
      keypadState: "unknown",
    };
    this.lastUserTranscriptSeq = -1;
    this.lastAiNarrationKey = "";
    this.loopedSoundIds.clear();
    this.lastAppliedLocation = null;
  }

  getState(): TheCallAudioState {
    return { ...this.state };
  }

  applyUserInstruction(seq: number, text: string): TheCallAudioAction[] {
    if (seq <= this.lastUserTranscriptSeq) return [];
    this.lastUserTranscriptSeq = seq;

    const normalized = normalizeText(text);
    if (!normalized) return [];

    const actions: TheCallAudioAction[] = [];

    if (hasAny(normalized, ["keypad", "key code", "code", "buttons", "keys"])) {
      this.state.interactionFocus = "keypad";
      this.state.keypadState = "probing";
      this.engine.triggerCue("keypad_beep");
      actions.push(this.snapshotAction("keypad_attempt", "keypad_beep"));
      return actions;
    }

    if (hasPanelIntent(normalized)) {
      this.state.interactionFocus = "panel";
      this.state.keypadState = "probing";
      this.engine.triggerCue("keypad_beep");
      actions.push(this.snapshotAction("panel_attempt", "keypad_beep"));
      return actions;
    }

    if (hasAny(normalized, ["vent", "ceiling grate", "grate near the ceiling"])) {
      this.state.interactionFocus = "vent";
      this.engine.triggerCue("metal_scrape");
      actions.push(this.snapshotAction("vent_attempt", "metal_scrape"));
      return actions;
    }

    if (hasAny(normalized, ["pipe", "valve"])) {
      this.state.interactionFocus = "pipe";
      this.engine.triggerCue("pipe_clank");
      actions.push(this.snapshotAction("pipe_attempt", "pipe_clank"));
      return actions;
    }

    if (hasAny(normalized, ["listen for water", "check the drain", "follow the water", "drain", "water"])) {
      this.state.interactionFocus = "water";
      this.engine.triggerCue("water_drip");
      actions.push(this.snapshotAction("water_probe", "water_drip"));
      return actions;
    }

    if (hasForceDoorIntent(normalized)) {
      this.state.interactionFocus = "door";
      this.engine.triggerCue("door_slam");
      actions.push(this.snapshotAction("door_slam", "door_slam"));
      return actions;
    }

    if (hasMovementIntent(normalized)) {
      this.state.interactionFocus = "movement";
      const isFast = hasAny(normalized, ["run", "hurry", "sprint"]);
      const soundId = isFast ? "footsteps_fast" : "footsteps";
      this.engine.triggerCue(
        soundId,
        isFast ? THE_CALL_MOVEMENT_CUE_VOLUMES.fast : THE_CALL_MOVEMENT_CUE_VOLUMES.slow,
      );
      actions.push(this.snapshotAction(isFast ? "movement_fast" : "movement_slow", soundId));
      return actions;
    }

    if (hasDoorManipulationIntent(normalized)) {
      this.state.interactionFocus = "door";
      this.engine.triggerCue("door_creak");
      actions.push(this.snapshotAction("door_attempt", "door_creak"));
      return actions;
    }

    return actions;
  }

  applyAiNarration(text: string): TheCallAudioAction[] {
    const normalized = normalizeText(text);
    if (!normalized || normalized === this.lastAiNarrationKey) return [];
    this.lastAiNarrationKey = normalized;

    const actions: TheCallAudioAction[] = [];
    if (isLoopResetNarration(normalized)) {
      this.applyLoopReset();
      actions.push(this.snapshotAction("loop_reset"));
    }

    const previousLocation = this.state.location;
    const inferredLocation = inferLocation(normalized, this.state.location);
    if (inferredLocation !== this.state.location || this.lastAppliedLocation === null) {
      this.state.location = inferredLocation;
      actions.push(...this.applyLocationMix());
    } else {
      this.state.location = inferredLocation;
    }

    const movementNarrationSoundId = inferMovementNarrationCue(
      normalized,
      previousLocation,
      inferredLocation,
      this.state.interactionFocus,
    );
    if (movementNarrationSoundId) {
      const isFast = movementNarrationSoundId === "footsteps_fast";
      this.engine.triggerCue(
        movementNarrationSoundId,
        isFast ? THE_CALL_MOVEMENT_CUE_VOLUMES.fast : THE_CALL_MOVEMENT_CUE_VOLUMES.slow,
      );
      actions.push(
        this.snapshotAction(
          isFast ? "movement_followthrough_fast" : "movement_followthrough_slow",
          movementNarrationSoundId,
        ),
      );
    }

    const targetWater = inferWaterTarget(normalized, this.state.waterLevel);
    if (targetWater > this.state.waterLevel) {
      this.state.waterLevel = targetWater;
      actions.push(...this.applyWaterState());
    }

    const targetTension = inferTensionTarget(normalized, this.state.tensionLevel);
    if (targetTension > this.state.tensionLevel) {
      this.state.tensionLevel = targetTension;
      if (targetTension >= 2) {
        actions.push(this.snapshotAction("tension_peak"));
      } else {
        actions.push(this.snapshotAction("tension_rise"));
      }
    }

    if (hasGasReleaseNarration(normalized)) {
      this.state.tensionLevel = Math.max(this.state.tensionLevel, 3) as 0 | 1 | 2 | 3;
      actions.push(this.snapshotAction("gas_release"));
    }

    if (hasDisconnectNarration(normalized)) {
      this.engine.triggerCue("disconnect_tone");
      actions.push(this.snapshotAction("disconnect", "disconnect_tone"));
    }

    if (
      this.state.interactionFocus === "keypad"
      || this.state.interactionFocus === "panel"
      || this.state.keypadState === "probing"
    ) {
      if (hasAny(normalized, ["accepted", "green light", "clicks open", "door clicks open", "unlocked", "panel worked", "alarm disabled"])) {
        this.state.keypadState = "accepted";
        this.engine.triggerCue("keypad_confirm");
        actions.push(this.snapshotAction("keypad_confirm", "keypad_confirm"));
      } else if (hasAny(normalized, ["still dark", "won't open", "doesn't work", "red light", "denied", "still locked", "no response"])) {
        this.state.keypadState = "invalid";
        this.engine.triggerCue("keypad_invalid");
        actions.push(this.snapshotAction("keypad_invalid", "keypad_invalid"));
      }
    }

    return actions;
  }

  private applyWaterState(): TheCallAudioAction[] {
    const actions: TheCallAudioAction[] = [];

    if (this.state.waterLevel === 1) {
      this.ensureLoop("water_leak_loop", 0.12, 2.5);
      this.engine.triggerCue("water_drip");
      actions.push(this.snapshotAction("water_level_1", "water_drip"));
      return actions;
    }

    if (this.state.waterLevel === 2) {
      this.ensureLoop("water_leak_loop", 0.12, 2.5);
      this.engine.setVolume("water_leak_loop", 0.16, 2);
      this.ensureLoop("water_rising_loop", 0.16, 3);
      this.ensureLoop("water_slosh_loop", 0.12, 2.5);
      this.engine.triggerCue("water_drip");
      actions.push(this.snapshotAction("water_level_2", "water_drip"));
      return actions;
    }

    this.ensureLoop("water_leak_loop", 0.12, 2.5);
    this.ensureLoop("water_rising_loop", 0.16, 3);
    this.ensureLoop("water_slosh_loop", 0.12, 2.5);
    this.engine.setVolume("water_leak_loop", 0.2, 1.5);
    this.engine.setVolume("water_rising_loop", 0.24, 1.5);
    this.engine.setVolume("water_slosh_loop", 0.16, 1.5);
    this.engine.triggerCue("water_drip");
    actions.push(this.snapshotAction("water_level_3", "water_drip"));
    return actions;
  }

  private applyLocationMix(): TheCallAudioAction[] {
    this.lastAppliedLocation = this.state.location;

    switch (this.state.location) {
      case "starting_room":
        this.engine.setVolume("call_bed", 0.16, 2);
        this.engine.setVolume("room_ambience", 0.18, 2);
        this.engine.setVolume("electrical_hum", 0.08, 2);
        if (this.loopedSoundIds.has("sub_bass")) this.engine.setVolume("sub_bass", 0.08, 3);
        this.stopLoop("water_slosh_loop", 1);
        return [this.snapshotAction("location_starting_room")];
      case "corridor":
        this.engine.setVolume("call_bed", 0.14, 2);
        this.engine.setVolume("room_ambience", 0.22, 2);
        this.engine.setVolume("electrical_hum", 0.08, 2);
        if (this.loopedSoundIds.has("sub_bass")) this.engine.setVolume("sub_bass", 0.1, 3);
        return [this.snapshotAction("location_corridor")];
      case "junction":
        this.ensureLoop("sub_bass", 0.1, 4);
        this.engine.setVolume("call_bed", 0.12, 2.5);
        this.engine.setVolume("room_ambience", 0.22, 2.5);
        this.engine.setVolume("electrical_hum", 0.09, 2.5);
        this.engine.setVolume("sub_bass", 0.1, 2.5);
        return [this.snapshotAction("location_junction")];
      case "left_path":
        this.ensureLoop("sub_bass", 0.16, 3.5);
        this.ensureLoop("water_slosh_loop", 0.1, 2.5);
        this.engine.setVolume("call_bed", 0.08, 1.5);
        this.engine.setVolume("room_ambience", 0.16, 1.5);
        this.engine.setVolume("electrical_hum", 0.06, 1.5);
        this.engine.setVolume("sub_bass", 0.16, 1.5);
        this.engine.setVolume("water_slosh_loop", Math.max(this.state.waterLevel >= 2 ? 0.14 : 0.1, 0.1), 1.5);
        return [this.snapshotAction("location_left_path")];
      case "right_path":
        this.ensureLoop("sub_bass", 0.12, 3.5);
        this.engine.setVolume("call_bed", 0.1, 2);
        this.engine.setVolume("room_ambience", 0.18, 2);
        this.engine.setVolume("electrical_hum", 0.12, 2);
        this.engine.setVolume("sub_bass", 0.12, 2);
        this.stopLoop("water_slosh_loop", 1);
        return [this.snapshotAction("location_right_path")];
      case "generator_room":
        this.ensureLoop("sub_bass", 0.14, 3.5);
        this.engine.setVolume("call_bed", 0.08, 2);
        this.engine.setVolume("room_ambience", 0.14, 2);
        this.engine.setVolume("electrical_hum", 0.14, 2);
        this.engine.setVolume("sub_bass", 0.14, 2);
        this.stopLoop("water_slosh_loop", 1);
        return [this.snapshotAction("location_generator_room")];
      default:
        return [];
    }
  }

  private applyLoopReset(): void {
    this.stopLoop("water_slosh_loop", 0.8);
    this.stopLoop("water_rising_loop", 0.8);
    this.stopLoop("water_leak_loop", 0.8);
    this.lastAiNarrationKey = "";
    this.state = {
      location: "starting_room",
      waterLevel: 0,
      tensionLevel: 0,
      interactionFocus: "none",
      keypadState: "unknown",
    };
    this.lastAppliedLocation = null;
  }

  private ensureLoop(soundId: string, volume: number, fadeInSeconds: number): void {
    if (this.loopedSoundIds.has(soundId)) return;
    this.engine.handleToolCall(soundId, volume, true, fadeInSeconds);
    this.loopedSoundIds.add(soundId);
  }

  private stopLoop(soundId: string, fadeDurationSeconds: number): void {
    if (!this.loopedSoundIds.has(soundId)) return;
    this.engine.stop(soundId, fadeDurationSeconds);
    this.loopedSoundIds.delete(soundId);
  }

  private snapshotAction(type: string, soundId?: string): TheCallAudioAction {
    return {
      type,
      soundId,
      state: this.getState(),
    };
  }
}
