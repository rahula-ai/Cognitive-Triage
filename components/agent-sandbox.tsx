"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  ChevronDown,
  FlaskConical,
  Plug,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import type { AgentRuntime, LogEntry } from "@/lib/types";

interface AgentSandboxProps {
  runtime: AgentRuntime;
  /** true while a tool is mid-execution (state.isExecuting). */
  busy: boolean;
  canProcess: boolean;
  canCommit: boolean;
  onProcess: () => void;
  onCommit: () => void;
  log: LogEntry[];
  onClearLog: () => void;
}

const KIND_STYLES: Record<LogEntry["kind"], { glyph: string; className: string }> = {
  call: { glyph: "→", className: "text-sky-300" },
  result: { glyph: "←", className: "text-emerald-300" },
  info: { glyph: "·", className: "text-zinc-500" },
  error: { glyph: "!", className: "text-rose-300" },
};

const RUNTIME_COPY: Record<AgentRuntime, { label: string; detail: string }> = {
  native: {
    label: "Native WebMCP detected",
    detail:
      "navigator.modelContext is provided by the browser — your tools are live and discoverable by browser agents.",
  },
  polyfill: {
    label: "WebMCP polyfill active",
    detail:
      "Tools are registered on navigator.modelContext (via the polyfill webmcp-react installs). No agent is connected yet — use the controls below to act as one.",
  },
  none: {
    label: "WebMCP unavailable",
    detail:
      "This browser exposes no model context. The app still works; the tools simply cannot be registered.",
  },
};

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * A local, zero-backend way to exercise the exact tool pipeline a browser
 * agent would drive: both buttons call the registered tools through
 * `navigator.modelContextTesting.executeTool()` — same registry, same Zod
 * schemas, same handlers, same execution state.
 */
export function AgentSandbox({
  runtime,
  busy,
  canProcess,
  canCommit,
  onProcess,
  onCommit,
  log,
  onClearLog,
}: AgentSandboxProps) {
  const [open, setOpen] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, open]);

  const runtimeCopy = RUNTIME_COPY[runtime];

  return (
    <section
      aria-labelledby="agent-sandbox-heading"
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <FlaskConical className="h-5 w-5" aria-hidden />
          </div>
          <span>
            <span
              id="agent-sandbox-heading"
              className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Agent Sandbox
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Drive the registered tools yourself — no browser agent needed.
            </span>
          </span>
          <span className="hidden rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 sm:inline dark:border-zinc-700 dark:text-zinc-500">
            local simulation
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="animate-fade-in border-t border-zinc-100 p-4 sm:p-5 dark:border-zinc-800/80">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold text-zinc-600 dark:text-zinc-300">
                {runtimeCopy.label}.
              </strong>{" "}
              {runtimeCopy.detail} These controls invoke{" "}
              <code className="font-mono text-[10px]">
                navigator.modelContextTesting.executeTool()
              </code>{" "}
              — the same registered tools, schemas and handlers a real WebMCP
              agent calls.
            </span>
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onProcess}
              disabled={!canProcess || busy}
              title={
                !canProcess
                  ? "Type something into the Cognitive Dump first"
                  : "The simulated agent triages your dump, then calls process_cognitive_dump"
              }
              className="group flex flex-col items-start gap-1.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden />
                Run triage on my dump
              </span>
              <code className="font-mono text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
                process_cognitive_dump()
              </code>
              <span className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                A heuristic stands in for the model: it reads your dump and
                calls the tool with up to three extracted tasks.
              </span>
            </button>

            <button
              type="button"
              onClick={onCommit}
              disabled={!canCommit || busy}
              title={
                !canCommit
                  ? "Stage some tasks first (or the schedule is already locked)"
                  : "The simulated agent asks to lock the board — execution pauses until you approve"
              }
              className="group flex flex-col items-start gap-1.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                <CalendarCheck className="h-4 w-4 text-emerald-500" aria-hidden />
                Commit the schedule
              </span>
              <code className="font-mono text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                commit_schedule_to_calendar()
              </code>
              <span className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Locks the staged tasks into your day. The tool pauses
                mid-execution and asks for your approval — nothing locks
                without you.
              </span>
            </button>
          </div>

          <div className="relative mt-4">
            <div
              ref={consoleRef}
              data-testid="agent-console"
              className="ct-scroll h-44 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
              role="log"
              aria-label="Agent tool call log"
            >
              {log.length === 0 ? (
                <p className="flex items-center gap-2 text-zinc-600">
                  <Terminal className="h-3.5 w-3.5" aria-hidden />
                  waiting for tool calls…
                </p>
              ) : (
                log.map((entry) => {
                  const style = KIND_STYLES[entry.kind];
                  return (
                    <p key={entry.id} className="whitespace-pre-wrap break-words">
                      <span className="text-zinc-600">{formatTime(entry.at)}</span>{" "}
                      <span className={style.className}>{style.glyph}</span>{" "}
                      {entry.tool && (
                        <span className="text-indigo-300/80">{entry.tool} </span>
                      )}
                      <span
                        className={
                          entry.kind === "error"
                            ? "text-rose-300"
                            : entry.kind === "result"
                              ? "text-emerald-200/90"
                              : "text-zinc-400"
                        }
                      >
                        {entry.message}
                      </span>
                    </p>
                  );
                })
              )}
            </div>
            {log.length > 0 && (
              <button
                type="button"
                onClick={onClearLog}
                title="Clear the console"
                className="absolute right-2 top-2 rounded-lg bg-zinc-900/80 p-1.5 text-zinc-500 transition-colors hover:text-zinc-200"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
