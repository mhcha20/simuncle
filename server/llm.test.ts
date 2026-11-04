import { afterEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({
  llmApiKey: "test-key",
  xaiApiKey: "",
  llmProvider: "",
  llmModel: undefined as string | undefined,
  llmApiUrl: "",
  publicUrl: "https://simuncle.com",
}));
vi.mock("./_core/env", async importOriginal => {
  const mod = await importOriginal<typeof import("./_core/env")>();
  return { ENV: new Proxy({ ...mod.ENV }, { get: (t, k) => (k in envState ? (envState as Record<string | symbol, unknown>)[k] : (t as Record<string | symbol, unknown>)[k]) }) };
});

import { invokeLLM } from "./_core/llm";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  vi.restoreAllMocks();
  Object.assign(envState, { llmApiKey: "test-key", xaiApiKey: "", llmProvider: "", llmModel: undefined, llmApiUrl: "" });
});

describe("invokeLLM (Anthropic)", () => {
  it("sends system separately and returns OpenAI-shaped text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "m1", model: "x", content: [{ type: "text", text: "hello" }], stop_reason: "end_turn", usage: { input_tokens: 3, output_tokens: 2 } }),
    );
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "be brief" },
        { role: "user", content: [{ type: "text", text: "hi" }] },
      ],
      max_tokens: 100,
    });
    expect(res.choices[0].message.content).toBe("hello");
    expect(res.usage?.total_tokens).toBe(5);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.system).toBe("be brief");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(body.max_tokens).toBe(100);
    expect(((init as RequestInit).headers as Record<string, string>)["x-api-key"]).toBe("test-key");
  });

  it("asks for json_schema output through output_config.format, never a forced tool call", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "m2", model: "x", content: [{ type: "thinking", thinking: "" }, { type: "text", text: '{"category":"news"}' }], stop_reason: "end_turn" }),
    );
    const res = await invokeLLM({
      messages: [{ role: "user", content: "classify" }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "cat", schema: { type: "object", properties: { category: { type: "string", maxLength: 9 } } } },
      },
    });
    expect(JSON.parse(res.choices[0].message.content)).toEqual({ category: "news" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool_choice).toBeUndefined();
    expect(body.tools).toBeUndefined();
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema).toEqual({
      type: "object", properties: { category: { type: "string" } }, additionalProperties: false,
    });
  });

  it("retries with a JSON instruction when the schema is refused", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response('{"error":{"message":"output_config.format: schema not supported"}}', { status: 400, statusText: "Bad Request" }))
      .mockResolvedValueOnce(ok({ id: "m3", model: "x", content: [{ type: "text", text: '{"category":"tips"}' }], stop_reason: "end_turn" }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await invokeLLM({
      messages: [{ role: "user", content: "classify" }],
      response_format: { type: "json_schema", json_schema: { name: "cat", schema: { type: "object", properties: { category: { type: "string" } } } } },
    });
    expect(JSON.parse(res.choices[0].message.content)).toEqual({ category: "tips" });
    const second = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(second.output_config).toBeUndefined();
    expect(second.system).toMatch(/JSON schema/);
  });

  it("retries on 429 then succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "retry-after": "1" } }))
      .mockResolvedValueOnce(ok({ id: "m3", model: "x", content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }));
    const pending = invokeLLM({ messages: [{ role: "user", content: "x" }] });
    await vi.advanceTimersByTimeAsync(1500);
    expect((await pending).choices[0].message.content).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("invokeLLM (OpenRouter / OpenAI-compatible)", () => {
  it("is chosen automatically for an sk-or- key and sends an OpenAI-style request", async () => {
    envState.llmApiKey = "sk-or-v1-abc";
    envState.llmModel = "google/gemini-2.5-flash";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "o1", model: "google/gemini-2.5-flash", choices: [{ finish_reason: "stop", message: { content: "hello" } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
    );
    const res = await invokeLLM({ messages: [{ role: "system", content: "be brief" }, { role: "user", content: "hi" }], max_tokens: 50 });
    expect(res.choices[0].message.content).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-or-v1-abc");
    expect(headers["HTTP-Referer"]).toBe("https://simuncle.com");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("google/gemini-2.5-flash");
    expect(body.messages).toEqual([{ role: "system", content: "be brief" }, { role: "user", content: "hi" }]);
    expect(body.max_tokens).toBe(50);
  });

  it("returns a forced function call's arguments as the JSON text", async () => {
    envState.llmApiKey = "sk-or-v1-abc";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "o2", model: "m", choices: [{ finish_reason: "tool_calls", message: { content: null, tool_calls: [{ function: { name: "cat", arguments: "{\"category\":\"news\"}" } }] } }] }),
    );
    const res = await invokeLLM({
      messages: [{ role: "user", content: "classify" }],
      response_format: { type: "json_schema", json_schema: { name: "cat", schema: { type: "object", properties: { category: { type: "string" } } } } },
    });
    expect(JSON.parse(res.choices[0].message.content)).toEqual({ category: "news" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool_choice).toEqual({ type: "function", function: { name: "cat" } });
    expect(body.tools[0].function.parameters.type).toBe("object");
  });

  it("reports an error object returned with HTTP 200", async () => {
    envState.llmApiKey = "sk-or-v1-abc";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ error: { message: "No credits" } }));
    await expect(invokeLLM({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow(/No credits/);
  });

  it("LLM_PROVIDER=anthropic still forces the Anthropic API even when a Grok key is set", async () => {
    envState.llmProvider = "anthropic";
    envState.xaiApiKey = "xai-should-not-be-used";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "m", model: "x", content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }),
    );
    await invokeLLM({ messages: [{ role: "user", content: "x" }] });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
    expect(((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>)["x-api-key"]).toBe("test-key");
  });
});

describe("invokeLLM (Grok / xAI)", () => {
  it("uses the xAI chat completions API when XAI_API_KEY is set and no provider is forced", async () => {
    envState.llmApiKey = "sk-ant-existing";
    envState.xaiApiKey = "xai-live-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "g1", model: "grok-4.5", choices: [{ finish_reason: "stop", message: { content: "你好" } }], usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 } }),
    );
    const res = await invokeLLM({ messages: [{ role: "system", content: "be brief" }, { role: "user", content: "hi" }], max_tokens: 80 });
    expect(res.choices[0].message.content).toBe("你好");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer xai-live-key");
    expect(headers["HTTP-Referer"]).toBeUndefined();
    expect(headers["X-Title"]).toBeUndefined();
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("grok-4.5");
    expect(body.max_tokens).toBe(80);
    expect(body.messages).toEqual([{ role: "system", content: "be brief" }, { role: "user", content: "hi" }]);
  });

  it("treats an xai- LLM_API_KEY as Grok and honours LLM_PROVIDER=grok", async () => {
    envState.llmApiKey = "xai-from-llm";
    envState.llmProvider = "grok";
    envState.llmModel = "grok-4.7";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "g2", model: "grok-4.7", choices: [{ finish_reason: "tool_calls", message: { content: null, tool_calls: [{ function: { name: "cat", arguments: "{\"category\":\"news\"}" } }] } }] }),
    );
    const res = await invokeLLM({
      messages: [{ role: "user", content: "classify" }],
      response_format: { type: "json_schema", json_schema: { name: "cat", schema: { type: "object", properties: { category: { type: "string" } } } } },
    });
    expect(JSON.parse(res.choices[0].message.content)).toEqual({ category: "news" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.x.ai/v1/chat/completions");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("grok-4.7");
    expect(body.tool_choice).toEqual({ type: "function", function: { name: "cat" } });
    expect(((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>).authorization).toBe("Bearer xai-from-llm");
  });
});
