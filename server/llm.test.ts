import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", async importOriginal => {
  const mod = await importOriginal<typeof import("./_core/env")>();
  return { ENV: { ...mod.ENV, llmApiKey: "test-key", llmModel: undefined, llmApiUrl: "" } };
});

import { invokeLLM } from "./_core/llm";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.restoreAllMocks());

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
