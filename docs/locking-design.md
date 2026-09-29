# 付款對帳及自動同步模組
## 資料庫交易隔離級別、分散式鎖及一致性設計

> 本文件針對 eSIM 叔叔目前的 MySQL／TiDB + Drizzle ORM 架構，補充付款對帳、Stripe Webhook、Vizlync／TGT 產品同步的交易隔離及分散式鎖設計。
>
> **重要區分：** 目前程式主要以單筆 SQL 更新、Heartbeat Cron 及應用層冪等完成流程；本文件列出的 staging、lease lock、outbox、交易鎖及 compare-and-set 是正式高併發環境的建議強化方案，不應誤當成目前已全部部署。

---

# 1. 設計目標

付款及同步模組要同時處理四種競態：

| 競態 | 例子 | 主要風險 |
|---|---|---|
| Webhook vs Checkout 成功頁 | Stripe Webhook 及前端 `confirmPayment` 同時進入 | 重複履約、重複發供應商訂單 |
| Webhook vs 對帳排程 | Cron 正在查同一 Stripe Session | 同一訂單被兩次 fulfill |
| TGT Callback vs 後台補發 | Callback 與管理員 reissue 同時執行 | 重複 TGT 建單或覆蓋 eSIM 資料 |
| 兩次同步排程 | Heartbeat 重試／手動同步重疊 | 新資料被舊同步覆蓋、重複通知、錯誤停用產品 |
| 兩個同步 worker 同寫產品 | 多個 app instance 同時 upsert | 價格／isActive／rawData 順序不穩定 |
| DB 更新成功但第三方 API 未知 | API request timeout，但供應商可能已接受 | 重試造成重複供應商訂單 |

目標不是令所有外部 API 呼叫都包在一個長交易內，而是：

1. 短交易只鎖本地資料及決定「誰有權執行」。
2. 外部 API 呼叫在交易外執行，避免長時間持有 DB lock。
3. API 結果回來後以 compare-and-set／冪等 key 寫回。
4. DB 狀態、工作隊列及外部副作用分開管理。
5. 所有重試都可安全重跑。

---

# 2. 交易隔離級別建議

## 2.1 建議基準：READ COMMITTED

付款對帳及履約工作建議使用：

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

原因：

- 對帳只需要讀取當下已提交狀態。
- 減少 MySQL `REPEATABLE READ` 下長交易的 gap lock／snapshot 陳舊問題。
- 降低 Webhook、成功頁及 Cron 互相等待的機會。
- 配合短交易 + `SELECT ... FOR UPDATE` 已足夠保護單筆訂單。

注意：`READ COMMITTED` 不會自動解決 lost update；仍必須使用 row lock 或 compare-and-set。

## 2.2 產品同步的兩種交易模式

### 模式 A：目前簡單 upsert 模式

目前同步以批量 `upsertProduct()` 逐批寫入，適合產品量大、希望部分成功的情況：

```text
每批 50／200 筆
  → 每項 upsert
  → 失敗用 Promise.allSettled 收集
  → 最後寫 sync_history
```

優點是單一產品失敗不會令全量同步 rollback；缺點是同步中間時間，前台可能讀到新舊資料混合狀態。

此模式建議：

- 使用 `READ COMMITTED`。
- 每批寫入完成即提交。
- 不在全量同步期間使用大範圍 `FOR UPDATE`。
- 不要在同一時間執行兩次相同 supplier sync。

### 模式 B：正式全量快照模式

若要求「前台只看到完整的新版本」，使用 staging table：

```text
products_cache_live
products_cache_stage
sync_runs
```

流程：

1. 建立 `sync_run`。
2. 供應商產品全部寫入 stage，帶 `sync_run_id`。
3. stage 驗證總數、產品 ID 唯一性、價格及必要欄位。
4. 短交易內將版本標記為 active。
5. 將缺失產品設 inactive。
6. Commit。

不建議在 MySQL 以 `RENAME TABLE` 交換含外鍵或長時間讀取的表；使用版本欄位及 `active_sync_run_id` 通常更安全。

---

# 3. 付款對帳的交易設計

## 3.1 訂單狀態與版本欄位

建議在 `orders` 增加：

```text
status_version          bigint default 0
fulfillment_status      pending | processing | completed | failed | dead_letter
fulfillment_attempts   int default 0
fulfillment_owner      varchar(100) nullable
fulfillment_lock_until timestamp nullable
last_reconciled_at     timestamp nullable
last_error_class       varchar(64) nullable
next_retry_at           timestamp nullable
```

同一筆訂單所有狀態變更必須使用：

```text
WHERE id = ? AND status_version = oldVersion
```

成功後：

```text
status_version = status_version + 1
```

這可防止舊 Worker 用較舊資料覆蓋新結果。

## 3.2 單筆訂單短交易模式

不要這樣做：

```pseudo
BEGIN
  SELECT order FOR UPDATE
  call Stripe API
  call TGT API / Vizlync API
  send email
  UPDATE order
COMMIT
```

原因：

- Stripe／供應商 API 可能等待數秒至數十秒。
- DB lock 長時間佔用。
- Webhook、對帳及後台請求互相阻塞。
- DB connection pool 容易耗盡。

應拆成：

```pseudo
短交易 A：claim job
交易外：呼叫 Stripe／供應商
短交易 B：compare-and-set 寫回結果
交易外：發送可重試通知／Email
短交易 C：記錄副作用結果
```

## 3.3 付款對帳 claim 流程

```pseudo
FUNCTION claimFulfillment(orderId, workerId):
    BEGIN TRANSACTION READ COMMITTED

    order = SELECT * FROM orders
            WHERE id = orderId
            FOR UPDATE

    IF order does not exist:
        ROLLBACK
        RETURN NOT_FOUND

    IF order.status == "completed":
        COMMIT
        RETURN ALREADY_COMPLETED

    IF order.fulfillment_lock_until > NOW()
       AND order.fulfillment_owner != workerId:
        COMMIT
        RETURN BUSY

    IF order.status NOT IN ["pending_payment", "paid", "processing"]:
        COMMIT
        RETURN NOT_ELIGIBLE

    UPDATE orders
    SET fulfillment_owner = workerId,
        fulfillment_lock_until = NOW() + INTERVAL 2 MINUTE,
        fulfillment_attempts = fulfillment_attempts + 1,
        status = CASE
                   WHEN status = "pending_payment" THEN "paid"
                   ELSE status
                 END,
        updatedAt = NOW()
    WHERE id = orderId

    COMMIT
    RETURN CLAIMED
```

這個 lock 只保護「同一時間由誰執行」，不保證 worker 永不崩潰；因此一定要有 lease expiry。

## 3.4 Stripe Session 查詢放在交易外

```pseudo
FUNCTION reconcileOneOrder(orderId, workerId):
    claim = claimFulfillment(orderId, workerId)

    IF claim IN [ALREADY_COMPLETED, BUSY, NOT_ELIGIBLE, NOT_FOUND]:
        RETURN claim

    TRY:
        order = DB.readOrder(orderId)
        sessionId = order.stripeSessionId

        IF sessionId is empty:
            return finalizeFailureIfStillOwned(
                orderId, workerId,
                error = "missing stripe session"
            )

        stripeSession = Stripe.retrieveSession(sessionId)

        IF stripeSession.payment_status != "paid":
            releaseLeaseAndRecord(orderId, workerId,
                result = "not_paid")
            RETURN NOT_PAID

        // 仍然在交易外呼叫共用履約服務，但它必須再次做 claim／CAS
        result = fulfillSupplierSafely(orderId, workerId)
        RETURN result

    CATCH error:
        classified = classify(error)
        IF retryable(classified):
            scheduleRetryIfStillOwned(orderId, workerId, error)
            RETURN RETRY_LATER

        markFailedIfStillOwned(orderId, workerId, error)
        RETURN FAILED
```

## 3.5 Compare-and-set 更新

每個 worker 寫回結果時，不應只使用：

```sql
UPDATE orders SET status = 'completed' WHERE id = ?;
```

應包括 owner／lease／版本條件：

```sql
UPDATE orders
SET status = 'completed',
    fulfillment_status = 'completed',
    fulfillment_lock_until = NULL,
    fulfillment_owner = NULL,
    completed_at = CURRENT_TIMESTAMP,
    status_version = status_version + 1,
    updatedAt = CURRENT_TIMESTAMP
WHERE id = ?
  AND fulfillment_owner = ?
  AND fulfillment_lock_until > CURRENT_TIMESTAMP
  AND status <> 'completed';
```

如果 affected rows = 0：

```text
不要再覆蓋資料
重新讀取訂單
若已 completed，視為另一個 worker 已成功
若 lease 已過期，進入下一輪 claim
```

---

# 4. 分散式鎖設計

## 4.1 不應只用 process memory lock

以下做法不足以應付正式環境：

```ts
let isSyncRunning = false;
```

因為：

- 只對單一 Node.js process 有效。
- 多個 instance 各自有一份變數。
- process crash 後 lock 狀態消失。
- 部署／重啟可能令兩個同步同時執行。

## 4.2 Database lease lock

建立 lock table：

```sql
CREATE TABLE distributed_locks (
    lock_key VARCHAR(128) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    token VARCHAR(128) NOT NULL,
    acquired_at TIMESTAMP NOT NULL,
    lease_until TIMESTAMP NOT NULL,
    heartbeat_at TIMESTAMP NOT NULL,
    metadata JSON NULL
);
```

使用 unique `lock_key`，例如：

```text
sync:vizlync-products
sync:tgt-products
reconcile:stripe-orders
fulfill:order:123456
callback:order:123456
```

### 取得 lock

```sql
INSERT INTO distributed_locks
    (lock_key, owner_id, token, acquired_at, lease_until, heartbeat_at)
VALUES
    (?, ?, ?, CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP + INTERVAL 2 MINUTE,
     CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
    owner_id = IF(lease_until < CURRENT_TIMESTAMP, VALUES(owner_id), owner_id),
    token = IF(lease_until < CURRENT_TIMESTAMP, VALUES(token), token),
    acquired_at = IF(lease_until < CURRENT_TIMESTAMP, VALUES(acquired_at), acquired_at),
    lease_until = IF(lease_until < CURRENT_TIMESTAMP,
                     VALUES(lease_until), lease_until),
    heartbeat_at = IF(lease_until < CURRENT_TIMESTAMP,
                      VALUES(heartbeat_at), heartbeat_at);
```

寫完後再檢查：

```sql
SELECT owner_id, token, lease_until
FROM distributed_locks
WHERE lock_key = ?;
```

只有 `owner_id` 及 `token` 都等於自己，才算取得成功。

### 延長 lease

```sql
UPDATE distributed_locks
SET lease_until = CURRENT_TIMESTAMP + INTERVAL 2 MINUTE,
    heartbeat_at = CURRENT_TIMESTAMP
WHERE lock_key = ?
  AND owner_id = ?
  AND token = ?
  AND lease_until > CURRENT_TIMESTAMP;
```

### 釋放 lock

```sql
DELETE FROM distributed_locks
WHERE lock_key = ?
  AND owner_id = ?
  AND token = ?;
```

不能只用 `DELETE WHERE lock_key=?`，否則舊 worker 的 finally 可能刪除新 worker 已重新取得的 lock。

## 4.3 Lock lease 時間

| 工作 | 建議 lease | Heartbeat |
|---|---:|---:|
| 單筆 Stripe fulfillment claim | 2 分鐘 | 每 30 秒 |
| Vizlync product sync | 10 分鐘 | 每 60 秒 |
| TGT product sync | 10 分鐘 | 每 60 秒 |
| Stripe reconciliation scan | 5 分鐘 | 每 60 秒 |
| TGT Callback 單筆處理 | 1 分鐘 | 不需要，應快速入隊 |

Lease 不應設定為無限期；worker crash 後必須可被下一個 worker 接管。

## 4.4 Lock owner 及 token

```pseudo
workerId = hostname + ":" + processId + ":" + randomUUID()
lockToken = randomUUID()
```

`owner_id` 只表示哪個 worker；`token` 表示這一次 lock acquisition。釋放／延長必須同時驗證兩者，避免 ABA 問題。

---

# 5. Stripe Webhook、成功頁及對帳的競態處理

## 5.1 事件來源

同一 Stripe Session 可能由三個入口觸發：

```text
A. /api/stripe/webhook
B. checkout success page → confirmAndFulfillBySession
C. /api/scheduled/reconcileOrders
```

三者必須呼叫相同的 `fulfillment` service，不能各自實作不同的建單流程。

## 5.2 Stripe event 去重表

建議新增：

```sql
CREATE TABLE stripe_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    session_id VARCHAR(255) NULL,
    status ENUM('received','processing','processed','failed') NOT NULL,
    payload_hash VARCHAR(64) NULL,
    received_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP NULL,
    error_message TEXT NULL
);
```

Webhook 入口：

```pseudo
FUNCTION handleWebhook(event):
    INSERT INTO stripe_events(event_id, event_type, status)
    VALUES(event.id, event.type, "received")
    ON DUPLICATE KEY DO NOTHING

    IF affectedRows == 0:
        RETURN { received: true, duplicate: true }

    QUEUE.enqueueOnce("stripe-event", event.id)
    RETURN { received: true }
```

如果暫時不使用 queue，至少要在 `handleCheckoutCompleted()` 入口以 Session ID + DB lock 做 claim。

## 5.3 主訂單唯一約束

建議索引：

```sql
CREATE UNIQUE INDEX uq_orders_stripe_session
ON orders(stripeSessionId);

CREATE UNIQUE INDEX uq_orders_supplier_channel
ON orders(supplier, supplierOrderId);
```

`stripeSessionId` 可允許 NULL，但非 NULL 時應唯一。

對 TGT，`channelOrderNo = SU{orderId}` 本身也應唯一：

```sql
CREATE UNIQUE INDEX uq_tgt_channel_order
ON orders(supplier, supplierOrderId);
```

若需要保存 channelOrderNo，最好獨立加欄位，而不要只靠字串推算。

## 5.4 共用履約服務虛擬碼

```pseudo
FUNCTION fulfillPaidOrder(orderId, trigger, workerId):
    claim = claimFulfillment(orderId, workerId)

    IF claim == ALREADY_COMPLETED:
        RETURN { status: "already_fulfilled" }
    IF claim == BUSY:
        RETURN { status: "in_progress" }
    IF claim != CLAIMED:
        RETURN { status: "not_eligible" }

    order = DB.readOrder(orderId)

    IF not stripePaymentConfirmed(order):
        releaseLease(orderId, workerId)
        RETURN { status: "unpaid" }

    IF order.supplier == "tgt":
        result = ensureTgtOrderCreated(order, workerId)
        // 建單成功後仍是 processing，等待 callback
        RETURN result

    IF order.supplier == "vizlync":
        result = ensureVizlyncOrderCreatedAndDetails(order, workerId)
        RETURN result

    markFailedIfStillOwned(orderId, workerId, "unknown supplier")
    RETURN { status: "failed" }
```

---

# 6. 產品自動同步的交易設計

## 6.1 現有模式的問題

現有同步流程是：

```text
fetch full supplier list
→ 分批 upsert products_cache
→ 比對 ID／價格
→ deactivation／notification
```

若同一 supplier 的兩次同步重疊：

```text
Run A 取得舊資料，慢速寫入
Run B 取得新資料，先完成
Run A 之後才寫入舊資料
```

結果可能是資料回退（last writer wins），尤其是價格、`rawData` 及 `isActive`。

## 6.2 最低限度：supplier-level lease lock

同步開始前先取得：

```text
sync:vizlync-products
sync:tgt-products
```

如果已有有效 lease：

```http
200 { "ok": true, "status": "sync already running" }
```

不要同時啟動第二次同步；Heartbeat 看到 200 即視為排程正常。

虛擬碼：

```pseudo
FUNCTION scheduledProductSync(supplier):
    workerId = makeWorkerId()
    lock = acquireLease("sync:" + supplier + "-products", workerId, 10 minutes)

    IF not lock.acquired:
        LOG("sync skipped because another run owns lock")
        RETURN { status: "already_running" }

    runId = DB.createSyncRun(supplier, workerId)

    TRY:
        refreshLeaseInBackground(lock)
        products = fetchAllSupplierProducts(supplier)
        validateProductSnapshot(products)
        writeProducts(supplier, products, runId)
        finalizeSyncRun(runId, "success")
    CATCH error:
        finalizeSyncRun(runId, "failed", error)
        ALERT.owner("Product sync failed", supplier, error)
    FINALLY:
        releaseLease(lock)
```

## 6.3 `sync_runs` 表

```sql
CREATE TABLE sync_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier ENUM('vizlync','tgt') NOT NULL,
    run_key VARCHAR(128) NOT NULL,
    worker_id VARCHAR(128) NOT NULL,
    status ENUM('started','staging','applying','success','failed','aborted') NOT NULL,
    source_total INT NOT NULL DEFAULT 0,
    written_count INT NOT NULL DEFAULT 0,
    deactivated_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP NULL,
    error_message TEXT NULL,
    UNIQUE KEY uq_supplier_run_key (supplier, run_key)
);
```

`run_key` 可由：

```text
supplier + scheduled time bucket + taskUid
```

組成，避免同一 Heartbeat execution 被重送兩次。

## 6.4 staging table 方案

```sql
CREATE TABLE products_sync_stage (
    sync_run_id BIGINT NOT NULL,
    supplier ENUM('vizlync','tgt') NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    product_json JSON NOT NULL,
    row_hash CHAR(64) NOT NULL,
    PRIMARY KEY (sync_run_id, supplier, product_id),
    KEY idx_stage_run (sync_run_id)
);
```

寫入 staging 時全部帶 `sync_run_id`。同一 run 中重試同一產品使用：

```sql
INSERT INTO products_sync_stage (...)
VALUES (...)
ON DUPLICATE KEY UPDATE
    product_json = VALUES(product_json),
    row_hash = VALUES(row_hash),
    name = VALUES(name),
    price = VALUES(price);
```

## 6.5 Stage → Live 的短交易

```pseudo
FUNCTION activateProductSnapshot(runId, supplier):
    BEGIN TRANSACTION READ COMMITTED

    run = SELECT * FROM sync_runs
          WHERE id = runId
          FOR UPDATE

    IF run.status != "staging":
        ROLLBACK
        RETURN NOT_ELIGIBLE

    stageCount = SELECT COUNT(*) FROM products_sync_stage
                 WHERE sync_run_id = runId

    IF stageCount == 0:
        ROLLBACK
        RETURN INVALID_SNAPSHOT

    IF stageCount < minimumExpectedCount(supplier):
        ROLLBACK
        RETURN SUSPICIOUS_SNAPSHOT

    UPDATE products_cache p
    JOIN products_sync_stage s
      ON s.sync_run_id = runId
     AND s.supplier = p.supplier
     AND s.product_id = p.productId
    SET p.name = s.name,
        p.price = s.price,
        p.rawData = s.product_json,
        p.lastSyncRunId = runId,
        p.isActive = true,
        p.updatedAt = NOW()
    WHERE p.supplier = supplier;

    INSERT missing products from stage into products_cache;

    UPDATE products_cache p
    SET p.isActive = false,
        p.lastSyncRunId = runId,
        p.updatedAt = NOW()
    WHERE p.supplier = supplier
      AND p.isActive = true
      AND NOT EXISTS (
          SELECT 1 FROM products_sync_stage s
          WHERE s.sync_run_id = runId
            AND s.supplier = p.supplier
            AND s.product_id = p.productId
      );

    UPDATE sync_runs
    SET status = "success", finished_at = NOW()
    WHERE id = runId;

    COMMIT
```

如果不能立即改用 stage table，至少加入 `lastSyncRunId`／`lastSyncedAt`，並在 upsert 時防止舊 run 覆蓋新 run：

```sql
UPDATE products_cache
SET price = ?, rawData = ?, lastSyncRunId = ?
WHERE productId = ?
  AND (lastSyncRunId IS NULL OR ? >= lastSyncRunId);
```

更可靠的方法是比較 run 的建立時間／版本，而不是單純比較數字 ID。

## 6.6 同步變更通知的交易邊界

不要在尚未 commit 產品資料前發通知：

```pseudo
BEGIN
  upsert products
  notifyOwner(...)   // 不建議
COMMIT
```

應該：

```pseudo
BEGIN
  apply snapshot
  insert outbox event "product_sync_completed"
COMMIT

OUTBOX WORKER:
  send owner notification
  submit IndexNow
  mark outbox sent
```

這樣即使通知服務暫時失敗，產品資料仍然成功；通知可獨立重試。

---

# 7. Outbox 設計

付款、同步及通知都會觸發外部副作用，建議使用 transactional outbox：

```sql
CREATE TABLE outbox_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_key VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(128) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NULL,
    locked_until TIMESTAMP NULL,
    last_error TEXT NULL,
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP NULL
);
```

例如付款完成交易內：

```pseudo
BEGIN TRANSACTION:
    UPDATE orders SET status = "completed" ...
    INSERT outbox_events(
        event_key = "order-confirmation:" + orderId,
        event_type = "send_order_confirmation",
        aggregate_type = "order",
        aggregate_id = orderId,
        payload = orderEmailPayload
    ) ON DUPLICATE KEY DO NOTHING
COMMIT
```

Outbox Worker 再呼叫 Resend／Push／IndexNow。這避免出現：

```text
DB 已 completed，但 process 在寄 Email 前 crash
```

---

# 8. 隔離級別與鎖的選擇表

| 場景 | 建議隔離 | 鎖 | 交易外工作 |
|---|---|---|---|
| 讀取待對帳訂單 | READ COMMITTED | `FOR UPDATE SKIP LOCKED`（支援時）或 lease claim | Stripe retrieve |
| 單筆履約 claim | READ COMMITTED | order row lock + lease | 供應商 create／query |
| 付款完成寫回 | READ COMMITTED | owner + version CAS | Email／Push |
| TGT Callback 入事件 | READ COMMITTED | unique event key | Callback worker |
| Callback 完成訂單 | READ COMMITTED | order row lock + event unique | Email／Push |
| Vizlync 產品 stage | READ COMMITTED | supplier lease | API fetch、批量寫 stage |
| Stage activate | READ COMMITTED | sync_run row lock | 通知／IndexNow |
| Legacy batch upsert | READ COMMITTED | supplier lease | API fetch |
| 報告／分析查詢 | READ COMMITTED | 不鎖或 read replica | 無 |

## 關於 `SKIP LOCKED`

如果目標 TiDB／MySQL 版本及 ORM 支援，可用：

```sql
SELECT id
FROM orders
WHERE status IN ('pending_payment','paid','processing')
  AND next_retry_at <= NOW()
ORDER BY createdAt
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

如果版本或 Drizzle 封裝不穩定，不要硬用；使用 lease claim table 會更可控。

---

# 9. 對帳批次掃描虛擬碼

```pseudo
CRON reconcileOrders():
    lock = acquireLease("reconcile:stripe-orders", workerId, 5 minutes)
    IF not lock.acquired:
        RETURN already_running

    TRY:
        LOOP:
            candidates = DB.queryStaleOrders(limit = 50)

            IF candidates is empty:
                BREAK

            FOR order IN candidates:
                // claim 是短交易，批次掃描不持有全局 DB transaction
                result = reconcileOneOrder(order.id, workerId)

                IF result == BUSY:
                    CONTINUE
                IF result == RETRY_LATER:
                    continue
                IF result == FAILED:
                    ALERT.ownerIfThresholdReached(order)

            refreshLease(lock)

    FINALLY:
        releaseLease(lock)
```

若要多 worker 並行處理，使用 per-order lease，而不是把整個 reconciliation global lock 設成唯一執行；global lock 可防止 Cron 重疊，per-order lock 仍是最後一道防線。

---

# 10. Deadlock、Lock Timeout 及交易失敗

## 10.1 Deadlock 重試

資料庫 Deadlock 是交易層暫時錯誤，可重試整個短交易，而不是只重試其中一條 SQL：

```pseudo
FUNCTION runShortTransaction(operation, maxAttempts = 3):
    FOR attempt FROM 1 TO maxAttempts:
        TRY:
            BEGIN TRANSACTION READ COMMITTED
            result = operation()
            COMMIT
            RETURN result
        CATCH error:
            ROLLBACK

            IF error.code IN ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]:
                sleep(calculateBackoff(attempt, 50ms, 1000ms))
                CONTINUE

            THROW error

    THROW RetryExhausted
```

## 10.2 不應重試的交易錯誤

- schema／migration 不存在。
- unique constraint 失敗且不是預期冪等 duplicate。
- 欄位型別錯誤。
- invalid JSON。
- 權限不足。
- 不合法的 supplier／order ID。

這些應告警並停止，不應無限重試。

## 10.3 Lock expiry 後的舊 worker

舊 worker 可能在 lease 到期後才返回。它不能直接寫回資料：

```pseudo
IF not CAS update affected one row:
    LOG("stale worker result ignored")
    reload current order
    RETURN STALE_RESULT
```

這是 lease lock 必須配合 CAS 的原因。

---

# 11. 目前架構的落地優先次序

## 第一階段：低改動高收益

1. `orders` 增加 `fulfillment_owner`、`fulfillment_lock_until`、`fulfillment_attempts`。
2. Stripe Webhook、成功頁及對帳共用一個 `claimFulfillment()`。
3. 所有 completed／processing 寫回加入 owner 或 version 條件。
4. 加入 `sync:vizlync-products` 及 `sync:tgt-products` database lease lock。
5. 將 Email／Push 失敗與 order status 分離。

## 第二階段：同步一致性

1. 建立 `sync_runs`。
2. 同步開始先取得 supplier lock。
3. `sync_history` 加入 run ID、worker ID、duration 及 snapshot count。
4. 阻止可疑的 0 筆／極少產品快照觸發全量停用。
5. 將 owner notification／IndexNow 改為 outbox。

## 第三階段：高可靠履約

1. 建立 `stripe_events`。
2. 建立 `supplier_events`，尤其是 TGT Callback。
3. 建立 `fulfillment_attempts` 及 dead-letter queue。
4. Vizlync 輪詢改為背景 worker。
5. TGT Callback 改為快速入隊後回應。
6. 引入 metrics、trace ID 及供應商 API duration 監控。

---

# 12. 驗收測試情境

## 付款對帳

- Webhook 與 reconcile 同時處理同一 order，只有一次供應商 create。
- Webhook 與成功頁同時處理，第二個入口收到 `already_fulfilled` 或 `in_progress`。
- Stripe Session 為 test，但正式環境 live key，對帳正確 skip。
- Stripe 已付款但供應商 API timeout，訂單進 processing，不重複盲目 create。
- worker 在 lease 期間 crash，另一 worker 在 lease expiry 後可接管。
- 舊 worker 在新 worker 接管後返回，CAS 令其結果被忽略。
- 電郵失敗，訂單仍 completed，重試只寄電郵不重建 eSIM。

## 產品同步

- 兩個同一 supplier sync 同時觸發，只有一個成功取得 lease。
- Vizlync sync 與 TGT sync 可並行，兩者 lock key 不相同。
- 同一 sync retry 使用相同 run key，不產生兩次 active snapshot。
- 供應商 API 返回 0 筆，系統不把所有本地產品停用。
- 同步寫入中前台讀取，不會看到未 commit 資料。
- 舊 run 晚完成時，不能覆蓋較新的 `lastSyncRunId`。
- upsert 中單一產品失敗，其他產品可完成並正確記錄 failedCount。

---

# 13. 結論

付款對帳及自動同步不應依賴單一「全局 mutex」或單次成功的 HTTP request。較穩健的設計是：

```text
短 DB transaction
  + supplier／order lease lock
  + row lock 或 compare-and-set
  + 外部 API 在交易外執行
  + unique idempotency key
  + outbox／背景工作
  + dead-letter 及人工補救
```

推薦的交易策略是：

- **付款對帳：** `READ COMMITTED` + 單筆 order lease + `SELECT ... FOR UPDATE` + version CAS。
- **供應商履約：** 不把外部 API 放進 DB transaction；用 supplier order ID、channel order number 及 idempotency key 防重。
- **產品同步：** supplier-level lease 防重疊；高要求環境使用 staging snapshot，最後用短交易切換 live version。
- **通知及 IndexNow：** 以 transactional outbox 與履約／同步資料提交分離。
- **故障恢復：** lease expiry 允許接管，CAS 防止舊 worker 覆蓋新結果，dead-letter 交給後台人工處理。
