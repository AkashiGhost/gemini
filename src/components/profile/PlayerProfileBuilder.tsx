"use client";

import { useMemo, useState } from "react";
import {
  buildGameProfileContext,
  clearPlayerProfile,
  createPlayerProfileDraft,
  type PlayerProfileProvider,
  type PlayerProfileV1,
  savePlayerProfile,
} from "@/lib/player-profile";

interface PlayerProfileBuilderProps {
  initialProfile?: PlayerProfileV1 | null;
  onProfileSave: (profile: PlayerProfileV1) => void;
  onProfileClear: () => void;
}

interface ProfileFormState {
  selfDescription: string;
  currentLifeStage: string;
  importedMemory: string;
  importedMemoryProvider: PlayerProfileProvider;
  coreValues: string;
  recurringGoals: string;
  dominantEmotions: string;
  avoidedEmotions: string;
  emotionalHotspots: string;
  unfinishedDecisions: string;
  desiredIdentities: string;
  fearedIdentities: string;
  hardLimits: string;
  protectedTopics: string;
  conflictStyle: PlayerProfileV1["behavioralProfile"]["conflictStyle"];
  pressureTolerance: PlayerProfileV1["behavioralProfile"]["pressureTolerance"];
  roastTolerance: PlayerProfileV1["behavioralProfile"]["roastTolerance"];
  attachmentTendency: PlayerProfileV1["behavioralProfile"]["attachmentTendency"];
  personalizedGamesApproved: boolean;
  importedMemoryApproved: boolean;
  roastModeApproved: boolean;
}

const DEFAULT_FORM_STATE: ProfileFormState = {
  selfDescription: "",
  currentLifeStage: "",
  importedMemory: "",
  importedMemoryProvider: "chatgpt",
  coreValues: "",
  recurringGoals: "",
  dominantEmotions: "",
  avoidedEmotions: "",
  emotionalHotspots: "",
  unfinishedDecisions: "",
  desiredIdentities: "",
  fearedIdentities: "",
  hardLimits: "",
  protectedTopics: "",
  conflictStyle: "mixed",
  pressureTolerance: "medium",
  roastTolerance: "medium",
  attachmentTendency: "unknown",
  personalizedGamesApproved: true,
  importedMemoryApproved: false,
  roastModeApproved: false,
};

function joinList(values: string[]): string {
  return values.join("\n");
}

function splitList(value: string): string[] {
  return value
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formStateFromProfile(profile: PlayerProfileV1): ProfileFormState {
  return {
    selfDescription: profile.identitySummary.selfDescription,
    currentLifeStage: profile.identitySummary.currentLifeStage,
    importedMemory: profile.narrativeProfile.selfStoryFragments.join("\n"),
    importedMemoryProvider: profile.source.importedMemoryProvider ?? "chatgpt",
    coreValues: joinList(profile.identitySummary.coreValues),
    recurringGoals: joinList(profile.identitySummary.recurringGoals),
    dominantEmotions: joinList(profile.emotionalMap.dominantEmotions),
    avoidedEmotions: joinList(profile.emotionalMap.avoidedEmotions),
    emotionalHotspots: joinList(profile.emotionalMap.emotionalHotspots),
    unfinishedDecisions: joinList(profile.narrativeProfile.unfinishedDecisions),
    desiredIdentities: joinList(profile.narrativeProfile.desiredIdentities),
    fearedIdentities: joinList(profile.narrativeProfile.fearedIdentities),
    hardLimits: joinList(profile.safety.hardLimits),
    protectedTopics: joinList(profile.safety.protectedTopics),
    conflictStyle: profile.behavioralProfile.conflictStyle,
    pressureTolerance: profile.behavioralProfile.pressureTolerance,
    roastTolerance: profile.behavioralProfile.roastTolerance,
    attachmentTendency: profile.behavioralProfile.attachmentTendency,
    personalizedGamesApproved: profile.consent.personalizedGamesApproved,
    importedMemoryApproved: profile.consent.importedMemoryApproved,
    roastModeApproved: profile.consent.roastModeApproved,
  };
}

export function PlayerProfileBuilder({
  initialProfile = null,
  onProfileSave,
  onProfileClear,
}: PlayerProfileBuilderProps) {
  const [form, setForm] = useState<ProfileFormState>(
    initialProfile ? formStateFromProfile(initialProfile) : DEFAULT_FORM_STATE,
  );
  const [draftProfile, setDraftProfile] = useState<PlayerProfileV1 | null>(initialProfile);
  const [notice, setNotice] = useState<string>(initialProfile ? "Loaded approved local profile." : "");

  const runtimeContext = useMemo(
    () => (draftProfile ? buildGameProfileContext(draftProfile) : null),
    [draftProfile],
  );

  function updateField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function buildDraft(): PlayerProfileV1 {
    const draft = createPlayerProfileDraft({
      selfDescription: form.selfDescription,
      currentLifeStage: form.currentLifeStage,
      importedMemory: form.importedMemory,
      importedMemoryProvider: form.importedMemoryProvider,
      coreValues: splitList(form.coreValues),
      recurringGoals: splitList(form.recurringGoals),
      dominantEmotions: splitList(form.dominantEmotions),
      avoidedEmotions: splitList(form.avoidedEmotions),
      emotionalHotspots: splitList(form.emotionalHotspots),
      unfinishedDecisions: splitList(form.unfinishedDecisions),
      desiredIdentities: splitList(form.desiredIdentities),
      fearedIdentities: splitList(form.fearedIdentities),
      hardLimits: splitList(form.hardLimits),
      protectedTopics: splitList(form.protectedTopics),
      conflictStyle: form.conflictStyle,
      pressureTolerance: form.pressureTolerance,
      roastTolerance: form.roastTolerance,
      attachmentTendency: form.attachmentTendency,
    });

    setDraftProfile(draft);
    setNotice("Draft profile built. Review it before using it in games.");
    return draft;
  }

  function handleSaveProfile() {
    const draft = draftProfile ?? buildDraft();
    const approved: PlayerProfileV1 = {
      ...draft,
      consent: {
        profileApproved: true,
        personalizedGamesApproved: form.personalizedGamesApproved,
        roastModeApproved: form.roastModeApproved,
        importedMemoryApproved: form.importedMemoryApproved,
      },
      review: {
        userConfirmed: true,
        userEdited: true,
        lastReviewedAt: new Date().toISOString(),
      },
    };
    savePlayerProfile(approved);
    setDraftProfile(approved);
    setNotice("Approved profile saved locally. Creator runs can use it now.");
    onProfileSave(approved);
  }

  function handleClearProfile() {
    clearPlayerProfile();
    setDraftProfile(null);
    setForm(DEFAULT_FORM_STATE);
    setNotice("Local player profile cleared.");
    onProfileClear();
  }

  return (
    <section aria-label="Player profile builder">
      <h3 className="creator-panel-title">Player Profile</h3>
      <p className="creator-muted">
        Build a local profile for personalized games. This is optional globally, but `Me and Mes` can use it heavily.
      </p>

      <div className="creator-spec-grid">
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-self-description">
            Self Description
          </label>
          <textarea
            id="profile-self-description"
            className="creator-input creator-input-compact"
            value={form.selfDescription}
            onChange={(event) => updateField("selfDescription", event.target.value)}
            placeholder="How would you describe yourself when you are not performing for anyone?"
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-life-stage">
            Current Life Stage
          </label>
          <input
            id="profile-life-stage"
            className="creator-text-input"
            value={form.currentLifeStage}
            onChange={(event) => updateField("currentLifeStage", event.target.value)}
            placeholder="Building a company, ending a relationship, starting over..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-imported-memory">
            Imported Memory From AI Tools (optional)
          </label>
          <textarea
            id="profile-imported-memory"
            className="creator-input creator-input-compact"
            value={form.importedMemory}
            onChange={(event) => updateField("importedMemory", event.target.value)}
            placeholder="Paste compact notes or memory snippets from ChatGPT, Claude, or other agents. This stays local in v1."
          />
          <label className="creator-spec-label" htmlFor="profile-imported-memory-provider">
            Memory Source
          </label>
          <select
            id="profile-imported-memory-provider"
            className="creator-text-input"
            value={form.importedMemoryProvider}
            onChange={(event) => updateField("importedMemoryProvider", event.target.value as PlayerProfileProvider)}
          >
            <option value="chatgpt">ChatGPT</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-core-values">
            Core Values
          </label>
          <textarea
            id="profile-core-values"
            className="creator-input creator-input-compact"
            value={form.coreValues}
            onChange={(event) => updateField("coreValues", event.target.value)}
            placeholder="One per line: truth, freedom, calm, recognition..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-goals">
            Recurring Goals
          </label>
          <textarea
            id="profile-goals"
            className="creator-input creator-input-compact"
            value={form.recurringGoals}
            onChange={(event) => updateField("recurringGoals", event.target.value)}
            placeholder="One per line: build something meaningful, feel calmer..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-dominant-emotions">
            Dominant Emotions
          </label>
          <textarea
            id="profile-dominant-emotions"
            className="creator-input creator-input-compact"
            value={form.dominantEmotions}
            onChange={(event) => updateField("dominantEmotions", event.target.value)}
            placeholder="One per line: fear, shame, anger..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-avoided-emotions">
            Avoided Emotions
          </label>
          <textarea
            id="profile-avoided-emotions"
            className="creator-input creator-input-compact"
            value={form.avoidedEmotions}
            onChange={(event) => updateField("avoidedEmotions", event.target.value)}
            placeholder="What do you avoid feeling directly?"
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-hotspots">
            Emotional Hotspots
          </label>
          <textarea
            id="profile-hotspots"
            className="creator-input creator-input-compact"
            value={form.emotionalHotspots}
            onChange={(event) => updateField("emotionalHotspots", event.target.value)}
            placeholder="Being ignored, failure, abandonment, being misunderstood..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-unfinished-decisions">
            Unfinished Decisions
          </label>
          <textarea
            id="profile-unfinished-decisions"
            className="creator-input creator-input-compact"
            value={form.unfinishedDecisions}
            onChange={(event) => updateField("unfinishedDecisions", event.target.value)}
            placeholder="Moves not taken, people not left, risks not owned..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-desired-identities">
            Desired Identities
          </label>
          <textarea
            id="profile-desired-identities"
            className="creator-input creator-input-compact"
            value={form.desiredIdentities}
            onChange={(event) => updateField("desiredIdentities", event.target.value)}
            placeholder="Writer, calmer partner, bolder founder..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-feared-identities">
            Feared Identities
          </label>
          <textarea
            id="profile-feared-identities"
            className="creator-input creator-input-compact"
            value={form.fearedIdentities}
            onChange={(event) => updateField("fearedIdentities", event.target.value)}
            placeholder="Coward, fraud, burden..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-hard-limits">
            Hard Limits
          </label>
          <textarea
            id="profile-hard-limits"
            className="creator-input creator-input-compact"
            value={form.hardLimits}
            onChange={(event) => updateField("hardLimits", event.target.value)}
            placeholder="Topics the game should not pressure."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-protected-topics">
            Protected Topics
          </label>
          <textarea
            id="profile-protected-topics"
            className="creator-input creator-input-compact"
            value={form.protectedTopics}
            onChange={(event) => updateField("protectedTopics", event.target.value)}
            placeholder="Family, grief, specific relationships..."
          />
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-conflict-style">
            Conflict Style
          </label>
          <select
            id="profile-conflict-style"
            className="creator-text-input"
            value={form.conflictStyle}
            onChange={(event) => updateField("conflictStyle", event.target.value as ProfileFormState["conflictStyle"])}
          >
            <option value="mixed">Mixed</option>
            <option value="avoid">Avoid</option>
            <option value="appease">Appease</option>
            <option value="attack">Attack</option>
            <option value="analyze">Analyze</option>
          </select>
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-pressure">
            Pressure Tolerance
          </label>
          <select
            id="profile-pressure"
            className="creator-text-input"
            value={form.pressureTolerance}
            onChange={(event) => updateField("pressureTolerance", event.target.value as ProfileFormState["pressureTolerance"])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="creator-spec-item">
          <label className="creator-spec-label" htmlFor="profile-roast">
            Roast / Confrontation Tolerance
          </label>
          <select
            id="profile-roast"
            className="creator-text-input"
            value={form.roastTolerance}
            onChange={(event) => updateField("roastTolerance", event.target.value as ProfileFormState["roastTolerance"])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="creator-actions" style={{ marginTop: "var(--space-sm)" }}>
        <button type="button" className="creator-btn" onClick={buildDraft}>
          Build Profile Draft
        </button>
        <button type="button" className="creator-btn" onClick={handleSaveProfile}>
          Save Approved Profile
        </button>
        <button type="button" className="creator-btn" onClick={handleClearProfile}>
          Clear Profile
        </button>
      </div>

      <div className="creator-spec-grid" style={{ marginTop: "var(--space-sm)" }}>
        <div className="creator-spec-item">
          <label className="creator-muted" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.personalizedGamesApproved}
              onChange={(event) => updateField("personalizedGamesApproved", event.target.checked)}
            />
            Use this profile across games on this device
          </label>
          <label className="creator-muted" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.4rem" }}>
            <input
              type="checkbox"
              checked={form.importedMemoryApproved}
              onChange={(event) => updateField("importedMemoryApproved", event.target.checked)}
            />
            Imported memory can influence generation
          </label>
          <label className="creator-muted" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.4rem" }}>
            <input
              type="checkbox"
              checked={form.roastModeApproved}
              onChange={(event) => updateField("roastModeApproved", event.target.checked)}
            />
            Strong confrontation is allowed
          </label>
        </div>
      </div>

      {notice ? (
        <p className="creator-muted" style={{ marginTop: "var(--space-sm)" }}>
          {notice}
        </p>
      ) : null}

      {draftProfile ? (
        <div className="creator-spec-grid" style={{ marginTop: "var(--space-sm)" }}>
          <div className="creator-spec-item">
            <span className="creator-spec-label">Candidate Selves</span>
            <span className="creator-spec-value">
              {draftProfile.castSeed.candidateSelves.map((self) => self.name).join(", ") || "None yet"}
            </span>
          </div>
          <div className="creator-spec-item">
            <span className="creator-spec-label">Runtime Slice Preview</span>
            <pre className="creator-debug-json">{JSON.stringify(runtimeContext, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
