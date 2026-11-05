# SIM uncle（eSIM 叔叔，simuncle）

給日後 AI 嘅項目背景。用戶用廣東話溝通，回覆用繁體廣東話；用戶唔係寫程式嘅人。所有網站一覽：`docs/ALL_SITES.md`。

**呢個係真網店（simuncle.com，Stripe 正式收款）。改動前要小心，部署前要 `pnpm check`、`pnpm test`、`pnpm build` 全過。**

## 接手先讀
- `README.md`：技術、指令、目錄。
- `DEPLOY.md`：由 Manus 搬到 Railway 嘅步驟同決定（固定出口 IP、VAPID、舊會員對返帳戶）。
- `docs/OPERATIONS.md`：日常營運（卡單點處理、退款、排程、備份、密鑰）。
- `docs/functional-spec.md`、`docs/architecture.md`、`docs/retry-strategy.md`、`docs/locking-design.md`、`docs/TGT-API-2.0-notes.md`、`docs/tgt-api-notes.md`、`docs/vizlync-api-v1.3.txt`。

## 係咩
六語言（繁中／簡中／English／日本語／한국어／ไทย）全球 eSIM 網店：目的地搜尋、Stripe 付款（購物車）、**Vizlync／TGT 供應商自動履約**、會員訂單／用量／增購（top-up）、推薦佣金、部落格＋AI 翻譯＋SEO 文章、AI 客服、推播、管理後台（訂單、產品、文章、SEO、推薦、公告、設定）。
React 19＋Vite＋Tailwind 4、Express＋tRPC 11、Drizzle＋MySQL、Stripe、Resend、Cloudflare R2。

## 部署
- Railway project `simuncle`（id `5336f6fd-e929-430e-8215-c63dc297bce6`），service `simuncle`（`51376ed0-78ab-437f-9e88-32d2f093fadb`）＋`MySQL`，環境 `production`（`c2f667f5-e7da-489f-8430-b20afe7e88bb`）。
- **部署 branch：`main`**。網址 https://simuncle.com （＋www），Railway 網址 simuncle-production.up.railway.app（port 8080）。
- `railway.json`：build `pnpm install --frozen-lockfile && pnpm build`，pre-deploy `node dist/db-setup.js`（自動 migration），start `pnpm start`，healthcheck `/sitemap.xml`，**只可 1 個 replica**（排程同 TGT token cache 喺單一 process）。
- 排程：`SCHEDULER_JOBS` 揀開邊啲工作（改呢個 variable 會重新部署）。
- AI：`LLM_PROVIDER`／`LLM_MODEL`／`LLM_API_KEY`；有 `XAI_API_KEY` 就用 Grok（2026-11-04 起）；`LLM_PROVIDER=anthropic` 可轉返 Claude。
- Variables（只記名稱）：`DATABASE_URL`、`JWT_SECRET`、`PUBLIC_URL`、`OWNER_EMAIL`、`ADMIN_EMAILS`、`GOOGLE_CLIENT_ID／SECRET`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`RESEND_API_KEY`、`S3_*`（R2）、`TGT_ACCOUNT_ID`、`TGT_SECRET`、`TGT_API_BASE_URL`、`VIZLYNC_API_KEY`、`VIZLYNC_PARTNER_ID`、`SORO_*`、`SE_RANKING_*`、`INDEXNOW_KEY`、`VAPID_*`、`VITE_VAPID_PUBLIC_KEY`、`LLM_*`、`XAI_API_KEY`、`SCHEDULER_JOBS`、`ORDER_ID_FLOOR`、`RETRANSLATE_MISSING`。
- TGT／Vizlync 有 **IP 白名單**（Railway Static Outbound IP），換 service／region 會斷供應商連線。

## 注意
- repo **公開**：客人資料、資料庫匯出、密鑰一律唔入 repo。
- `JWT_SECRET` 一改全部人要重新登入；VAPID key 一改推播訂閱全部失效。

## 修改歷史（摘要，52 個 commit）
- 09-29：由 Manus 匯出源碼 → R2 儲存、Google＋電郵連結登入、內建排程、換走 Manus LLM／通知 → Railway 部署。
- 09-30–10-01：私隱政策、自動 db-setup、排程子集、Vizlync 遲到 eSIM 跟進、TGT callback 遺失補救、增購、AI 客服接店舖資料、退款＋退款電郵、Service worker v6、營運指南。
- 10-03：文章 AI 翻譯（伺服器背景＋進度）、Vizlync 下架同步、同步紀錄分開。
- 10-30–11-01：產品同步改每週一、低用量提醒包 TGT、favicon、細 bundle、品牌色（藍 #0b6bbd／橙 #ea622a）、手機 UX、目的地相片、短計劃名、安裝教學圖搬入網站。
- 11-03–11-04：搜尋逐字、大數據計劃行、AI 用 output_config.format、Grok、補譯最新文章。
