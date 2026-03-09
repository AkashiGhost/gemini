# Me and Mes Design

Date: 2026-03-09
Status: Approved direction for v1 planning
Scope: Flagship personalized game design for the current InnerPlay runtime

## Goal

Create a flagship InnerPlay experience where the player enters an inner chamber and confronts multiple functional selves inside one mind, using the current live runtime and creator pipeline.

---

## Core Premise

The player is guided by a neutral facilitator voice.

The facilitator studies how the player reacts, then opens the door to a chamber where multiple selves are waiting. These selves are not random emotions. They are functional internal roles:

1. what reacts first
2. what protects second
3. what gets buried
4. what secretly wants control

The game is about witnessing, negotiating, silencing, empowering, or integrating these selves.

---

## Runtime Strategy

V1 should be:

1. `single live voice`
2. `cast illusion`
3. `creator-built`
4. `Playwright/debugText verified`

Do not require true multi-voice runtime in v1.

The “multiple selves” effect should come from:

1. diction
2. pacing
3. temperature
4. sound bed
5. transcript framing
6. agenda

---

## Opening Structure

The user chose:

1. `facilitator only first`
2. then explicit transition
3. then the room appears

So the opening must be:

## Phase 1: Orientation

The facilitator explains the rule quickly.

Example shape:

`Answer plainly. I am here to show you what speaks first inside you.`

## Phase 2: Calibration

3 to 5 situational questions, poetic and eerie but still precise.

The purpose is not trait labeling.

The purpose is sequence detection:

1. trigger
2. first appraisal
3. first emotion
4. protector response
5. what gets buried

## Phase 3: Threshold

The facilitator says:

`OK. Now you're going to enter the room.`

Then the selves begin appearing.

---

## Psychological Model

The game should be built on:

1. emotion appraisal
2. emotion regulation
3. psychological flexibility
4. attachment patterning
5. parts/selves as the player-facing language

So the game presents:

1. `The Alarm`
2. `The Prosecutor`
3. `The Diplomat`
4. `The Ghost`
5. `The Hunger`
6. `The Witness`

These are not decorative. Each must have:

1. function
2. demand
3. fear
4. accusation
5. desired ending

---

## Branch Structure

Branch on inner process, not surface morality.

## Axis 1: What comes first

1. fear
2. shame
3. anger
4. grief
5. numbness / control

## Axis 2: What takes over second

1. attack
2. appease
3. withdraw
4. intellectualize
5. over-perform

## Axis 3: What the player protects most

1. belonging
2. competence
3. autonomy
4. innocence
5. hope

This gives much stronger branching than simple “good / bad / curious / defiant”.

---

## What Makes The Game Playable

The game works only if:

1. the player understands the concept within 1 minute
2. the facilitator clearly explains the rule
3. by turn 2, one emotionally accurate inference lands
4. by turn 4, a second self contradicts the first
5. the player knows what they can do next

Allowed player actions should feel obvious:

1. answer
2. challenge
3. ask one self to speak
4. silence one self
5. ask what another self is protecting

---

## What Makes The Game Confusing

Avoid:

1. generic therapy language
2. abstract “how do you feel” dialogue
3. too many selves too early
4. no visible rule for why a self appears
5. voices that differ only in prose, not in function
6. the player not knowing whether this is confession, roleplay, or puzzle

---

## Phase Outline

Recommended creator-phase structure:

1. `Assessment`
- facilitator only
- situational calibration questions

2. `First Manifestation`
- first self appears
- first contradiction lands

3. `Cross-Examination`
- second and third selves challenge the first interpretation

4. `Power Struggle`
- the selves try to win authority
- the player decides who gets power

5. `Integration or Fragmentation`
- player ends by integrating, suppressing, empowering, or abandoning parts of the self

---

## Sound Strategy

V1 should not use noisy literal cues.

Use emotional-space cues:

1. chamber hum
2. tonal interruption for protector takeover
3. close-breath intimacy for grief
4. pulse escalation for conflict
5. thin high-frequency pressure when shame dominates

This should remain compatible with the current `ambient_first_live` approach.

---

## Creator Workflow

Use the real `/create` GUI first.

Required workflow:

1. research the target user persona
2. write facilitator-led concept prompt
3. generate story pack in `/create`
4. manually tighten:
   - title
   - opening line
   - phase outline
   - system prompt
5. publish
6. test on hosted site with `debugText=1`
7. iterate until branch quality is strong

---

## Evaluation Loop

Use Playwright/debugText with fixed test personas.

Required personas:

1. skeptical first-time user
2. shame-dominant user
3. anger-first user
4. avoidant/intellectualizing user

Fail the game if:

1. the concept is unclear by turn 2
2. selves are not functionally distinct by turn 4
3. player cannot tell what to say next
4. branch outputs feel interchangeable

---

## Current Platform Constraints

Important current constraint:

1. published stories currently expose one visible `characterName`
2. the cast must therefore live in prompt/runtime behavior in v1
3. do not wait for cast manifest schema before building the first version

So v1 should be:

1. one visible facilitator label
2. internal selves surfaced through transcript content and controlled prompt behavior

---

## UX Dependencies

Before polish, the platform should add:

1. onboarding `Back`
2. onboarding `Exit`
3. onboarding `Skip intro`

These are especially important for `Me and Mes`, because the calibration stage must feel deliberate, not trapping.

---

## v1 Recommendation

Build `Me and Mes` first as:

1. facilitator-first opening
2. poetic and eerie but precise calibration
3. one live voice
4. cast illusion
5. branch logic based on inner sequence
6. creator-loop tested on the live site

