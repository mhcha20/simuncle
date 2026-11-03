import { describe, expect, it } from "vitest";
import { searchTerms } from "./searchTerms";
import { translateSearchQuery } from "../client/src/lib/countryNames";

describe("searchTerms", () => {
  it("splits words and drops separators", () => {
    expect(searchTerms("Singapore Malaysia Thailand")).toEqual(["Singapore", "Malaysia", "Thailand"]);
    expect(searchTerms("Singapore - Malaysia, Hong Kong")).toEqual(["Singapore", "Malaysia", "Hong", "Kong"]);
    expect(searchTerms("300GB")).toEqual(["300GB"]);
    expect(searchTerms("eSIM-Holiday")).toEqual(["eSIM-Holiday"]);
    expect(searchTerms(" - ")).toEqual(["-"]);
  });

  it("Chinese country names typed together become separate words", () => {
    expect(searchTerms(translateSearchQuery("新加坡馬來西亞", "zh-TW"))).toEqual(["Singapore", "Malaysia"]);
    expect(searchTerms(translateSearchQuery("新加坡 泰國 300GB", "zh-TW"))).toEqual(["Singapore", "Thailand", "300GB"]);
  });
});

import { pickBigDataPlans } from "../client/src/lib/bigDataPlans";

describe("pickBigDataPlans", () => {
  const P = (id: string, gb: string, countries: string[], name = id) => ({ productId: id, name, dataAmount: gb, dataUnit: "GB", countries: countries.map((c) => ({ id: c })) });
  it("keeps 50GB+ plans, one per coverage area, skips top-ups", () => {
    const picked = pickBigDataPlans([
      P("a", "999", ["GB"]), P("b", "999", ["GB"]), P("t", "500", ["FR"], "TopUp France 500GB"),
      P("c", "300", ["SG", "MY"]), P("d", "10", ["JP"]), P("e", "66", ["SG"]), P("g", "200", ["XX"], "Global 18GB - 3UK AIO Roaming Plan"),
    ], 4);
    expect(picked.map((p) => p.productId)).toEqual(["a", "c", "e"]);
  });
});
