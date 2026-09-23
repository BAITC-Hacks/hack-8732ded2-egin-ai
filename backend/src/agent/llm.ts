import { buildAnalysisPrompt, parseAnalysis, type AnalysisPromptInput, type ParsedAnalysis } from "./prompts.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new Error("OpenAI response is not an object");
  }
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }
  if (!Array.isArray(payload.output)) {
    throw new Error("OpenAI response does not contain output text");
  }

  const textParts: string[] = [];
  for (const outputItem of payload.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }
    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }
  const text = textParts.join("\n").trim();
  if (text.length === 0) {
    throw new Error("OpenAI response contains no text output");
  }
  return text;
}

function parseJsonText(text: string): unknown {
  const fencedText = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(fencedText) as unknown;
}

export async function analyzeWithOpenAi(input: AnalysisPromptInput): Promise<ParsedAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey === undefined || apiKey.trim().length === 0) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const responsesUrl = process.env.OPENAI_RESPONSES_URL;
  if (responsesUrl === undefined || responsesUrl.trim().length === 0) {
    throw new Error("OPENAI_RESPONSES_URL is not configured");
  }
  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5",
      input: buildAnalysisPrompt(input),
      reasoning: { effort: "minimal" },
      text: { format: { type: "json_object" } },
      max_output_tokens: 800,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI Responses API returned HTTP ${response.status}`);
  }
  const payload: unknown = await response.json();
  return parseAnalysis(parseJsonText(extractText(payload)));
}
