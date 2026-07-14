# Agent Workshop: Build a Minimal ReAct Agent

A hands-on, framework-free workshop. In ~20 minutes you go from a single LLM
call to a working agent that reasons, calls tools, and loops until done.

> Core idea: an agent is just **LLM + loop + tools + memory**. No framework required.

## Prerequisites

- Node.js 20+ (`node -v`)
- An API key for any OpenAI-compatible endpoint (OpenAI, GitHub Models, MiniMax)

## Setup

```bash
npm install
cp .env.example .env
# open .env and paste your key (OpenAI is the default; see file for alternatives)
```

## The three steps

| Step | Command | What you learn |
| --- | --- | --- |
| 1. Single call | `npm run step1` | A lone LLM call has no "next step", no tools, no memory. It guesses. |
| 2. The agent | `npm run step2` | The full ReAct loop: Thought -> Action -> Observation, repeated. |
| 3. Exercise | `npm run exercise` | Rebuild the loop yourself and add a new tool. |

### Step 1 - the baseline

```bash
npm run step1
```

Ask for live weather and exact math. The model can only guess -- it has no
tools and no memory. This is the problem an agent solves.

### Step 2 - the minimal agent

```bash
npm run step2
```

Watch the loop print each step: the model **thinks**, picks an **action**
(a tool), receives an **observation** (the real result), and repeats until it
outputs a **Final Answer**. That loop is the entire agent.

Read `src/2-agent.ts` -- it is ~90 lines and every piece maps to the mental
model:

- `SYSTEM_PROMPT` = the protocol (tools + output format)
- `for` loop = the **loop**
- `runTool` = **tools**
- `messages` array = **memory** (short-term / conversation history)

### Step 3 - your turn

Open `src/3-exercise.ts` and complete two TODOs:

1. **Add a tool** `get_time` in `src/tools.ts` (mirror `get_weather`).
2. **Implement the loop body** where marked.

Then run:

```bash
npm run exercise
```

If it answers time + weather + math across multiple steps, you built an agent.
Compare with the reference in `src/2-agent.ts`.

## Where this goes next

Parsing the model's text with a regex is brittle. The next topic,
**Tool Use / Function Calling**, makes tool selection structured and reliable.
But the core loop stays exactly the same.
