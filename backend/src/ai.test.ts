/**
 * Tests for the Bedrock output-handling boundary.
 *
 * This is the security-critical seam in the AI integration: text produced by a
 * language model crosses into SQLite here. No real network calls are made —
 * Converse responses are constructed as fixtures, so runs are deterministic.
 */

import { describe, expect, test } from "bun:test";
import type { ContentBlock } from "@aws-sdk/client-bedrock-runtime";
import { extractSubtaskTitles, normalizeSubtaskTitles } from "./ai.ts";

/** Deterministic PRNG (mulberry32) so generative cases are reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_TITLE_CHARS = 200;
const MAX_SUBTASKS = 5;

function toolUseBlock(input: unknown): ContentBlock {
  return {
    toolUse: { toolUseId: "tu-1", name: "emit_subtasks", input },
  } as ContentBlock;
}

function textBlock(text: string): ContentBlock {
  return { text } as ContentBlock;
}

describe("extractSubtaskTitles", () => {
  test("reads titles from a forced tool-use block", () => {
    const blocks = [
      toolUseBlock({ subtasks: ["Add an index", "Backfill rows"] }),
    ];
    expect(extractSubtaskTitles(blocks)).toEqual([
      "Add an index",
      "Backfill rows",
    ]);
  });

  test("falls back to JSON embedded in plain text", () => {
    const blocks = [
      textBlock('Sure, here you go:\n{"subtasks":["First step","Second step"]}'),
    ];
    expect(extractSubtaskTitles(blocks)).toEqual(["First step", "Second step"]);
  });

  test("prefers tool use over trailing text", () => {
    const blocks = [
      toolUseBlock({ subtasks: ["Authoritative"] }),
      textBlock('{"subtasks":["Ignored"]}'),
    ];
    expect(extractSubtaskTitles(blocks)).toEqual(["Authoritative"]);
  });

  test("discards non-string array members", () => {
    const blocks = [
      toolUseBlock({ subtasks: ["Valid", 42, null, { a: 1 }, "Also valid"] }),
    ];
    expect(extractSubtaskTitles(blocks)).toEqual(["Valid", "Also valid"]);
  });

  test("returns an empty array for unusable payloads", () => {
    expect(extractSubtaskTitles([])).toEqual([]);
    expect(extractSubtaskTitles([textBlock("no json here")])).toEqual([]);
    expect(extractSubtaskTitles([textBlock("{ broken json")])).toEqual([]);
    expect(extractSubtaskTitles([toolUseBlock({ wrong: "key" })])).toEqual([]);
    expect(extractSubtaskTitles([toolUseBlock(null)])).toEqual([]);
    expect(extractSubtaskTitles([toolUseBlock("a string")])).toEqual([]);
  });

  test("ignores a tool-use block with an unexpected name", () => {
    const blocks = [
      { toolUse: { toolUseId: "x", name: "something_else", input: { subtasks: ["No"] } } } as ContentBlock,
    ];
    expect(extractSubtaskTitles(blocks)).toEqual([]);
  });
});

describe("normalizeSubtaskTitles", () => {
  test("collapses whitespace and trims", () => {
    expect(normalizeSubtaskTitles(["  Add   an\n\tindex  "])).toEqual([
      "Add an index",
    ]);
  });

  test("drops empty and whitespace-only entries", () => {
    expect(normalizeSubtaskTitles(["", "   ", "\n", "Real task"])).toEqual([
      "Real task",
    ]);
  });

  test("de-duplicates case-insensitively within the batch", () => {
    expect(
      normalizeSubtaskTitles(["Add Index", "add index", "ADD INDEX", "Other"]),
    ).toEqual(["Add Index", "Other"]);
  });

  test("skips titles that already exist on the task", () => {
    const existing = [{ title: "Add an index" }, { title: "Write tests" }];
    expect(
      normalizeSubtaskTitles(["add an index", "  WRITE TESTS ", "New step"], existing),
    ).toEqual(["New step"]);
  });

  test("caps the batch at five subtasks", () => {
    const titles = Array.from({ length: 12 }, (_, i) => `Step number ${i}`);
    expect(normalizeSubtaskTitles(titles)).toHaveLength(MAX_SUBTASKS);
  });

  test("truncates titles to the persisted column budget", () => {
    const [title] = normalizeSubtaskTitles(["x".repeat(500)]);
    expect(title).toHaveLength(MAX_TITLE_CHARS);
  });

  test("returns an empty array when nothing survives", () => {
    expect(normalizeSubtaskTitles([])).toEqual([]);
    expect(normalizeSubtaskTitles(["", "  "])).toEqual([]);
    expect(
      normalizeSubtaskTitles(["Duplicate"], [{ title: "duplicate" }]),
    ).toEqual([]);
  });

  test("preserves adversarial content as inert text", () => {
    // SQL and markup are stored verbatim; parameterized queries and React's
    // escaping neutralize them. The invariant is that they are not dropped or
    // allowed to alter the shape of the output.
    const hostile = [
      "'); DROP TABLE subtasks;--",
      "<script>alert(1)</script>",
    ];
    const result = normalizeSubtaskTitles(hostile);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("'); DROP TABLE subtasks;--");
    expect(result[1]).toBe("<script>alert(1)</script>");
  });

  test("invariants hold across generated inputs", () => {
    const random = seededRandom(0x5eed);
    const alphabet = " \t\nabcXYZ019'\"<>-_/\\{}%$#";

    for (let iteration = 0; iteration < 400; iteration += 1) {
      const count = Math.floor(random() * 14);
      const titles = Array.from({ length: count }, () => {
        const length = Math.floor(random() * 260);
        let value = "";
        for (let i = 0; i < length; i += 1) {
          value += alphabet[Math.floor(random() * alphabet.length)];
        }
        return value;
      });

      const existingCount = Math.floor(random() * 3);
      const existing = Array.from({ length: existingCount }, () => ({
        title: titles[Math.floor(random() * Math.max(titles.length, 1))] ?? "",
      }));

      const result = normalizeSubtaskTitles(titles, existing);

      // Never exceeds the batch cap.
      expect(result.length).toBeLessThanOrEqual(MAX_SUBTASKS);

      const seen = new Set<string>();
      for (const title of result) {
        // Never empty, never over the column budget.
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(MAX_TITLE_CHARS);
        // Always normalized: no leading/trailing space, no runs of whitespace.
        expect(title).toBe(title.trim());
        expect(title).not.toMatch(/\s{2,}/);
        expect(title).not.toMatch(/[\n\t]/);
        // Always unique, case-insensitively.
        const key = title.toLowerCase();
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});
