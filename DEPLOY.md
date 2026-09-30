# 由 Manus 搬到 Railway：部署步驟

呢個版本已經唔再依賴 Manus：

| 功能 | 以前（Manus） | 而家 |
| --- | --- | --- |
| 登入 | Manus 登入 | Google 登入 + 電郵登入連結（`/login`） |
| 圖片／檔案 | Manus Storage | Cloudflare R2（或任何 S3 相容儲存） |
| 資料庫 | Manus 託管 TiDB | Railway MySQL |
| 排程 | Manus Heartbeat | 伺服器內建排程（`server/scheduler.ts`，13 個工作） |
| AI（翻譯、SEO 文章、客服） | Manus LLM | Anthropic API（`LLM_API_KEY`） |
| 站主通知 | Manus 通知 | Resend 寄 email 去 `OWNER_EMAIL` |

舊會員用**同一個 email** 登入（Google 或電郵連結都得），就會自動對返佢原本嘅帳戶、訂單、購物車、推薦碼同管理員權限。`ADMIN_EMAILS` 入面嘅 email 一定係管理員。

> 用 Apple 登入嘅舊會員如果揀咗「隱藏我的電郵」，個 email 係 `@privaterelay.appleid.com`，要用嗰個地址做電郵登入先對到。搬遷前可以喺舊資料庫查：
> `SELECT COUNT(*) FROM users WHERE email LIKE '%@privaterelay.appleid.com';`

**只可以開 1 個 replica。** 內建排程同 TGT token cache 都喺單一 process 入面；`railway.json` 已設 `numReplicas: 1`。

---

## 0. 搬遷前要處理（唔做會出事）

1. **撤銷並重新生成曾經寫死喺舊源碼嘅密鑰：** `SORO_EMBED_TOKEN`，同 TGT 帳戶 secret（`TGT_SECRET`）。`TGT_SECRET` 亦係 TGT callback 驗簽用，換嘅時間要同 TGT 約好。
2. **固定出口 IP：** TGT 同 Vizlync 有 IP 白名單。喺 Railway 網站 service → **Settings → Networking** 開 **Static Outbound IP**（可能要 Pro 計劃），攞到 IP 之後交俾 TGT 同 Vizlync 加入白名單。**要喺切換域名前完成。**
3. **沿用舊 VAPID 推播 key**（`VAPID_PUBLIC_KEY`／`VAPID_PRIVATE_KEY`／`VITE_VAPID_PUBLIC_KEY`）。重新生成會令所有現有推播訂閱失效。
4. **喺舊站仲行緊嗰陣，下載晒 Manus Storage 嘅圖片**（見第 3 節）。

## 1. 開 Railway 項目

1. <https://railway.com> → **New Project → Deploy from GitHub repo**，揀 `simuncle`。
2. 同一項目 **+ New → Database → MySQL**。
3. 網站 service → **Variables**，加 `DATABASE_URL` = `${{MySQL.MYSQL_URL}}`。

每次 deploy，`railway.json` 嘅 pre-deploy 指令 `node dist/db-setup.js` 會自動行資料庫 migration（見第 2 節）。

## 2. 匯入舊資料

1. 喺 Manus 匯出資料庫（SQL dump），記低匯出時間。
2. 用 TablePlus／DBeaver 或 `mysql -h <host> -P <port> -u root -p railway < dump.sql` 匯入 Railway MySQL（用 **Public Network** 連線資料）。
3. **唔好用 `pnpm db:push`**，匯入嘅資料庫冇 migration 記錄，會重複建表。直接行：

   ```bash
   DATABASE_URL=<Railway 公開連線網址> pnpm db:setup
   ```

   （或者直接 deploy，pre-deploy 會自動行。）`db-setup` 會：
   - 如果資料庫已經有 migration 0000–0024 嘅全部表同欄位，就將呢 25 個 migration 記錄為已完成，只行新嘅（例如 `0025` 加 `sync_history.supplier`）；欄位對唔上就會報錯並列出缺咗嘅欄位，唔會亂改。
   - 補返 `orders.errorMessage`、`orders.startDate` 兩個喺 Manus 手動加、冇 migration 嘅欄位。
   - 全新空資料庫就由頭行晒 migration。
4. 對數：`users`、`orders`、`topup_orders`、`products_cache`、`articles`、`referral_*`、`push_subscriptions` 逐表 `COUNT(*)` 同 Manus 比較。
5. 匯入後手動觸發一次 Vizlync 同 TGT 產品同步（後台 → 產品管理），確認產品數量正常。

> TiDB → MySQL 大致相容。如果匯入報錯，最常見係 TiDB 專用語法（例如 `AUTO_RANDOM`），要手動改 dump。

## 3. Cloudflare R2（圖片）

1. Cloudflare → **R2** → Create bucket（例如 `simuncle`）。Bucket 可以保持私人，網站會經 `/manus-storage/*` 轉發。
2. **Manage API tokens → Create API token**，權限 *Object Read & Write*，抄低 Access Key ID、Secret、endpoint（`https://<account-id>.r2.cloudflarestorage.com`）。
3. 由舊站落晒圖片，再用**同一個 key** 上傳。要搵齊所有 key：

   ```bash
   grep -rhoE "/manus-storage/[A-Za-z0-9._/-]+" client server | sort -u
   ```

   另外要查資料庫入面用到嘅（文章封面、公告等）。舊站仲行緊嗰陣，可以用 `curl -O https://simuncle.com/manus-storage/<key>` 逐個落。
4. 上傳後，新站 `/manus-storage/logo-optimized_e921ee9c.webp` 應該出到圖。

程式入面嘅圖片路徑維持 `/manus-storage/<key>`（唔改名），咁樣舊資料、電郵同 SEO 資料都唔使動。

## 4. Google 登入

1. <https://console.cloud.google.com> → 開新 project → **OAuth consent screen**（External，填 app 名同支援 email，然後 Publish）。
2. **Credentials → Create credentials → OAuth client ID → Web application**。
3. **Authorised redirect URIs** 加：
   - `https://simuncle.com/api/auth/google/callback`
   - 測試期間仲要加 `https://<你的-railway-網址>.up.railway.app/api/auth/google/callback`
4. 抄低 Client ID 同 secret。

## 5. 環境變數

參考 `.env.example`，喺 Railway → Variables 逐個加。沿用舊嘅（唔好重新生成）：Stripe、Vizlync、TGT、Resend、SE Ranking、Soro、IndexNow、VAPID。新增：`PUBLIC_URL`、`JWT_SECRET`、`GOOGLE_*`、`ADMIN_EMAILS`、`OWNER_EMAIL`、`S3_*`、`LLM_API_KEY`。

- `STRIPE_SECRET_KEY` 正式環境**必須用 live key**。對帳會跳過 test／live 唔同模式嘅 session，用錯 key 舊訂單會全部被跳過。
- `VITE_*` 變數係 **build 時**寫入前台，要喺第一次 build 前設好，改咗要 Redeploy。
- `JWT_SECRET` 係新嘅，所有人會被登出一次，冇問題。
- Umami 分析：新開一個 Umami Cloud 網站，填 `VITE_UMAMI_SCRIPT_URL`／`VITE_UMAMI_WEBSITE_ID`；月度報告另需 `UMAMI_API_URL`／`UMAMI_API_KEY`／`UMAMI_WEBSITE_ID`（唔填就唔會有流量部分）。舊 Manus 嘅 Umami 數據唔會搬過嚟。

## 6. 排程（內建）

伺服器每分鐘檢查一次時間表（UTC），到時自己 `POST` 去 `/api/scheduled/*`：

| 工作 | 時間（UTC） |
| --- | --- |
| 付款對帳 `reconcileOrders` | 每 10 分鐘 |
| 電郵重試 | 每 15 分鐘 |
| 未付款提醒 | 每 6 小時（:00） |
| 用量偏低提醒 | 每 6 小時（:30） |
| Soro 文章同步 | 每 6 小時（:15） |
| 匯率更新 | 每日 00:30 |
| Vizlync 產品同步 | 每日 01:00 |
| TGT 產品同步 | 每日 01:30 |
| eSIM 到期提醒 | 每日 02:00 |
| TGT 同步狀態檢查 | 每日 03:00 |
| SEO 機會分析 | 每週一 01:00 |
| SEO 文章生成 | 每週三 01:00 |
| 每月流量報告 | 每月 1 日 01:00（HKT 09:00） |

**首次上線建議只開安全嘅工作。** 舊 Manus 其實只註冊咗一個（已暫停）排程，對帳、提醒等一直冇跑過，所以新站一開全部，客人提醒電郵會即刻出。先設：

```
SCHEDULER_JOBS=reconcile-orders,sync-products,sync-tgt-products,update-exchange-rates,check-tgt-sync-status
```

（呢五個唔會發客人電郵。）確認穩定之後，再逐個加 `email-retry`、`pending-reminder`、`expiry-reminder`、`low-usage-alert`，其餘按需要加；全部都要就將 `SCHEDULER_JOBS` 留空。未付款提醒已加上限：只提醒 5 日內嘅訂單。

要改時間就改 `server/scheduler.ts` 嘅 `JOBS`。伺服器停機期間錯過嘅工作唔會補跑，下一個時間點先再行（付款對帳每 10 分鐘一次，所以唔會積壓）。

如果想用外部 cron 服務，設 `DISABLE_SCHEDULER=1` 同 `CRON_SECRET`，然後以 `Authorization: Bearer <CRON_SECRET>` 去 POST 對應網址。

## 7. 測試（用 Railway 網址）

- 首頁、產品、目的地頁、圖片都正常
- Google 登入同電郵登入都得；用 `ADMIN_EMAILS` 嘅 email 登入見到 `/admin`
- 舊會員登入後 `/orders` 見到舊訂單
- **用 Stripe 測試模式 + TGT sandbox 落一張單**：付款 → 供應商建單 → TGT callback → QR → 確認電郵
- Vizlync 用量、增購、後台補發 eSIM、AI 客服、文章翻譯（LLM）、推播

## 8. 切換域名（建議喺低流量時段做）

1. 舊站公佈短暫維修（或暫停），**記低時間點 T**。
2. 再匯出一次 Manus 資料庫，將 T 之後嘅新訂單／會員補入新資料庫。
3. Railway service → **Settings → Networking → Custom Domain** 加 `simuncle.com`、`www.simuncle.com`，跟指示改 DNS。`www` 會自動 301 去 non-www。
4. `PUBLIC_URL` 確認係 `https://simuncle.com`，Redeploy。
5. **TGT 後台**：callback 網址設 `https://simuncle.com/api/tgt/callback`；確認白名單已包含 Railway 固定出口 IP。
6. **Stripe → Developers → Webhooks**：endpoint `https://simuncle.com/api/stripe/webhook`，訂閱 `checkout.session.completed`、`payment_intent.payment_failed`；signing secret 填入 `STRIPE_WEBHOOK_SECRET`。
7. 即刻用 `CRON_SECRET` 手動叫一次對帳，睇有冇卡住嘅訂單：

   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://simuncle.com/api/scheduled/reconcileOrders
   ```

8. 用一張小額真實訂單完整跑一次。
9. 舊站保留 1–2 星期（唔好再有 webhook／排程指去佢），確認：冇 `pending_payment` 卡單、TGT `processing` 訂單正常變 `completed`、產品同匯率同步有跑，先至停用 Manus。**舊站同新站唔好同時接 Stripe webhook／TGT callback／排程。**

## 9. 已知事項

- TGT callback 驗簽唔匹配時，目前仍會繼續處理訂單（`server/tgtCallback.ts`）。正式運作穩定後建議改為拒絕。
- 履約鎖、`stripe_events`、`supplier_events` 等強化設計見 `docs/locking-design.md`、`docs/retry-strategy.md`，**尚未實作**。
- `pnpm test` 入面需要真實密鑰嘅測試（TGT、Vizlync、Resend、SE Ranking、Soro）喺冇對應環境變數時會自動跳過。
