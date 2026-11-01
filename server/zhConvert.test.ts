import { describe, expect, it } from "vitest";
import * as OpenCC from "opencc-js";
import { toDisplayChinese } from "../client/src/lib/zhConvert";

const full = OpenCC.Converter({ from: "cn", to: "hk" });

describe("toDisplayChinese (trimmed dictionary)", () => {
  it("matches the full OpenCC converter on plan-style and ambiguous text", () => {
    const samples = [
      "日本 每日500MB 高速后降速",
      "中国大陆+香港+澳门 30天 10GB",
      "云南 发送短信 后付费 不限流量",
      "达量后降速至384kbps 可热点分享",
      "里程 面积 头发 干净 干预 系统 联系 关系",
      "东南亚多国 15天 欧洲33国 数据卡",
      "只限数据 台湾 韩国 首尔 马来西亚",
      "出发前 准备 复制 范围 松开 斗争 山谷",
    ];
    for (const s of samples) expect(toDisplayChinese(s, "zh-TW")).toBe(full(s));
  });

  it("leaves other languages and empty values alone", () => {
    expect(toDisplayChinese("简体", "zh-CN")).toBe("简体");
    expect(toDisplayChinese(null, "zh-TW")).toBe("");
  });
});
