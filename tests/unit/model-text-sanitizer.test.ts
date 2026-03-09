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

  it("removes leaked parenthetical cue markers from spoken text", () => {
    expect(
      sanitizeModelDisplayText("The active file dictates the procedure. (badge-scan)"),
    ).toBe("The active file dictates the procedure.");
    expect(
      sanitizeModelDisplayText("Your packet is printing now. [printer-spool]"),
    ).toBe("Your packet is printing now.");
    expect(
      sanitizeModelDisplayText("Your severance packet is being finalized now. (printer spool We note your current address is Portland."),
    ).toBe("Your severance packet is being finalized now. We note your current address is Portland.");
  });

  it("removes italicized stage directions from spoken text", () => {
    expect(
      sanitizeModelDisplayText("*Pulse rises* I will not be silenced."),
    ).toBe("I will not be silenced.");
    expect(
      sanitizeModelDisplayText("*Chamber-hum steady* The Prosecutor speaks coldly."),
    ).toBe("The Prosecutor speaks coldly.");
  });
});
