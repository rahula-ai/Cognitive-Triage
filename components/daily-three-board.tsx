"use client";

import {
  Briefcase,
  Check,
  CircleDashed,
  Clock,
  Lock,
  RotateCcw,
  Target,
  User,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_META, type Task, type TaskCategory } from "@/lib/types";

const CATEGORY_ICONS: Record<TaskCategory, LucideIcon> = {
  work: Briefcase,
  personal: User,
  urgent: Zap,
};

interface DailyThreeBoardProps {
  tasks: Task[];
  locked: boolean;
  onReset: () => void;
  resetDisabled: boolean;
}

function TaskCard({
  task,
  index,
  locked,
}: {
  task: Task;
  index: number;
  locked: boolean;
}) {
  const CategoryIcon = CATEGORY_ICONS[task.category];
  const meta = CATEGORY_META[task.category];

  return (
    <li
      data-testid="task-card"
      className={`animate-pop-in flex gap-3.5 rounded-xl border p-4 transition-colors ${
        locked
          ? "border-emerald-300/70 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
      }`}
    >
      <span
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${
          locked
            ? "bg-emerald-500 text-white"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
        aria-hidden
      >
        {locked ? <Check className="h-3.5 w-3.5" /> : index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
          {task.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            <Clock className="h-3 w-3" aria-hidden />
            {task.effortEstimate} min
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.badgeClass}`}
          >
            <CategoryIcon className="h-3 w-3" aria-hidden />
            {meta.label}
          </span>
        </div>
      </div>

      {locked && (
        <Lock
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-label="Locked"
        />
      )}
    </li>
  );
}

/**
 * Right panel — the prioritized output. At most three tasks at a time; the
 * board only becomes final after the human approves the agent's commit.
 */
export function DailyThreeBoard({
  tasks,
  locked,
  onReset,
  resetDisabled,
}: DailyThreeBoardProps) {
  const totalMinutes = tasks.reduce((sum, task) => sum + task.effortEstimate, 0);
  const emptySlots = Math.max(0, 3 - tasks.length);

  return (
    <section
      aria-labelledby="daily-three-heading"
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Target className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2
              id="daily-three-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Daily Three Board
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your three highest-leverage moves today.
            </p>
          </div>
        </div>
        {locked && (
          <span
            data-testid="locked-badge"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25"
          >
            <Lock className="h-3 w-3" aria-hidden /> Locked in
          </span>
        )}
      </div>

      <ol className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} index={index} locked={locked} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <li
            key={`slot-${tasks.length + i}`}
            aria-hidden
            className="flex items-center gap-3.5 rounded-xl border border-dashed border-zinc-300/80 p-4 dark:border-zinc-700/70"
          >
            <CircleDashed className="h-6 w-6 shrink-0 text-zinc-300 dark:text-zinc-600" />
            <div>
              <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                Slot {tasks.length + i + 1}
              </p>
              <p className="text-[11px] text-zinc-300 dark:text-zinc-600">
                Awaiting triage
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3.5 dark:border-zinc-800/80">
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {tasks.length > 0
            ? `${totalMinutes} min of focused work`
            : "No time committed yet"}
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-zinc-400 sm:inline dark:text-zinc-500">
            {locked
              ? "Finalized — safe from re-triage."
              : tasks.length > 0
                ? "Staged — the agent can still re-triage."
                : "Waiting for the agent."}
          </span>
          {(tasks.length > 0 || locked) && (
            <button
              type="button"
              onClick={onReset}
              disabled={resetDisabled}
              title={
                resetDisabled
                  ? "Wait for the agent to finish before resetting"
                  : "Clear the board and unlock it"
              }
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
