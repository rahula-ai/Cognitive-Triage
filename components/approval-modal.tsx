"use client";

import { useEffect, useRef } from "react";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { CATEGORY_META, type Task } from "@/lib/types";

interface ApprovalModalProps {
  open: boolean;
  /** The tasks the agent is trying to lock (staged at call time). */
  tasks: Task[];
  /** Resolves the pending requestUserInteraction promise back to the agent. */
  onDecision: (approved: boolean) => void;
}

/**
 * Human-in-the-loop confirmation gate. Rendered while the
 * `commit_schedule_to_calendar` tool is parked inside
 * `client.requestUserInteraction(...)`; clicking Approve/Reject resolves the
 * promise and lets the agent's execution continue.
 */
export function ApprovalModal({ open, tasks, onDecision }: ApprovalModalProps) {
  const approveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    approveButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDecision(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onDecision]);

  if (!open) return null;

  const totalMinutes = tasks.reduce((sum, task) => sum + task.effortEstimate, 0);

  return (
    <div
      data-testid="approval-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
      className="fixed inset-0 z-50 grid place-items-center p-4"
    >
      {/* Overlay — dismissing it counts as a rejection */}
      <div
        className="animate-fade-in absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={() => onDecision(false)}
      />

      <div className="animate-pop-in relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Approval required
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              commit_schedule_to_calendar
            </p>
          </div>
          <button
            type="button"
            aria-label="Close and reject"
            onClick={() => onDecision(false)}
            className="ml-auto rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <h2
          id="approval-modal-title"
          className="mt-4 text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100"
        >
          The agent wants to finalize and lock these tasks. Do you approve?
        </h2>

        {tasks.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700/70 dark:bg-zinc-950/40">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                  {task.title}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CATEGORY_META[task.category].badgeClass}`}
                  >
                    {CATEGORY_META[task.category].label}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {task.effortEstimate}m
                  </span>
                </span>
              </li>
            ))}
            <li className="border-t border-zinc-200 pt-2 text-right text-[11px] text-zinc-500 dark:border-zinc-700/70 dark:text-zinc-400">
              {totalMinutes} min total
            </li>
          </ul>
        )}

        <p className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          The agent is paused until you decide.
        </p>

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onDecision(false)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Reject
          </button>
          <button
            ref={approveButtonRef}
            type="button"
            onClick={() => onDecision(true)}
            data-testid="approve-button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            <Check className="h-4 w-4" aria-hidden /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}
