import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { setSetting } from "./db";

const CURRENCY_KEY_MAP: Record<string, string> = {
  USD: "usd_rate", JPY: "jpy_rate", KRW: "krw_rate", THB: "thb_rate",
  TWD: "twd_rate", SGD: "sgd_rate", MYR: "myr_rate", PHP: "php_rate",
  IDR: "idr_rate", VND: "vnd_rate", INR: "inr_rate", CNY: "cny_rate",
  MOP: "mop_rate", EUR: "eur_rate", GBP: "gbp_rate", AUD: "aud_rate",
  CAD: "cad_rate", CHF: "chf_rate", NZD: "nzd_rate", SEK: "sek_rate",
  NOK: "nok_rate", DKK: "dkk_rate",
};

export async function handleScheduledUpdateExchangeRates(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const apiRes = await fetch("https://open.er-api.com/v6/latest/HKD");
    if (!apiRes.ok) {
      throw new Error(`Exchange rate API error: ${apiRes.status}`);
    }
    const data = await apiRes.json() as { result: string; rates: Record<string, number> };
    if (data.result !== "success") {
      throw new Error("Exchange rate API returned non-success");
    }

    const updated: string[] = [];
    for (const [currency, key] of Object.entries(CURRENCY_KEY_MAP)) {
      const rate = data.rates[currency];
      if (rate != null) {
        await setSetting(key, String(rate));
        updated.push(currency);
      }
    }

    console.log(`[scheduled/update-exchange-rates] Updated ${updated.length} rates: ${updated.join(", ")}`);
    return res.json({ ok: true, updatedCount: updated.length, currencies: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[scheduled/update-exchange-rates] Error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
