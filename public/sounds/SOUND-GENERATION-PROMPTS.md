# InnerPlay Sound Generation Prompts

All sounds needed across the three stories. Use this document as a generation checklist.

**Generation tools referenced:**
- **ElevenLabs SFX** -- ambient loops, one-shots, short atmospheric (up to 30s, native loop toggle)
- **Stable Audio 2.5** via fal.ai -- drones, sustained tones, long atmospheric (up to 3 min)
- **CassetteAI** via fal.ai -- quick SFX prototyping (~1s generation)

---

## Summary Table

| Story | Ambient | Intermittent | Atmospheric | Endings | Reactive | Voice-Based | **Total** |
|---|---|---|---|---|---|---|---|
| The Last Session | 3 | 2 | 3 | 5 | 0 | 0 | **13** |
| The Lighthouse | 4 | 2 | 2 | 5 | 2 | 3 | **18** |
| Room 4B | 4 | 3 | 3 | 3 | 3 | 3 | **19** |
| **TOTAL** | **11** | **7** | **8** | **13** | **5** | **6** | **50** |

---

---

# Story 1: The Last Session

**Setting:** 14th-floor therapy office at night. Rain, mechanical building sounds, clinical atmosphere.
**Design principle:** "Subtractive horror -- things DISAPPEAR. The building goes silent around you."

---

## Ambient (3 sounds)

### 1. `rain`
- **Category:** Ambient loop
- **Generation prompt:** "Heavy rain on glass windows, steady, atmospheric, slightly resonant, dark ambience, seamless loop"
- **Enhanced context:** Heavy, steady rain against floor-to-ceiling windows. Slightly left-panned. This is a comfort sound -- familiar, safe, maternal. It is the LAST ambient element standing by Phase 4; the only proof the outside world still exists. Must feel like shelter so its eventual EQ-shift in Phase 5 lands as a gut punch.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. This sound persists through ALL phases -- it is never fully removed, only EQ-shifted in endings. Left-panned (-0.3).
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/rain.mp3`

### 2. `hvac`
- **Category:** Ambient loop
- **Generation prompt:** "Low frequency air conditioning hum, building HVAC system, 60-80Hz mechanical drone, clinical interior, seamless loop"
- **Enhanced context:** Low mechanical building hum, 60-80 Hz fundamental. Clinical, institutional. So constant it becomes part of the room's silence. Players will NOT consciously notice it until it stops at 3:30 (Phase 2). The disappearance is the FIRST signal something is wrong -- not with drama, but with the removal of a sound.
- **Duration:** 15-20 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Intentionally quiet (volume 0.15) -- below conscious threshold. Omnidirectional panning. Removed at 3:30 with a 4-second fade.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/hvac.mp3`

### 3. `clock`
- **Category:** Ambient loop
- **Generation prompt:** "Old mechanical wall clock ticking, steady rhythm, wood resonance, precise metronomic beat, quiet room, seamless loop"
- **Enhanced context:** Steady metronomic wall clock tick providing temporal grounding. The player's heartbeat syncs to it subconsciously. This is the most psychologically powerful sound in the entire experience. At 7:00 (Phase 3), the clock HARD STOPS mid-tick. Zero fade. The silence that follows is total and wrong.
- **Duration:** 15-20 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. CRITICAL: The clock must be designed so a hard cut at any point sounds like a mid-tick stop -- no fade, no wind-down. The zero fade_out is a deliberate horror design choice. Slightly right-panned (0.2).
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/clock.mp3`

---

## Intermittent (2 sounds)

### 4. `elevator`
- **Category:** Intermittent one-shot
- **Generation prompt:** "Distant elevator machinery, cable mechanism, motor hum, building mechanical ambient, muffled through floors"
- **Enhanced context:** Occasional mechanical movement 2-3 floors below -- cable groan, motor hum, soft thud of arrival. While the elevator moves, someone else is in the building. The player is not alone. Its removal at 4:30 removes the possibility of rescue.
- **Duration:** 4-5 seconds
- **Important notes:** NOT a loop. Played every ~45 seconds with +/-20s variance. The 6-second fade-out mimics the elevator simply stopping between floors. Center-panned (below/behind the player).
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/elevator.mp3`

### 5. `footsteps`
- **Category:** Intermittent one-shot
- **Generation prompt:** "Footsteps on hardwood floor above, slow walking pace, muffled through concrete ceiling, office building, irregular"
- **Enhanced context:** Irregular, unhurried footsteps from the floor above (15th floor). Probably the cleaning crew -- slow, purposeful, human. They represent the last human presence outside this room. They do not run. They do not hurry. They simply stop mid-stride and are never heard again.
- **Duration:** 3-5 seconds
- **Important notes:** NOT a loop. Very quiet (volume 0.08) -- felt more than heard. Played every ~30 seconds with +/-15s variance. Should have a "from above" quality. Removed at 5:30.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/footsteps.mp3`

---

## Atmospheric (3 sounds)

### 6. `cello_drone`
- **Category:** Atmospheric drone
- **Generation prompt:** "Low cello drone, single sustained bowed note, D2 register, resonant, slightly breathy, psychological horror atmosphere, 90 seconds"
- **Enhanced context:** A single sustained cello note -- not a melody, not a chord. Just a bowed, resonant, barely-breathing tone around D2/E2. Introduced at 6:00 with an 8-second fade-in to be imperceptible at first. By the time the player consciously registers it, it has already been present for 30-60 seconds. Textbook anxiety music: it creates the feeling that danger was always here.
- **Duration:** 30 seconds (seamless loop; generation prompt asks for 90 seconds for drone quality)
- **Important notes:** Must loop seamlessly. The 8-second fade-in means it enters below perception threshold. Center-panned (comes from the room itself). Volume 0.2.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/the-last-session/cello_drone.mp3`

### 7. `sub_bass`
- **Category:** Atmospheric drone
- **Generation prompt:** "Deep sub-bass rumble 20-30Hz, barely audible infrasound, ominous building tension, horror atmosphere, seamless loop"
- **Enhanced context:** 20-30 Hz infrasound rumble -- at this volume (0.08) it is felt more than heard, creating a physical sense of unease without an identifiable source. Can induce anxiety, unease, and the sensation that something is wrong. Volume deliberately below hearing threshold.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Volume intentionally near-inaudible (0.08). Raising it defeats the purpose. Omnidirectional. Introduced at Phase 3 / 6:00 alongside cello_drone.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/the-last-session/sub_bass.mp3`

### 8. `low_tone`
- **Category:** Atmospheric drone
- **Generation prompt:** "Single sustained low tone 80-100Hz, pure sine wave with slight organic texture, ominous, revelation moment, not melodic"
- **Enhanced context:** A single, pure, sustained low tone (~80-100 Hz) that emerges from 2-second silence after the mute_all event at 8:00. This is the first sound of the revelation phase. It is THE sound. It does not modulate. It does not swell. It is simply there and will continue until the ending takes over.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Pure sine wave character with slight organic texture. Not melodic -- unwavering. Center-panned, sourceless, ethereal. Volume 0.3. Tagged `[revelation_tone]` for LLM embedding.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/the-last-session/low_tone.mp3`

---

## Endings (5 sounds)

### 9. `rain_warm`
- **Category:** Ending ambient loop
- **Generation prompt:** "Heavy rain on glass windows, warm filtered, mid-heavy EQ, intimate, resolved, less harsh than cold variant, seamless loop"
- **Enhanced context:** Same rain but EQ-shifted toward midrange (200-800 Hz boosted, highs rolled off at 6kHz). The rain sounds warmer, closer, more like shelter than threat. Used for integration and release endings where the session ends with resolution. The world outside reflects that the player has done something right.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Left-panned (-0.3) to match the original rain position. Volume 0.55. Used in: integration, release endings.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/rain_warm.mp3`

### 10. `rain_cold`
- **Category:** Ending ambient loop
- **Generation prompt:** "Heavy rain on glass windows, cold filtered, bright harsh high-end, percussive, unresolved, indifferent, seamless loop"
- **Enhanced context:** Same rain with EQ shifted to high end (highs boosted 3dB at 8kHz+, mids slightly scooped). The rain sounds harder, more percussive, indifferent. Used for consumption and dissolution endings where the session ends in loss.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Left-panned (-0.3). Slightly louder than warm variant (volume 0.65) -- the indifference is also relentless. Used in: consumption, dissolution endings.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/rain_cold.mp3`

### 11. `piano_motif`
- **Category:** Ending one-shot
- **Generation prompt:** "Three-note descending piano motif, sparse, intimate, slightly reverberant, melancholic but resolved, psychological horror denouement"
- **Enhanced context:** Elara's theme. A three-note descending piano figure -- simple, spare, played once (or twice) without variation. This is the first and only time it is heard as music. For the integration ending, it signals that Elara is still here, still human enough to have a melody. Should feel like remembering something you didn't know you'd forgotten.
- **Duration:** 3-5 seconds
- **Important notes:** NOT a loop. Play once. Slightly right-panned (0.1) -- Elara's chair is to the right. Volume 0.45. Tagged `[piano_motif]` for LLM timing. Used in: integration ending.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/the-last-session/piano_motif.mp3`

### 12. `door_knock`
- **Category:** Ending one-shot
- **Generation prompt:** "Single sharp knock on wooden door, unhurried, professional, from outside, slight room reverb"
- **Enhanced context:** A single, sharp, unhurried knock on the office door -- from outside. Played at 10:30 in the consumption ending, ~30 seconds after the clock restarts. Someone is waiting. The session is beginning again. The knock is not loud, not frantic. It is exactly the knock you'd expect from a patient who made an appointment. The sound of Elara, arriving. Again.
- **Duration:** 2-3 seconds
- **Important notes:** NOT a loop. Single knock only. Slightly behind and left-panned (-0.1) -- door is behind the therapist. Volume 0.7 (prominent). Tagged `[door_knock]` for LLM timing. Used in: consumption ending.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/door_knock.mp3`

### 13. `birdsong`
- **Category:** Ending one-shot
- **Generation prompt:** "Distant morning birdsong, sparse, one or two birds, dawn, peaceful, after rain, outdoor ambience, natural"
- **Enhanced context:** Distant, sparse bird calls -- not a dawn chorus, just one or two birds. It is morning. The session has ended and something outside still exists. The only sound in the entire experience that represents the world after -- a world beyond this room, beyond Elara. The birds are indifferent because they are simply alive.
- **Duration:** 10-15 seconds
- **Important notes:** NOT a loop (or optionally a subtle loop for extended endings). Left-panned (-0.3) -- through the window, same direction as the rain. Volume 0.3. Used in: release ending only.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-last-session/birdsong.mp3`

---

---

# Story 2: The Lighthouse

**Setting:** Remote lighthouse during a violent storm at night. Radio communication with a distressed voice at sea.
**Design principle:** "Additive then subtractive horror. Phases 1-2 build a full, hostile but comprehensible soundscape. Phase 3 subtracts: the storm drops, machinery stops, foghorn dies. The silence that replaces the storm is worse than the storm ever was."

---

## Ambient (4 sounds)

### 14. `storm_wind`
- **Category:** Ambient loop
- **Generation prompt:** "Violent storm wind battering stone lighthouse, howling gusts, irregular surges, rain hitting stone, hostile weather, seamless loop"
- **Enhanced context:** Violent, howling wind battering a stone structure. Not a clean whistle -- a ragged, gusting assault with irregular surges. The wind finds every crack in the lighthouse walls. The primary atmospheric sound: aggressive, unrelenting. When the storm drops in Phase 3, the absence of this sound is the first sign that safety and danger have inverted. The quiet is not calm. The quiet is wrong.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Omnidirectional panning. Volume 0.55. Present from second 0. Drops dramatically in Phase 3 (to 0.15 over 3 seconds), returns in variant form in Phase 5 endings.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/storm_wind.mp3`

### 15. `waves_crash`
- **Category:** Ambient loop
- **Generation prompt:** "Heavy ocean waves crashing on rocky coast, violent impacts, spray, undertow, lighthouse cliff base, irregular rhythm, seamless loop"
- **Enhanced context:** Heavy ocean waves hitting the rocky base of the lighthouse island. Not gentle surf -- violent impacts with spray and undertow. Each wave is a physical event (~8-12 second rhythm). This is the player's spatial anchor: waves are below and to the right. Waves intensify in Phase 2, then recede to a low rhythmic pulse in Phase 3 -- the sea is holding its breath.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Right-panned (0.3) -- sea approach is to the right. Volume 0.5. Changes character across phases: violent (P1-2) to gentle pulse (P3) to absent (P4) to variant (P5).
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/waves_crash.mp3`

### 16. `radio_static_ambient`
- **Category:** Ambient loop
- **Generation prompt:** "Maritime radio static, low-level white noise crackle, open frequency, soft persistent interference, not harsh, seamless loop"
- **Enhanced context:** Persistent low-level radio static -- the white noise of an open maritime frequency. Not harsh scanner static but the softer crackle of an active connection. This is the medium through which the voice arrives. It recedes slightly when the voice transmits (TTS ducking). In Phase 3 it thins, becoming almost biological -- more like breathing than electrical noise. In Phase 4 it disappears entirely. Its absence when the voice speaks in Phase 4 is the audio revelation: the radio was never the medium.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Left-panned (-0.2) -- the radio sits to the keeper's left. Volume 0.2. Fades in Phase 3, gone by Phase 4. Its absence is narratively significant.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/radio_static_ambient.mp3`

### 17. `lighthouse_machinery`
- **Category:** Ambient loop
- **Generation prompt:** "Lighthouse lamp mechanism rotating, heavy gears, metal on metal, slow grinding rhythm, mechanical lighthouse interior, seamless loop"
- **Enhanced context:** The grinding, rhythmic mechanical sound of the lighthouse lamp mechanism rotating. A heavy gear system turning the beam -- metal on metal, slow and steady (~one rotation every 10-15 seconds). This is the lighthouse's heartbeat, representing the keeper's purpose. When the machinery HARD STOPS in Phase 3, the keeper loses their functional identity.
- **Duration:** 15-20 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. CRITICAL: HARD STOP at 5:00 -- no fade, no winding down, no gradual slowing. Running, then silent. Implement as immediate gain.value = 0. The sound must be designed so a hard cut at any point sounds like a machine that simply stopped. Center-panned, vertical 0.6 (above the keeper).
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/lighthouse_machinery.mp3`

---

## Intermittent (2 sounds)

### 18. `foghorn`
- **Category:** Intermittent one-shot
- **Generation prompt:** "Deep mournful foghorn blast, two-tone, coastal navigation marker, lonely, reverberant, maritime night atmosphere"
- **Enhanced context:** A deep, mournful foghorn blast. Two-tone: lower fundamental (~100Hz) with an overtone giving the classic lonely foghorn sound. The signature sound of the lighthouse experience. Its removal at 5:30 marks when the lighthouse stops being a functioning navigation aid. The foghorn stopping is not dramatic -- it simply does not sound again. The player waits for it. It never comes.
- **Duration:** 4-5 seconds
- **Important notes:** NOT a loop. Played every ~40 seconds with +/-15s variance. A discrete event -- no fade in or out. Center-panned, vertical 0.3 (above and out). Volume 0.35. Stops after 5:30 -- just never plays again.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/foghorn.mp3`

### 19. `seagulls_distant`
- **Category:** Intermittent one-shot
- **Generation prompt:** "Distant seagull cries, one or two birds, sparse, wind-carried, maritime coast, stormy night"
- **Enhanced context:** Occasional distant seagull cries -- one or two birds, not a flock. Sparse, thin, almost lost in the wind. They represent life outside the lighthouse. After Phase 2, they simply stop appearing (storm drove them to shelter). The player won't consciously miss them, but their absence contributes to Phase 3's growing emptiness.
- **Duration:** 3-4 seconds
- **Important notes:** NOT a loop. Very quiet (volume 0.08) -- ambient texture only. Played every ~60 seconds with +/-30s variance. Right-panned (0.3) -- seaward. Naturally absent after Phase 2.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/seagulls_distant.mp3`

---

## Atmospheric (2 sounds)

### 20. `deep_ocean_drone`
- **Category:** Atmospheric drone
- **Generation prompt:** "Deep ocean frequency drone, vast low resonance 40-60Hz, abyssal pressure, immense depth, otherworldly oceanic, not melodic, 90 seconds"
- **Enhanced context:** A vast, low, resonant drone -- the sound of the deep ocean itself. Not a musical note -- something between a frequency and a feeling. ~40-60Hz with harmonic overtones suggesting immense depth and pressure. The abyss: 4000 meters below, where pressure crushes and light does not reach. It does not modulate. It does not swell. Patient, vast, indifferent, and very old.
- **Duration:** 30 seconds (seamless loop; generation prompt asks 90 seconds for drone quality)
- **Important notes:** Must loop seamlessly. Enters after 2-second silence in Phase 4 as the first sound of the revelation. Omnidirectional. Volume 0.3. 4-second fade-in.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/the-lighthouse/deep_ocean_drone.mp3`

### 21. `sub_bass`
- **Category:** Atmospheric drone
- **Generation prompt:** "Deep sub-bass rumble 20-30Hz, oceanic infrasound, barely audible, ominous deep sea pressure, seamless loop"
- **Enhanced context:** 20-30Hz infrasound rumble -- felt more than heard. Creates physiological anxiety: increased heart rate, peripheral vision disturbance, sensation of being watched. The body responds before the mind. Enters with the deep_ocean_drone in Phase 4. Combined effect is oceanic pressure -- the player feels submerged even in a lighthouse above the water.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Volume intentionally near-inaudible (0.08). Raising it defeats the purpose. Omnidirectional. 6-second fade-in. Introduced Phase 4 / 6:02.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/the-lighthouse/sub_bass.mp3`

---

## Endings (5 sounds)

### 22. `storm_warm`
- **Category:** Ending ambient loop
- **Generation prompt:** "Storm resolving to steady warm rain on stone, gentle wind, sheltering, midrange-heavy EQ, maritime coast, peaceful after violence, seamless loop"
- **Enhanced context:** The storm resolves. Not stops -- resolves. The violent wind becomes steady rain on stone, warm and sheltering. The waves become rhythmic, almost gentle. EQ shifts: midrange prominent, highs softened. The storm resolving is the world's response to the keeper's choice to stay connected.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Omnidirectional. Volume 0.45. Used in: acceptance ending.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/storm_warm.mp3`

### 23. `storm_cold`
- **Category:** Ending ambient loop
- **Generation prompt:** "Violent storm returning, cold sharp wind, percussive rain, high-frequency emphasis, indifferent hostile weather, seamless loop"
- **Enhanced context:** The original storm returns -- but colder, sharper, more percussive. Wind is higher-pitched. Rain is harder. EQ shifted to highs: 8kHz+ boosted, mids scooped. The storm has not resolved. It has looped. Used for the loop ending where the keeper hung up and the call restarted. The cold storm is the same storm, forever.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Omnidirectional. Volume 0.6. Used in: loop ending.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/storm_cold.mp3`

### 24. `radio_loop`
- **Category:** Ending one-shot
- **Generation prompt:** "Radio distress call through heavy static, panicked voice fragment, maritime emergency, crackling interference, single burst"
- **Enhanced context:** The first transmission replays. "Can anyone hear me?" through heavy static. This is the door_knock equivalent from The Last Session -- the confirmation that the loop has restarted. The voice sounds exactly as it did at the start. Same panic. Same urgency. Same hope. The repetition is the horror.
- **Duration:** 3-5 seconds
- **Important notes:** NOT a loop. Single burst. Left-panned (-0.2) -- the radio. Volume 0.55. Tagged `[radio_loop]` for LLM timing. INCLUDES VOICE -- see Voice-Based section. Used in: loop ending.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/radio_loop.mp3`

### 25. `morning_calm`
- **Category:** Ending ambient loop
- **Generation prompt:** "Calm morning coastal ambience, gentle waves on rock, single seabird distant, post-storm, clear air, peaceful dawn, no wind"
- **Enhanced context:** The morning after the storm. Gentle waves on rock -- no longer violent, just rhythmic. A single seabird. Silence has changed from dread to peace. No wind. Air sounds open, clear, unhaunted. The only sound representing "after." The storm ended. The night ended. The voice ended. The morning is indifferent -- but it is the indifference of continuing, not of cruelty.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Right-panned (0.3) -- seaward, where the storm was. Volume 0.35. 8-second fade-in. Used in: release ending.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/morning_calm.mp3`

### 26. `waves_gentle`
- **Category:** Ending ambient loop
- **Generation prompt:** "Gentle ocean waves on rocky shore, calm rhythmic, low-energy surf, peaceful maritime, no storm, seamless loop"
- **Enhanced context:** Calm, rhythmic waves on rock. No violence. Just the ocean breathing. Used as the bass layer under ending-specific sounds. The sea was hostile for the entire experience. Now it is not. That shift is the emotional resolution, delivered through sound rather than words.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Right-panned (0.3). Volume 0.25. Used in: acceptance, release endings.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/waves_gentle.mp3`

---

## Reactive (2 sounds)

### 27. `radio_static`
- **Category:** Reactive one-shot
- **Generation prompt:** "Short radio static burst, 1-2 seconds, maritime frequency interference, crackling"
- **Enhanced context:** A 1-2 second burst of heavier radio static. Used by the LLM to interrupt the voice's own speech mid-sentence. "The current is pulling us toward the--" [SOUND:radio_static] "--can you hear me?" Natural radio communication artifact that doubles as dramatic punctuation.
- **Duration:** 2 seconds
- **Important notes:** NOT a loop. Short burst. Left-panned (-0.2) -- the radio. Volume 0.4. Tagged `[radio_static]` for LLM embedding. Used frequently throughout Phases 1-3.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/radio_static.mp3`

### 28. `radio_burst`
- **Category:** Reactive one-shot
- **Generation prompt:** "Loud radio static burst, 2-3 seconds, maritime emergency frequency, harsh interference, attention-grabbing"
- **Enhanced context:** A louder, longer static burst (2-3 seconds). Used sparingly -- at initial contact, at key transition moments, at the moment before silence in Phase 4. The loudness draws attention to the radio as a physical object before it becomes irrelevant.
- **Duration:** 3 seconds
- **Important notes:** NOT a loop. Louder and longer than `radio_static`. Left-panned (-0.2). Volume 0.65. Tagged `[radio_burst]` for LLM embedding. Use sparingly for impact.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/the-lighthouse/radio_burst.mp3`

---

---

# Story 3: Room 4B

**Setting:** Decommissioned hospital at night. Player is a security guard doing a routine check.
**Design principle:** "Subtractive institutional horror -- a building going quiet around you."

---

## Ambient (4 sounds)

### 29. `fluorescent_buzz`
- **Category:** Ambient loop
- **Generation prompt:** "Fluorescent tube lighting hum, hospital hallway, 50-60Hz electrical buzz with slight ballast whine, clinical institutional, seamless loop"
- **Enhanced context:** Persistent electrical hum of aging fluorescent tube lighting. 50-60 Hz fundamental with 120 Hz harmonics from the ballast. This sound is the hospital's heartbeat. Its removal on the 2nd floor in Phase 3 leaves only footsteps and ventilation. When it disappears, the hallway feels darker even though nothing visible changed. Players will not consciously register it until it is gone.
- **Duration:** 15-20 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Omnidirectional (ceiling-mounted). Volume 0.18. Present from second 0. Removed at Phase 3 with 5-second fade. Must support a flicker pattern: drops to 0 for 0.3s, returns at 80% for 0.5s, drops again for 0.1s, returns to normal.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/fluorescent_buzz.mp3`

### 30. `footsteps_echo`
- **Category:** Ambient loop
- **Generation prompt:** "Footsteps on hospital linoleum floor, slow walking pace, echoing empty hallway, rubber sole shoes, institutional reverb, seamless loop"
- **Enhanced context:** The player's own footsteps echoing off linoleum floors and hard walls. Echo characteristics change per floor -- upper floors have longer reverb (bare linoleum, empty rooms as resonance chambers). The footsteps are the player's primary spatial anchor: they prove the player is real, the floor is real, the building has dimensions. In Phase 4 (basement), footsteps gain additional echo -- as if the hallway is longer than it should be. The footsteps NEVER stop.
- **Duration:** 15-20 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. The ONLY ambient sound that persists through the entire experience including endings. Center-panned. Volume 0.22. Never fades out (fade_out_seconds: 0).
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/footsteps_echo.mp3`

### 31. `ventilation`
- **Category:** Ambient loop
- **Generation prompt:** "Hospital ventilation system, rhythmic airflow through ductwork, 4-second push-pull breathing pattern, institutional, slightly resonant, seamless loop"
- **Enhanced context:** Central air system cycling through ductwork. A low, rhythmic push-pull: 4 seconds of airflow, 1 second of relative quiet, 4 seconds of airflow. This breathing rhythm is deliberately chosen because by Phase 4, when all other sounds are gone, the ventilation sounds exactly like someone breathing in the hallway with the player. The ventilation transforms from "mechanical breathing" to something indistinguishable from actual breathing.
- **Duration:** 20-25 seconds (seamless loop, must capture full 4-1 breathing cycle multiple times)
- **Important notes:** Must loop seamlessly. CRITICAL: The 4-1 second breathing rhythm must be consistent so the player's subconscious syncs to it. When it stops in Phase 4, the player may unconsciously hold their breath. Omnidirectional. Volume 0.12. 6-second fade-out makes it ambiguous whether it stopped or became breathing.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/ventilation.mp3`

### 32. `distant_elevator`
- **Category:** Ambient (intermittent playback)
- **Generation prompt:** "Distant elevator machinery, cable and motor, old hospital service elevator, mechanical groan through floors, muffled, intermittent"
- **Enhanced context:** The service elevator's motor and cable system, heard from a distance. A low mechanical groan lasting 8-10 seconds. In Phase 1, this is background building life. In Phase 2, the elevator arrives at the player's floor unprompted. The distant version stops after Phase 2 -- replaced by close-proximity elevator_arrive. "The elevator is somewhere else in the building" becomes "the elevator is here, waiting for you specifically."
- **Duration:** 8-10 seconds
- **Important notes:** NOT played as a continuous loop. Intermittent: every ~60 seconds with +/-25s variance. Slightly right-panned (0.15) -- elevator shaft in the east wing. Volume 0.08. Removed at Phase 2 / 3:30.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/distant_elevator.mp3`

---

## Intermittent (3 sounds)

### 33. `door_creak`
- **Category:** Intermittent / reactive one-shot
- **Generation prompt:** "Heavy institutional door creak, slow, low-pitched, fire door on hydraulic hinge, hospital corridor, settling sound, not horror cliche"
- **Enhanced context:** A heavy institutional door settling on its hinges. Not a horror-movie creak -- a real sound, the kind a fire door makes when air pressure changes. Long (2-3 seconds) and low-pitched. Sounds like the building stretching. Played reactively when approaching doors, and on the timeline in Phase 2 when doors on the 4th floor open by themselves.
- **Duration:** 3-4 seconds
- **Important notes:** NOT a loop. Must sound realistic, NOT horror-cliche. Dynamic panning (set by engine based on door location). Volume 0.25. Tagged `[door_creak]` for LLM embedding.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/door_creak.mp3`

### 34. `pipe_groan`
- **Category:** Intermittent / reactive one-shot
- **Generation prompt:** "Metal pipe groaning inside wall, thermal expansion sound, resonant low frequency, hospital plumbing, 1-2 seconds, institutional"
- **Enhanced context:** Metal pipes expanding or contracting inside the walls. A deep, resonant groan lasting 1-2 seconds. In a functioning hospital, this would be hot water or steam. In a decommissioned hospital, there is no hot water. The pipes should NOT be making this sound. Used primarily in Phase 3 on the 2nd floor where the floor is damp. Something is flowing through the pipes. The narrator does not comment on the impossibility.
- **Duration:** 2-3 seconds
- **Important notes:** NOT a loop. Left-panned (-0.2) -- pipes run along the left wall. Volume 0.15. No fade in or out. Tagged `[pipe_groan]` for LLM embedding.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/pipe_groan.mp3`

### 35. `phone_ring`
- **Category:** Intermittent one-shot
- **Generation prompt:** "Old analog telephone ringing, mechanical bell, hospital desk phone, 3 rings then silence, slightly muffled through walls, institutional"
- **Enhanced context:** A phone ringing somewhere in the building. An old analog ring -- not electronic, but a physical bell struck by a mechanical arm. 3 rings, then stops. Heard once in Phase 2 (from a floor below) and once in Phase 3 (same floor as the player). The phone has been disconnected. ALL phones in the building have been disconnected. The narrator does not acknowledge this contradiction. The single most unnerving intermittent sound -- not because it is loud or sudden, but because the building has no active phone lines.
- **Duration:** 5 seconds (3 rings + silence)
- **Important notes:** NOT a loop. Must have exactly 3 rings followed by silence. Right-panned (0.3) -- down the hallway. Volume 0.18. No fade in or out. Tagged `[phone_ring]` for LLM embedding. Its explanation is silence.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/phone_ring.mp3`

---

## Atmospheric (3 sounds)

### 36. `hospital_drone`
- **Category:** Atmospheric drone
- **Generation prompt:** "Deep building resonance drone, structural frequency, 30-40Hz, hospital architecture, ominous, imperceptible onset, seamless loop"
- **Enhanced context:** A deep tonal drone -- the building itself resonating at its fundamental frequency. Every large structure has one: a sub-audible hum from wind load, structural flex, and HVAC resonance. In a silent decommissioned hospital, it becomes dominant. It is the building's voice. At 0.1 volume, it is felt rather than heard -- a pressure in the chest, a weight in the air. The building is aware of the player. This is how it sounds when it is paying attention.
- **Duration:** 30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Omnidirectional. Volume 0.1. 10-second fade-in. Introduced Phase 2 / 4:00.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/room-4b/hospital_drone.mp3`

### 37. `sub_bass`
- **Category:** Atmospheric drone
- **Generation prompt:** "Deep infrasound sub-bass 15-25Hz, barely audible pressure wave, horror atmosphere, physiological unease, seamless loop"
- **Enhanced context:** 15-25 Hz infrasound. Below conscious hearing threshold. Creates physiological anxiety: increased heart rate, peripheral vision disturbance, the feeling of being watched. The source is the building -- or more precisely, the space between the walls. Enters in Phase 4 alongside the heartbeat. Combined effect: being inside something alive.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Volume intentionally near-inaudible (0.06). Raising it defeats the purpose. Omnidirectional. 8-second fade-in. Introduced Phase 4 / 6:00.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/room-4b/sub_bass.mp3`

### 38. `heartbeat`
- **Category:** Atmospheric loop
- **Generation prompt:** "Slow heartbeat 40 BPM, low frequency, mechanical precision, unnaturally slow, hospital cardiac monitor feel, slightly muffled, seamless loop"
- **Enhanced context:** A slow, low-frequency heartbeat at 40 BPM -- significantly slower than a healthy resting heart rate (60-100 BPM). The slowness is what makes it wrong. This is NOT the player's heartbeat. Too slow, too regular, too mechanical. Sounds like a heart that has been beating for much longer than a human heart should. The heartbeat source appears to come from the room at the end of the corridor -- from the bed.
- **Duration:** 15-20 seconds (seamless loop, must contain multiple 40 BPM beats)
- **Important notes:** Must loop seamlessly. 40 BPM is chosen to sit in the uncanny valley -- slow enough the player's heart does NOT sync to it, fast enough it is unmistakably a heartbeat. Center-panned initially; if engine supports dynamic panning, shift toward room door in Phase 4. Volume 0.25. 6-second fade-in. Introduced Phase 4 / 6:30.
- **Tool:** Stable Audio 2.5 (via fal.ai)
- **Output file:** `public/sounds/stories/room-4b/heartbeat.mp3`

---

## Endings (3 sounds)

### 39. `morning_light`
- **Category:** Ending ambient loop
- **Generation prompt:** "Hospital morning ambient, distant voices, laundry cart rumble, PA chime, institutional waking up, warm but clinical, seamless loop"
- **Enhanced context:** The sound of a hospital waking up. Distant voices (indistinct, no words), the rumble of a laundry cart, a PA system chime. This is St. Maren's as it was when it was alive -- or as the player imagines it was. In the consumption ending (the loop), the morning sounds are aggressively normal -- the horror is that normalcy is the prison. In the release ending, lower volume and colder, more distant EQ.
- **Duration:** 20-30 seconds (seamless loop)
- **Important notes:** Must loop seamlessly. Omnidirectional. Volume 0.35. 3-second fade-in. INCLUDES VOICE elements -- see Voice-Based section. Used in: consumption, release endings.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/morning_light.mp3`

### 40. `breath_close`
- **Category:** Ending / Phase 4 reactive one-shot
- **Generation prompt:** "Single close exhale, human breath, very close proximity, intimate, slightly warm, hospital room acoustic, not whisper, just breath"
- **Enhanced context:** A single close exhale -- not the player's. Someone else. Close enough to feel on skin. Used reactively in Phase 4 when the player stands next to the bed. Not looped. One exhale. Then nothing. The player decides whether they heard it. The narrator does not confirm.
- **Duration:** 2-3 seconds
- **Important notes:** NOT a loop. Single exhale only. Slightly right-panned (0.1) -- from the bed. Volume 0.4. 1.5-second fade-out. Tagged `[breath_close]` for LLM embedding. INCLUDES VOICE -- see Voice-Based section.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/breath_close.mp3`

### 41. `elevator_arrive`
- **Category:** Ending / reactive one-shot
- **Generation prompt:** "Hospital service elevator arriving, close proximity, cable tension release, hydraulic brake, doors opening, institutional mechanical, single event"
- **Enhanced context:** The service elevator arriving close -- not distant machinery but the immediate mechanical sound of doors opening on the player's floor. Cable tension release, hydraulic brake, double-clunk of doors parting. This is close. This is for the player. No one pressed the button. Used in Phase 2 (arrives at 4th floor unbidden) and Phase 3 (follows the player floor to floor).
- **Duration:** 4-5 seconds
- **Important notes:** NOT a loop. Single arrival event. Slightly right-panned (0.2) -- east wing. Volume 0.35. No fade in or out -- immediate presence. Tagged `[elevator_arrive]` for LLM embedding.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/elevator_arrive.mp3`

---

## Reactive (3 sounds)

### 42. `door_check`
- **Category:** Reactive one-shot
- **Generation prompt:** "Commercial door handle test, lever press and release, locked resistance, institutional hardware, quick mechanical click, hospital corridor"
- **Enhanced context:** Testing a commercial door handle -- lever depresses, meets resistance, returns. Quick, functional, normal. Used throughout Phase 1 as the player checks each door on their route. Mechanical. Satisfying. Normal. The sound of a building that works as designed.
- **Duration:** 2 seconds
- **Important notes:** NOT a loop. Very short, precise mechanical sound. Center-panned. Volume 0.3. Tagged `[door_check]` for LLM embedding.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/door_check.mp3`

### 43. `clipboard_mark`
- **Category:** Reactive one-shot
- **Generation prompt:** "Ballpoint pen checking box on clipboard, paper scratch, quick precise mark, close proximity, slightly percussive"
- **Enhanced context:** A ballpoint pen checking a box on a clipboard. Small, precise. The satisfying scratch of ink on paper. Used in Phase 1 as the player marks each door as locked. In the integration ending, this sound returns when the player signs the chart -- the same pen, the same scratch, different meaning.
- **Duration:** 1-2 seconds
- **Important notes:** NOT a loop. Very short, precise paper/pen sound. Center-panned (in the player's hands). Volume 0.25. Tagged `[clipboard_mark]` for LLM embedding.
- **Tool:** ElevenLabs SFX
- **Output file:** `public/sounds/stories/room-4b/clipboard_mark.mp3`

### 44. `phone_ring`
- **Category:** Reactive one-shot (also in intermittent above)
- **Note:** Same asset as intermittent `phone_ring` (#35). See that entry for generation details.

---

---

# Voice-Based Sound Effects

Sounds that include human voice elements as part of their ambient or reactive design. These require special attention during generation -- they are NOT dialogue, they are atmospheric voice textures.

---

## The Lighthouse -- Voice-Based Sounds (3)

### V1. `radio_loop` (see #24)
- **Voice content:** A panicked voice fragment saying "Can anyone hear me?" through heavy radio static
- **Character:** Maritime distress call. Male voice, urgent, fragmented by interference
- **Generation approach:** Generate the radio static + voice together as a single asset. The voice should sound like it is coming through a damaged radio -- compressed, mid-heavy, with static artifacts interrupting the speech
- **Duration:** 3-5 seconds
- **Output file:** `public/sounds/stories/the-lighthouse/radio_loop.mp3`

### V2. Distant radio chatter (NOT in cue-map -- supplementary voice texture)
- **Voice content:** Indistinct maritime radio transmissions -- fragments of weather reports, coordinates, "mayday" calls. No complete sentences. Words half-heard through static.
- **Character:** Multiple voices at different distances, all filtered through radio compression. Some English, some could be other languages. The impression of a busy maritime channel slowly going quiet.
- **Generation prompt:** "Maritime radio chatter, multiple distant voices through static, weather reports and coordinates, fragmented, indistinct, gradually fading, 15 seconds"
- **Duration:** 10-15 seconds
- **Important notes:** This is a supplementary ambient texture for Phases 1-2 that could layer with `radio_static_ambient`. Words must be indistinct -- the player should feel communication happening without understanding it. OPTIONAL asset -- only generate if time permits.
- **Output file:** `public/sounds/stories/the-lighthouse/radio_chatter_voices.mp3`

### V3. Distress "mayday" fragment (NOT in cue-map -- supplementary voice texture)
- **Voice content:** A single "Mayday, mayday" through extreme radio interference, barely audible
- **Character:** Desperate but distant. The kind of transmission you catch for one second before losing the signal.
- **Generation prompt:** "Mayday distress call through extreme radio static, barely audible, single burst, maritime emergency, fragmented"
- **Duration:** 2-3 seconds
- **Important notes:** OPTIONAL supplementary asset. Could be used as a reactive cue in Phase 2 to heighten urgency.
- **Output file:** `public/sounds/stories/the-lighthouse/mayday_fragment.mp3`

---

## Room 4B -- Voice-Based Sounds (3)

### V4. `morning_light` voice layer (see #39)
- **Voice content:** Indistinct distant hospital voices -- no words identifiable, just the murmur of staff beginning a shift. A PA system chime (not voice).
- **Character:** Warm institutional. The voices are comfort sounds -- proof that the building is populated and normal. No specific words needed.
- **Generation approach:** The morning_light ambient already includes "distant voices" in its generation prompt. If voices are not prominent enough in the initial generation, generate a separate voice-murmur layer.
- **Duration:** 20-30 seconds (seamless loop, matching morning_light)
- **Output file:** `public/sounds/stories/room-4b/morning_light.mp3` (integrated) or `public/sounds/stories/room-4b/morning_voices_layer.mp3` (separate layer)

### V5. `breath_close` (see #40)
- **Voice content:** A single human exhale -- not speech, not whisper, just breath
- **Character:** Close, intimate, warm. Gender-ambiguous. Could be a sleeping patient. Could be something else.
- **Generation approach:** Already defined in the main entry. The "voice" here is biological sound, not speech.
- **Duration:** 2-3 seconds
- **Output file:** `public/sounds/stories/room-4b/breath_close.mp3`

### V6. PA system announcement (NOT in cue-map -- supplementary voice texture)
- **Voice content:** A hospital PA announcement -- tone + indistinct voice, like hearing an announcement from three floors away. Words completely unintelligible.
- **Character:** The classic hospital "bing-bong" followed by a muffled female voice speaking for 4-5 seconds. Standard institutional. Nothing abnormal about it except that this hospital has been decommissioned.
- **Generation prompt:** "Hospital PA system announcement, two-tone chime followed by indistinct female voice, muffled through floors, institutional, 5 seconds"
- **Duration:** 5-6 seconds
- **Important notes:** OPTIONAL supplementary asset. Could be used as a Phase 2 intermittent cue to reinforce the "the hospital shouldn't have active PA" contradiction. Same narrative function as the phone_ring -- impossible normalcy.
- **Output file:** `public/sounds/stories/room-4b/pa_announcement.mp3`

---

## The Last Session -- Voice-Based Sounds (0)

The Last Session does not include voice-based ambient sounds. All human voice comes from Elara's TTS narration. The ambient soundscape is entirely environmental (rain, mechanical building sounds, musical drones). This is a deliberate design choice: Elara IS the only human presence, reinforced by the absence of any other voice in the sound design.

---

---

# Generation Checklist

Quick reference for batch generation sessions. Ordered by priority (needed earliest in gameplay).

## Priority 1: Needed at second 0 (generate first)
| # | Sound ID | Story | Tool | Duration |
|---|---|---|---|---|
| 1 | `rain` | The Last Session | ElevenLabs SFX | 20-30s |
| 2 | `hvac` | The Last Session | ElevenLabs SFX | 15-20s |
| 3 | `clock` | The Last Session | ElevenLabs SFX | 15-20s |
| 14 | `storm_wind` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 15 | `waves_crash` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 16 | `radio_static_ambient` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 17 | `lighthouse_machinery` | The Lighthouse | ElevenLabs SFX | 15-20s |
| 29 | `fluorescent_buzz` | Room 4B | ElevenLabs SFX | 15-20s |
| 30 | `footsteps_echo` | Room 4B | ElevenLabs SFX | 15-20s |
| 31 | `ventilation` | Room 4B | ElevenLabs SFX | 20-25s |
| 27 | `radio_static` | The Lighthouse | ElevenLabs SFX | 2s |
| 28 | `radio_burst` | The Lighthouse | ElevenLabs SFX | 3s |

## Priority 2: Needed by minute 2-5 (generate second)
| # | Sound ID | Story | Tool | Duration |
|---|---|---|---|---|
| 4 | `elevator` | The Last Session | ElevenLabs SFX | 4-5s |
| 5 | `footsteps` | The Last Session | ElevenLabs SFX | 3-5s |
| 18 | `foghorn` | The Lighthouse | ElevenLabs SFX | 4-5s |
| 19 | `seagulls_distant` | The Lighthouse | ElevenLabs SFX | 3-4s |
| 32 | `distant_elevator` | Room 4B | ElevenLabs SFX | 8-10s |
| 33 | `door_creak` | Room 4B | ElevenLabs SFX | 3-4s |
| 42 | `door_check` | Room 4B | ElevenLabs SFX | 2s |
| 43 | `clipboard_mark` | Room 4B | ElevenLabs SFX | 1-2s |

## Priority 3: Needed by minute 4-7 (atmospheric drones)
| # | Sound ID | Story | Tool | Duration |
|---|---|---|---|---|
| 6 | `cello_drone` | The Last Session | Stable Audio 2.5 | 30s |
| 7 | `sub_bass` | The Last Session | Stable Audio 2.5 | 20-30s |
| 8 | `low_tone` | The Last Session | Stable Audio 2.5 | 20-30s |
| 20 | `deep_ocean_drone` | The Lighthouse | Stable Audio 2.5 | 30s |
| 21 | `sub_bass` | The Lighthouse | Stable Audio 2.5 | 20-30s |
| 34 | `pipe_groan` | Room 4B | ElevenLabs SFX | 2-3s |
| 35 | `phone_ring` | Room 4B | ElevenLabs SFX | 5s |
| 36 | `hospital_drone` | Room 4B | Stable Audio 2.5 | 30s |
| 37 | `sub_bass` | Room 4B | Stable Audio 2.5 | 20-30s |
| 38 | `heartbeat` | Room 4B | Stable Audio 2.5 | 15-20s |
| 40 | `breath_close` | Room 4B | ElevenLabs SFX | 2-3s |

## Priority 4: Needed by minute 8-10 (endings)
| # | Sound ID | Story | Tool | Duration |
|---|---|---|---|---|
| 9 | `rain_warm` | The Last Session | ElevenLabs SFX | 20-30s |
| 10 | `rain_cold` | The Last Session | ElevenLabs SFX | 20-30s |
| 11 | `piano_motif` | The Last Session | Stable Audio 2.5 | 3-5s |
| 12 | `door_knock` | The Last Session | ElevenLabs SFX | 2-3s |
| 13 | `birdsong` | The Last Session | ElevenLabs SFX | 10-15s |
| 22 | `storm_warm` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 23 | `storm_cold` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 24 | `radio_loop` | The Lighthouse | ElevenLabs SFX | 3-5s |
| 25 | `morning_calm` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 26 | `waves_gentle` | The Lighthouse | ElevenLabs SFX | 20-30s |
| 39 | `morning_light` | Room 4B | ElevenLabs SFX | 20-30s |
| 41 | `elevator_arrive` | Room 4B | ElevenLabs SFX | 4-5s |

## Optional: Voice-Based Supplementary (generate if time permits)
| # | Sound ID | Story | Tool | Duration |
|---|---|---|---|---|
| V2 | `radio_chatter_voices` | The Lighthouse | ElevenLabs SFX | 10-15s |
| V3 | `mayday_fragment` | The Lighthouse | ElevenLabs SFX | 2-3s |
| V6 | `pa_announcement` | Room 4B | ElevenLabs SFX | 5-6s |

---

# Skipped Entries (for reference)

The following cue-map entries were intentionally excluded from this document because they are runtime events, not audio files to generate:

**The Last Session:**
- `hvac_stop` -- gain_automation event on hvac channel
- `elevator_stop` -- gain_automation event on elevator channel
- `footsteps_stop` -- gain_automation event on footsteps channel
- `clock_stop` -- instant_stop event on clock channel
- `silence_full` -- mute_all event
- `clock_restart` -- reuses existing clock asset (generation_prompt: null)
- `all_sounds_return` -- restore_all_channels orchestration event (asset_path: null)

**The Lighthouse:**
- `machinery_stop` -- instant_stop event on lighthouse_machinery channel
- `foghorn_stop` -- stop_intermittent event on foghorn channel
- `storm_drop` -- gain_automation event on storm_wind + waves_crash channels
- `waves_close` -- gain_automation event on waves_crash channel
- `silence_absolute` -- mute_all event

**Room 4B:**
- `ventilation_stop` -- gain_automation event on ventilation channel
- `elevator_stop` -- gain_automation event on distant_elevator channel
- `fluorescent_flicker` -- volume_pattern automation on fluorescent_buzz channel
- `fluorescent_off` -- gain_automation event on fluorescent_buzz channel
- `silence_full` -- mute_all event
- `fluorescent_restore` -- reuses existing fluorescent_buzz asset (generation_prompt: null)
- `all_sounds_return` -- restore_all_channels orchestration event (asset_path: null)
