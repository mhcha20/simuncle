import { afterEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({
  llmApiKey: "test-key", llmProvider: "", llmModel: undefined as string | undefined, llmApiUrl: "", publicUrl: "https://simuncle.com",
}));
vi.mock("./_core/env", async importOriginal => {
  const mod = await importOriginal<typeof import("./_core/env")>();
  return { ENV: new Proxy({ ...mod.ENV }, { get: (t, k) => (k in envState ? (envState as Record<string | symbol, unknown>)[k] : (t as Record<string | symbol, unknown>)[k]) }) };
});

import { invokeLLM } from "./_core/llm";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  vi.restoreAllMocks();
  Object.assign(envState, { llmApiKey: "test-key", llmProvider: "", llmModel: undefined, llmApiUrl: "" });
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

  it("uses a forced tool call for json_schema and returns its input as JSON text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "m2", model: "x", content: [{ type: "tool_use", input: { category: "news" } }], stop_reason: "tool_use" }),
    );
    const res = await invokeLLM({
      messages: [{ role: "user", content: "classify" }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "cat", schema: { type: "object", properties: { category: { type: "string" } } } },
      },
    });
    expect(JSON.parse(res.choices[0].message.content)).toEqual({ category: "news" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool_choice).toEqual({ type: "tool", name: "cat" });
    expect(body.tools[0].input_schema.type).toBe("object");
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

  it("LLM_PROVIDER=anthropic still forces the Anthropic API for a non sk-or- key", async () => {
    envState.llmProvider = "anthropic";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ok({ id: "m", model: "x", content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }),
    );
    await invokeLLM({ messages: [{ role: "user", content: "x" }] });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
  });
});
