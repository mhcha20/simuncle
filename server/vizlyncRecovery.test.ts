import { describe, expect, it, vi } from "vitest";
import { hasEsimData, recoverVizlyncOrders, type RecoveryDeps, type RecoveryOrder } from "./vizlyncRecovery";

const order = (over: Partial<RecoveryOrder> = {}): RecoveryOrder => ({
  id: 1, userId: null, guestEmail: "a@b.com", productName: "Japan 3GB", totalAmount: "100",
  vizlyncOrderId: "VLZ1", esimData: { orderId: "VLZ1" }, preferredLang: "en", status: "completed", ...over,
});

const deps = (orders: RecoveryOrder[], fresh: Record<string, unknown> | null): RecoveryDeps => ({
  findOrders: async () => orders,
  customerEmail: async o => o.guestEmail,
  fetchVizlyncOrder: vi.fn(async () => fresh),
  saveEsimData: vi.fn(async () => {}),
  sendEmail: vi.fn(async () => true),
  markEmailSent: vi.fn(async () => {}),
});

describe("recoverVizlyncOrders", () => {
  it("saves the eSIM and emails it once Vizlync has the data", async () => {
    const d = deps([order()], { lpaString: "LPA:1$x$y", iccid: "899" });
    const r = await recoverVizlyncOrders(d);
    expect(r).toEqual({ checked: 1, recovered: 1, stillPending: 0 });
    expect(d.saveEsimData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lpaString: "LPA:1$x$y", orderId: "VLZ1" }));
    expect(d.sendEmail).toHaveBeenCalledTimes(1);
    expect(d.markEmailSent).toHaveBeenCalledWith(expect.anything(), "a@b.com", true);
  });

  it("leaves the order alone while Vizlync is still provisioning", async () => {
    const d = deps([order()], { status: "pending" });
    const r = await recoverVizlyncOrders(d);
    expect(r).toEqual({ checked: 1, recovered: 0, stillPending: 1 });
    expect(d.saveEsimData).not.toHaveBeenCalled();
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("saves the data but does not email when there is no customer address", async () => {
    const d = deps([order({ guestEmail: null })], { iccid: "899" });
    await recoverVizlyncOrders(d);
    expect(d.saveEsimData).toHaveBeenCalled();
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("keeps going when one order throws", async () => {
    const d = deps([order({ id: 1 }), order({ id: 2 })], { iccid: "899" });
    (d.fetchVizlyncOrder as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("timeout"));
    const r = await recoverVizlyncOrders(d);
    expect(r.recovered).toBe(1);
  });
});

describe("hasEsimData", () => {
  it("needs an LPA string or ICCID", () => {
    expect(hasEsimData({ lpaString: "x" })).toBe(true);
    expect(hasEsimData({ iccid: "1" })).toBe(true);
    expect(hasEsimData({ status: "pending" })).toBe(false);
    expect(hasEsimData(null)).toBe(false);
  });
});
