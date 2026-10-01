// LLM helper. Keeps the OpenAI-style call and result shape the rest of the server
// already uses - messages in, choices[0].message.content out - so callers don't care
// which provider is behind it.
//
// Providers: "anthropic" (Messages API, default) or "openrouter" (OpenAI-compatible
// chat completions; also works for any OpenAI-compatible endpoint via LLM_API_URL).
// Config: LLM_API_KEY, LLM_MODEL, optional LLM_PROVIDER / LLM_API_URL.
// A key starting with "sk-or-" is treated as OpenRouter without setting LLM_PROVIDER.

import { ENV } from "./env";

export type Role = "system" | "user" | "assistant";

export type TextContent = { type: "text"; text: string };
export type MessageContent = string | TextContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  maxTokens?: number;
  max_tokens?: number;
  model?: string;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: JsonSchema;
  output_schema?: JsonSchema;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const DEFAULT_MODEL = "claude-sonnet-5-5";
const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MAX_TOKENS = 8192;
const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const textOf = (content: MessageContent | MessageContent[]): string =>
  (Array.isArray(content) ? content : [content])
    .map(part => (typeof part === "string" ? part : part.text))
    .join("\n");

type AnthropicResponse = {
  id: string;
  model: string;
  content: Array<{ type: string; text?: string; input?: unknown }>;
  stop_reason: string | null;
  usage?: { input_tokens: number; output_tokens: number };
};

async function invokeAnthropic(params: InvokeParams, apiKey: string): Promise<InvokeResult> {

  const format = params.responseFormat ?? params.response_format;
  const schema =
    params.outputSchema ?? params.output_schema ?? (format?.type === "json_schema" ? format.json_schema : undefined);

  const system = params.messages.filter(m => m.role === "system").map(m => textOf(m.content));
  const messages = params.messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role, content: textOf(m.content) }));

  const payload: Record<string, unknown> = {
    model: params.model ?? ENV.llmModel ?? DEFAULT_MODEL,
    max_tokens: params.max_tokens ?? params.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages,
  };
  if (format?.type === "json_object" && !schema) {
    system.push("Respond with a single valid JSON object and nothing else.");
  }
  if (system.length > 0) payload.system = system.join("\n\n");

  // Structured output: force one tool call whose input must match the schema,
  // then hand that input back as the JSON text callers expect.
  if (schema) {
    payload.tools = [{ name: schema.name, description: "Return the result in this structure.", input_schema: schema.schema }];
    payload.tool_choice = { type: "tool", name: schema.name };
  }

  const url = ENV.llmApiUrl || API_URL;
  let response: Response | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const retryable = response.status === 429 || response.status === 529 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) break;
    const retryAfter = Number(response.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : "no response";
    throw new Error(`LLM invoke failed: ${response?.status} ${response?.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const toolUse = data.content.find(block => block.type === "tool_use");
  const content = toolUse
    ? JSON.stringify(toolUse.input ?? {})
    : data.content.filter(block => block.type === "text").map(block => block.text ?? "").join("");

  return {
    id: data.id,
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: data.stop_reason }],
    usage: data.usage && {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
}

const isOpenRouter = (apiKey: string) =>
  ENV.llmProvider === "openrouter" || (!ENV.llmProvider && apiKey.startsWith("sk-or-"));

type OpenAIChatResponse = {
  id: string;
  model: string;
  created?: number;
  choices: Array<{
    finish_reason: string | null;
    message: { content: string | null; tool_calls?: Array<{ function: { name: string; arguments: string } }> };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

async function invokeOpenAICompatible(params: InvokeParams, apiKey: string): Promise<InvokeResult> {
  const format = params.responseFormat ?? params.response_format;
  const schema =
    params.outputSchema ?? params.output_schema ?? (format?.type === "json_schema" ? format.json_schema : undefined);

  const messages = params.messages.map(m => ({ role: m.role, content: textOf(m.content) }));
  if (format?.type === "json_object" && !schema) {
    messages.unshift({ role: "system", content: "Respond with a single valid JSON object and nothing else." });
  }

  const payload: Record<string, unknown> = {
    model: params.model ?? ENV.llmModel ?? DEFAULT_OPENROUTER_MODEL,
    max_tokens: params.max_tokens ?? params.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages,
  };
  // Structured output through a forced function call: supported by far more models than json_schema.
  if (schema) {
    payload.tools = [{ type: "function", function: { name: schema.name, description: "Return the result in this structure.", parameters: schema.schema } }];
    payload.tool_choice = { type: "function", function: { name: schema.name } };
  }

  const url = ENV.llmApiUrl || OPENROUTER_URL;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
    "X-Title": "SIM uncle",
  };
  if (ENV.publicUrl) headers["HTTP-Referer"] = ENV.publicUrl;

  let response: Response | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const retryable = response.status === 429 || response.status === 529 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) break;
    const retryAfter = Number(response.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : "no response";
    throw new Error(`LLM invoke failed: ${response?.status} ${response?.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as OpenAIChatResponse & { error?: { message?: string } };
  if (data.error) throw new Error(`LLM invoke failed: ${data.error.message ?? JSON.stringify(data.error)}`);
  const choice = data.choices?.[0];
  if (!choice) throw new Error("LLM returned no choices");
  const call = choice.message.tool_calls?.[0];
  const content = call ? call.function.arguments : choice.message.content ?? "";

  return {
    id: data.id,
    created: data.created ?? Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: choice.finish_reason }],
    usage: data.usage,
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = ENV.llmApiKey;
  if (!apiKey) throw new Error("LLM_API_KEY is not configured");
  if (isOpenRouter(apiKey) || ENV.llmProvider === "openai") return invokeOpenAICompatible(params, apiKey);
  return invokeAnthropic(params, apiKey);
}
