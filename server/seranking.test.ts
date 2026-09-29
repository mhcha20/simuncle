import { describe, it, expect } from "vitest";

describe.skipIf(!process.env.SE_RANKING_API_KEY)("SE Ranking Data API Key", () => {
  it("SE_RANKING_API_KEY should be set and valid", async () => {
    const apiKey = process.env.SE_RANKING_API_KEY;
    expect(apiKey, "SE_RANKING_API_KEY must be set").toBeTruthy();

    const res = await fetch("https://api.seranking.com/v1/account/subscription", {
      headers: { Authorization: `Token ${apiKey}` },
    });
    expect(res.status, "API should return 200").toBe(200);

    const data = (await res.json()) as { subscription_info?: { status?: string } };
    expect(data.subscription_info?.status, "Subscription should be active").toBe("active");
  });
});

describe.skipIf(!process.env.SE_RANKING_PROJECT_TOKEN)("SE Ranking Project API Token", () => {
  it("SE_RANKING_PROJECT_TOKEN should be set and return projects", async () => {
    const token = process.env.SE_RANKING_PROJECT_TOKEN;
    expect(token, "SE_RANKING_PROJECT_TOKEN must be set").toBeTruthy();
    const res = await fetch("https://api.seranking.com/v1/project-management/sites", {
      headers: { Authorization: `Token ${token}` },
    });
    expect(res.status, "Project API should return 200").toBe(200);
    const data = (await res.json()) as Array<{ id: number; title: string; keyword_count: number }>;
    expect(Array.isArray(data), "Response should be an array of projects").toBe(true);
    expect(data.length, "Should have at least one project").toBeGreaterThan(0);
    expect(data[0].id, "Project should have an id").toBeTruthy();
  });
});
