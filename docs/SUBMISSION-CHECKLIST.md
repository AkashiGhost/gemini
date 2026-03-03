# Gemini Live Agent Challenge — Submission Checklist

## Deadline
**March 16, 2026 at 5:00 PM PT** (14 days from March 2)

## Mandatory Requirements (must check ALL before submitting)

### Tech Requirements
- [ ] Uses Gemini model (minimum: `gemini-2.5-flash`)
- [ ] Uses Google GenAI SDK (`@google/genai`) — NOT ADK
- [ ] Backend hosted on Google Cloud (Cloud Run, Vertex AI, Firestore, etc.)
- [ ] At least one Google Cloud service actively used in submission
- [ ] Project is NEW (started on/after Feb 16, 2026)

### Submission Materials (Required)
- [ ] Text description (features, tech stack, learnings, third-party integrations disclosed)
- [ ] Public GitHub repository URL (must be accessible for judging through April 3)
- [ ] README.md with step-by-step spin-up instructions (local OR cloud deployment)
- [ ] GCP deployment proof (separate from demo video):
  - Either: Screen recording showing Cloud Run console/logs, or
  - A code file in repo demonstrating GCP API calls (e.g., Vertex AI, Firestore)
- [ ] Architecture diagram (visual representation: Gemini ↔ backend ↔ frontend flow)
- [ ] Demo video (YouTube or Vimeo, PUBLIC not unlisted):
  - Under 4 minutes (only first 4 min evaluated)
  - Shows actual working software (no mockups)
  - Pitches problem AND solution
  - English or English subtitles
- [ ] Category selection on Devpost: **Live Agents** (or alternative: Creative Storyteller / UI Navigator)

### Submission Requirements Checklist
- [ ] Submission form on Devpost completed with all required fields
- [ ] Text description includes:
  - Project features and functionality
  - Technologies used (SDKs, services, models)
  - Data sources (if any)
  - Learnings and findings
- [ ] README.md includes spin-up instructions (even if judges don't run, proves reproducibility)
- [ ] All third-party integrations declared in description
- [ ] No code containing ElevenLabs, Mistral, or other non-Google APIs (InnerPlay must use only Google AI)
- [ ] Repository is PUBLIC (not private)

## Judging Criteria (Scoring: 1–5 per criterion, then 1–6 final score)

### Innovation & Multimodal UX — 40%
- [ ] Breaks the "text box" paradigm (interaction is immersive, not chat-like)
- [ ] Agent handles interruptions/barge-in naturally (for Live Agents category)
- [ ] Distinct persona and voice
- [ ] Experience feels "live" and context-aware (not turn-based)
- [ ] Seamless multimodal integration (audio + text + potentially vision)

### Technical Implementation & Agent Architecture — 30%
- [ ] Effectively uses Google GenAI SDK
- [ ] Backend robustly hosted on Google Cloud (Cloud Run preferred)
- [ ] Handles errors, API timeouts, edge cases gracefully
- [ ] Agent avoids hallucinations
- [ ] Evidence of grounding (system prompts, knowledge bases, instruction-following)

### Demo & Presentation — 30%
- [ ] Video clearly defines problem and solution
- [ ] Architecture diagram is clear and visually organized
- [ ] Deployment proof is separate, shows GCP environment
- [ ] Actual working software demonstrated (not mockups)
- [ ] Professional presentation quality

## Bonus Opportunities (max +1.0 points)

- [ ] Published content (blog/podcast/video) covering the build:
  - Platform: Medium, Dev.to, YouTube, etc.
  - Status: PUBLIC (not unlisted)
  - Language: Includes statement "I created this for the Gemini Live Agent Challenge"
  - Social media: Tagged `#GeminiLiveAgentChallenge`
  - Points: +0.6 (per piece; multiple allowed)

- [ ] Automated cloud deployment:
  - Infrastructure-as-code scripts in repository (Terraform, Pulumi, Cloud Deployment Manager, etc.)
  - Points: +0.2

- [ ] Google Developer Group (GDG) membership:
  - Active member of a GDG chapter
  - Public profile link provided
  - Points: +0.2

## GCP Credits
- [ ] Applied for $100 in credits at forms.gle/rKNPXA1o6XADvQGb7
  - **Deadline: March 13 at 12:00 PM PT**
  - Approval timeline: within 72 business hours
- [ ] Responsible for any costs exceeding $100

## Red Flags — Do NOT Submit Without Checking

- [ ] Video is NOT unlisted (YouTube/Vimeo must be PUBLIC)
- [ ] README has clear, step-by-step spin-up instructions
- [ ] GitHub repository is PUBLIC
- [ ] NOT claiming to use ADK if using GenAI SDK (or vice versa)
- [ ] No code referencing ElevenLabs, Mistral, AWS, Anthropic, or other non-Google AI providers
- [ ] GCP deployment proof is a SEPARATE recording/doc from demo video
- [ ] All third-party integrations are declared in text description
- [ ] Project started after Feb 16, 2026 (verify commit history if questioned)
- [ ] Devpost account exists and is accessible
- [ ] Category selected matches InnerPlay's scope (Live Agents for voice-based gameplay)

## Timeline & Important Dates

| Date | Event | Action |
|------|-------|--------|
| Feb 16 – Mar 16, 2026 | Submission Period | Build and submit before **5:00 PM PT on March 16** |
| Mar 17 – Apr 3, 2026 | Judging Period | Judges evaluate submissions (do not submit edits) |
| **Mar 13, 12:00 PM PT** | GCP Credits Deadline | Apply for $100 credits if needed |
| Apr 8, 2026 (2-day window) | Winner Notification | **CRITICAL: Respond within 2 days or forfeit** |
| Apr 22–24, 2026 | Winners Announced | Google Cloud NEXT 2026 in Las Vegas |

## Prize Structure (Category-Based)

### Grand Prize (across all categories)
- $25,000 USD
- $3,000 Google Cloud Credits
- Virtual coffee with Google team
- Up to 2x Google Cloud NEXT tickets (value: $2,299 each)
- Up to 2x travel stipends ($3,000 USD each) for flights/hotel to Las Vegas
- Opportunity to present at Google Cloud NEXT 2026
- Social media promotion

### Category Winners (Live Agents / Creative Storyteller / UI Navigator)
- $10,000 USD per category
- $1,000 Google Cloud Credits
- Virtual coffee with Google team
- Recognition as Category Winner

### Subcategory Winners (Best Technical Execution, Best Innovation & Thought Leadership)
- $5,000 USD per subcategory
- $500 Google Cloud Credits
- Social media promotion

### Honorable Mentions (5 selected)
- $2,000 USD each
- $500 Google Cloud Credits each

**Total Prize Pool: $80,000 USD + Google Cloud credits**

## InnerPlay-Specific Compliance

### MUST Do
- [ ] Category: **Live Agents** (real-time audio/voice interaction, interruption-handling)
- [ ] Use `gemini-live-2.5-flash-native-audio` for live conversations
- [ ] Use `gemini-2.5-flash-lite` for intent/choice classification
- [ ] Backend on Cloud Run (WebSocket support)
- [ ] Eyes-closed voice-only gameplay (immersive, multimodal audio experience)
- [ ] Declare ElevenLabs ConvAI usage if using (for speech integration)
- [ ] Sound cues parsed from Gemini output
- [ ] Story state machine and rules engine included

### MUST NOT Do
- [ ] Do NOT mention Mistral, ElevenLabs primary APIs, Amazon Nova, or other AI providers in code repo
- [ ] Do NOT use pre-existing code (must start fresh for contest period)
- [ ] Do NOT claim ADK if using GenAI SDK
- [ ] Do NOT deploy on Vercel/AWS/other clouds (must be GCP only)
- [ ] Do NOT include unlisted/private videos
- [ ] Do NOT submit mockups as "working software"

## Video Demo Tips (for Judges)

1. **First 30 seconds:** Problem statement. "I built an AI therapy patient who traps you in a psychological horror experience."
2. **Next 2 minutes:** Live Gemini API handling natural interruptions, emotional responses, distinct voice/persona.
3. **Last minute:** Show results, learnings, technical elegance (backend handling, error recovery).
4. **Post-video:** Separate GCP deployment screen (logs, Cloud Run console, or code file with API calls).

**Key phrase from rules:** "Does the project break the 'text box' paradigm?" InnerPlay DOES — voice-only, eyes-closed, immersive.

## Winner Response Requirement

**CRITICAL — Only 2 days to respond after April 8 notification:**
- [ ] Check email regularly starting April 8, 2026
- [ ] Respond within 2 days to avoid disqualification
- [ ] Prepare to sign eligibility/liability forms
- [ ] If selected, provide team member details for potential Google Cloud NEXT travel

## Submission Links

- **Devpost:** geminiliveagentchallenge.devpost.com
- **GCP Credits Form:** forms.gle/rKNPXA1o6XADvQGb7
- **GCP Free Trial:** cloud.google.com/free
- **GitHub:** (your public repo URL here once created)
- **Demo Video:** (YouTube or Vimeo public link here once uploaded)

---

## Final Verification Before Submit

- [ ] Ran `tsc --noEmit` — no TypeScript errors
- [ ] Ran `npx tsx scripts/closed-loop-scenario.ts` — tool-call closed-loop checks pass (exit code `0`)
- [ ] Demo video is under 4 minutes
- [ ] Video is PUBLIC on YouTube/Vimeo (not unlisted/private)
- [ ] All links in submission are correct and functional
- [ ] README instructions tested (at least once locally)
- [ ] GCP deployment recording separate from demo
- [ ] Architecture diagram is clear and professional
- [ ] Text description has no spelling/grammar errors
- [ ] Category correctly selected: **Live Agents**
- [ ] Bonus materials listed (if applicable)

## Closed-Loop CLI Verification

- Command: `npx tsx scripts/closed-loop-scenario.ts`
- Purpose: verifies deterministic parsing of live tool calls (`trigger_sound`, `set_tension`, `end_game`) and expected phase outcomes from tension updates.
- Pass/Fail:
  - `0` exit code: all scenarios passed
  - non-zero exit code: one or more scenarios failed; inspect per-case diagnostics in terminal
- Reference: `docs/verification/closed-loop.md`

---

**Status:** ⬜ Ready for submission | 🟡 In progress | 🟢 Submitted
