import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../../src/app/api/health/route";
import { STORY_IDS } from "../../src/lib/constants";

const originalGeminiKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

describe("GET /api/health", () => {
  it("returns expected shape when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.services).toEqual({ gemini: "missing" });
    expect(payload.stories).toEqual(STORY_IDS);
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
  });

  it("reports configured gemini service when GEMINI_API_KEY is present", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.services).toEqual({ gemini: "configured" });
  });
});
