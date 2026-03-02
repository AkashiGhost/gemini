// ─────────────────────────────────────────────
// Synthetic sound generator — browser-side AudioBuffer synthesis
// Generates placeholder ambient sounds when audio files aren't available.
// Story-aware: each story gets its own appropriate sound palette.
// ─────────────────────────────────────────────

const SAMPLE_RATE = 44100;

/** Generate filtered noise buffer (rain, wind, HVAC, etc.) */
async function generateFilteredNoise(
  duration: number,
  filterType: BiquadFilterType,
  frequency: number,
  Q: number,
  gain: number,
): Promise<AudioBuffer> {
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const noiseBuffer = offlineCtx.createBuffer(1, length, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = offlineCtx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = offlineCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = Q;

  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = gain;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(offlineCtx.destination);
  source.start();

  return offlineCtx.startRendering();
}

/** Generate a clock tick buffer (1 second with a sharp click at the start) */
async function generateClockTick(): Promise<AudioBuffer> {
  const duration = 1;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const osc = offlineCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 800;

  const env = offlineCtx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.6, 0.001);
  env.gain.exponentialRampToValueAtTime(0.001, 0.05);

  osc.connect(env);
  env.connect(offlineCtx.destination);
  osc.start(0);
  osc.stop(0.06);

  return offlineCtx.startRendering();
}

/** Generate a sustained drone */
async function generateDrone(
  frequency: number,
  waveform: OscillatorType,
  duration: number,
  gain: number,
): Promise<AudioBuffer> {
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const osc = offlineCtx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = frequency;

  const osc2 = offlineCtx.createOscillator();
  osc2.type = waveform;
  osc2.frequency.value = frequency * 1.003;

  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = gain;

  const filter = offlineCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = frequency * 3;

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  osc.start();
  osc2.start();

  return offlineCtx.startRendering();
}

// ─────────────────────────────────────────────
// Story-specific sound generation
// ─────────────────────────────────────────────

export type SoundSet = Record<string, AudioBuffer>;

/** The Last Session — therapy office: rain, HVAC hum, clock, drones */
async function generateLastSessionSounds(): Promise<SoundSet> {
  // Sequential rendering to avoid starving WebRTC audio thread
  const rain = await generateFilteredNoise(8, "bandpass", 4000, 0.5, 0.15);
  const hvac = await generateFilteredNoise(6, "lowpass", 100, 1.0, 0.2);
  const clock = await generateClockTick();
  const cello_drone = await generateDrone(73.4, "sawtooth", 8, 0.25);
  const sub_bass = await generateDrone(25, "sine", 6, 0.3);
  const low_tone = await generateDrone(90, "sine", 6, 0.35);
  return { rain, hvac, clock, cello_drone, sub_bass, low_tone };
}

/** The Lighthouse — coastal storm: ocean waves, wind, creaking, foghorn drone */
async function generateLighthouseSounds(): Promise<SoundSet> {
  // Sequential rendering to avoid starving WebRTC audio thread
  const ocean = await generateFilteredNoise(8, "lowpass", 800, 0.3, 0.2);
  const wind = await generateFilteredNoise(8, "bandpass", 2000, 0.8, 0.12);
  const creak = await generateFilteredNoise(4, "bandpass", 300, 5.0, 0.08);
  const foghorn_drone = await generateDrone(55, "sawtooth", 8, 0.2);
  const sub_bass = await generateDrone(30, "sine", 6, 0.25);
  return { ocean, wind, creak, foghorn_drone, sub_bass };
}

/** Room 4B — abandoned hospital: fluorescent hum, machinery, metallic echo, heartbeat */
async function generateRoom4bSounds(): Promise<SoundSet> {
  // Sequential rendering to avoid starving WebRTC audio thread
  const fluorescent_hum = await generateFilteredNoise(6, "bandpass", 120, 8.0, 0.15);
  const machinery = await generateFilteredNoise(8, "lowpass", 200, 0.5, 0.1);
  const metal_echo = await generateFilteredNoise(4, "bandpass", 1200, 6.0, 0.05);
  const heartbeat_drone = await generateDrone(40, "sine", 6, 0.2);
  const sub_bass = await generateDrone(20, "sine", 6, 0.25);
  const low_tone = await generateDrone(80, "sine", 6, 0.3);
  return { fluorescent_hum, machinery, metal_echo, heartbeat_drone, sub_bass, low_tone };
}

/** Footsteps on concrete — 2 rhythmic thuds, like someone taking 2 steps */
async function generateFootsteps(): Promise<AudioBuffer> {
  const duration = 1.2;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  // Two footstep impacts at t=0 and t=0.5
  for (const offset of [0, 0.5]) {
    const noiseBuffer = offlineCtx.createBuffer(1, Math.ceil(SAMPLE_RATE * 0.08), SAMPLE_RATE);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = offlineCtx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.8;

    const env = offlineCtx.createGain();
    env.gain.setValueAtTime(0, offset);
    env.gain.linearRampToValueAtTime(0.5, offset + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, offset + 0.07);

    source.connect(filter);
    filter.connect(env);
    env.connect(offlineCtx.destination);
    source.start(offset);
  }

  return offlineCtx.startRendering();
}

/** Water dripping — 3 drip sounds at irregular intervals */
async function generateWaterDrip(): Promise<AudioBuffer> {
  const duration = 2;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  for (const offset of [0, 0.7, 1.3]) {
    const osc = offlineCtx.createOscillator();
    osc.type = "sine";
    // Each drip slightly different pitch
    osc.frequency.value = 1800 + (offset * 200);

    const env = offlineCtx.createGain();
    env.gain.setValueAtTime(0, offset);
    env.gain.linearRampToValueAtTime(0.3, offset + 0.002);
    env.gain.exponentialRampToValueAtTime(0.001, offset + 0.08);

    osc.connect(env);
    env.connect(offlineCtx.destination);
    osc.start(offset);
    osc.stop(offset + 0.1);
  }

  return offlineCtx.startRendering();
}

/** Door creak — slow frequency-swept filtered noise */
async function generateDoorCreak(): Promise<AudioBuffer> {
  const duration = 1.5;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const noiseBuffer = offlineCtx.createBuffer(1, length, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const source = offlineCtx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = offlineCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 15;
  // Sweep frequency from 400Hz to 800Hz over duration (creak sound)
  filter.frequency.setValueAtTime(400, 0);
  filter.frequency.linearRampToValueAtTime(800, duration * 0.7);
  filter.frequency.linearRampToValueAtTime(500, duration);

  const env = offlineCtx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.15, 0.1);
  env.gain.setValueAtTime(0.15, duration * 0.8);
  env.gain.linearRampToValueAtTime(0, duration);

  source.connect(filter);
  filter.connect(env);
  env.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/** Keypad beeps — 3 short DTMF-style tones */
async function generateKeypadBeeps(): Promise<AudioBuffer> {
  const duration = 1;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const tones = [697, 770, 852]; // DTMF row frequencies
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.25;
    const osc = offlineCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = tones[i];

    const env = offlineCtx.createGain();
    env.gain.setValueAtTime(0, offset);
    env.gain.linearRampToValueAtTime(0.25, offset + 0.005);
    env.gain.setValueAtTime(0.25, offset + 0.1);
    env.gain.linearRampToValueAtTime(0, offset + 0.12);

    osc.connect(env);
    env.connect(offlineCtx.destination);
    osc.start(offset);
    osc.stop(offset + 0.15);
  }

  return offlineCtx.startRendering();
}

/** Metal scrape — harsh high-frequency noise burst */
async function generateMetalScrape(): Promise<AudioBuffer> {
  const duration = 0.8;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const noiseBuffer = offlineCtx.createBuffer(1, length, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const source = offlineCtx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = offlineCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3500;
  filter.Q.value = 4;

  const env = offlineCtx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.2, 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, duration);

  source.connect(filter);
  filter.connect(env);
  env.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/** Pipe clank — resonant metallic hit */
async function generatePipeClank(): Promise<AudioBuffer> {
  const duration = 0.6;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  // Two oscillators for metallic ring
  const osc1 = offlineCtx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 1200;

  const osc2 = offlineCtx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 2400;

  const env = offlineCtx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.4, 0.002);
  env.gain.exponentialRampToValueAtTime(0.001, duration);

  osc1.connect(env);
  osc2.connect(env);
  env.connect(offlineCtx.destination);

  osc1.start(0);
  osc1.stop(duration);
  osc2.start(0);
  osc2.stop(duration);

  return offlineCtx.startRendering();
}

/** Heavy breathing — rhythmic filtered noise with inhale/exhale pattern */
async function generateHeavyBreathing(): Promise<AudioBuffer> {
  const duration = 3;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const noiseBuffer = offlineCtx.createBuffer(1, length, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const source = offlineCtx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = offlineCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800;
  filter.Q.value = 1.5;

  const env = offlineCtx.createGain();
  // 3 breath cycles: inhale (ramp up) + exhale (ramp down)
  for (let i = 0; i < 3; i++) {
    const start = i * 1.0;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.12, start + 0.3); // inhale
    env.gain.linearRampToValueAtTime(0.02, start + 0.6); // exhale pause
    env.gain.linearRampToValueAtTime(0.1, start + 0.8);  // exhale sound
    env.gain.linearRampToValueAtTime(0, start + 0.95);    // silence gap
  }

  source.connect(filter);
  filter.connect(env);
  env.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/** Generate a dual-tone phone ring with on/off pulsing (North American ring: 440Hz + 480Hz) */
async function generatePhoneRing(): Promise<AudioBuffer> {
  // 6 seconds total: 2s on, 4s off (standard North American cadence)
  const duration = 6;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const osc1 = offlineCtx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 440;

  const osc2 = offlineCtx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 480;

  const env = offlineCtx.createGain();
  // Start silent
  env.gain.setValueAtTime(0, 0);
  // Ring ON: 0s – 2s
  env.gain.setValueAtTime(0.4, 0);
  env.gain.setValueAtTime(0.4, 2.0);
  // Ring OFF: 2s – 6s
  env.gain.setValueAtTime(0, 2.0);
  env.gain.setValueAtTime(0, 6.0);

  osc1.connect(env);
  osc2.connect(env);
  env.connect(offlineCtx.destination);

  osc1.start(0);
  osc1.stop(duration);
  osc2.start(0);
  osc2.stop(duration);

  return offlineCtx.startRendering();
}

/** Generate a short noise burst — simulates picking up a phone receiver */
async function generatePickupClick(): Promise<AudioBuffer> {
  // 10ms sharp transient
  const duration = 0.01;
  const length = Math.ceil(SAMPLE_RATE * duration);
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const noiseBuffer = offlineCtx.createBuffer(1, length, SAMPLE_RATE);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = offlineCtx.createBufferSource();
  source.buffer = noiseBuffer;

  const env = offlineCtx.createGain();
  // Sharp attack, very fast decay
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.8, 0.001);
  env.gain.exponentialRampToValueAtTime(0.001, 0.009);

  source.connect(env);
  env.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/** Generate a disconnect busy-signal tone (480Hz + 620Hz, pulsed 0.25s on / 0.25s off) */
async function generateDisconnectTone(): Promise<AudioBuffer> {
  // 3 seconds total: 0.25s on / 0.25s off × 6 cycles
  const duration = 3;
  const length = SAMPLE_RATE * duration;
  const offlineCtx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const osc1 = offlineCtx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 480;

  const osc2 = offlineCtx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 620;

  const env = offlineCtx.createGain();
  env.gain.setValueAtTime(0, 0);

  // 6 pulses of 0.25s on / 0.25s off
  const pulseOnDuration = 0.25;
  const pulseOffDuration = 0.25;
  const cycleLength = pulseOnDuration + pulseOffDuration;
  const numCycles = Math.floor(duration / cycleLength);
  for (let i = 0; i < numCycles; i++) {
    const onStart = i * cycleLength;
    const offStart = onStart + pulseOnDuration;
    env.gain.setValueAtTime(0.4, onStart);
    env.gain.setValueAtTime(0, offStart);
  }

  osc1.connect(env);
  osc2.connect(env);
  env.connect(offlineCtx.destination);

  osc1.start(0);
  osc1.stop(duration);
  osc2.start(0);
  osc2.stop(duration);

  return offlineCtx.startRendering();
}

/** The Call — underground phone call: phone static, electrical hum, sub bass, ring, click, disconnect + reactive environment sounds */
async function generateTheCallSounds(): Promise<SoundSet> {
  // Sequential rendering — 13 concurrent OfflineAudioContext renders via Promise.all()
  // was starving the WebRTC audio thread, causing glitching in the first few seconds.
  // Sequential await lets the audio thread breathe between each render.
  const phone_static = await generateFilteredNoise(6, "bandpass", 3000, 2.0, 0.05);
  const electrical_hum = await generateDrone(60, "sine", 6, 0.08);
  const sub_bass = await generateDrone(30, "sine", 6, 0.15);
  const phone_ring = await generatePhoneRing();
  const pickup_click = await generatePickupClick();
  const disconnect_tone = await generateDisconnectTone();
  const footsteps = await generateFootsteps();
  const water_drip = await generateWaterDrip();
  const door_creak = await generateDoorCreak();
  const keypad_beep = await generateKeypadBeeps();
  const metal_scrape = await generateMetalScrape();
  const pipe_clank = await generatePipeClank();
  const heavy_breathing = await generateHeavyBreathing();
  return {
    phone_static, electrical_hum, sub_bass, phone_ring, pickup_click, disconnect_tone,
    footsteps, water_drip, door_creak, keypad_beep, metal_scrape, pipe_clank, heavy_breathing,
  };
}

/** Generate story-specific sound set */
export async function generateSoundsForStory(storyId: string): Promise<SoundSet> {
  console.log(`[SYNTH] Generating synthetic sounds for story: ${storyId}`);

  let sounds: SoundSet;
  switch (storyId) {
    case "the-lighthouse":
      sounds = await generateLighthouseSounds();
      break;
    case "room-4b":
      sounds = await generateRoom4bSounds();
      break;
    case "the-call":
      sounds = await generateTheCallSounds();
      break;
    default:
      sounds = await generateLastSessionSounds();
      break;
  }

  console.log(`[SYNTH] Generated ${Object.keys(sounds).length} buffers for "${storyId}": [${Object.keys(sounds).join(", ")}]`);
  return sounds;
}
