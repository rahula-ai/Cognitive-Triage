import type { CallToolResult } from "webmcp-react";
import type { AgentRuntime, ExtractedTask, TaskCategory } from "./types";
/* -------------------------------------------------------------------------- */
/* WebMCP testing bridge                                                      */
/* -------------------------------------------------------------------------- */
/**
 * `navigator.modelContextTesting` is installed alongside the WebMCP polyfill
 * (and exists in native Early-Preview builds). It lets the page itself invoke
 * the tools registered on `navigator.modelContext` — through the exact same
 * registry, schema validation, and execution path a real browser agent uses.
 * The Agent Sandbox uses it to demo the pipeline without a live agent.
 */

interface ModelContextTestingApi {
  listTools(): { name: string; description: string }[];
  executeTool(
    toolName: string,
    inputArgsJson: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>;
}

export function getModelContextTesting(): ModelContextTestingApi | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { modelContextTesting?: ModelContextTestingApi };
  return nav.modelContextTesting ?? null;
}

export interface ToolCallOutcome {
  ok: boolean;
  result: CallToolResult | null;
  error?: string;
}

/** Invoke a tool registered via `useMcpTool`, as an agent would. */
export async function callRegisteredTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolCallOutcome> {
  const testing = getModelContextTesting();
  if (!testing) {
    return {
      ok: false,
      result: null,
      error:
        "navigator.modelContextTesting is unavailable — the WebMCP runtime did not install in this browser.",
    };
  }
  try {
    const raw = await testing.executeTool(toolName, JSON.stringify(args));
    return { ok: true, result: raw ? (JSON.parse(raw) as CallToolResult) : null };
  } catch (err) {
    return {
      ok: false,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function summarizeResult(result: CallToolResult | null): string {
  if (!result) return "(no result returned)";
  const text = (result.content ?? [])
    .map((block) => (block.type === "text" ? block.text : ""))
    .join(" ")
    .trim();
  return result.isError ? `error: ${text || "tool reported an error"}` : text || "ok";
}

/**
 * Which WebMCP runtime the page is talking to. Safe to call during render:
 * the provider's `available` flag flips exactly when `modelContext` appears,
 * so for any given `available` value the answer is deterministic.
 */
export function detectRuntime(available: boolean): AgentRuntime {
  if (!available || typeof navigator === "undefined") return "none";
  const mc = (
    navigator as Navigator & {
      modelContext?: { __isWebMCPPolyfill?: boolean };
    }
  ).modelContext;
  if (!mc) return "none";
  return "__isWebMCPPolyfill" in mc ? "polyfill" : "native";
}

/* -------------------------------------------------------------------------- */
/* Heuristic stand-in for a language model                                    */
/* -------------------------------------------------------------------------- */
/**
 * A deterministic, fully local heuristic that plays the part of the browser
 * agent's language model: it reads the cognitive dump and produces the
 * `extractedTasks` payload for `process_cognitive_dump`. It is intentionally
 * simple — in production the real agent does this reasoning; this just makes
 * the tool pipeline demonstrable without one.
 */

const URGENT_HINTS = [
  "urgent",
  "asap",
  "immediately",
  "deadline",
  "overdue",
  "critical",
  "emergency",
  "due today",
  "today",
  "right now",
];

const WORK_HINTS = [
  "email",
  "e-mail",
  "meeting",
  "standup",
  "deploy",
  "release",
  "ship",
  "client",
  "boss",
  "manager",
  "report",
  "recap",
  "deck",
  "slides",
  "presentation",
  "invoice",
  "review",
  "jira",
  "ticket",
  "sprint",
  "bug",
  "fix",
  "code",
  "log",
  "test",
  "demo",
  "interview",
  "q3",
  "q4",
  "doc",
  "spec",
  "pr",
];

const PERSONAL_HINTS = [
  "mom",
  "dad",
  "sister",
  "brother",
  "partner",
  "wife",
  "husband",
  "birthday",
  "present",
  "gift",
  "dentist",
  "doctor",
  "gym",
  "workout",
  "groceries",
  "grocery",
  "laundry",
  "clean",
  "friend",
  "family",
  "haircut",
  "car service",
  "car",
  "passport",
  "bank",
  "flight",
  "hotel",
  "rsvp",
  "vet",
];

const ACTION_CUES = [
  "haven't",
  "havent",
  "have not",
  "need to",
  "needs to",
  "should",
  "must",
  "have to",
  "gotta",
  "still",
  "twice already",
  "postponing",
  "overdue",
  "forget",
];

function escapeHint(hint: string): string {
  return hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeMatcher(hint: string): RegExp {
  return new RegExp(`(^|[^a-z])${escapeHint(hint)}([^a-z]|$)`, "i");
}

function countHits(text: string, hints: string[]): number {
  let hits = 0;
  for (const hint of hints) {
    if (makeMatcher(hint).test(text)) hits += 1;
  }
  return hits;
}

function classify(text: string): TaskCategory {
  if (countHits(text, URGENT_HINTS) > 0) return "urgent";
  const work = countHits(text, WORK_HINTS);
  const personal = countHits(text, PERSONAL_HINTS);
  if (work > personal) return "work";
  if (personal > work) return "personal";
  // Unclassified anxieties read as life admin by default.
  return "personal";
}

function score(text: string): number {
  return (
    countHits(text, URGENT_HINTS) * 4 +
    countHits(text, WORK_HINTS) * 2 +
    countHits(text, PERSONAL_HINTS) * 2 +
    countHits(text, ACTION_CUES)
  );
}

function clampEffort(minutes: number): number {
  return Math.max(5, Math.min(480, Math.round(minutes / 5) * 5));
}

function estimateEffort(text: string): number {
  const mins = text.match(/(\d{1,3})\s*(?:min(?:ute)?s?)\b/i);
  if (mins) return clampEffort(Number(mins[1]));

  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  if (hours) return clampEffort(Number(hours[1]) * 60);

  // Deterministic pseudo-random in 25–65 min, stable per fragment.
  const hash = [...text].reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997,
    7,
  );
  return 25 + (hash % 9) * 5;
}

function splitFragments(dump: string): string[] {
  return dump
    .split(/\r?\n+|(?<=[.!?;])\s+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0 && fragment.split(/\s+/).length >= 3);
}

/** Turn a messy sentence into something resembling a task title. */
function toTitle(fragment: string): string {
  const cleaned = fragment
    .replace(/^\s*(?:[-*•–—]|\d+[.)])\s*/, "")
    .replace(/^\s*(?:todo|task|note)s?\s*[:—-]\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/[\s.;,!]+$/, "")
    .trim();

  let f = cleaned;

  // Prefer the actionable clause after an em-dash/semicolon when there is one.
  const segments = f.split(/\s+[—–]\s+/);
  if (segments.length > 1) {
    const actionable = segments
      .slice(1)
      .find((s) => /\b(need|should|must|have to|gotta|to-?do)\b/i.test(s));
    if (actionable) f = actionable.trim();
  }

  // Drop trailing subordinate clauses.
  f = f.split(/\s+instead of\b/i)[0];
  f = f.split(/\s+(?:and|but|because)\s+(?:she|he|they|i|it)\b/i)[0];
  f = f.replace(/[\s,;:—-]+$/, "").trim();

  // Strip pronoun openers down to the action itself.
  f = f.replace(/^i(?:'ve|'ll|'m)?\s+/i, "");
  f = f.replace(
    /^(?:also\s+|and\s+|plus\s+|still\s+|really\s+|probably\s+|definitely\s+)*(?:haven'?t\s+|have\s+(?:to|got)\s+to\s+|need\s+to\s+|needs\s+to\s+|should\s+(?:probably\s+)?|must\s+|keep\s+(?:on\s+)?|want\s+to\s+|gotta\s+|ought\s+to\s+)/i,
    "",
  );
  f = f.replace(/^(?:also\s+|and\s+|plus\s+)/i, "");
  f = f.trim();

  // If trimming went too far, fall back to the cleaned fragment.
  if (f.split(/\s+/).filter(Boolean).length < 2) f = cleaned;

  if (f.length > 90) {
    const cut = f.slice(0, 90);
    const lastSpace = cut.lastIndexOf(" ");
    f = `${cut.slice(0, lastSpace > 60 ? lastSpace : 90).trim()}…`;
  }

  return f.charAt(0).toUpperCase() + f.slice(1);
}

/**
 * Read the cognitive dump and produce up to three `extractedTasks`,
 * mimicking what a browser agent's model would send to the tool.
 */
export function heuristicTriage(dump: string): ExtractedTask[] {
  const ranked = splitFragments(dump)
    .map((fragment, index) => ({ fragment, index, score: score(fragment) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const seen = new Set<string>();
  const tasks: ExtractedTask[] = [];

  for (const { fragment } of ranked) {
    const title = toTitle(fragment);
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    tasks.push({
      title,
      effortEstimate: estimateEffort(fragment),
      category: classify(fragment),
    });
    if (tasks.length === 3) break;
  }

  return tasks;
}
