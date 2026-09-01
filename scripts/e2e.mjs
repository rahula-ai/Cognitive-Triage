/**
 * E2E verification of the Cognitive Triage tool pipeline.
 * Requires the dev server on http://localhost:3000 and playwright installed.
 *
 *   node scripts/e2e.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let failures = 0;
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}`);
  }
};

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (err) => {
  failures++;
  console.error("  ✗ uncaught page error:", err.message);
});
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("  [console.error]", msg.text().slice(0, 200));
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator("#cognitive-dump-input").waitFor({ timeout: 30000 });

console.log("\n— layout —");
check("page title", (await page.title()).includes("Cognitive Triage"));
check("Cognitive Dump textarea present", (await page.locator("#cognitive-dump-input").count()) === 1);
check("Daily Three Board present", await page.getByText("Daily Three Board").first().isVisible());
check("Agent Sandbox present", await page.getByText("Agent Sandbox").first().isVisible());
check("agent idle initially", (await page.getByTestId("agent-status").innerText()).includes("Agent idle"));
check("no task cards yet", (await page.locator('[data-testid="task-card"]').count()) === 0);

console.log("\n— WebMCP tool registration —");
// Registration lands shortly after hydration (provider effect → context flip
// → tool effect), so poll for it rather than checking instantly.
let tools = [];
for (let i = 0; i < 100; i++) {
  tools = await page.evaluate(() => navigator.modelContextTesting?.listTools() ?? []);
  if (tools.length === 2) break;
  await page.waitForTimeout(100);
}
check("2 tools registered", tools.length === 2);
check(
  "tool names correct",
  tools.map((t) => t.name).sort().join(",") ===
    "commit_schedule_to_calendar,process_cognitive_dump",
);
const processDesc = tools.find((t) => t.name === "process_cognitive_dump")?.description ?? "";
check(
  "process_cognitive_dump description",
  processDesc.startsWith("Extract a prioritized list of up to three actionable tasks"),
);
const schema = JSON.parse(
  tools.find((t) => t.name === "process_cognitive_dump")?.inputSchema ?? "{}",
);
check(
  "schema: extractedTasks array with maxItems 3",
  schema.properties?.extractedTasks?.type === "array" &&
    schema.properties?.extractedTasks?.maxItems === 3,
);
check(
  "schema: item shape {title, effortEstimate, category}",
  JSON.stringify(
    Object.keys(schema.properties.extractedTasks.items.properties).sort(),
  ) === '["category","effortEstimate","title"]',
);
check(
  "schema: category enum",
  JSON.stringify(schema.properties.extractedTasks.items.properties.category.enum) ===
    '["work","personal","urgent"]',
);
check(
  "schema: required fields",
  JSON.stringify(schema.properties.extractedTasks.items.required?.sort()) ===
    '["category","effortEstimate","title"]',
);

console.log("\n— process_cognitive_dump (via sandbox) —");
await page.getByRole("button", { name: /load sample/i }).click();
check(
  "sample dump loaded",
  (await page.inputValue("#cognitive-dump-input")).includes("Q3 recap email"),
);
await page.getByRole("button", { name: /run triage on my dump/i }).click();
await page
  .getByText("Agent working")
  .waitFor({ state: "visible", timeout: 3000 })
  .catch(() => {});
check(
  "agent status pulsing while executing (state.isExecuting)",
  (await page.getByTestId("agent-status").innerText()).includes("Agent working"),
);
await page.locator('[data-testid="task-card"]').first().waitFor({ timeout: 15000 });
check("3 task cards staged", (await page.locator('[data-testid="task-card"]').count()) === 3);
const firstCard = await page.locator('[data-testid="task-card"]').first().innerText();
check("card shows effort in minutes", /\d+\s*min/.test(firstCard));
check(
  "card shows a category badge",
  /Work|Personal|Urgent/.test(firstCard),
);
check(
  "agent idle again after execution",
  (await page.getByTestId("agent-status").innerText()).includes("Agent idle"),
);
check("not locked before commit", (await page.getByTestId("locked-badge").count()) === 0);
const consoleText1 = await page.getByTestId("agent-console").innerText();
check("console traces the tool call", consoleText1.includes("process_cognitive_dump"));

console.log("\n— commit_schedule_to_calendar: approval gate —");
await page.getByRole("button", { name: /commit the schedule/i }).click();
await page.getByTestId("approval-modal").waitFor({ timeout: 5000 });
const modalText = await page.getByTestId("approval-modal").innerText();
check(
  "modal shows the exact confirmation question",
  modalText.includes(
    "The agent wants to finalize and lock these tasks. Do you approve?",
  ),
);
check("modal has Approve + Reject buttons", modalText.includes("Approve") && modalText.includes("Reject"));
check(
  "agent execution paused (still 'working') while modal open",
  (await page.getByTestId("agent-status").innerText()).includes("Agent working"),
);

console.log("\n— reject path —");
await page.getByRole("button", { name: "Reject", exact: true }).click();
await page.waitForTimeout(500);
check("modal closed after reject", (await page.getByTestId("approval-modal").count()) === 0);
check("board NOT locked after reject", (await page.getByTestId("locked-badge").count()) === 0);
check("tasks remain staged after reject", (await page.locator('[data-testid="task-card"]').count()) === 3);

console.log("\n— approve path —");
await page.getByRole("button", { name: /commit the schedule/i }).click();
await page.getByTestId("approval-modal").waitFor({ timeout: 5000 });
await page.getByTestId("approve-button").click();
await page.getByTestId("locked-badge").waitFor({ timeout: 5000 });
check("locked badge shown after approve", true);
const consoleText2 = await page.getByTestId("agent-console").innerText();
check("console records the lock", consoleText2.includes("schedule locked"));
check(
  "agent idle after resolution",
  (await page.getByTestId("agent-status").innerText()).includes("Agent idle"),
);

console.log("\n— schema enforcement (agent sends 4 tasks) —");
const badCall = await page.evaluate(async () => {
  const four = [1, 2, 3, 4].map((i) => ({
    title: `Task ${i}`,
    effortEstimate: 10,
    category: "work",
  }));
  const raw = await navigator.modelContextTesting.executeTool(
    "process_cognitive_dump",
    JSON.stringify({ extractedTasks: four }),
  );
  return JSON.parse(raw);
});
check(
  "payload with >3 tasks fails validation",
  badCall.isError === true && /3|three/i.test(badCall.content?.[0]?.text ?? ""),
);

console.log("\n— human overrides & dark mode —");
await page.getByRole("button", { name: "Reset" }).click();
await page.waitForTimeout(300);
check("board cleared by human reset", (await page.locator('[data-testid="task-card"]').count()) === 0);
check("lock cleared by human reset", (await page.getByTestId("locked-badge").count()) === 0);
const wasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
await page.getByRole("button", { name: "Toggle dark mode" }).click();
await page.waitForTimeout(200);
const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
check("dark mode toggles", isDark !== wasDark);
check(
  "theme persisted to localStorage",
  (await page.evaluate(() => localStorage.getItem("ct-theme"))) === (isDark ? "dark" : "light"),
);

await browser.close();
console.log(
  failures === 0 ? "\nALL CHECKS PASSED ✅" : `\n${failures} CHECK(S) FAILED ❌`,
);
process.exit(failures === 0 ? 0 : 1);
