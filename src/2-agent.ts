// STEP 2 - The minimal ReAct agent (the payoff).
//
// The whole "agent" is just a loop:
//   ask the model -> it picks a tool -> we run it -> feed the result back -> repeat
// ...until the model produces a Final Answer.
//
// This is the complete, working reference. Step 3 asks you to rebuild the loop
// yourself and add a tool.
//
// Run:  npm run step2

import { chat } from "./llm.js";
import { toolDescriptions, runTool } from "./tools.js";
import type OpenAI from "openai";

// The system prompt IS the protocol: it teaches the model the tools + the
// exact Thought/Action/Final Answer format we will parse.
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

// Pull the model's decision out of its text output.
// (In a later lesson, "function calling" replaces this brittle regex step.)
function parseAction(text: string): { tool: string; input: string } | null {
  const m = text.match(/Action:\s*([a-zA-Z_]+)\[([\s\S]*?)\]/);
  return m ? { tool: m[1], input: m[2] } : null;
}

function parseFinal(text: string): string | null {
  const m = text.match(/Final Answer:\s*([\s\S]*)/);
  return m ? m[1].trim() : null;
}

async function runAgent(task: string, maxSteps = 6): Promise<string> {
  // `messages` is the short-term memory: every step is appended so the model
  // always sees what happened so far.
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];

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

async function main() {
  const answer = await runAgent(
    "What is the weather in Altay, and what is 23 * 17?"
  );
  console.log(`\n=== Final Answer ===\n${answer}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
