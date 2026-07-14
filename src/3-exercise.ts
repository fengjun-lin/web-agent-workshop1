// STEP 3 - Your turn (exercise).
//
// Two TODOs. When done, `npm run exercise` should behave like step 2 and also
// answer the extra question in the task below.
//
//   TODO 1: In src/tools.ts, add a new tool `get_time` that returns a fake time
//           for a city (mirror how `get_weather` is written).
//
//   TODO 2: Fill in the agent loop body where marked. The reference solution is
//           src/2-agent.ts -- try it yourself first, then compare.
//
// Run:  npm run exercise

import { chat } from "./llm.js";
import { toolDescriptions, runTool } from "./tools.js";
import type OpenAI from "openai";

const SYSTEM_PROMPT = `You are a reasoning agent that solves tasks step by step.

You can use the following tools:
${toolDescriptions()}

Always answer using this exact format, one step per turn:

Thought: <your reasoning about what to do next>
Action: <tool_name>[<input>]

After each Action you will be given:
Observation: <tool result>

Then continue with another Thought/Action. When you can answer the user, output:

Thought: <final reasoning>
Final Answer: <the answer for the user>`;

function parseAction(text: string): { tool: string; input: string } | null {
  const m = text.match(/Action:\s*([a-zA-Z_]+)\[([\s\S]*?)\]/);
  return m ? { tool: m[1], input: m[2] } : null;
}

function parseFinal(text: string): string | null {
  const m = text.match(/Final Answer:\s*([\s\S]*)/);
  return m ? m[1].trim() : null;
}

async function runAgent(task: string, maxSteps = 6): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];

  for (let step = 0; step < maxSteps; step++) {
    // --- TODO 2: implement one turn of the loop -------------------------------
    // 1. Call the model with `messages` (use stop: ["Observation:"]).
    // 2. Print + append the assistant output to `messages`.
    // 3. If parseFinal(output) returns something, return it.
    // 4. Otherwise parseAction(output), run the tool, print the observation,
    //    and append `Observation: <result>` as a user message.
    //
    // Reference: src/2-agent.ts
    // --------------------------------------------------------------------------
    throw new Error("TODO 2: implement the agent loop, then delete this line.");
  }

  return "Reached max steps without a final answer.";
}

async function main() {
  const answer = await runAgent(
    "What time is it in Altay, what's the weather there, and what is 23 * 17?"
  );
  console.log(`\n=== Final Answer ===\n${answer}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
