// PERF DEMO (interactive chat) - the SAME agent as agent.ts, just wrapped in a
// conversation instead of a one-shot run.
//
// This is the answer to "is an agent just a run-once script?": no. The agent IS
// the loop in loop.ts. Here we put a different SHELL around it:
//   - an outer while-loop that reads your questions from the terminal, and
//   - a SINGLE message history that persists across questions (= memory).
//
// So you can ask a follow-up like "what about on web?" and the agent still has
// the previous turn's context. Type "exit" (or Ctrl+C) to quit.
//
// Run:  npm run perf-demo:chat

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { SYSTEM_PROMPT, runAgentTurn, type Message } from "./loop.js";

async function main() {
  // One history for the WHOLE conversation. Every question appends to it, and
  // the agent's steps (Thought/Action/Observation) stay in it too — that shared,
  // growing transcript is the agent's short-term memory across turns.
  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  const rl = readline.createInterface({ input, output });

  console.log(
    [
      "Perf agent (interactive). Ask a Web-OTT perf question, e.g.:",
      '  - "How does webott_firetv_multiple_accounts_phase_3 affect RTU on Fire TV?"',
      '  - "What is the TTFB by platform recently?"',
      '  - a follow-up like "what about on web?" (it remembers the last turn)',
      "Type 'exit' or Ctrl+C to quit.",
    ].join("\n")
  );

  while (true) {
    let question: string;
    try {
      question = (await rl.question("\nyou > ")).trim();
    } catch {
      // stdin reached EOF (e.g. Ctrl+D or piped input ended).
      break;
    }
    if (!question) continue;
    if (question === "exit" || question === "quit") break;

    messages.push({ role: "user", content: question });
    // Same loop as the single-shot demo, but on the persistent history.
    const answer = await runAgentTurn(messages);
    console.log(`\nagent > ${answer}`);
  }

  rl.close();
  console.log("\nbye.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
