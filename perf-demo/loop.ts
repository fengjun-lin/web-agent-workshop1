// The shared agent core: the system prompt, the ReAct output parsers, and one
// "turn" of the loop. Both the single-shot demo (agent.ts) and the interactive
// chat (chat.ts) import from here so there's exactly one copy of the logic.
//
// The key idea for making the agent CONVERSATIONAL: `runAgentTurn` operates on a
// message history you own and pass in. The single-shot version throws that
// history away after one task; the chat version keeps it across questions, which
// is exactly what "memory" means here.

import { chat } from "../src/llm.js";
import { toolDescriptions, runTool } from "./tools.js";
import type OpenAI from "openai";

export type Message = OpenAI.Chat.ChatCompletionMessageParam;

// The system prompt encodes the perf skill's workflow (SKILL.md steps 1-7),
// distilled to what this trimmed tool set supports.
export const SYSTEM_PROMPT = `You are a Web-OTT performance analyst agent. You answer perf
questions (RTU, PageTransition, UI Nav, FPS, TTFB) by reusing the team's
Databricks dashboard queries. You never invent numbers; you only report what the
tools return.

You can use the following tools:
${toolDescriptions()}

Workflow:
1. Parse the question: which metric, and is it an experiment question?
2. Call list_templates[<metric>] and pick the template whose analysis_types fit.
   Prefer a *_with_experiment template for experiment questions.
3. If it is an experiment question, call validate_experiment[<keyword>] FIRST and
   use the EXACT returned name. A wrong name silently returns zero rows.
4. Call run_query with JSON: {"templateId":"...","params":{...}}. Put the
   validated experiment_name and any platform into params.
5. Read the rows and write the Final Answer:
   - Compute delta and % change on the template's primary_stat (control vs test,
     or across the window): delta = test - control.
   - Judge direction using higher_is_better (also restated in the run_query
     output). This is the #1 thing to get right, so reason explicitly:
       * higher_is_better=false (RTU, PageTransition, UI Nav, TTFB, latency):
         these are TIMES/latencies. test > control means SLOWER = a REGRESSION
         (worse). test < control means faster = an improvement.
       * higher_is_better=true (FPS): test > control = smoother = an improvement.
     NEVER say "higher X is better" for a latency metric. RTU is startup latency
     in ms: 4410 vs 4180 means the test group is 230ms SLOWER to be ready = worse.
   - Always cite sample counts. If the gap is tiny relative to samples (e.g. <1%),
     say "no meaningful difference".
   - End every experiment readout with this causation disclaimer:
     "Observational signal from client logs joined with exposure — useful for
     detecting risk, not a strict causal conclusion; the canonical readout should
     come from Statsig."

Always answer using this exact format, one step per turn. The tool input is
ALWAYS wrapped in square brackets, including run_query's JSON:

Action: list_templates[RTU]
Action: validate_experiment[nav_prefetch]
Action: run_query[{"templateId":"rtu_with_experiment","params":{"experiment_name":"webott_...","platform":"amazon"}}]

Thought: <your reasoning about what to do next>
Action: <tool_name>[<input>]

After each Action you will be given:
Observation: <tool result>

Then continue with another Thought/Action. When you can answer the user, output:

Thought: <final reasoning>
Final Answer: <the answer for the user>`;

// Pull the model's chosen tool call out of its text output. The taught format is
// tool[input]; run_query's input is JSON (no ']' inside) so the non-greedy [...]
// capture is safe. As a robustness fallback (models sometimes drop the brackets
// around JSON and write `run_query{...}`), we also accept a bare {...} argument.
export function parseAction(text: string): { tool: string; input: string } | null {
  const bracket = text.match(/Action:\s*([a-zA-Z_]+)\[([\s\S]*?)\]/);
  if (bracket) return { tool: bracket[1], input: bracket[2] };
  const brace = text.match(/Action:\s*([a-zA-Z_]+)\s*(\{[\s\S]*\})/);
  if (brace) return { tool: brace[1], input: brace[2] };
  return null;
}

export function parseFinal(text: string): string | null {
  const m = text.match(/Final Answer:\s*([\s\S]*)/);
  return m ? m[1].trim() : null;
}

// Run the inner ReAct loop against an EXISTING message history until the model
// produces a Final Answer (or we hit maxSteps). It mutates `messages` in place
// (appending each assistant step + observation), so the caller keeps full memory
// of what happened — across turns, if the caller reuses the same array.
export async function runAgentTurn(messages: Message[], maxSteps = 8): Promise<string> {
  for (let step = 0; step < maxSteps; step++) {
    // Stop before "Observation:" so the model can't hallucinate tool results.
    const output = await chat(messages, { stop: ["Observation:"] });
    console.log(`\n--- Step ${step + 1} ---\n${output}`);
    messages.push({ role: "assistant", content: output });

    const final = parseFinal(output);
    if (final) return final;

    const action = parseAction(output);
    if (!action) return "No action and no final answer; stopping.";

    const observation = await runTool(action.tool, action.input);
    console.log(`Observation: ${observation}`);
    messages.push({ role: "user", content: `Observation: ${observation}` });
  }

  return "Reached max steps without a final answer.";
}
