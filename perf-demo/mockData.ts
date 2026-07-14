// Mock data layer standing in for the real Databricks connection.
//
// The real perf skill runs SQL against the "Web-OTT Performance" dashboard via
// the `user-databricks` MCP server. That server is only reachable from inside a
// Cursor agent (and the tubi-dev profile uses short-lived OAuth, no static
// token), so a plain node script can't hit it. For a self-contained workshop we
// return deterministic sample rows here instead.
//
// Everything below mirrors the SHAPE of real results: experiment discovery
// returns matching experiment names; runQuery returns control/test (or
// per-platform) rows with the same columns the real templates produce. Swapping
// this file for a real connector is all it takes to "go real" (see README).

import { getTemplate } from "./catalog.js";

// ---- Experiment discovery (stands in for the statsig_experiment_bydevice scan) ----

const KNOWN_EXPERIMENTS = [
  "webott_firetv_multiple_accounts_phase_3",
  "webott_web_home_redesign",
  "webott_firetv_nav_prefetch",
];

// Fuzzy name lookup, like:
//   SELECT DISTINCT experiment__name ... WHERE experiment__name LIKE '%<kw>%'
export function findExperiments(keyword: string): string[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return [];
  return KNOWN_EXPERIMENTS.filter((name) => name.toLowerCase().includes(needle));
}

// ---- Query results (stands in for execute_sql_read_only + poll_sql_result) ----

export type QueryParams = {
  experiment_name?: string;
  platform?: string;
  [key: string]: string | undefined;
};

export type QueryResult = {
  templateId: string;
  params: QueryParams;
  columns: string[];
  rows: Record<string, string | number>[];
  note?: string;
};

// Deterministic per-experiment control/test numbers so the demo is repeatable.
// multiple_accounts_phase_3 is intentionally a SLIGHT RTU regression
// (control p90=4180ms -> test p90=4410ms; lower is better).
function rtuExperimentRows(experiment?: string): Record<string, string | number>[] {
  const profiles: Record<string, { control: number; test: number }> = {
    webott_firetv_multiple_accounts_phase_3: { control: 4180, test: 4410 },
    webott_firetv_nav_prefetch: { control: 4180, test: 4090 },
    webott_web_home_redesign: { control: 3120, test: 3150 },
  };
  const p = (experiment && profiles[experiment]) ?? { control: 4200, test: 4205 };
  return [
    { platform: "amazon", variant: "control", p90: p.control, p50: Math.round(p.control * 0.62), samples: 52140, devices: 18320 },
    { platform: "amazon", variant: "test", p90: p.test, p50: Math.round(p.test * 0.62), samples: 51870, devices: 18190 },
  ];
}

function pageTransitionExperimentRows(): Record<string, string | number>[] {
  return [
    { platform: "amazon", variant: "control", page: "home", p50: 820, samples: 40120, devices: 15010 },
    { platform: "amazon", variant: "test", page: "home", p50: 835, samples: 39980, devices: 14980 },
  ];
}

function uiNavExperimentRows(): Record<string, string | number>[] {
  return [
    { platform: "amazon", variant: "control", direction: "right", ui_nav_p90: 310, ui_nav_p50: 150, samples: 88010, devices: 16500 },
    { platform: "amazon", variant: "test", direction: "right", ui_nav_p90: 305, ui_nav_p50: 148, samples: 87650, devices: 16420 },
  ];
}

function rtuOverviewRows(): Record<string, string | number>[] {
  return [
    { ts: "2026-07-06", platform: "amazon", p90: 4200, samples: 61230 },
    { ts: "2026-07-07", platform: "amazon", p90: 4185, samples: 60110 },
    { ts: "2026-07-08", platform: "amazon", p90: 4260, samples: 59870 },
    { ts: "2026-07-09", platform: "amazon", p90: 4230, samples: 62040 },
  ];
}

function fpsRenderRows(): Record<string, string | number>[] {
  return [
    { platform: "amazon", model: "AFTMM", FPS_p50: 58, lowFpsPercent_p50: 4.1 },
    { platform: "amazon", model: "AFTKA", FPS_p50: 52, lowFpsPercent_p50: 7.8 },
    { platform: "web", model: "chrome", FPS_p50: 60, lowFpsPercent_p50: 1.2 },
  ];
}

function ttfbByPlatformRows(): Record<string, string | number>[] {
  return [
    { ts: "2026-07-08", platform: "amazon", p50: 240 },
    { ts: "2026-07-08", platform: "web", p50: 180 },
    { ts: "2026-07-09", platform: "amazon", p50: 250 },
    { ts: "2026-07-09", platform: "web", p50: 175 },
  ];
}

// Route a rendered query to its mock rows. In the real skill this is where the
// SQL would be substituted and sent to Databricks.
export function runQuery(templateId: string, params: QueryParams = {}): QueryResult {
  const template = getTemplate(templateId);
  if (!template) {
    return {
      templateId,
      params,
      columns: [],
      rows: [],
      note: `Unknown template "${templateId}". Call list_templates first.`,
    };
  }

  // Experiment templates need a validated experiment_name.
  if (template.required_params.includes("experiment_name") && !params.experiment_name) {
    return {
      templateId,
      params,
      columns: [],
      rows: [],
      note: "This template requires experiment_name. Validate it first with validate_experiment.",
    };
  }

  let rows: Record<string, string | number>[];
  switch (templateId) {
    case "rtu_with_experiment":
      rows = rtuExperimentRows(params.experiment_name);
      break;
    case "pagetransition_with_experiment":
      rows = pageTransitionExperimentRows();
      break;
    case "ui_nav_with_experiment":
      rows = uiNavExperimentRows();
      break;
    case "rtu_overview":
      rows = rtuOverviewRows();
      break;
    case "fps_render":
      rows = fpsRenderRows();
      break;
    case "perf_ttfb_by_platform":
      rows = ttfbByPlatformRows();
      break;
    default:
      rows = [];
  }

  // Honor a platform filter if the caller passed one.
  if (params.platform) {
    const plat = params.platform.trim().toLowerCase();
    const filtered = rows.filter(
      (r) => typeof r.platform !== "string" || r.platform.toLowerCase() === plat
    );
    if (filtered.length > 0) rows = filtered;
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { templateId, params, columns, rows };
}
