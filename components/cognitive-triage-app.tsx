"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WebMCPProvider, useMcpTool, useWebMCPStatus } from "webmcp-react";
import type { CallToolResult } from "webmcp-react";
import { AlertTriangle, BrainCircuit } from "lucide-react";
import { AgentSandbox } from "@/components/agent-sandbox";
import { AgentStatus } from "@/components/agent-status";
import { ApprovalModal } from "@/components/approval-modal";
import { CognitiveDump } from "@/components/cognitive-dump";
import { DailyThreeBoard } from "@/components/daily-three-board";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  callRegisteredTool,
  detectRuntime,
  heuristicTriage,
  summarizeResult,
} from "@/lib/agent-sim";
import { commitScheduleInput, processCognitiveDumpInput } from "@/lib/schemas";
import { SAMPLE_DUMP, type LogEntry, type Task } from "@/lib/types";
import { makeId, sleep } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Cognitive Triage — a human–agent collaborative task board.
 *
 * The page exposes two WebMCP tools to browser-based agents:
 *
 *   1. process_cognitive_dump — the agent reads the dump on the left and
 *      calls this tool with up to three extracted tasks; the handler stages
 *      them on the Daily Three Board (right).
 *
 *   2. commit_schedule_to_calendar — the agent asks to finalize the board.
 *      The handler parks on client.requestUserInteraction(...) until the
 *      human clicks Approve/Reject in the modal, and only then resolves.
 *
 * While either tool runs, its hook's `state.isExecuting` drives the Agent
 * Status indicator in the header.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function CognitiveTriageApp() {
  return (
    <WebMCPProvider name="cognitive-triage" version="1.0.0">
      <TriageWorkspace />
    </WebMCPProvider>
  );
}

function TriageWorkspace() {
  const { available } = useWebMCPStatus();

  /* ----------------------------- app state ----------------------------- */
  const [dump, setDump] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locked, setLocked] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  /** Latest values for tool handlers (they fire outside the render cycle). */
  const tasksRef = useRef<Task[]>([]);
  const lockedRef = useRef(false);
  /** Resolves the pending requestUserInteraction promise from the modal. */
  const approvalResolveRef = useRef<((approved: boolean) => void) | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const pushLog = useCallback(
    (kind: LogEntry["kind"], message: string, tool?: string) => {
      setLog((prev) => [
        ...prev.slice(-199),
        { id: makeId(), at: Date.now(), kind, message, tool },
      ]);
    },
    [],
  );

  // `available` flips exactly when modelContext appears (native or polyfill),
  // so the runtime kind is derived, not stored.
  const runtime = detectRuntime(available);

  /* ------------------ tool 1: process_cognitive_dump ------------------- */
  const processTool = useMcpTool({
    name: "process_cognitive_dump",
    description:
      "Extract a prioritized list of up to three actionable tasks from the user's unstructured input.",
    annotations: { title: "Process cognitive dump" },
    input: processCognitiveDumpInput,
    handler: async ({ extractedTasks }) => {
      pushLog(
        "call",
        `invoked with ${extractedTasks.length} extracted task(s)`,
        "process_cognitive_dump",
      );

      // Brief, deliberate pause so the "Agent working…" state is observable.
      await sleep(900);

      const staged: Task[] = extractedTasks.map((task) => ({
        ...task,
        id: makeId(),
      }));
      setTasks(staged);
      setLocked(false);

      const totalMinutes = staged.reduce((sum, t) => sum + t.effortEstimate, 0);
      if (staged.length > 0) {
        pushLog(
          "info",
          `Daily Three Board staged — ${staged.length} task(s), ${totalMinutes} min total`,
        );
      } else {
        pushLog("info", "Triage found nothing actionable — board cleared");
      }

      return {
        content: [
          {
            type: "text" as const,
            text:
              staged.length > 0
                ? `Triage complete. ${staged.length} task(s) staged on the Daily Three Board: ${staged
                    .map(
                      (t) =>
                        `“${t.title}” (${t.effortEstimate} min, ${t.category})`,
                    )
                    .join("; ")}. Ask the user to review, then call commit_schedule_to_calendar to lock the schedule.`
                : "Triage complete. No actionable tasks were found in the dump — the board is now empty.",
          },
        ],
        structuredContent: {
          tasksStaged: staged.length,
          totalEffortMinutes: totalMinutes,
        },
      } satisfies CallToolResult;
    },
  });

  /* --------------- tool 2: commit_schedule_to_calendar ----------------- */
  const commitTool = useMcpTool({
    name: "commit_schedule_to_calendar",
    description:
      "Finalize and lock the tasks staged on the Daily Three Board into the user's calendar for the day. Pauses for explicit human approval before completing.",
    annotations: { title: "Commit schedule to calendar", idempotentHint: true },
    input: commitScheduleInput,
    handler: async (_input, client) => {
      const staged = tasksRef.current;

      if (staged.length === 0) {
        pushLog(
          "error",
          "failed: the board is empty — nothing to commit",
          "commit_schedule_to_calendar",
        );
        return {
          content: [
            {
              type: "text" as const,
              text: "Nothing to commit — the Daily Three Board is empty. Call process_cognitive_dump first.",
            },
          ],
          isError: true,
        } satisfies CallToolResult;
      }

      if (lockedRef.current) {
        return {
          content: [
            { type: "text" as const, text: "The schedule is already locked in for today." },
          ],
          isError: true,
        } satisfies CallToolResult;
      }

      pushLog(
        "call",
        "requesting human approval via client.requestUserInteraction()",
        "commit_schedule_to_calendar",
      );

      /* ------------------------------------------------------------------
       * Human-in-the-loop confirmation gate.
       *
       * Execution stays parked on this await until the user clicks Approve
       * or Reject in the modal — that click resolves the promise, which
       * flows back through the ModelContextClient to the agent.
       * ------------------------------------------------------------------ */
      const approved = (await client.requestUserInteraction(
        () =>
          new Promise<boolean>((resolve) => {
            approvalResolveRef.current = resolve;
            setApprovalOpen(true);
          }),
      )) as boolean;

      if (!approved) {
        pushLog(
          "info",
          "human rejected the commit — schedule stays unlocked",
          "commit_schedule_to_calendar",
        );
        return {
          content: [
            {
              type: "text" as const,
              text: "The user rejected the commit. The tasks remain staged but unlocked — nothing was written to the calendar.",
            },
          ],
          structuredContent: { approved: false },
          isError: true,
        } satisfies CallToolResult;
      }

      setLocked(true);
      pushLog(
        "info",
        `schedule locked — ${staged.length} task(s) committed`,
        "commit_schedule_to_calendar",
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Approved by the user. ${staged.length} task(s) are locked into today's calendar. The Daily Three Board is now finalized.`,
          },
        ],
        structuredContent: {
          approved: true,
          lockedTasks: staged.map((t) => ({
            title: t.title,
            effortEstimate: t.effortEstimate,
            category: t.category,
          })),
        },
      } satisfies CallToolResult;
    },
  });

  /* ----------------------- derived + callbacks ------------------------- */
  const agentBusy = processTool.state.isExecuting || commitTool.state.isExecuting;
  const toolError = processTool.state.error ?? commitTool.state.error;

  const handleDecision = useCallback((approved: boolean) => {
    setApprovalOpen(false);
    const resolve = approvalResolveRef.current;
    approvalResolveRef.current = null;
    resolve?.(approved);
  }, []);

  const handleClearDump = useCallback(() => setDump(""), []);

  const handleLoadSample = useCallback(() => {
    setDump(SAMPLE_DUMP);
    pushLog("info", "sample dump loaded — run a triage to see the pipeline");
  }, [pushLog]);

  const handleResetBoard = useCallback(() => {
    setTasks([]);
    setLocked(false);
    pushLog("info", "board reset by the human");
  }, [pushLog]);

  const handleClearLog = useCallback(() => setLog([]), []);

  /* -------------------- sandbox: act as the agent ---------------------- */
  const handleSimulatedTriage = useCallback(async () => {
    const text = dump.trim();
    if (!text) return;

    const candidates = heuristicTriage(text);
    pushLog(
      "info",
      `simulated agent read the dump (${text.split(/\s+/).length} words) and produced ${candidates.length} candidate task(s)`,
    );

    const outcome = await callRegisteredTool("process_cognitive_dump", {
      extractedTasks: candidates,
    });
    if (!outcome.ok) {
      pushLog("error", outcome.error ?? "tool call failed");
      return;
    }
    pushLog(
      "result",
      summarizeResult(outcome.result),
      "process_cognitive_dump",
    );
  }, [dump, pushLog]);

  const handleSimulatedCommit = useCallback(async () => {
    if (tasksRef.current.length === 0 || lockedRef.current) return;

    pushLog("info", "simulated agent decided to lock the schedule");
    const outcome = await callRegisteredTool("commit_schedule_to_calendar", {});
    if (!outcome.ok) {
      pushLog("error", outcome.error ?? "tool call failed");
      return;
    }
    pushLog(
      "result",
      summarizeResult(outcome.result),
      "commit_schedule_to_calendar",
    );
  }, [pushLog]);

  /* ------------------------------- render ------------------------------ */
  return (
    <div className="min-h-screen text-zinc-900 antialiased dark:text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6">
        <header className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between lg:py-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <BrainCircuit className="h-5.5 w-5.5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Cognitive Triage
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                A human–agent collaborative task board
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <AgentStatus isWorking={agentBusy} />
            <ThemeToggle />
          </div>
        </header>

        {toolError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Agent tool error: {toolError.message}</span>
          </div>
        )}

        <main className="grid flex-1 gap-5 pb-6 lg:grid-cols-2 lg:gap-6">
          <CognitiveDump
            value={dump}
            onChange={setDump}
            onClear={handleClearDump}
            onLoadSample={handleLoadSample}
            agentBusy={agentBusy}
          />
          <DailyThreeBoard
            tasks={tasks}
            locked={locked}
            onReset={handleResetBoard}
            resetDisabled={agentBusy}
          />
        </main>

        <div className="pb-6">
          <AgentSandbox
            runtime={runtime}
            busy={agentBusy}
            canProcess={dump.trim().length > 0}
            canCommit={tasks.length > 0 && !locked}
            onProcess={handleSimulatedTriage}
            onCommit={handleSimulatedCommit}
            log={log}
            onClearLog={handleClearLog}
          />
        </div>

        <footer className="flex flex-col gap-1 border-t border-zinc-200 py-5 text-[11px] text-zinc-400 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:text-zinc-500">
          <span>
            Local-first — your cognitive dump never leaves this browser window.
          </span>
          <span>Next.js · Tailwind CSS · webmcp-react · zod · lucide-react</span>
        </footer>
      </div>

      <ApprovalModal
        open={approvalOpen}
        tasks={tasks}
        onDecision={handleDecision}
      />
    </div>
  );
}
