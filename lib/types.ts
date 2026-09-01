export type TaskCategory = "work" | "personal" | "urgent";

/** A task as it lives on the Daily Three Board. */
export interface Task {
  id: string;
  title: string;
  /** Estimated effort in minutes. */
  effortEstimate: number;
  category: TaskCategory;
}

/** A task as delivered by an agent inside the `process_cognitive_dump` payload. */
export type ExtractedTask = Omit<Task, "id">;

/** Which WebMCP runtime the page is currently talking to. */
export type AgentRuntime = "native" | "polyfill" | "none";

export interface LogEntry {
  id: string;
  at: number;
  kind: "call" | "result" | "info" | "error";
  tool?: string;
  message: string;
}

export const CATEGORY_META: Record<
  TaskCategory,
  { label: string; badgeClass: string }
> = {
  work: {
    label: "Work",
    badgeClass:
      "bg-sky-100 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25",
  },
  personal: {
    label: "Personal",
    badgeClass:
      "bg-violet-100 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/25",
  },
  urgent: {
    label: "Urgent",
    badgeClass:
      "bg-rose-100 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
  },
};

export const SAMPLE_DUMP = `Ugh, where to start. I still haven't sent the Q3 recap email to Priya and she asked twice already.
The deploy keeps failing because of the flaky integration test — I need to sit down and actually read the logs instead of re-running it for the tenth time.
Mom's birthday is on Friday and I haven't bought anything yet.
Also I should probably book the dentist appointment I've been postponing since March.
And the car service is due — the 30,000 km check.`;
