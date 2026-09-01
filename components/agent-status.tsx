"use client";

import { Loader2 } from "lucide-react";

interface AgentStatusProps {
  /** true while any WebMCP tool is mid-execution (state.isExecuting). */
  isWorking: boolean;
}

/**
 * Visual indicator for agent activity. `isWorking` is driven directly by the
 * `state.isExecuting` flags of the `useMcpTool` hooks, so it lights up whenever
 * a browser agent (or the sandbox) is executing a tool — including while the
 * agent is parked on the approval gate.
 */
export function AgentStatus({ isWorking }: AgentStatusProps) {
  return (
    <div
      data-testid="agent-status"
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        isWorking
          ? "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
      }`}
    >
      {isWorking ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Agent working…</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
          <span>Agent idle</span>
        </>
      )}
    </div>
  );
}
