import { describe, expect, it, vi } from "vitest";
import { recoverTgtOrders, toCallbackInfo } from "./tgtRecovery";
import type { TgtOrderInfo } from "./tgt";

const info = (over: Partial<TgtOrderInfo> = {}): TgtOrderInfo => ({
  orderNo: "SE1", productCode: "P", productName: "Thai", orderStatus: "NOTACTIVE", profileStatus: "nodownload",
  qrCode: "LPA:1$a$b", cardInfo: { iccid: "899", imsi: "454", msisdn: "852" }, ...over,
});

describe("recoverTgtOrders", () => {
  it("completes an order once TGT already has its QR code", async () => {
    const complete = vi.fn(async () => {});
    const queryTgt = vi.fn(async () => info());
    const r = await recoverTgtOrders({ findOrders: async () => [2970001], queryTgt, complete });
    expect(queryTgt).toHaveBeenCalledWith("SU2970001");
    expect(complete).toHaveBeenCalledWith(2970001, expect.objectContaining({ qrCode: "LPA:1$a$b", iccid: "899", channelOrderNo: "SU2970001", orderNo: "SE1" }));
    expect(r).toEqual({ checked: 1, recovered: 1, stillPending: 0 });
  });

  it("waits while TGT has no QR yet or does not know the order", async () => {
    const complete = vi.fn(async () => {});
    const answers = [info({ qrCode: undefined }), null];
    const r = await recoverTgtOrders({ findOrders: async () => [1, 2], queryTgt: async () => answers.shift() ?? null, complete });
    expect(complete).not.toHaveBeenCalled();
    expect(r).toEqual({ checked: 2, recovered: 0, stillPending: 2 });
  });

  it("keeps going when TGT errors for one order", async () => {
    const complete = vi.fn(async () => {});
    const queryTgt = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(info());
    const r = await recoverTgtOrders({ findOrders: async () => [1, 2], queryTgt, complete });
    expect(r.recovered).toBe(1);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe("toCallbackInfo", () => {
  it("maps TGT query fields to the callback shape", () => {
    expect(toCallbackInfo("SU5", info({ activatedEndTime: "2026-10-02T00:00:00Z" }))).toMatchObject({
      channelOrderNo: "SU5", iccid: "899", imsi: "454", msisdn: "852", activatedEndTime: "2026-10-02T00:00:00Z",
    });
  });
});
