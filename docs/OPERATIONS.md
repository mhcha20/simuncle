# SIM uncle — day-to-day operations

## Daily (2 minutes)
- Admin → Orders: look for orders stuck in **processing** (TGT) or **paid** / **failed** for more than 15 minutes.
  - TGT orders recover on their own (the recovery job runs every 15 minutes). If one is still stuck after an hour, check Railway logs for `[TGT]` and the order number.
  - Vizlync orders without an eSIM are re-fetched by the same job.
- Stripe → Developers → Webhooks: the `simuncle.com/api/stripe/webhook` endpoint should show recent deliveries with status 200.
- Stripe, Vizlync and TGT balances: keep enough credit with both suppliers (a low balance makes new orders fail).

## When something looks wrong
1. Railway → `simuncle` service → Deployments → Logs. Search for the order number, `error`, `[Stripe]`, `[TGT]`, `[tRPC]`.
2. Admin → Orders → **記錄** shows the emails sent for an order; **發郵件** / **重發** re-sends the eSIM email.
3. A customer paid but has no order: Stripe → Payments → find the payment → check the webhook delivery; the `reconcile-orders` job also fixes paid-but-unfulfilled orders every 10 minutes.

## Refunds
Admin → Orders → **終止** (if the eSIM was issued and must stop working) → **退款**. The customer gets a refund email. Orders paid together in one cart checkout must be refunded from the Stripe dashboard.

## Scheduled jobs (Railway variable `SCHEDULER_JOBS`)
Enabled now: `reconcile-orders,email-retry,sync-products,sync-tgt-products,update-exchange-rates,check-tgt-sync-status`.
Optional customer emails (enable one at a time, after the site has run for a few days): `pending-reminder`, `expiry-reminder`, `low-usage-alert`.
Changing the variable redeploys the service.

## Backups
- Railway MySQL volume is not a backup. Before risky changes, export the database from TablePlus (File → Export, SQL) and keep the file off GitHub (it contains customer data).
- To connect: Railway → MySQL service → Settings → Networking → add a TCP Proxy, connect with TablePlus, and **remove the proxy when done**.

## Secrets
Keys live only in Railway Variables. Rotate a key by changing it there; never paste keys into chat, GitHub or email.
- Stripe live key / webhook secret, Vizlync, TGT, Resend, R2, OpenRouter, Google OAuth client secret, `JWT_SECRET` (changing it logs everyone out).

## Domain
DNS is in Squarespace. Do not delete: MX records, `email`, `autodiscover`, `send`, `resend._domainkey`, SPF/DMARC, Google verification, `_domainconnect`, `_railway-verify*`. `@` is an ALIAS and `www` a CNAME to Railway.
