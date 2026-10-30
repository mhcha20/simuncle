import { beforeEach, describe, expect, it, vi } from "vitest";

const queryUsage = vi.fn();
const queryOrder = vi.fn();
const sendExhausted = vi.fn();
const createEmailLog = vi.fn();
const updates: unknown[] = [];
let selectResults: unknown[][] = [];

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: async () => ({ isCron: true }) } }));
vi.mock("./tgt", () => ({ queryTgtUsage: queryUsage, queryTgtOrder: queryOrder }));
vi.mock("./vizlync", () => ({
  getVizlyncUsage: vi.fn(), getTopupPlans: vi.fn(), extractTopupPlans: vi.fn(), computeTopupPriceHkd: vi.fn(), parsePlanDataGb: vi.fn(),
}));
vi.mock("./push", () => ({ sendPushNotification: vi.fn() }));
vi.mock("./email", () => ({ sendDataExhaustedEmail: sendExhausted }));
vi.mock("./db", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.from = () => c;
    c.where = () => c;
    c.limit = async () => selectResults.shift() ?? [];
    return c;
  };
  const db = {
    select: () => chain(),
    update: () => ({ set: (v: unknown) => ({ where: async () => { updates.push(v); } }) }),
  };
  return { getDb: async () => db, getCustomerEmailByUserId: vi.fn(), createEmailLog };
});

const tgtOrder = (over: Record<string, unknown> = {}) => ({
  id: 5000001, userId: null, guestEmail: "guest@example.com", productName: "HK 3GB", productId: "tgt_x",
  preferredLang: "en", esimData: { iccid: "1" }, supplierOrderId: "SE1", ...over,
});

async function run() {
  const { handleScheduledLowUsageAlert } = await import("./scheduledLowUsageAlert");
  const json = vi.fn();
  await handleScheduledLowUsageAlert({} as never, { json, status: () => ({ json }) } as never);
  return json.mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  vi.resetModules();
  sendExhausted.mockResolvedValue(true);
  queryOrder.mockResolvedValue({ orderStatus: "INUSE" });
});

describe("low-usage alert for TGT orders", () => {
  it("emails once when a TGT plan is used up, without top-up options", async () => {
    // select order: Vizlync orders, TGT orders, product row
    selectResults = [[], [tgtOrder()], [{ topUpAvailable: true }]];
    queryUsage.mockResolvedValue({ dataTotal: "3072", dataUsage: "3072", dataResidual: "0" });
    const result = await run();
    expect(result).toMatchObject({ checked: 1, exhaustedEmailed: 1 });
    expect(sendExhausted.mock.calls[0][0]).toMatchObject({ orderId: 5000001, topUpAvailable: false, topupPlans: [] });
    expect(createEmailLog.mock.calls[0][0]).toMatchObject({ emailType: "data_exhausted", status: "sent" });
    expect(JSON.stringify(updates)).toContain("dataExhaustedEmailSent");
  });

  it("does nothing for daily plans (no cycle total) or plans that still have data", async () => {
    selectResults = [[], [tgtOrder(), tgtOrder({ id: 5000002, supplierOrderId: "SE2" })]];
    queryUsage
      .mockResolvedValueOnce({ qtaconsumption: "100", refuelingTotal: "500" }) // daily plan
      .mockResolvedValueOnce({ dataTotal: "3072", dataUsage: "800", dataResidual: "2272" }); // 74% left
    const result = await run();
    expect(result).toMatchObject({ checked: 2, notified: 0, exhaustedEmailed: 0, skipped: 2 });
    expect(sendExhausted).not.toHaveBeenCalled();
  });

  it("does not email when TGT says the eSIM is no longer active", async () => {
    selectResults = [[], [tgtOrder()], [{ topUpAvailable: false }]];
    queryUsage.mockResolvedValue({ dataTotal: "3072", dataUsage: "3072", dataResidual: "0" });
    queryOrder.mockResolvedValue({ orderStatus: "EXPIRED" });
    const result = await run();
    expect(result).toMatchObject({ exhaustedEmailed: 0, skipped: 1 });
    expect(sendExhausted).not.toHaveBeenCalled();
  });
});
