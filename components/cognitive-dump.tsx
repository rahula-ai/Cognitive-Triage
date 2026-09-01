"use client";

import { BrainCircuit, Eraser, Plug, Sparkles } from "lucide-react";

interface CognitiveDumpProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onLoadSample: () => void;
  agentBusy: boolean;
}

/**
 * Left panel — the unstructured inlet. Meeting notes, half-formed worries,
 * whatever is rattling around. The agent's `process_cognitive_dump` tool
 * triages whatever lands here.
 */
export function CognitiveDump({
  value,
  onChange,
  onClear,
  onLoadSample,
  agentBusy,
}: CognitiveDumpProps) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <section
      aria-labelledby="cognitive-dump-heading"
      className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Activity shimmer while a tool is executing */}
      {agentBusy && (
        <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-indigo-500/70" />
      )}

      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <BrainCircuit className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2
              id="cognitive-dump-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Cognitive Dump
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Everything on your mind, unfiltered.
            </p>
          </div>
        </div>
        <span
          title="Tools exposed to browser agents: process_cognitive_dump, commit_schedule_to_calendar"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:text-zinc-400"
        >
          <Plug className="h-3 w-3" aria-hidden /> 2 agent tools
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <label htmlFor="cognitive-dump-input" className="sr-only">
          Cognitive dump — type your unstructured thoughts, meeting notes, or anxieties
        </label>
        <textarea
          id="cognitive-dump-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            "Brain-dump here — messy is fine…\n\nMeeting notes, half-formed worries, that email you keep avoiding."
          }
          spellCheck={false}
          data-testid="cognitive-dump-input"
          className="min-h-[240px] flex-1 resize-y rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700/80 dark:bg-zinc-950/50 dark:text-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-indigo-500/60"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {words === 0
              ? "The agent will triage whatever lands here."
              : `${words} word${words === 1 ? "" : "s"} dumped`}
          </p>
          <div className="flex items-center gap-2">
            {value.trim().length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Load sample
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
