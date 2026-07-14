// Tools are the agent's "hands and senses": plain functions the model can call by name.
// The model itself only produces text; tools let it read the world and take actions.

export type Tool = {
  description: string;
  run: (input: string) => Promise<string> | string;
};

export const tools: Record<string, Tool> = {
  get_weather: {
    description: "get current weather for a city, e.g. get_weather[altay]",
    // A fake weather API so the workshop runs offline / deterministically.
    run: (city: string) => {
      const db: Record<string, string> = {
        altay: "Snowy, -12C",
        beijing: "Cloudy, 18C",
        "san francisco": "Foggy, 15C",
      };
      return db[city.trim().toLowerCase()] ?? "Unknown city";
    },
  },

  calculator: {
    description: "evaluate a math expression, e.g. calculator[2 * (3 + 4)]",
    // WARNING: Function()/eval-style evaluation is ONLY for a demo.
    // Never evaluate untrusted input like this in production.
    run: (input: string) => {
      try {
        return String(Function(`"use strict"; return (${input})`)());
      } catch {
        return `Error: cannot evaluate "${input}"`;
      }
    },
  },
};

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
