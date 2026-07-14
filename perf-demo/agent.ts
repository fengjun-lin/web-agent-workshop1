// PERF DEMO (single-shot) - the same minimal ReAct loop from the workshop
// (src/2-agent.ts), pointed at a REAL-WORLD tool set: the team's "perf" skill.
//
// The perf skill answers Web-OTT performance questions (does experiment X hurt
// RTU? how's FPS on Fire TV?) by picking a Databricks dashboard query, running
// it, and returning a verdict. Under the hood it's just a ReAct agent: parse the
// question -> pick a template -> validate the experiment -> run the query ->
// judge the delta. We reuse the workshop's loop verbatim (see loop.ts) and only
// swap the tools + system prompt.
//
// This file runs ONE task and exits. For a conversational version that keeps
// memory across questions, see chat.ts (`npm run perf-demo:chat`).
//
// Databricks is mocked here (see mockData.ts / README) so this runs offline.
//
// Run:  npm run perf-demo [preset|"your question"]

import { SYSTEM_PROMPT, runAgentTurn, type Message } from "./loop.js";

async function runAgent(task: string, maxSteps = 8): Promise<string> {
  // A fresh, throwaway message history: system prompt + the one task.
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];
  return runAgentTurn(messages, maxSteps);
}

// Preset tasks for the live demo. Pick one on the command line, e.g.
//   npm run perf-demo -- ttfb
//   npm run perf-demo -- uinav
// or pass a full custom question:
//   npm run perf-demo -- "How's render FPS on Fire TV by model?"
const TASKS: Record<string, string> = {
  // Experiment questions -> the agent must validate_experiment first.
  rtu: "How does webott_firetv_multiple_accounts_phase_3 affect RTU on Fire TV?",
  uinav: "Does webott_firetv_nav_prefetch affect UI navigation speed on Fire TV?",
  pagetransition: "Does webott_web_home_redesign affect page transition time?",
  // Non-experiment questions -> the agent skips validation and just queries.
  ttfb: "What is the TTFB by platform recently?",
  fps: "How is render FPS on Fire TV, broken down by model?",
};

async function main() {
  const arg = process.argv[2] ?? "rtu";
  // Accept a preset key (rtu/ttfb/uinav/...) OR a full custom question.
  const task = TASKS[arg] ?? arg;
  console.log(`Task: ${task}\n(presets: ${Object.keys(TASKS).join(", ")})`);
  const answer = await runAgent(task);
  console.log(`\n=== Final Answer ===\n${answer}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
