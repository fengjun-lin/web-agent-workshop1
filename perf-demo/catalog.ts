// A trimmed-down copy of the real perf skill's query_catalog.yaml.
//
// The real catalog lives in www/.cursor/skills/perf/query_catalog.yaml and drives
// a Cursor agent that answers Web-OTT performance questions off a Databricks
// dashboard. Here we keep only ~6 templates and the handful of fields the demo
// agent needs to route a question, validate params, and interpret the result.
//
// This is the "semantic source of truth": it tells the agent WHICH query answers
// a question, what params it needs, which direction is good (higher_is_better),
// and which stat to lead the verdict with (primary_stat).

export type AnalysisType =
  | "experiment_comparison"
  | "trend"
  | "breakdown"
  | "baseline_comparison"
  | "overview";

export type Template = {
  id: string;
  metric: string;
  aliases: string[];
  analysis_types: AnalysisType[];
  // true for FPS-like metrics (bigger = better); false for latency/error metrics.
  higher_is_better: boolean;
  // The stat to lead the verdict with; matches a column name in the result rows.
  primary_stat: string;
  // Params the caller MUST provide (e.g. experiment_name for *_with_experiment).
  required_params: string[];
  // Template ids to suggest as a next drilldown when a regression shows up.
  drilldowns: string[];
};

export const templates: Template[] = [
  // ============ RTU ============
  {
    id: "rtu_with_experiment",
    metric: "RTU",
    aliases: [
      "ready to use",
      "startup latency",
      "launch rtu",
      "app start time",
      "experiment affects rtu",
      "rtu experiment impact",
    ],
    analysis_types: ["experiment_comparison", "trend"],
    higher_is_better: false,
    primary_stat: "p90",
    required_params: ["experiment_name"],
    drilldowns: ["rtu_overview"],
  },
  {
    id: "rtu_overview",
    metric: "RTU",
    aliases: ["rtu by platform", "rtu trend", "launch rtu over time"],
    analysis_types: ["trend", "breakdown", "baseline_comparison", "overview"],
    higher_is_better: false,
    primary_stat: "p90",
    required_params: [],
    drilldowns: [],
  },

  // ============ PageTransition ============
  {
    id: "pagetransition_with_experiment",
    metric: "PageTransition",
    aliases: [
      "page transition experiment",
      "route change time experiment",
      "experiment affects page transition",
    ],
    analysis_types: ["experiment_comparison", "trend"],
    higher_is_better: false,
    primary_stat: "p50",
    required_params: ["experiment_name"],
    drilldowns: [],
  },

  // ============ UI Nav ============
  {
    id: "ui_nav_with_experiment",
    metric: "UINav",
    aliases: [
      "navigation speed experiment",
      "homegrid nav experiment",
      "focus move time experiment",
      "experiment affects navigation",
    ],
    analysis_types: ["experiment_comparison", "breakdown"],
    higher_is_better: false,
    primary_stat: "ui_nav_p90",
    required_params: ["experiment_name"],
    drilldowns: [],
  },

  // ============ FPS ============
  {
    id: "fps_render",
    metric: "FPS",
    aliases: ["render fps", "rendering smoothness", "frame rate render"],
    analysis_types: ["breakdown", "baseline_comparison"],
    higher_is_better: true,
    primary_stat: "FPS_p50",
    required_params: [],
    drilldowns: [],
  },

  // ============ Web vitals ============
  {
    id: "perf_ttfb_by_platform",
    metric: "TTFB",
    aliases: ["ttfb", "time to first byte", "ttfb by platform"],
    analysis_types: ["trend", "breakdown", "baseline_comparison"],
    higher_is_better: false,
    primary_stat: "p50",
    required_params: [],
    drilldowns: [],
  },
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

// Group templates by metric so the agent can list "what can I query" cheaply.
export function templatesByMetric(metric?: string): Template[] {
  if (!metric) return templates;
  const needle = metric.trim().toLowerCase();
  return templates.filter((t) => t.metric.toLowerCase() === needle);
}
