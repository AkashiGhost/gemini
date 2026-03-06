import { describe, expect, it } from "vitest";
import { sanitizeModelDisplayText } from "@/lib/model-text-sanitizer";

describe("sanitizeModelDisplayText", () => {
  it("removes leaked tool metadata prefixes from model text", () => {
    expect(
      sanitizeModelDisplayText("1.0, set_tension:0.6} I just woke up in a concrete room."),
    ).toBe("I just woke up in a concrete room.");
  });

  it("keeps plain spoken text unchanged", () => {
    expect(
      sanitizeModelDisplayText("Can you hear me?"),
    ).toBe("Can you hear me?");
  });
});
