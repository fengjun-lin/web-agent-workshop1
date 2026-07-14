// Tools are the agent's "hands and senses": plain functions the model can call by name.
// The model itself only produces text; tools let it read the world and take actions.
//
// WORKSHOP: fill in the `tools` object below by copying from the Notion handbook
// ("动手环节"). Reference solution: `git checkout main` (src/tools.ts).

export type Tool = {
  description: string;
  run: (input: string) => Promise<string> | string;
};

// TODO 1: define two tools, each with a `description` (shown to the model) and a
//         `run(input)` function.
//   - get_weather: return a fake weather string for a city (offline/deterministic).
//   - calculator:  evaluate a math expression.
// The `description` is how the model learns the tool exists and how to call it,
// e.g. "get current weather for a city, e.g. get_weather[altay]".
export const tools: Record<string, Tool> = {
  // ... copy the two tools here ...
};

// --- plumbing below: no need to change ---

// Render the tool list for the system prompt so the model knows what it can call.
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
