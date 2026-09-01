import { z } from "zod";

/**
 * Input schema for the `process_cognitive_dump` WebMCP tool.
 *
 * The agent must send an object with an `extractedTasks` array (max 3 items),
 * where each item is `{ title, effortEstimate, category }`.
 */
export const processCognitiveDumpInput = z.object({
  extractedTasks: z
    .array(
      z.object({
        title: z
          .string()
          .min(1)
          .describe("Short, imperative task title"),
        effortEstimate: z
          .number()
          .positive()
          .describe("Estimated effort in minutes"),
        category: z
          .enum(["work", "personal", "urgent"])
          .describe("Task category"),
      }),
    )
    .max(3)
    .describe(
      "Up to three prioritized, actionable tasks extracted from the user's unstructured input",
    ),
});

export type ProcessCognitiveDumpInput = z.infer<
  typeof processCognitiveDumpInput
>;

/**
 * Input schema for the `commit_schedule_to_calendar` WebMCP tool.
 *
 * Takes no arguments — it commits whatever is currently staged on the
 * Daily Three Board, after asking the human for approval.
 */
export const commitScheduleInput = z
  .object({})
  .describe(
    "No arguments — commits the tasks currently staged on the Daily Three Board",
  );

export type CommitScheduleInput = z.infer<typeof commitScheduleInput>;
