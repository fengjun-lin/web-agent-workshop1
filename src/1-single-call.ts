// STEP 1 - A single LLM call.
//
// Goal: feel the baseline. One prompt in, one text answer out. There is no
// "next step", no tools, no memory. The model can only guess from what it
// already knows -- so real-time facts (weather) and exact math are unreliable.
//
// Run:  npm run step1

import { chat } from "./llm.js";

async function main() {
  const question =
    "What is the weather in Altay right now, and what is 23 * 17?";

  const answer = await chat([
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: question },
  ]);

  console.log("Question:", question);
  console.log("\nAnswer:\n" + answer);
  console.log(
    "\n[Notice] The model has no live data and no calculator. It can only guess."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
