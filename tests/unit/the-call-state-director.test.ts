import { describe, expect, it } from "vitest";
import {
  TheCallStateDirector,
  type TheCallAudioDirectorEngine,
} from "../../src/lib/audio/the-call-state-director";

function createEngineSpy() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const engine: TheCallAudioDirectorEngine = {
    triggerCue(soundId, volume) {
      calls.push({ method: "triggerCue", args: [soundId, volume] });
    },
    handleToolCall(soundId, volume, loop, fadeInSeconds) {
      calls.push({ method: "handleToolCall", args: [soundId, volume, loop, fadeInSeconds] });
    },
    setVolume(soundId, targetVolume, fadeDurationSeconds) {
      calls.push({ method: "setVolume", args: [soundId, targetVolume, fadeDurationSeconds] });
    },
    stop(soundId, fadeDurationSeconds) {
      calls.push({ method: "stop", args: [soundId, fadeDurationSeconds] });
    },
  };

  return { engine, calls };
}

describe("TheCallStateDirector", () => {
  it("maps keypad instructions to a keypad attempt event", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Try the keypad first.");

    expect(actions.map((action) => action.type)).toEqual(["keypad_attempt"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["keypad_beep", undefined] },
    ]);
    expect(director.getState().interactionFocus).toBe("keypad");
  });

  it("escalates water into persistent loop layers from AI narration", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    director.applyAiNarration("I can hear water dripping somewhere below me.");
    director.applyAiNarration("The sound of water is getting louder now and I can feel it on my feet.");

    expect(calls).toEqual([
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "handleToolCall", args: ["water_leak_loop", 0.12, true, 2.5] },
      { method: "triggerCue", args: ["water_drip", undefined] },
      { method: "setVolume", args: ["water_leak_loop", 0.16, 2] },
      { method: "handleToolCall", args: ["water_rising_loop", 0.16, true, 3] },
      { method: "handleToolCall", args: ["water_slosh_loop", 0.12, true, 2.5] },
      { method: "triggerCue", args: ["water_drip", undefined] },
    ]);
    expect(director.getState().waterLevel).toBe(2);
  });

  it("resolves keypad outcomes from follow-up narration", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    director.applyUserInstruction(1, "Press the keypad.");
    director.applyAiNarration("The keypad is still dark. It doesn't work.");

    expect(calls).toEqual([
      { method: "triggerCue", args: ["keypad_beep", undefined] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "triggerCue", args: ["keypad_invalid", undefined] },
    ]);
    expect(director.getState().keypadState).toBe("invalid");
  });

  it("maps control panel instructions to a panel attempt event", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Work the panel.");

    expect(actions.map((action) => action.type)).toEqual(["panel_attempt"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["keypad_beep", undefined] },
    ]);
    expect(director.getState().interactionFocus).toBe("panel");
  });

  it("treats directional movement toward a door as movement first", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Go left toward the heavy door.");

    expect(actions.map((action) => action.type)).toEqual(["movement_slow"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["footsteps", 0.78] },
    ]);
    expect(director.getState().interactionFocus).toBe("movement");
  });

  it("maps urgent running instructions to the fast footsteps cue", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Run down the corridor now.");

    expect(actions.map((action) => action.type)).toEqual(["movement_fast"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["footsteps_fast", 0.86] },
    ]);
  });

  it("follows Alex's narrated movement with an audible footsteps cue", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    director.applyUserInstruction(1, "Take the stairs on the right.");
    calls.length = 0;

    const actions = director.applyAiNarration("Okay. I'm moving carefully down the stairs now.");

    expect(actions.map((action) => action.type)).toEqual([
      "location_right_path",
      "movement_followthrough_slow",
    ]);
    expect(calls).toEqual([
      { method: "handleToolCall", args: ["sub_bass", 0.12, true, 3.5] },
      { method: "setVolume", args: ["call_bed", 0.1, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.12, 2] },
      { method: "setVolume", args: ["sub_bass", 0.12, 2] },
      { method: "triggerCue", args: ["footsteps", 0.78] },
    ]);
  });

  it("maps forcing the exit door to a slam cue", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Force the door.");

    expect(actions.map((action) => action.type)).toEqual(["door_slam"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["door_slam", undefined] },
    ]);
  });

  it("maps vent interaction to the scrape cue", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Try the ceiling vent.");

    expect(actions.map((action) => action.type)).toEqual(["vent_attempt"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["metal_scrape", undefined] },
    ]);
  });

  it("maps pipe interaction to the clank cue", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyUserInstruction(1, "Hit the pipe with something heavy.");

    expect(actions.map((action) => action.type)).toEqual(["pipe_attempt"]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["pipe_clank", undefined] },
    ]);
  });

  it("resolves panel outcomes from follow-up narration", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    director.applyUserInstruction(1, "Work the panel.");
    director.applyAiNarration("The panel worked. There's a green light now. I think it's unlocked.");

    expect(calls).toEqual([
      { method: "triggerCue", args: ["keypad_beep", undefined] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "triggerCue", args: ["keypad_confirm", undefined] },
    ]);
  });

  it("plays a disconnect tone when the call dies in narration", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyAiNarration("Wait. The line just went dead. I can't hear anything now.");

    expect(actions.map((action) => action.type)).toEqual(["location_starting_room", "disconnect"]);
    expect(calls).toEqual([
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "triggerCue", args: ["disconnect_tone", undefined] },
    ]);
  });

  it("treats gas-release narration as a tension spike without breathing SFX", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyAiNarration("Wait. There's a smell. I can't breathe.");

    expect(actions.map((action) => action.type)).toEqual(["location_starting_room", "gas_release"]);
    expect(calls).toEqual([
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
    ]);
  });

  it("shifts the mix when Alex reaches the generator room", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const actions = director.applyAiNarration("There's a generator room here. I can see the secondary exit.");

    expect(actions.map((action) => action.type)).toContain("location_generator_room");
    expect(calls).toEqual([
      { method: "handleToolCall", args: ["sub_bass", 0.14, true, 3.5] },
      { method: "setVolume", args: ["call_bed", 0.08, 2] },
      { method: "setVolume", args: ["room_ambience", 0.14, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.14, 2] },
      { method: "setVolume", args: ["sub_bass", 0.14, 2] },
    ]);
    expect(director.getState().location).toBe("generator_room");
  });

  it("resets flooding loops when the call restarts after a death", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    director.applyAiNarration("I'm in the mechanical room by the heavy door. The water is rising and sloshing around my feet.");
    calls.length = 0;

    const actions = director.applyAiNarration("Hello? Is... is someone there? I just woke up in this room. I found this phone.");

    expect(actions.map((action) => action.type)).toContain("loop_reset");
    expect(actions.map((action) => action.type)).toContain("location_starting_room");
    expect(calls).toEqual([
      { method: "stop", args: ["water_slosh_loop", 0.8] },
      { method: "stop", args: ["water_rising_loop", 0.8] },
      { method: "stop", args: ["water_leak_loop", 0.8] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "setVolume", args: ["sub_bass", 0.08, 3] },
    ]);
    expect(director.getState().location).toBe("starting_room");
    expect(director.getState().waterLevel).toBe(0);
  });

  it("allows the same opening narration to trigger again after a loop reset", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);
    const openingLine = "Hello? Is... is someone there? I just woke up in this room. I found this phone.";

    director.applyAiNarration("I'm in the mechanical room by the heavy door. The water is rising and sloshing around my feet.");
    calls.length = 0;

    const firstReset = director.applyAiNarration(openingLine);
    calls.length = 0;
    const secondReset = director.applyAiNarration(openingLine);

    expect(firstReset.map((action) => action.type)).toContain("loop_reset");
    expect(secondReset.map((action) => action.type)).toContain("loop_reset");
    expect(calls).toEqual([
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "setVolume", args: ["sub_bass", 0.08, 3] },
    ]);
  });

  it("ignores duplicate user transcript sequence numbers", () => {
    const { engine, calls } = createEngineSpy();
    const director = new TheCallStateDirector(engine);

    const first = director.applyUserInstruction(7, "Try the keypad.");
    const second = director.applyUserInstruction(7, "Try the keypad.");

    expect(first.map((action) => action.type)).toEqual(["keypad_attempt"]);
    expect(second).toEqual([]);
    expect(calls).toEqual([
      { method: "triggerCue", args: ["keypad_beep", undefined] },
    ]);
  });
});
