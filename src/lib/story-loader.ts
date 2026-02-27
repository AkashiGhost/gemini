import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import Ajv from "ajv";
import type { GameConfig } from "./types";

// ─────────────────────────────────────────────
// Key transformation: snake_case → camelCase
// Transforms object keys only, NOT string values
// ─────────────────────────────────────────────

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
}

// ─────────────────────────────────────────────
// YAML file loader
// ─────────────────────────────────────────────

function loadYaml<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content) as T;
}

function loadYamlIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return loadYaml<T>(filePath);
}

// ─────────────────────────────────────────────
// Schema validation (per-file, not composite)
// ─────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateIndividualFiles(
  schemasDir: string,
  files: Array<{ label: string; data: unknown; schemaId: string }>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let ajv: Ajv;
  try {
    ajv = new Ajv({ allErrors: true, strict: false });
    for (const file of fs.readdirSync(schemasDir)) {
      if (file.endsWith(".json")) {
        const schema = JSON.parse(
          fs.readFileSync(path.join(schemasDir, file), "utf-8"),
        );
        ajv.addSchema(schema);
      }
    }
  } catch (err) {
    warnings.push(
      `Schema loading failed, skipping validation: ${(err as Error).message}`,
    );
    return { valid: true, errors, warnings };
  }

  for (const { label, data, schemaId } of files) {
    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      warnings.push(`Schema ${schemaId} not found, skipping ${label}`);
      continue;
    }
    const valid = validate(data);
    if (!valid && validate.errors) {
      for (const e of validate.errors) {
        errors.push(`[${label}] ${e.instancePath || "/"}: ${e.message}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────
// Assemble story from directory of YAML files
// ─────────────────────────────────────────────

interface RawStory {
  assembled: Record<string, unknown>;
  /** Individual parsed files for schema validation */
  rawArc: Record<string, unknown>;
  rawWorld: Record<string, unknown>;
  rawCharacters: Record<string, unknown>[];
}

function assembleStory(storyDir: string): RawStory {
  const meta = loadYaml<Record<string, unknown>>(
    path.join(storyDir, "meta.yaml"),
  );
  const world = loadYaml<Record<string, unknown>>(
    path.join(storyDir, "world.yaml"),
  );
  const arc = loadYaml<Record<string, unknown>>(
    path.join(storyDir, "arc.yaml"),
  );

  // Characters
  const charsDir = path.join(storyDir, "characters");
  const characters: Record<string, unknown>[] = [];
  if (fs.existsSync(charsDir)) {
    for (const file of fs.readdirSync(charsDir)) {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        characters.push(
          loadYaml<Record<string, unknown>>(path.join(charsDir, file)),
        );
      }
    }
  }

  // Prompts — system.yaml is an object, we keep its full structure
  const systemPrompt = loadYaml<Record<string, unknown>>(
    path.join(storyDir, "prompts", "system.yaml"),
  );
  const phaseOverrides =
    loadYamlIfExists<Record<string, unknown>>(
      path.join(storyDir, "prompts", "phase-overrides.yaml"),
    ) ?? {};

  // Sounds
  const cueMap = loadYaml<Record<string, unknown>>(
    path.join(storyDir, "sounds", "cue-map.yaml"),
  );
  const timelineFile = loadYaml<Record<string, unknown>>(
    path.join(storyDir, "sounds", "timeline.yaml"),
  );
  const timelineEvents = (timelineFile.timeline as unknown[]) ?? [];
  const timelineMixing = timelineFile.mixing as Record<string, unknown> | undefined;

  // Evaluation
  const evalDir = path.join(storyDir, "evaluation");
  const qualityChecklist = loadYamlIfExists<Record<string, unknown>>(
    path.join(evalDir, "quality-checklist.yaml"),
  );
  const goldenPaths = loadYamlIfExists<Record<string, unknown>>(
    path.join(evalDir, "golden-paths.yaml"),
  );

  // Endings
  const endingsDir = path.join(storyDir, "endings");
  const endings: Record<string, unknown> = {};
  if (fs.existsSync(endingsDir)) {
    for (const file of fs.readdirSync(endingsDir)) {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        const name = path.basename(file, path.extname(file));
        endings[name] = loadYaml<Record<string, unknown>>(
          path.join(endingsDir, file),
        );
      }
    }
  }

  // Extract quality checklist items
  const checklistItems =
    (qualityChecklist as Record<string, unknown> | null)?.criteria ??
    (qualityChecklist as Record<string, unknown> | null)?.checklist ??
    (qualityChecklist as Record<string, unknown> | null)?.items ??
    (Array.isArray(qualityChecklist) ? qualityChecklist : []);

  const assembled: Record<string, unknown> = {
    meta,
    world,
    characters,
    arc,
    prompts: {
      system: systemPrompt,
      phase_overrides: phaseOverrides,
    },
    sounds: {
      cue_map: cueMap,
      timeline: timelineEvents,
      mixing: (cueMap as Record<string, unknown>).mixing ?? timelineMixing ?? {},
    },
    evaluation: {
      quality_checklist: checklistItems,
      golden_path: goldenPaths,
    },
    endings,
  };

  return {
    assembled,
    rawArc: arc,
    rawWorld: world,
    rawCharacters: characters,
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export interface LoadStoryResult {
  config: GameConfig;
  warnings: string[];
}

export interface LoadStoryError {
  errors: string[];
}

export function loadStory(
  storyDir: string,
  schemasDir: string,
): LoadStoryResult | LoadStoryError {
  // 1. Assemble raw YAML
  let raw: RawStory;
  try {
    raw = assembleStory(storyDir);
  } catch (err) {
    return {
      errors: [`Failed to load YAML files: ${(err as Error).message}`],
    };
  }

  // 2. Validate individual files against their schemas
  const validation = validateIndividualFiles(schemasDir, [
    {
      label: "arc.yaml",
      data: raw.rawArc,
      schemaId: "https://innerplay.app/schemas/arc-schema.json",
    },
    {
      label: "world.yaml",
      data: raw.rawWorld,
      schemaId: "https://innerplay.app/schemas/world-schema.json",
    },
    ...raw.rawCharacters.map((char, i) => ({
      label: `characters[${i}]`,
      data: char,
      schemaId: "https://innerplay.app/schemas/character-schema.json",
    })),
  ]);

  if (!validation.valid) {
    return { errors: validation.errors };
  }

  // 3. Transform keys snake_case → camelCase
  const transformed = transformKeys(raw.assembled) as GameConfig;

  // 4. Freeze and return
  return {
    config: Object.freeze(transformed),
    warnings: validation.warnings,
  };
}

/** Check if result is an error */
export function isLoadError(
  result: LoadStoryResult | LoadStoryError,
): result is LoadStoryError {
  return "errors" in result;
}
