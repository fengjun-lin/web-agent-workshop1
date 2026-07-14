// The perf agent's tools. Same shape as the workshop's src/tools.ts (a name ->
// { description, run } map), but instead of a fake weather API these wrap the
// perf catalog + the (mocked) Databricks queries.
//
// Three tools, mirroring the real skill's flow:
//   list_templates[metric]      -> route a question to the right query template
//   validate_experiment[keyword]-> confirm an experiment name exists (avoid 0 rows)
//   run_query[JSON]             -> run a template and get control/test rows back

import { templates, templatesByMetric, getTemplate } from "./catalog.js";
import { findExperiments, runQuery, type QueryParams } from "./mockData.js";

export type Tool = {
  description: string;
  run: (input: string) => Promise<string> | string;
};

export const tools: Record<string, Tool> = {
  list_templates: {
    description:
      "list query templates, optionally filtered by metric (RTU/PageTransition/UINav/FPS/TTFB), e.g. list_templates[RTU]. Returns id, analysis_types, primary_stat, higher_is_better, required_params.",
    run: (metric: string) => {
      const picked = metric.trim() ? templatesByMetric(metric) : templates;
      if (picked.length === 0) {
        const known = [...new Set(templates.map((t) => t.metric))].join(", ");
        return `No template for metric "${metric.trim()}". Known metrics: ${known}.`;
      }
      return picked
        .map(
          (t) =>
            `- ${t.id} | metric=${t.metric} | analysis=${t.analysis_types.join(
              "/"
            )} | primary_stat=${t.primary_stat} | higher_is_better=${
              t.higher_is_better
            } | required_params=[${t.required_params.join(",")}]`
        )
        .join("\n");
    },
  },

  validate_experiment: {
    description:
      "check that an experiment name exists before querying it, e.g. validate_experiment[multiple_accounts]. Returns the exact name(s) matching the keyword.",
    run: (keyword: string) => {
      const matches = findExperiments(keyword);
      if (matches.length === 0) {
        return `No webott experiment matches "${keyword.trim()}". Check the Statsig name or give a fuller keyword. Do NOT run the metric query.`;
      }
      if (matches.length > 1) {
        return `Multiple experiments match "${keyword.trim()}":\n${matches
          .map((m) => `  - ${m}`)
          .join("\n")}\nAsk the user which one, or pass a more specific keyword.`;
      }
      return `Exactly one match: ${matches[0]} (use this exact name as experiment_name).`;
    },
  },

  run_query: {
    description:
      'run a template against the (mocked) perf data. Input is JSON: {"templateId":"rtu_with_experiment","params":{"experiment_name":"webott_...","platform":"amazon"}}. Returns the result columns and rows.',
    run: (input: string) => {
      let parsed: { templateId?: string; params?: QueryParams } & QueryParams;
      try {
        parsed = JSON.parse(input);
      } catch {
        return `Error: run_query input must be JSON, e.g. {"templateId":"rtu_with_experiment","params":{"experiment_name":"webott_..."}}. Got: ${input}`;
      }

      const templateId = parsed.templateId;
      if (!templateId) {
        return 'Error: JSON is missing "templateId".';
      }
      if (!getTemplate(templateId)) {
        return `Error: unknown templateId "${templateId}". Call list_templates first.`;
      }

      // Accept params either nested under "params" or flattened alongside templateId.
      const params: QueryParams = {
        ...(parsed.experiment_name ? { experiment_name: parsed.experiment_name } : {}),
        ...(parsed.platform ? { platform: parsed.platform } : {}),
        ...(parsed.params ?? {}),
      };

      const result = runQuery(templateId, params);
      if (result.note && result.rows.length === 0) {
        return result.note;
      }

      const template = getTemplate(templateId)!;
      const header = result.columns.join(" | ");
      const body = result.rows
        .map((r) => result.columns.map((c) => String(r[c])).join(" | "))
        .join("\n");
      // Restate the direction rule right next to the numbers so the verdict
      // can't invert it: for lower-is-better metrics a BIGGER value is WORSE.
      const direction = template.higher_is_better
        ? `higher_is_better=true -> a BIGGER ${template.primary_stat} is BETTER`
        : `higher_is_better=false -> a BIGGER ${template.primary_stat} is WORSE (lower is better)`;
      return `template=${templateId} params=${JSON.stringify(
        params
      )}\nprimary_stat=${template.primary_stat} | ${direction}\n${header}\n${body}`;
    },
  },
};

export function toolDescriptions(): string {
  return Object.entries(tools)
    .map(([name, t]) => `- ${name}[input]: ${t.description}`)
    .join("\n");
}

export async function runTool(name: string, input: string): Promise<string> {
  const tool = tools[name];
  if (!tool) return `Unknown tool: ${name}`;
  return tool.run(input);
}
