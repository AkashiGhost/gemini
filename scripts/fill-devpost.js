// Playwright script to fill Devpost submission form
// DOES NOT submit — only fills fields on Steps 1, 2, and 3.
// Run with: node scripts/fill-devpost.js

const { chromium } = require('playwright');
const path = require('path');

const OUTPUT_DIR = 'C:/Users/akash/Desktop/AI_projects/InnerPlay/hackathons/gemini/output';

// Devpost submission URLs (one per step)
const URLS = {
  step1: 'https://devpost.com/submit-to/28633-gemini-live-agent-challenge/manage/submissions/951748/project-overview',
  step2: 'https://devpost.com/submit-to/28633-gemini-live-agent-challenge/manage/submissions/951748/project-details',
  step3: 'https://devpost.com/submit-to/28633-gemini-live-agent-challenge/manage/submissions/951748/additional-info',
};

// ── Cookies ──────────────────────────────────────────────────────────────────
const COOKIES = [
  { domain: '.devpost.com', name: '_devpost', value: 'VE9heWRzcllvbkJrSFpQSHdldStjZWVKWkRqYUdBQlprTmg0L0kvdTRQK0R0T1RCcE5GZ25ITVFQY1JjZWFnbkVoclYwUnNqR1Q1VFd5MHI3bXN6MFdOZy9UU1V1OVp2U3E1Y2tkRVUvMnhWTmw4ZHArQzdxU1l1b1JYb005K1lxeHEyWGlUQ1ROUHVkMjNjb05iTzd5RzN0MHhtWWYxVnQ1WU5wMFhKZFVJMDFLQzdkRTVvUVg3ZFRQaFA0d3hDbVVSbXRqcm1ZVTNpNTJUYVhTY0E3aHZva1JjbVRnRTRQY0FSSjhrQUxjMUN6ZjNDTVlIeWJ6UVdsSGxKa240b0cxZlY0TmpsT1Y2VDMxeVBYNDZBOHYxcDBZU0oyV09NOEU2Vjg3STZvTVVxYXNGcjB3Y0k0dmxiWHhQUG5BUklkZTZ3d2Y0Q2JiMGw2WVZ4bHlFTkVhV0RXaHBTSGVJekZuMlVwV1BIbnVPZG9iSEZDNzM4Nm5ES2ZBT1ZVVGJNdUF6eGZCR05lUHFmcjVHZkR1R0kwZXA0aGhOeGIvREE2Y2VWY3Bma3V6Q25SRVRMWktEelNKOWlHc09kanlTd1UwakcyQWl1aDdUTUJtaGdqZVdTR2JHQlhYUzJyVWk2MzR0YlpkN3puR056YzRoc3E3dGtmQ0JmUjllSFlvckpXNlM0c0k2RjR2NGIxWEp6N3dGSnVPWGRhdmxSMzkrc1ppc01CcVpmOG5sRnFORFU5aG11UEJDa0VBSkN4QklKb1NpTkxMbSsyWlhUaUVHZlVMNERPZz09LS1OaDlCNFlkcXdvZXp0Z2FDSUgvajRRPT0%3D--68938dca84413514a0b8ca7f0ce8eecf5eb04b30', path: '/', httpOnly: true, secure: true },
  { domain: '.devpost.com', name: 'jwt', value: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTAyMTMyNDF9.1QYh7mVG_EOY4rH26nbbd9KDI-8Yqh54Mc6cZ3ow0qY', path: '/', httpOnly: true, secure: true },
  { domain: '.devpost.com', name: 'remember_user_token', value: 'W1sxMDIxMzI0MV0sIk14d1JwbXhYVkdzWG16cWFmVDg5IiwiMTc3MzU5Nzg0MS4wMjMzNDk1Il0%3D--f317e70d22336554423b72a598e2d556d094bf18', path: '/', httpOnly: true, secure: true },
  { domain: '.devpost.com', name: '_ga', value: 'GA1.1.1819464861.1773597988', path: '/', httpOnly: false, secure: false },
  { domain: '.devpost.com', name: '_ga_0YHJK3Y10M', value: 'GS2.1.s1773597987$o1$g0$t1773598047$j60$l0$h0', path: '/', httpOnly: false, secure: false },
  { domain: '.devpost.com', name: 'CookieControl', value: '{"necessaryCookies":["__zlcmid","__mp_opt_in_out_*","platform.notifications.newsletter.dismissed","AWSALB","AWSALBCORS"],"optionalCookies":{},"initialState":{"type":"closed"},"statement":{},"consentDate":1772185848771,"consentExpiry":90,"interactedWith":true,"user":"860DA5A5-F90C-443F-A3C4-857231D1838A"}', path: '/', httpOnly: false, secure: false },
  { domain: '.devpost.com', name: 'aws-waf-token', value: 'a2f1e9a0-3661-4025-b9fc-e83e4bf656a5:EQoAdSB/xSlYAAAA:AoSoC8llIodiQ2OKcosoyLC0kScrKw4PikKVQW+4RChIaI+U8mvy9jyMYLb6JmQhzCY7VJTlWHKMeul2JtN51mqXojKPHVVVao3ULCLgdlKUXFOD/WZZH33xtG0GNakPfApR3FJ3aR2HCR41YuJIJduin7ubqpyd13Y3991T4yTbxvicuu+goTWHM1Sz6+YvF1xYYDfx7wlf8ECJm33Jbnb2xg0P/hxQmkgdyT1z72VUgOfOnTpqV+0HzbovOIN95ofWtTdV3Q==', path: '/', httpOnly: false, secure: true },
  { domain: 'devpost.com', name: 'AWSALB', value: 'dFPxE2i0gacXpp89vfcpUK3oeeNHhWUc3M92rhXds5sNL1ut6nnLdz0Xkhlo0dw9Pfdf51zsuorwtxwffv6DiGmHiTd4NRMe89G3+NKzMrLrs3/MERAEp6hL5byh', path: '/', httpOnly: false, secure: false },
  { domain: 'devpost.com', name: 'AWSALBCORS', value: 'dFPxE2i0gacXpp89vfcpUK3oeeNHhWUc3M92rhXds5sNL1ut6nnLdz0Xkhlo0dw9Pfdf51zsuorwtxwffv6DiGmHiTd4NRMe89G3+NKzMrLrs3/MERAEp6hL5byh', path: '/', httpOnly: false, secure: true },
];

// ── Form content ──────────────────────────────────────────────────────────────

// STEP 1
const PROJECT_NAME    = 'InnerPlay';
const ELEVATOR_PITCH  = 'The first game designed to be played with your eyes closed — voice-only AI storytelling powered by Gemini Live.';

// STEP 2 — Project details
const PROJECT_STORY = `## Inspiration

Every immersive experience I have tried — VR, AR, escape rooms, audio dramas — still asks you to look at something. A screen. A headset lens. A room. The technology becomes the object of attention, and the experience shrinks to fit around it.

There is a better engine available: the human imagination. When you close your eyes in a dark room, your brain does not go quiet. It renders. Give it a compelling voice, spatially placed sound, and a character that reacts to you, and it builds something no GPU can match.

InnerPlay started from one design constraint: remove the screen entirely. If a player must open their eyes to interact with the game, the experience has failed.

## What It Does

InnerPlay is the first game designed to be played with your eyes closed.

Players put on headphones, speak the command "begin," and enter a ten-minute story powered by a live Gemini voice agent. There is no interface to navigate, no text to read, no controller to hold. The AI character responds to what you say, how you say it, the length of your pauses, and a player profile that captures your emotional self-portrait — your life stage, values, recurring fears, and conflict style. No two sessions sound the same.

Stories are not branching trees. They are living conversations constrained by arc structure. The AI holds a narrative direction and tension level while staying genuinely responsive to the specific player in the room. If you challenge the character, the story escalates. If you go quiet, the silence becomes part of the experience.

The current catalogue includes:
- The Call — a thriller. You answer a phone. The person on the other end knows more about you than they should.
- The Last Session — psychological horror. Your therapist has scheduled one final appointment.
- The Lighthouse — cosmic horror. Something has been watching from offshore for a very long time.
- Room 4B — body horror. You wake up in a medical facility with no memory of checking in.
- Exit Interview — corporate horror. The HR rep at the end of the table is not reviewing your performance. She is reviewing your choices.
- Me and Mes — inner dialogue. A neutral facilitator maps your functional selves.

Three layers of spatial audio run continuously: ambient environment, adaptive music, and the character's live voice.

## How We Built It

The runtime is built around persistent Gemini Live WebSocket sessions using gemini-live-2.5-flash-native-audio via the Google GenAI SDK (@google/genai). Every story opens a native audio session: the browser streams microphone audio directly to Gemini, and Gemini streams synthesized voice audio back in real time. No intermediate speech-to-text or text-to-speech pipeline sits in between.

Each session is initialized with a system prompt that encodes the character's persona, the story's current phase, the tension target, and a bounded slice of the player's profile. Stories are defined as YAML documents validated against AJV schemas.

Gemini produces inline tool calls (trigger_sound, set_tension, end_game) embedded in its output stream. A sanitization layer strips these from the visible transcript before display.

Players complete a questionnaire that produces a PlayerProfile stored in localStorage. At session start, a bounded GameProfileContext slice is injected into the system prompt.

The Web Audio API manages three independent audio layers: ambient environment, tension-aware music, and Gemini's live voice stream positioned spatially in the stereo field.

The Next.js application runs on Google Cloud Run behind a custom server built with tsx to support persistent WebSocket connections. The /api/live-token endpoint mints short-lived ephemeral tokens for Gemini Live sessions. The Docker container is deployed to us-central1 and scales to zero between sessions.

## Challenges

Opening-Turn Lockup: When Gemini completed an opening turn without producing any audio or text payload, the state machine refused to release the microphone. We instrumented 11 startup timing stages before the real cause became visible.

Transient 1008 WebSocket Closes: Gemini Live sessions occasionally close with a 1008 policy violation before the first transcript arrives. The fix was a classification layer that distinguishes retryable transient closes from permanent configuration errors.

Sanitizing Tool Syntax from the Transcript: Without sanitization, the visible transcript would include raw function call syntax mixed into the story dialogue. We built a streaming sanitizer that detects and strips tool call blocks in real time.

Structured Arc vs. Freeform Generation: The hardest product problem — how to constrain an open-ended model to follow a narrative arc without making it feel scripted. The solution was phase-gated instruction injection.

## Accomplishments That We're Proud Of

A working eyes-closed game. This sounds simple but it took every layer of the system working correctly together: reliable session startup, voice-first interaction, spatial audio, and a story engine that holds narrative tension without a visible UI.

The creator pipeline. A storyteller with no coding background can describe a story concept, have a multi-turn conversation with an interview agent, and publish a playable live-voice story in under twenty minutes.

Player profile personalization without a database. The PlayerProfile system provides meaningful story conditioning from localStorage alone.

Zero-UI positioning. Every design decision pushed the technology into the background. The sound layers fade in before the first word is spoken.

## What We Learned

The live API's failure modes are subtle. The most dangerous issues were not crashes — they were silent hangs. The instrumentation we added turned invisible problems into measurable ones.

Voice-first design requires different constraints than text-first. In a voice interface, confusion is permanent — the moment is gone. Every opening line had to be tuned for one-shot comprehension at audio speed.

Short-form is the right format for this medium. Ten minutes is not a limitation — it is the design.

The brain is the best rendering engine. Players described seeing things they knew were not there. Gemini's voice did not describe those things in detail. The player's imagination did.

## What's Next

More stories across genres — mystery, romance, existential comedy, sci-fi. Multiplayer voice sessions with two players and one AI narrator. Community creator tools for public story publishing. Mobile-native release. Lyria adaptive music at full fidelity. Cross-session memory so the AI remembers how you played previous stories.`;

const BUILT_WITH_TAGS = [
  'gemini-live-2.5-flash-native-audio',
  'gemini-2.5-flash',
  'google-genai-sdk',
  'google-cloud-run',
  'nextjs-16',
  'react-19',
  'typescript',
  'web-audio-api',
  'docker',
  'yaml',
  'ajv',
  'vitest',
  'playwright',
  'lyria-experimental',
];

const DEMO_URL         = 'https://innerplay.app';
const VIDEO_URL        = ''; // leave blank — no video URL available yet

// STEP 3 — Additional info
// Field indices from the dump:
//   [0] Submitter Type  (select/radio)
//   [1] Organization name (optional text)
//   [2] Country of residence (Select2 dropdown)
//   [3] Category (select)
//   [4] Project start date (text, MM-DD-YY)
//   [5] URL to public code repo
//   [6] Reproducible testing in README? (select)
//   [7] URL to proof of GCP deployment
//   [8] Architecture diagram location (Select2 multi)
//   [9] OPTIONAL: blog/video content URL
//   [10] OPTIONAL: IaC/deployment automation URL
//   [11] OPTIONAL: GDG profile URL

const STEP3 = {
  submitterType:   'Individual',  // select option text
  orgName:         '',            // blank (individual)
  country:         'India',       // Select2 search text
  category:        'Live Agents', // select option text
  startDate:       '01-15-26',    // MM-DD-YY (Jan 15 2026)
  codeRepoUrl:     'https://github.com/AkashiGhost/gemini',
  readmeTestingYes: 'Yes',        // select option
  gcpProofUrl:     'https://innerplay-gemini-443171020325.us-central1.run.app',
  archDiagram:     'Image carousel', // exact value from <select> options
  blogUrl:         '',
  deployAutomationUrl: 'https://github.com/AkashiGhost/gemini/blob/master/Dockerfile',
  gdgUrl:          '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPWCookies(list) {
  return list.map(c => ({
    name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
    httpOnly: !!c.httpOnly, secure: !!c.secure, sameSite: 'Lax',
  }));
}

async function ss(page, name) {
  const p = path.join(OUTPUT_DIR, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  [screenshot] ${name}`);
}

// Fill a plain input or textarea
async function fill(page, selector, value, label = selector) {
  const el = page.locator(selector).first();
  if (await el.count() === 0) { console.log(`  [miss] ${label}`); return false; }
  await el.fill(value);
  console.log(`  [OK] ${label}`);
  return true;
}

// Select a <select> option by visible text
async function selectByText(page, selector, optionText, label = selector) {
  const el = page.locator(selector).first();
  if (await el.count() === 0) { console.log(`  [miss] ${label}`); return false; }
  await el.selectOption({ label: optionText });
  console.log(`  [OK] ${label} = "${optionText}"`);
  return true;
}

// Select2 single-select: click trigger, type search text, pick first match
async function select2Single(page, containerSelector, searchText, label = containerSelector) {
  try {
    const container = page.locator(containerSelector).first();
    if (await container.count() === 0) { console.log(`  [miss] ${label}`); return false; }
    // Click the Select2 arrow/trigger
    await container.click();
    await page.waitForTimeout(400);
    // Type in the search box that appears
    const searchInput = page.locator('.select2-search__field, .select2-input').last();
    await searchInput.type(searchText, { delay: 50 });
    await page.waitForTimeout(600);
    // Click the first result
    const result = page.locator('.select2-results__option, .select2-result').first();
    if (await result.count() > 0) {
      await result.click();
      console.log(`  [OK] ${label} = "${searchText}"`);
      return true;
    }
    console.log(`  [miss result] ${label} search="${searchText}"`);
    return false;
  } catch (e) {
    console.log(`  [error] ${label}: ${e.message}`);
    return false;
  }
}

// Select2 multi-select: add one option
async function select2Multi(page, containerSelector, optionText, label = containerSelector) {
  return select2Single(page, containerSelector, optionText, label);
}

// Bootstrap tagsinput: type tag + Enter
async function addTag(page, inputSelector, tagText) {
  const el = page.locator(inputSelector).first();
  if (await el.count() === 0) return false;
  await el.click();
  // Clear any existing value first
  await el.fill('');
  await el.type(tagText, { delay: 20 });
  await page.waitForTimeout(300);
  // Press Enter to confirm
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  // Fallback: if text still in input, try Tab
  const remaining = await el.inputValue().catch(() => '');
  if (remaining.trim()) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
  }
  return true;
}

// Add a technology tag to the Select2 multi-tag Built With field
async function addBuiltWithTag(page, tech) {
  // The outer container for the tag-input is .select2-choices (a <ul>)
  // Clicking it focuses the inner search input without the mask issue
  const choices = page.locator('.select2-choices').first();
  if (await choices.count() === 0) { console.log(`  [miss] .select2-choices`); return false; }

  // Click the container to open/focus
  await choices.click();
  await page.waitForTimeout(200);

  // Type into the now-focused search input
  await page.keyboard.type(tech, { delay: 25 });
  await page.waitForTimeout(500);

  // The dropdown shows results — press Enter to pick the first
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  // If a result didn't get selected and dropdown is still open, press Escape
  const dropMask = page.locator('#select2-drop-mask');
  if (await dropMask.count() > 0 && await dropMask.isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  return true;
}

// ── STEP 1: Project Overview ─────────────────────────────────────────────────
async function fillStep1(page) {
  console.log('\n=== STEP 1: Project Overview ===');
  await page.goto(URLS.step1, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Guard against auth redirect
  if (page.url().includes('/login') || page.url().includes('/sign_in')) {
    throw new Error('Redirected to login — cookies expired');
  }

  await ss(page, '01-step1-before.png');

  // Dump Step 1 fields for diagnostics
  const fields = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input:not([type=hidden]), textarea')).map(el => ({
      id: el.id, name: el.name, type: el.type, placeholder: el.placeholder,
    }))
  );
  console.log('  Step 1 fields:', JSON.stringify(fields));

  // Project name — real ID discovered: participants_manage_project_overview_title
  await fill(page, '#participants_manage_project_overview_title', PROJECT_NAME, 'project name') ||
    await fill(page, 'input[name="participants_manage_project_overview[title]"]', PROJECT_NAME, 'project name') ||
    await fill(page, '#project_name', PROJECT_NAME, 'project name') ||
    await fill(page, 'section input[type="text"]', PROJECT_NAME, 'project name (fallback)');

  // Elevator pitch — real ID: participants_manage_project_overview_tagline
  // Note: Devpost renders it as input[type=textarea] (unusual) — use fill() which handles both
  await fill(page, '#participants_manage_project_overview_tagline', ELEVATOR_PITCH, 'elevator pitch') ||
    await fill(page, 'textarea[name="participants_manage_project_overview[tagline]"]', ELEVATOR_PITCH, 'elevator pitch') ||
    await fill(page, '#project_elevator_pitch', ELEVATOR_PITCH, 'elevator pitch') ||
    await fill(page, 'textarea:not([name*="search"])', ELEVATOR_PITCH, 'elevator pitch (fallback)');

  await ss(page, '02-step1-filled.png');

  // Click Save & continue
  console.log('  Clicking Save & continue...');
  await page.locator('input[value="Save & continue"], button:has-text("Save & continue")').first().click();
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('  Step 1 saved. Current URL:', page.url());
}

// ── STEP 2: Project Details ──────────────────────────────────────────────────
async function fillStep2(page) {
  console.log('\n=== STEP 2: Project Details ===');

  // Navigate directly to step 2 URL to be safe
  if (!page.url().includes('/project-details') && !page.url().includes('project_details')) {
    await page.goto(URLS.step2, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
  }

  await ss(page, '03-step2-before.png');

  // About the project — plain textarea `#software_description`
  // It has placeholder "## Inspiration..." indicating markdown-in-textarea
  await fill(page, '#software_description', PROJECT_STORY, 'about the project') ||
    await fill(page, 'textarea[name="software[description]"]', PROJECT_STORY, 'about the project');

  // Built with — Select2 multi-tag widget (.select2-choices container)
  console.log('  Filling Built With tags...');
  let tagsFilled = 0;
  for (const tech of BUILT_WITH_TAGS) {
    const ok = await addBuiltWithTag(page, tech);
    if (ok) {
      tagsFilled++;
      console.log(`  [tag ${tagsFilled}] ${tech}`);
    } else {
      console.log(`  [tag miss] ${tech}`);
    }
  }
  console.log(`  [OK] ${tagsFilled}/${BUILT_WITH_TAGS.length} tags entered`);

  // "Try it out" URL
  await fill(page, '#software_urls_attributes_0_url', DEMO_URL, 'demo URL') ||
    await fill(page, 'input[name="software[urls_attributes][0][url]"]', DEMO_URL, 'demo URL') ||
    await fill(page, 'input[type="url"]', DEMO_URL, 'demo URL (type=url)');

  // Video demo link — leave blank if no URL
  if (VIDEO_URL) {
    await fill(page, '#software_video_url', VIDEO_URL, 'video URL') ||
      await fill(page, 'input[name="software[video_url]"]', VIDEO_URL, 'video URL');
  }

  await ss(page, '04-step2-filled.png');

  // Click Save & continue
  console.log('  Clicking Save & continue...');
  await page.locator('input[value="Save & continue"], button:has-text("Save & continue")').first().click();
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('  Step 2 saved. Current URL:', page.url());
}

// Click a Select2 single-select container, search, pick first result
async function select2Search(page, containerIndex, searchText, label) {
  try {
    const containers = await page.locator('.select2-container').all();
    if (containerIndex >= containers.length) {
      console.log(`  [miss] select2 container[${containerIndex}] (only ${containers.length} found)`);
      return false;
    }
    await containers[containerIndex].click();
    await page.waitForTimeout(500);
    // Type into the active search box
    await page.keyboard.type(searchText, { delay: 40 });
    await page.waitForTimeout(700);
    // Click the first visible result
    const result = page.locator('.select2-result-label, .select2-results__option').first();
    if (await result.count() > 0) {
      await result.click();
      console.log(`  [OK] ${label} = "${searchText}"`);
      await page.waitForTimeout(300);
      return true;
    }
    // No result matched — press Escape to close
    await page.keyboard.press('Escape');
    console.log(`  [miss result] ${label} search="${searchText}"`);
    return false;
  } catch (e) {
    await page.keyboard.press('Escape').catch(() => {});
    console.log(`  [error] ${label}: ${e.message.split('\n')[0]}`);
    return false;
  }
}

// ── STEP 3: Additional Info ──────────────────────────────────────────────────
async function fillStep3(page) {
  console.log('\n=== STEP 3: Additional Info ===');

  if (!page.url().includes('/additional-info') && !page.url().includes('additional_info')) {
    await page.goto(URLS.step3, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
  }

  await ss(page, '05-step3-before.png');

  // Count Select2 containers for debugging
  const s2Count = await page.locator('.select2-container').count();
  console.log(`  Select2 containers on page: ${s2Count}`);

  // [0] Submitter Type — plain <select>
  const submitterSel = '#participants_submission_requirements_submission_field_values_attributes_0_value';
  // Try exact match first, then partial
  await selectByText(page, submitterSel, STEP3.submitterType, 'submitter type') ||
    await page.locator(submitterSel).first().selectOption({ label: 'Individual' }).then(() => console.log('  [OK] submitter type (direct)')).catch(() => {});

  // [1] Organization name — optional, leave blank

  // [2] Country of residence — Select2 wraps a hidden <select multiple>
  // Bypass Select2: set value directly on the underlying <select>, then trigger change
  const countrySel = '#participants_submission_requirements_submission_field_values_attributes_2_values';
  try {
    await page.locator(countrySel).selectOption({ value: STEP3.country });
    // Trigger change event so Select2 syncs its UI
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    }, countrySel);
    console.log(`  [OK] country = "${STEP3.country}"`);
  } catch (e) {
    // Fallback: use Select2 search but click an exact text match
    console.log(`  [fallback] country selectOption failed: ${e.message.split('\n')[0]}`);
    await select2Search(page, 0, STEP3.country, 'country');
  }

  // [3] Category — plain <select>
  const catSel = '#participants_submission_requirements_submission_field_values_attributes_3_value';
  // "Live Agents" may be shown as exact text or contain it
  const catFilled = await selectByText(page, catSel, STEP3.category, 'category');
  if (!catFilled) {
    // Try selecting by value/partial match
    try {
      const opts = await page.locator(`${catSel} option`).all();
      for (const opt of opts) {
        const txt = await opt.textContent();
        if (txt && txt.toLowerCase().includes('live agent')) {
          const val = await opt.getAttribute('value');
          await page.locator(catSel).selectOption({ value: val });
          console.log(`  [OK] category (partial match) = "${txt.trim()}"`);
          break;
        }
      }
    } catch (e) {
      console.log(`  [error] category: ${e.message.split('\n')[0]}`);
    }
  }

  // [4] Start date MM-DD-YY
  const dateSel = '#participants_submission_requirements_submission_field_values_attributes_4_value';
  await fill(page, dateSel, STEP3.startDate, 'start date');

  // [5] Code repo URL
  const repoSel = '#participants_submission_requirements_submission_field_values_attributes_5_value';
  await fill(page, repoSel, STEP3.codeRepoUrl, 'code repo URL');

  // [6] Reproducible testing in README — plain <select>
  const readmeSel = '#participants_submission_requirements_submission_field_values_attributes_6_value';
  await selectByText(page, readmeSel, 'Yes', 'readme testing');

  // [7] GCP proof URL
  const gcpSel = '#participants_submission_requirements_submission_field_values_attributes_7_value';
  await fill(page, gcpSel, STEP3.gcpProofUrl, 'GCP proof URL');

  // [8] Architecture diagram location — Select2 wraps a hidden <select multiple>
  // Options: "Image carousel", "File upload", "Code repo"
  // Select "Image carousel" (architecture diagram was uploaded to gallery)
  const archSel = '#participants_submission_requirements_submission_field_values_attributes_8_values';
  try {
    await page.locator(archSel).selectOption({ value: 'Image carousel' });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    }, archSel);
    console.log(`  [OK] arch diagram = "Image carousel"`);
  } catch (e) {
    console.log(`  [fallback] arch diagram selectOption failed: ${e.message.split('\n')[0]}`);
    await select2Search(page, 1, 'Image carousel', 'arch diagram');
  }

  // [10] Deployment automation URL (optional bonus)
  if (STEP3.deployAutomationUrl) {
    const deployAutomSel = '#participants_submission_requirements_submission_field_values_attributes_10_value';
    await fill(page, deployAutomSel, STEP3.deployAutomationUrl, 'deploy automation URL');
  }

  await ss(page, '06-step3-filled.png');

  // Scroll to bottom for full-page view
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await ss(page, '07-step3-filled-bottom.png');

  console.log('\n  Step 3 filled. NOT clicking Save & continue (per instructions).');
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  await context.addCookies(toPWCookies(COOKIES));
  console.log('Cookies loaded.');

  const page = await context.newPage();

  try {
    await fillStep1(page);
    await fillStep2(page);
    await fillStep3(page);

    console.log('\n=== ALL STEPS FILLED. FORM NOT SUBMITTED. ===');
    console.log('Screenshots in:', OUTPUT_DIR);
  } catch (err) {
    console.error('\nFATAL:', err.message);
    await ss(page, 'error-state.png');
  }

  console.log('\nBrowser staying open for review (10 min). Ctrl+C to close early.');
  await page.waitForTimeout(600000);
  await browser.close();
})();
