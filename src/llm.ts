// Shared LLM client for the workshop.
// Works with any OpenAI-compatible endpoint (OpenAI, GitHub Models, MiniMax, ...).
// Configuration comes from .env: OPENAI_API_KEY, OPENAI_BASE_URL (optional), MODEL.

import OpenAI from "openai";

export const MODEL = process.env.MODEL ?? "gpt-4o-mini";

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Empty string -> undefined so the SDK falls back to the default OpenAI endpoint.
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

// A thin wrapper around a chat completion so the step files stay readable.
export async function chat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { stop?: string[] } = {}
): Promise<string> {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0, // deterministic output is nicer for a live demo
    stop: options.stop,
  });
  return res.choices[0]?.message?.content ?? "";
}
