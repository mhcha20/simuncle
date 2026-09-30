// Built-in scheduler. Replaces the Manus "Heartbeat": on a fixed schedule it
// POSTs to this server's own /api/scheduled/* endpoints with the cron secret,
// so the handlers run exactly as they did when Manus called them.
//
// Runs in-process, so keep the app at ONE replica (otherwise every replica would
// fire every job). SCHEDULER_JOBS=name1,name2 runs only those jobs (unset = all).
// DISABLE_SCHEDULER=1 turns it off, e.g. when an external
// cron service calls the endpoints instead. Times are UTC. A run missed while the
// server was down is not made up; the next scheduled run picks up.

import { randomBytes } from "node:crypto";
import { ENV } from "./_core/env";
import { setInternalCronSecret } from "./_core/sdk";

export type ScheduledJob = {
  name: string;
  /** 5-field cron in UTC: minute hour day-of-month month day-of-week. Supports *, *\/n, a-b, a,b,c. */
  cron: string;
  path: string;
};

// UTC. HKT = UTC+8.
export const JOBS: ScheduledJob[] = [
  { name: "reconcile-orders", cron: "*/10 * * * *", path: "/api/scheduled/reconcileOrders" },
  { name: "email-retry", cron: "*/15 * * * *", path: "/api/scheduled/email-retry" },
  { name: "pending-reminder", cron: "0 */6 * * *", path: "/api/scheduled/pending-reminder" },
  { name: "low-usage-alert", cron: "30 */6 * * *", path: "/api/scheduled/low-usage-alert" },
  { name: "sync-soro-articles", cron: "15 */6 * * *", path: "/api/scheduled/sync-soro-articles" },
  { name: "update-exchange-rates", cron: "30 0 * * *", path: "/api/scheduled/update-exchange-rates" },
  { name: "sync-products", cron: "0 1 * * *", path: "/api/scheduled/sync-products" },
  { name: "sync-tgt-products", cron: "30 1 * * *", path: "/api/scheduled/sync-tgt-products" },
  { name: "expiry-reminder", cron: "0 2 * * *", path: "/api/scheduled/expiry-reminder" },
  { name: "check-tgt-sync-status", cron: "0 3 * * *", path: "/api/scheduled/check-tgt-sync-status" },
  { name: "seo-opportunity", cron: "0 1 * * 1", path: "/api/scheduled/seo-opportunity" },
  { name: "generate-seo-articles", cron: "0 1 * * 3", path: "/api/scheduled/generate-seo-articles" },
  { name: "monthly-traffic-report", cron: "0 1 1 * *", path: "/api/scheduled/monthly-traffic-report" },
];

function fieldMatches(field: string, value: number, min: number, max: number): boolean {
  return field.split(",").some(part => {
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) return false;
    let from = min;
    let to = max;
    if (range !== "*") {
      const [a, b] = range.split("-");
      from = Number(a);
      to = b === undefined ? (stepText === undefined ? from : max) : Number(b);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
    }
    return value >= from && value <= to && (value - from) % step === 0;
  });
}

/** Whether a 5-field UTC cron expression fires at the given minute. */
export function cronMatches(expr: string, date: Date): boolean {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`Invalid cron expression: ${expr}`);
  const [min, hour, dom, mon, dow] = f;
  const domOk = fieldMatches(dom, date.getUTCDate(), 1, 31);
  const dowOk = fieldMatches(dow, date.getUTCDay(), 0, 6);
  // Standard cron: if both day fields are restricted, either may match.
  const dayOk = dom !== "*" && dow !== "*" ? domOk || dowOk : domOk && dowOk;
  return (
    fieldMatches(min, date.getUTCMinutes(), 0, 59) &&
    fieldMatches(hour, date.getUTCHours(), 0, 23) &&
    fieldMatches(mon, date.getUTCMonth() + 1, 1, 12) &&
    dayOk
  );
}

/** Keep only the named jobs; an empty list means all. Throws on an unknown name so a typo can't silently disable a job. */
export function selectJobs(jobs: ScheduledJob[], names: string[]): ScheduledJob[] {
  if (names.length === 0) return jobs;
  const unknown = names.filter(n => !jobs.some(j => j.name === n));
  if (unknown.length > 0) throw new Error(`SCHEDULER_JOBS has unknown job(s): ${unknown.join(", ")}`);
  return jobs.filter(j => names.includes(j.name));
}

async function fire(baseUrl: string, secret: string, job: ScheduledJob) {
  try {
    const res = await fetch(`${baseUrl}${job.path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) console.warn(`[Scheduler] ${job.name} -> HTTP ${res.status}`);
    else console.log(`[Scheduler] ${job.name} -> ${res.status}`);
  } catch (err) {
    console.error(`[Scheduler] ${job.name} failed to start:`, err instanceof Error ? err.message : err);
  }
}

/** Start the scheduler; returns a function that stops it. */
export function startScheduler(port: number, jobs: ScheduledJob[] = JOBS): () => void {
  if (ENV.disableScheduler) {
    console.log("[Scheduler] Disabled (DISABLE_SCHEDULER=1)");
    return () => {};
  }
  jobs.forEach(j => cronMatches(j.cron, new Date())); // fail fast on a typo
  jobs = selectJobs(jobs, ENV.schedulerJobs);

  // Without CRON_SECRET, use a random per-process secret: the scheduler still works,
  // and nobody outside can call the endpoints.
  const secret = ENV.cronSecret || randomBytes(32).toString("hex");
  if (!ENV.cronSecret) setInternalCronSecret(secret);

  const baseUrl = `http://127.0.0.1:${port}`;
  let lastMinute = Math.floor(Date.now() / 60_000);
  const timer = setInterval(() => {
    const nowMinute = Math.floor(Date.now() / 60_000);
    // Walk every minute since the last tick, so a delayed timer never skips a minute.
    for (let m = lastMinute + 1; m <= nowMinute; m++) {
      const at = new Date(m * 60_000);
      for (const job of jobs) if (cronMatches(job.cron, at)) void fire(baseUrl, secret, job);
    }
    lastMinute = nowMinute;
  }, 15_000);
  timer.unref();

  console.log(`[Scheduler] Started with ${jobs.length} jobs (UTC)`);
  return () => clearInterval(timer);
}
