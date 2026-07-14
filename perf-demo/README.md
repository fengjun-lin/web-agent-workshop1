# Perf Demo — a "real world" ReAct agent

This is the **advanced** demo for the workshop. Steps 1–3 build a toy ReAct agent
with fake weather/calculator tools. This one keeps the **exact same loop** but
points it at a real internal use case: our team's **perf skill**.

The perf skill answers Web-OTT performance questions —

> "How does experiment X affect RTU?" · "Is FPS on Fire TV regressing?" · "TTFB by platform?"

— by reusing the queries behind the **Web-OTT Performance** Databricks dashboard.
Strip away the SQL and the dashboard, and it's just a ReAct agent:

```
parse question → pick a query template → validate the experiment → run the query → judge the delta
```

That's the whole point of the demo: **the same 40-line loop from step 2 scales to
a genuinely useful internal tool** just by changing the tools and the system
prompt.

## Run

```bash
# from the agent-workshop root — default task is the RTU experiment
npm run perf-demo

# pick a preset task (great for showing different branches live)
npm run perf-demo -- ttfb     # non-experiment: skips validation, just queries
npm run perf-demo -- uinav    # experiment: validates the name first
npm run perf-demo -- rtu      # experiment with a regression (default)
npm run perf-demo -- pagetransition
npm run perf-demo -- fps

# or pass a full custom question
npm run perf-demo -- "How is render FPS on Fire TV by model?"
```

### Interactive chat (multi-turn, with memory)

`npm run perf-demo` runs one task and exits. To see that an agent is **not** just
a run-once script, there's a conversational version:

```bash
npm run perf-demo:chat
```

It wraps the SAME loop (`loop.ts`) in a REPL: type a question, get an answer,
ask a follow-up. A single message history persists across turns, so the agent
remembers previous results:

```
you > What is the TTFB by platform recently?
agent > ... amazon p50 240->250ms, web 180->175ms ...
you > which platform is worse on the latest day?
agent > amazon (250ms vs 175ms, 75ms slower)   # answered from memory, no re-query
```

Type `exit` (or Ctrl+D) to quit. Same code as the single-shot demo — only the
outer shell (an input loop + a persistent history) changed.

> Note: the OpenAI key is read from your shell env. If you exported it only in an
> interactive shell (e.g. via `~/.zshrc`), run through one: `zsh -i -c 'npm run perf-demo -- ttfb'`
> (for the chat REPL, run it in your own terminal so stdin stays interactive).

You'll watch the agent think in `Thought / Action / Observation` steps: list
templates → (for experiment questions) validate the experiment name → run the
query → deliver a verdict with delta, % change, direction judgment, sample
counts, and a causation disclaimer.

Preset highlights:
- **`rtu`** — the default. Sample data makes this experiment a **slight RTU
  regression** (control p90 = 4180ms → test p90 = 4410ms; lower is better), so the
  agent flags it as worse. Good for showing the agent get direction right.
- **`ttfb`** — a NON-experiment question. The agent skips `validate_experiment`
  and goes straight to the query, then reads a per-platform/day trend.
- **`uinav`** — an experiment question that comes out as a **small improvement**
  (test slightly faster). Good contrast with the RTU regression.

## Files

| File | Role | Real-skill analogue |
| --- | --- | --- |
| `catalog.ts` | ~6 query templates + routing metadata (metric, aliases, `higher_is_better`, `primary_stat`, `required_params`, `drilldowns`) | `query_catalog.yaml` |
| `mockData.ts` | `findExperiments()` + `runQuery()` returning deterministic sample rows | Databricks (`statsig_experiment_bydevice` scan + dashboard SQL) |
| `tools.ts` | 3 tools: `list_templates`, `validate_experiment`, `run_query` | catalog lookup + MCP execution |
| `loop.ts` | the shared agent core: system prompt (distilled from `SKILL.md`), ReAct parsers, and one `runAgentTurn` over a message history | the skill workflow (steps 1–7) |
| `agent.ts` | single-shot shell around `loop.ts`: run one task and exit | — |
| `chat.ts` | interactive shell around `loop.ts`: a REPL with a persistent history (memory) | — |

It reuses the workshop's shared `../src/llm.ts` client and the already-installed
`openai` / `tsx` dependencies — nothing new to install.

## The three tools

1. **`list_templates[metric]`** — routing. `list_templates[RTU]` returns the
   templates for that metric with their `analysis_types`, `primary_stat`,
   `higher_is_better`, and `required_params`. The agent uses this to choose the
   right query (and to know which direction is "good").
2. **`validate_experiment[keyword]`** — guardrail. A wrong experiment name
   silently returns zero rows in the real dashboard, so experiment questions must
   resolve the exact name first. Known sample experiments:
   `webott_firetv_multiple_accounts_phase_3`, `webott_web_home_redesign`,
   `webott_firetv_nav_prefetch`.
3. **`run_query[JSON]`** — execution. Input is JSON, e.g.
   `{"templateId":"rtu_with_experiment","params":{"experiment_name":"webott_...","platform":"amazon"}}`.
   Returns columns + control/test rows.

## Going real (swapping the mock for live Databricks)

Everything real lives behind `mockData.ts`. To connect to the actual dashboard,
replace the two functions there with a real connector; nothing else changes.

- **`findExperiments(keyword)`** → run the discovery query and return the matching
  names:
  ```sql
  SELECT DISTINCT experiment__name
  FROM core_dev.dsa.statsig_experiment_bydevice
  WHERE experiment__name LIKE '%<keyword>%'
  ORDER BY experiment__name
  ```
- **`runQuery(templateId, params)`** → look up the SQL template (in the real skill
  these live in `queries.md`, joined by `dataset_id`), substitute the params
  (`experiment_name`, `platform`, `date_range`) and the template's
  `recommended_filters`, then execute read-only and parse the rows.

### Why it's mocked here

- The real skill executes SQL through the **`user-databricks` MCP server**, which
  is only reachable from inside a Cursor agent — a standalone `node`/`tsx` script
  can't call it.
- The `tubi-dev` Databricks profile uses **short-lived OAuth** (via
  `databricks-cli`), not a static token you can drop into an env var.

So for a self-contained, offline-runnable workshop demo we mock the data layer
and keep the interface identical. Two ways to make it live:

1. **Databricks SQL connector** — add `@databricks/sql`, authenticate with a
   real token / OAuth, and run the rendered SQL from `runQuery`. Best for a
   script like this one.
2. **Run it as a Cursor agent** — port `tools.ts` to call the `user-databricks`
   MCP tools (`execute_sql_read_only` → `poll_sql_result`) instead of
   `mockData.ts`. This is what the production perf skill does.

The safety rules from the real skill still apply once live: keep a date filter,
add a `LIMIT` to raw/row-returning queries, read-only only (no
INSERT/UPDATE/DELETE/DDL), and never run a metric query with an unvalidated
experiment name.
