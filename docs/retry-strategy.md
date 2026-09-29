# eSIM 輪詢機制及 TGT 非同步 Callback
## 異常重試策略、錯誤處理及虛擬碼

> 本文件針對兩個履約場景提供工程實作級別的處理方案：
>
> 1. Vizlync 建單後，eSIM 詳情尚未立即生成，需要輪詢 `GET /order/:orderId`。
> 2. TGT 建單後只返回 `orderNo`，QR Code 等資料由 TGT 透過 `/api/tgt/callback` 非同步送回。
>
> 「目前實作」描述現有專案行為；「建議強化」描述適合正式高流量環境的完整策略。

---

# 1. 核心設計原則

## 1.1 付款成功不等於 eSIM 已可交付

付款成功後，訂單必須拆成兩個獨立狀態：

```text
paymentStatus = paid
fulfillmentStatus = pending | processing | completed | failed
```

目前系統將履約狀態整合到 `orders.status`，語意如下：

- `paid`：Stripe 已付款，供應商履約尚未完成。
- `processing`：已建立供應商訂單，但資料仍在生成／等待 Callback／需要重試。
- `completed`：已取得足夠 eSIM 資料，可供客戶安裝。
- `failed`：已確認無法自動完成，需要重試或人工處理。

不要因為 API 回應 HTTP 200，就直接將訂單設為 `completed`。必須確認至少有：

- QR Code 或 LPA 字串。
- 或供應商可接受的完整啟用資料。
- 以及可追蹤的 supplier order ID。

## 1.2 錯誤要先分類，再決定是否重試

所有異常先歸類為：

| 類別 | 例子 | 是否自動重試 |
|---|---|---|
| 暫時網絡錯誤 | timeout、DNS、connection reset | 是，指數退避 |
| 供應商 429／限流 | rate limit、too many requests | 是，尊重 `Retry-After` |
| 供應商 5xx | upstream error、gateway error | 是，有限次數 |
| 資料尚未生成 | HTTP 200 但無 QR／LPA | 是，輪詢退避 |
| 供應商業務處理中 | TGT 4068、processing | 是，延後查詢 |
| 找不到訂單 | 404、TGT 5032 | 視情況；不要密集重試 |
| 錯誤產品／參數 | invalid product、invalid order | 否，標記 failed |
| 認證失效 | 401、token expired | 先刷新 token，最多重試一次 |
| 簽名錯誤 | TGT Callback sign mismatch | 否，拒絕更新並告警 |
| 資料完整性錯誤 | 缺少 orderNo／channelOrderNo | 否，進死信／人工隊列 |
| 電郵失敗 | Resend 失敗 | 與履約分離，另行重試 |

---

# 2. 建議資料模型

目前 `orders` 已有 `status`、`supplierOrderId`、`esimData` 及 `errorMessage`。為了支援完整重試及排錯，建議增加以下欄位：

```text
fulfillment_status       pending | processing | completed | failed | dead_letter
fulfillment_attempts     integer default 0
last_fulfillment_error   text
next_retry_at            timestamp nullable
last_polled_at           timestamp nullable
poll_attempts            integer default 0
callback_received_at     timestamp nullable
callback_attempts        integer default 0
completed_at             timestamp nullable
locked_at                timestamp nullable
locked_by                varchar nullable
```

另建議增加兩張事件／工作表：

```text
fulfillment_attempts
- id
- order_id
- supplier
- operation              create_order | poll_detail | callback | send_email
- attempt_no
- request_id
- supplier_order_id
- result                 success | retry | failed | ignored
- http_status
- supplier_code
- error_class
- error_message
- created_at

supplier_events
- id
- supplier
- event_key              unique
- event_type
- channel_order_no
- supplier_order_no
- payload_hash
- signature_valid
- status                  received | processed | duplicate | rejected | failed
- payload_json
- received_at
- processed_at
```

`payload_json` 應避免保存付款卡資料及不必要的敏感資訊；QR／LPA 等資料需要按正式環境的存取政策保護。

---

# 3. 共用錯誤類型及重試工具

## 3.1 虛擬碼：錯誤分類

```pseudo
ENUM ErrorClass:
    NETWORK_TRANSIENT
    RATE_LIMITED
    UPSTREAM_5XX
    AUTH_EXPIRED
    NOT_READY
    SUPPLIER_PROCESSING
    NOT_FOUND
    INVALID_REQUEST
    BUSINESS_REJECTED
    SIGNATURE_INVALID
    DATA_INCOMPLETE
    PERMANENT_UNKNOWN

FUNCTION classifyHttpError(error):
    IF error is timeout OR error.code IN [ECONNRESET, ECONNREFUSED, ENOTFOUND]:
        RETURN NETWORK_TRANSIENT

    status = error.httpStatus

    IF status == 401:
        RETURN AUTH_EXPIRED
    IF status == 404:
        RETURN NOT_FOUND
    IF status == 429:
        RETURN RATE_LIMITED
    IF status >= 500:
        RETURN UPSTREAM_5XX
    IF status >= 400:
        RETURN INVALID_REQUEST

    RETURN PERMANENT_UNKNOWN

FUNCTION classifyVizlyncResponse(response):
    IF response is null:
        RETURN DATA_INCOMPLETE

    IF response.code IN ["PROCESSING", "PENDING", "PROVISIONING"]:
        RETURN NOT_READY

    IF response.orderId exists AND
       response.lpaString is empty AND
       response.qrCode is empty AND
       response.iccid is empty:
        RETURN NOT_READY

    IF response contains supplier business error:
        RETURN BUSINESS_REJECTED

    RETURN null

FUNCTION classifyTgtResponse(response):
    IF response.subCode IN ["4068", "5002"]:
        RETURN SUPPLIER_PROCESSING

    IF response.subCode IN ["5032"]:
        RETURN NOT_FOUND

    IF response.code != "0000":
        IF response.subCode IN ["1003", "2003", "0429", "5000"]:
            RETURN BUSINESS_REJECTED
        RETURN PERMANENT_UNKNOWN

    RETURN null
```

## 3.2 虛擬碼：指數退避

```pseudo
FUNCTION calculateBackoff(attempt, baseMs, maxMs, jitterRatio = 0.20):
    // attempt starts from 1
    exponential = MIN(maxMs, baseMs * (2 ^ (attempt - 1)))
    jitter = RANDOM(-exponential * jitterRatio,
                    +exponential * jitterRatio)
    RETURN MAX(0, ROUND(exponential + jitter))

FUNCTION retryAfterMs(httpResponse):
    header = httpResponse.headers["retry-after"]
    IF header is missing:
        RETURN null
    IF header is integer seconds:
        RETURN integer(header) * 1000
    IF header is HTTP date:
        RETURN MAX(0, parseDate(header) - NOW())
    RETURN null
```

建議預設：

| 場景 | base | max | 次數／時間 |
|---|---:|---:|---|
| Vizlync 詳情尚未生成 | 3 秒 | 30 秒 | 5 次，約 15 秒至 2 分鐘內完成 |
| Vizlync network／5xx | 2 秒 | 30 秒 | 3–5 次 |
| TGT token refresh | 0 秒 | 0 秒 | 只刷新後重試 1 次 |
| TGT 查詢 processing | 5 秒 | 60 秒 | 由背景工作重試，不阻塞 Callback |
| TGT Callback 寫 DB | 1 秒 | 30 秒 | 3–5 次，必須快速回應供應商 |
| Email 發送 | 5 秒 | 15 分鐘 | 由 Email Retry Job 處理 |

付款履約的「建立供應商訂單」與「查詢詳情」應使用不同 retry budget：建單不能無限重試，避免未知結果下重複下單；查詢詳情則可較安全地重試。

---

# 4. Vizlync eSIM 詳情輪詢策略

## 4.1 目前流程

目前 `server/stripe.ts` 的 Vizlync 流程：

1. 呼叫 `POST /api/v1/order`。
2. 如 response 沒有 `lpaString`，最多輪詢 5 次。
3. 每次等待 3 秒。
4. 呼叫 `GET /api/v1/order/:orderId`。
5. 取得 `lpaString` 或 `iccid` 後停止。
6. 寫入 `esimData` 並設 `completed`。
7. 若仍未取得，保存目前資料並記錄警告／processing 狀態。

這個策略足以處理一般幾秒內完成的 Vizlync 建卡，但輪詢在付款處理函數內同步執行，若供應商長時間未生成資料，會令同一個 request 等待較久。因此正式高流量環境建議將「建立訂單」與「查詢詳情」拆成背景工作。

## 4.2 建議的狀態機

```text
PAID
  → CREATE_SENT
  → CREATE_CONFIRMED
  → DETAIL_PENDING
  → DETAIL_POLLING
  → READY

任何節點：
  → RETRY_WAITING（可恢復錯誤）
  → FAILED（永久業務錯誤）
  → DEAD_LETTER（超過總時間／次數，需人工）
```

## 4.3 建單的關鍵風險

如果 `POST /order` 發出後網絡 timeout，不能直接判斷「供應商沒有建單」。可能情況是：

```text
Request 已到達 Vizlync
Vizlync 已成功建單
但 response 在回程途中遺失
```

因此建立訂單失敗時的處理順序應為：

1. 使用固定本地 `orderId` 作 idempotency key（如供應商支援）。
2. 優先以本地已保存 supplier order ID 查詢。
3. 如果沒有 supplier order ID，使用供應商提供的 channel reference 查詢。
4. 只有確認不存在時才重新 create。
5. 禁止對未知結果的 create request 盲目連續重試。

## 4.4 Vizlync 輪詢虛擬碼：同步兼容版本

```pseudo
FUNCTION fulfillVizlyncOrder(orderId, productId, startDate):
    order = DB.getOrderForUpdate(orderId)

    IF order.status == completed AND hasUsableEsim(order.esimData):
        RETURN ALREADY_COMPLETED

    IF order.supplier != "vizlync":
        RETURN WRONG_SUPPLIER

    acquireLock(orderId, "vizlync-fulfillment")

    TRY:
        DB.update(orderId, {
            status: "processing",
            fulfillment_status: "processing"
        })

        supplierOrderId = order.vizlyncOrderId OR order.supplierOrderId

        IF supplierOrderId is empty:
            createResult = callWithOneAuthRefresh(
                operation = "vizlync.createOrder",
                request = POST "/order" {
                    productId,
                    startDate
                }
            )

            IF createResult is transient error:
                // 不確定供應商是否已成功建單
                markRetry(orderId,
                    errorClass = NETWORK_TRANSIENT,
                    message = "create response unknown",
                    retryOperation = "resolve-vizlync-order")
                RETURN RETRY_LATER

            IF createResult is permanent business error:
                markFailed(orderId, createResult.error)
                RETURN FAILED

            supplierOrderId = createResult.orderId
            DB.update(orderId, {
                vizlyncOrderId: supplierOrderId,
                supplierOrderId: supplierOrderId
            })

            IF hasUsableEsim(createResult):
                RETURN completeVizlync(orderId, createResult)

        result = pollVizlyncDetail(orderId, supplierOrderId)

        IF result.status == "ready":
            RETURN completeVizlync(orderId, result.esimData)

        IF result.status == "retry":
            markRetry(orderId, result.errorClass, result.message,
                      retryOperation = "poll-vizlync-detail")
            RETURN RETRY_LATER

        IF result.status == "failed":
            markFailed(orderId, result.message)
            RETURN FAILED

    CATCH error:
        classified = classifyHttpError(error)
        IF isRetryable(classified):
            markRetry(orderId, classified, error.message,
                      retryOperation = "vizlync-fulfillment")
            RETURN RETRY_LATER
        ELSE:
            markFailed(orderId, error.message)
            RETURN FAILED
    FINALLY:
        releaseLock(orderId, "vizlync-fulfillment")
```

## 4.5 Vizlync 詳情輪詢虛擬碼

```pseudo
FUNCTION pollVizlyncDetail(orderId, supplierOrderId):
    MAX_ATTEMPTS = 5
    BASE_DELAY_MS = 3000
    MAX_DELAY_MS = 30000
    startedAt = NOW()
    lastError = null

    FOR attempt FROM 1 TO MAX_ATTEMPTS:
        IF attempt > 1:
            delay = calculateBackoff(
                attempt - 1,
                baseMs = BASE_DELAY_MS,
                maxMs = MAX_DELAY_MS
            )
            sleep(delay)

        IF DB.orderIsCompleted(orderId):
            RETURN { status: "ready", esimData: DB.getEsimData(orderId) }

        TRY:
            response = HTTP.GET(
                "/api/v1/order/" + supplierOrderId,
                timeout = 15000,
                requestId = newRequestId()
            )

            errorClass = classifyVizlyncResponse(response)

            IF errorClass == null AND hasUsableEsim(response):
                RETURN {
                    status: "ready",
                    esimData: response
                }

            IF errorClass == NOT_READY:
                lastError = "Vizlync order exists but eSIM data not ready"
                DB.recordAttempt(orderId, "poll_detail", attempt,
                                 result = "retry",
                                 errorClass = NOT_READY)
                CONTINUE

            IF errorClass == NOT_FOUND:
                // 建單後立刻查詢可能有 eventual consistency
                IF elapsed(startedAt) < 60 seconds:
                    lastError = "order not visible yet"
                    CONTINUE
                RETURN {
                    status: "failed",
                    message: "Vizlync order not found after consistency window"
                }

            IF response has business error:
                RETURN {
                    status: "failed",
                    message: response.errorMessage
                }

        CATCH error:
            classified = classifyHttpError(error)
            lastError = error.message

            IF classified == AUTH_EXPIRED AND attempt == 1:
                refreshVizlyncCredentialsIfSupported()
                CONTINUE

            IF classified IN [NETWORK_TRANSIENT, RATE_LIMITED, UPSTREAM_5XX]:
                DB.recordAttempt(orderId, "poll_detail", attempt,
                                 result = "retry",
                                 errorClass = classified,
                                 errorMessage = error.message)
                CONTINUE

            IF classified == NOT_FOUND AND elapsed(startedAt) < 60 seconds:
                CONTINUE

            RETURN {
                status: "failed",
                message: error.message
            }

    RETURN {
        status: "retry",
        errorClass: NOT_READY,
        message: lastError ?? "eSIM details not ready after polling budget"
    }
```

## 4.6 Vizlync 背景重試虛擬碼

輪詢超過第一輪 budget 後，不應在客戶付款請求內無限等待。應建立背景工作：

```pseudo
FUNCTION scheduleVizlyncDetailRetry(orderId, attempt):
    retryCount = DB.getPollAttempts(orderId)

    IF retryCount >= 12 OR age(orderId) > 15 minutes:
        DB.update(orderId, {
            status: "failed",
            fulfillment_status: "dead_letter",
            errorMessage: "Vizlync eSIM details timeout",
            next_retry_at: null
        })
        ALERT.owner("Vizlync order requires manual review", orderId)
        RETURN

    delay = calculateBackoff(retryCount, 5 seconds, 60 seconds)

    DB.update(orderId, {
        status: "processing",
        fulfillment_status: "retry_waiting",
        poll_attempts: retryCount + 1,
        next_retry_at: NOW() + delay,
        errorMessage: "Waiting for Vizlync eSIM details"
    })

    QUEUE.enqueue("poll-vizlync-detail", orderId,
                  runAt = NOW() + delay)
```

---

# 5. TGT 非同步 Callback 策略

## 5.1 TGT 的正確處理模型

TGT 建單 API 只返回 `orderNo`，不應在 Stripe Webhook request 內等待 QR Code。正確模型：

```text
Stripe payment success
  → TGT POST /order/create
  → 本地 processing
  → HTTP callback received later
  → verify + persist eSIM
  → completed
  → notify + email
```

TGT Callback 是供應商主動通知，不是平台主動輪詢的替代品；兩者可並存：

- Callback：正常快速交付。
- TGT order query：Callback 延遲、漏送或客服查詢時的補救。
- Callback monitor：監察 processing 超時訂單。

## 5.2 Callback Handler 的時間限制

TGT 要求 10 秒內回應。Callback handler 不應在回應前做大量工作，例如：

- 慢速電郵發送。
- 多次供應商 API 查詢。
- 大量 Push 發送。
- 長交易鎖。

建議流程：

```text
驗證基本結構
  → 驗證簽名
  → 記錄 supplier_events
  → 快速回 200／0000
  → 背景 worker 處理 DB、通知及電郵
```

目前程式會在 Callback handler 內更新 DB、通知及寄電郵；若要達到更高可靠性，應將後半段移至 queue。

## 5.3 Callback 事件冪等 Key

優先使用：

```text
event.id / idempotencyKey
```

如果 TGT 沒有穩定 event ID，可組合：

```text
supplier + eventType + orderNo + channelOrderNo + payloadHash
```

同一事件必須只產生一次「完成履約」副作用：

- 只更新一次 `orders.status=completed`。
- 只寄一次確認電郵。
- 只建立一次通知。
- 只發一次推播。

## 5.4 TGT Callback 虛擬碼：快速接收層

```pseudo
HTTP POST /api/tgt/callback(request, response):
    receivedAt = NOW()
    rawPayload = request.body

    IF not hasBasicShape(rawPayload):
        DB.recordEvent(
            eventKey = hash(rawPayload),
            status = "rejected",
            error = "missing data.orderInfo"
        )
        // 對無效事件也可回 acknowledgement，避免供應商無限重試
        RETURN response.json({ code: "0000", msg: "success" })

    event = parseTgtEvent(rawPayload)
    eventKey = makeStableEventKey(event)

    IF DB.supplierEventExists(eventKey):
        DB.markEventDuplicate(eventKey)
        RETURN response.json({ code: "0000", msg: "success" })

    signatureValid = verifyTgtCallbackSign(rawPayload, event.sign)

    IF not signatureValid:
        DB.insertSupplierEvent({
            eventKey,
            supplier: "tgt",
            eventType: event.eventType,
            channelOrderNo: event.channelOrderNo,
            signatureValid: false,
            status: "rejected",
            payloadHash: sha256(rawPayload)
        })
        ALERT.security("TGT callback signature mismatch", event)

        // 正式環境：按安全政策拒絕或 acknowledgement
        RETURN response.status(401).json({
            code: "SIGNATURE_INVALID",
            msg: "invalid signature"
        })

    orderId = parseLocalOrderId(event.channelOrderNo)

    IF orderId is null:
        DB.insertSupplierEvent({
            eventKey,
            status: "failed",
            error: "invalid channelOrderNo"
        })
        ALERT.owner("TGT callback cannot map local order", event)
        RETURN response.json({ code: "0000", msg: "success" })

    DB.insertSupplierEvent({
        eventKey,
        supplier: "tgt",
        eventType: event.eventType,
        channelOrderNo: event.channelOrderNo,
        supplierOrderNo: event.orderNo,
        signatureValid: true,
        status: "received",
        payloadJson: safePayload(rawPayload),
        receivedAt
    })

    QUEUE.enqueue("process-tgt-callback", {
        eventKey,
        orderId,
        event
    })

    // 必須在 10 秒內，不等待 DB 大操作、Email 或 Push
    RETURN response.json({ code: "0000", msg: "success" })
```

## 5.5 TGT Callback 虛擬碼：背景處理層

```pseudo
WORKER processTgtCallback(job):
    event = DB.getSupplierEventForUpdate(job.eventKey)

    IF event.status == "processed":
        RETURN DUPLICATE_SUCCESS

    IF event.eventType != 1:
        DB.markEvent(event.key, "ignored")
        RETURN IGNORED_EVENT

    order = DB.getOrderForUpdate(job.orderId)

    IF order is null:
        DB.markEvent(event.key, "failed", "local order not found")
        ALERT.owner("TGT callback order not found", job)
        RETURN FAILED

    IF order.supplier != "tgt":
        DB.markEvent(event.key, "failed", "supplier mismatch")
        ALERT.owner("TGT callback supplier mismatch", job)
        RETURN FAILED

    IF order.status == "completed" AND hasUsableEsim(order.esimData):
        DB.markEvent(event.key, "duplicate")
        RETURN ALREADY_COMPLETED

    IF event.orderNo is empty OR event.channelOrderNo is empty:
        DB.markEvent(event.key, "failed", "missing order identifiers")
        ALERT.owner("TGT callback missing identifiers", job)
        RETURN FAILED

    esimData = normalizeTgtCallbackToEsimData(job.event.orderInfo)

    IF not hasUsableEsim(esimData):
        // Callback 到達但資料尚未完整，不能標記 completed
        DB.update(order.id, {
            status: "processing",
            errorMessage: "TGT callback received without usable QR/LPA"
        })
        DB.markEvent(event.key, "failed", "incomplete esim data")
        QUEUE.enqueue("query-tgt-order-after-callback", order.id,
                      runAt = NOW() + 30 seconds)
        RETURN RETRY_LATER

    DB.transaction:
        DB.update(order.id, {
            status: "completed",
            fulfillment_status: "completed",
            supplierOrderId: job.event.orderInfo.orderNo,
            esimData,
            callback_received_at: NOW(),
            completed_at: NOW(),
            errorMessage: null
        })
        DB.markEvent(event.key, "processed", processedAt = NOW())

    // 副作用應有獨立冪等 key
    enqueueOnce("send-order-confirmation", order.id)
    enqueueOnce("create-order-notification", order.id)
    enqueueOnce("send-order-push", order.id)

    RETURN SUCCESS
```

## 5.6 Callback 資料不足的處理

TGT Callback 可能有 `orderNo`，但 `qrCode` 尚未出現，或只送部分欄位。此時：

```text
不要 → status=completed
不要 → 寄出「eSIM 已就緒」電郵
要做 → 保存原始 event
要做 → status=processing
要做 → 排程 query order/orders
要做 → 超時後告警／人工處理
```

查詢補救：

```pseudo
FUNCTION recoverTgtOrder(orderId):
    order = DB.getOrder(orderId)

    IF order.status == completed AND hasUsableEsim(order.esimData):
        RETURN already_completed

    IF order.supplierOrderId is empty:
        RETURN dead_letter("missing TGT orderNo")

    result = retryTgtApi(
        POST "/eSIMApi/v2/order/orders",
        body = { channelOrderNo: "SU" + orderId }
    )

    IF result.notFound:
        IF age(order) < 10 minutes:
            RETURN retry_later("eventual consistency")
        RETURN dead_letter("TGT order not found")

    IF result.processing OR result.profileStatus in ["ungenerated", "nodownload"]:
        RETURN retry_later("TGT profile not ready")

    IF hasUsableEsim(result):
        processAsSyntheticCallback(orderId, result)
        RETURN completed

    RETURN retry_later("TGT data incomplete")
```

---

# 6. 兩種供應商的錯誤處理矩陣

## 6.1 Vizlync

| 異常 | 本地狀態 | 動作 |
|---|---|---|
| `POST /order` timeout | `processing`／retry_waiting | 先以 reference 查詢，不立即重建 |
| `POST /order` 4xx invalid product | `failed` | 不重試，通知管理員 |
| `POST /order` 5xx | `processing` | 有限次數重試；未知結果先查詢 |
| `GET /order/:id` 404（建單後即時） | `processing` | 等待 eventual consistency，最多 60 秒 |
| `GET /order/:id` 404（長時間） | `dead_letter` | 管理員檢查 supplier order |
| HTTP 200 但無 QR／LPA | `processing` | 指數退避輪詢 |
| 有 `orderId`，無 eSIM 15 分鐘 | `dead_letter` | 發 owner alert，後台補救 |
| 電郵失敗 | `completed` + `emailSent=false` | 另行 Email Retry，不重建 eSIM |

## 6.2 TGT Callback

| 異常 | Callback 回應 | 本地動作 |
|---|---|---|
| JSON 結構不完整 | acknowledgement 或 4xx，按政策 | 記 rejected event |
| Signature mismatch | 正式環境拒絕；Sandbox 可記錄後 ack | 安全告警，不改訂單 |
| `eventType != 1` | `0000` | 記 ignored，不作 QR 履約 |
| channelOrderNo 不可解析 | `0000` | 記 failed，通知管理員 |
| 本地訂單不存在 | `0000` | 記 failed，進人工隊列 |
| 重複 Callback | `0000` | 以 event key 去重，不重寄電郵 |
| 有 orderNo 無 QR | `0000` | processing，排程 query recovery |
| DB 暫時失敗 | `0000` 或讓供應商重試，需明確政策 | supplier event + background retry |
| Push／Email 失敗 | `0000` | 訂單仍 completed，獨立重試 |

---

# 7. Callback 與電郵的副作用冪等

履約完成後不要直接在多個入口各自執行寄信。應使用唯一工作 Key：

```pseudo
FUNCTION enqueueOnce(jobType, orderId):
    key = jobType + ":" + orderId

    INSERT INTO jobs(job_key, job_type, order_id, status)
    VALUES(key, jobType, orderId, "queued")
    ON DUPLICATE KEY DO NOTHING
```

電郵 Worker：

```pseudo
WORKER sendOrderConfirmation(orderId):
    order = DB.getOrder(orderId)

    IF order.emailSent == true:
        RETURN already_sent

    IF order.guestEmail is empty:
        DB.createEmailLog(orderId, status="failed",
                          error="no customer email")
        RETURN no_email

    IF not hasUsableEsim(order.esimData):
        RETURN retry_later("eSIM data not ready")

    result = Resend.send(templateFor(order.preferredLang))

    IF result.success:
        DB.transaction:
            DB.update(orderId, { emailSent: true })
            DB.insertEmailLog(orderId, status="sent")
        RETURN sent

    DB.insertEmailLog(orderId, status="failed", error=result.error)

    IF retryableEmailError(result):
        QUEUE.retryWithBackoff("send-order-confirmation", orderId)
    ELSE:
        ALERT.owner("Confirmation email permanently failed", orderId)

    RETURN failed
```

重要：電郵失敗不能把 `orders.status` 改回 failed，也不能重新呼叫供應商 create API。

---

# 8. 監控、死信及人工介入

## 8.1 建議監控指標

- Vizlync 建單成功率。
- Vizlync 取得 QR Code 的平均／P95 時間。
- Vizlync 超過 5 次仍未 ready 的數量。
- TGT processing 超過 5 分鐘的訂單數量。
- TGT Callback signature mismatch 次數。
- TGT Callback duplicate 次數。
- TGT callback → completed 延遲。
- Stripe paid 但本地未 completed 的數量。
- 對帳每次 `checked`／`fulfilled`／`errors`。
- Email sent／failed／retry 次數。
- 每個供應商 API 的 429／5xx 比例。

## 8.2 Dead-letter 條件

訂單進入 `dead_letter` 的條件建議包括：

```text
Vizlync：
- 建單後超過 15 分鐘仍無可用 eSIM 資料
- 重試超過 12 次
- 供應商明確返回永久業務錯誤

TGT：
- processing 超過 30 分鐘仍無 Callback
- query order 多次找不到
- Callback 資料重複不完整
- 無法以 channelOrderNo 對應本地訂單
```

Dead-letter 不代表付款失敗，而是代表「自動化流程不能再安全地自行嘗試」。後台應顯示：

- 訂單號碼。
- 供應商訂單號碼。
- 最後錯誤。
- 最後嘗試時間。
- 累計次數。
- 「重新查詢」、「補發 eSIM」、「標記完成」、「聯絡客戶」操作。

## 8.3 TGT Callback 監察排程虛擬碼

```pseudo
CRON monitorTgtProcessingOrders():
    orders = DB.findOrders(
        supplier = "tgt",
        status = "processing",
        createdBefore = NOW() - 5 minutes,
        createdAfter = NOW() - 24 hours,
        limit = 100
    )

    FOR order IN orders:
        IF order.next_retry_at > NOW():
            CONTINUE

        IF order.callback_received_at is null:
            IF age(order) < 15 minutes:
                QUEUE.enqueue("query-tgt-order", order.id,
                              runAt = NOW() + 60 seconds)
            ELSE:
                ALERT.owner("TGT callback delayed", order.id)
                DB.update(order.id, {
                    fulfillment_status: "retry_waiting",
                    next_retry_at: NOW() + 5 minutes,
                    errorMessage: "callback not received"
                })

        ELSE IF not hasUsableEsim(order.esimData):
            QUEUE.enqueue("query-tgt-order", order.id)

        ELSE:
            // callback 已收到且資料可用，但背景處理可能中斷
            QUEUE.enqueueOnce("process-tgt-callback-recovery", order.id)
```

---

# 9. 付款對帳與輪詢／Callback 的交互規則

對帳工作只負責確認 Stripe 是否付款，不應直接假設供應商資料已準備好：

```pseudo
IF Stripe payment_status == paid:
    IF supplier == vizlync:
        run Vizlync fulfillment
        // 詳情未 ready → processing + poll retry

    IF supplier == tgt:
        run TGT create only if no supplierOrderId
        // create success → processing + wait callback
```

因此：

- 對帳重跑不應重複 Vizlync create。
- 對帳重跑不應重複 TGT create。
- TGT Callback 到達後不應再次檢查 Stripe 才能完成，因為付款已由前置流程確認。
- 電郵重試不應重新觸發供應商履約。
- 管理員補發前應先查詢現有 supplier order，避免重複購買供應商產品。

---

# 10. 完整端到端虛擬碼

```pseudo
FUNCTION onStripeCheckoutCompleted(session):
    orderId = session.metadata.order_id
    order = DB.getOrderByStripeSession(session.id)

    IF order is completed:
        RETURN already_completed

    payment = Stripe.retrieveSession(session.id)
    IF payment.payment_status != "paid":
        RETURN unpaid

    DB.update(orderId, {
        status: "paid",
        paymentIntentId: payment.payment_intent,
        guestEmail: resolveCustomerEmail(payment)
    })

    supplier = trustedSupplierFromDBOrValidatedMetadata(order)

    IF supplier == "vizlync":
        result = fulfillVizlyncOrder(
            orderId,
            order.productId,
            order.startDate
        )

        IF result == RETRY_LATER:
            scheduleVizlyncDetailRetry(orderId, order.poll_attempts)

        RETURN result

    IF supplier == "tgt":
        existingSupplierOrder = DB.getSupplierOrderId(orderId)

        IF existingSupplierOrder is empty:
            result = createTgtOrderSafely(orderId)
            IF result is retryable:
                QUEUE.enqueue("retry-tgt-create", orderId,
                              runAt = NOW() + backoff())
                RETURN RETRY_LATER

            IF result is permanent failure:
                DB.markFailed(orderId, result.error)
                ALERT.owner("TGT create failed", orderId)
                RETURN FAILED

            DB.update(orderId, {
                status: "processing",
                supplierOrderId: result.orderNo
            })

        // Do not wait for QR in this request
        QUEUE.enqueue("monitor-tgt-callback", orderId)
        RETURN PROCESSING
```

```pseudo
FUNCTION createTgtOrderSafely(orderId):
    order = DB.getOrderForUpdate(orderId)
    idempotencyKey = "su-order-" + orderId

    IF order.supplierOrderId exists:
        RETURN { status: "already_created", orderNo: order.supplierOrderId }

    result = HTTP.POST(
        "/eSIMApi/v2/order/create",
        {
            productCode: order.rawData.productCode,
            channelOrderNo: "SU" + orderId,
            idempotencyKey,
            startDate: order.startDate
        }
    )

    IF result.success AND result.orderNo exists:
        DB.update(orderId, {
            supplierOrderId: result.orderNo,
            status: "processing"
        })
        RETURN { status: "created", orderNo: result.orderNo }

    IF result.timeout OR result.networkError:
        // Unknown whether TGT accepted request
        existing = TGT.queryByChannelOrderNo("SU" + orderId)
        IF existing.orderNo exists:
            DB.update(orderId, { supplierOrderId: existing.orderNo })
            RETURN { status: "recovered", orderNo: existing.orderNo }
        RETURN { status: "retryable", error: result.error }

    IF result.subCode is permanent:
        RETURN { status: "failed", error: result.message }

    RETURN { status: "retryable", error: result.message }
```

---

# 11. 最終建議

## 立即可維持的現有策略

- Vizlync：最多 5 次、每次 3 秒輪詢；失敗寫入 `processing` 及 `errorMessage`。
- TGT：create 後設 `processing`，等待 `/api/tgt/callback`。
- Callback：先驗證結構、簽名及 `eventType=1`，保存 QR／ICCID 後設 completed。
- Stripe：Webhook、成功頁確認及定時對帳共用 idempotent fulfillment handler。
- 電郵失敗與 eSIM 履約分離，使用 `email_logs` 及重試排程。

## 優先強化順序

1. 將 TGT Callback 改成「快速驗證／入隊／立即回應」，避免 10 秒 timeout。
2. 增加 `supplier_events`，以 event key 防止重複 Callback 副作用。
3. 將 Vizlync 詳情輪詢由同步 request 移至背景工作。
4. 對 Vizlync 建單 timeout 增加「先查詢、後重建」保護。
5. 為 TGT processing 超時訂單建立監察及自動 query recovery。
6. 增加 fulfillment attempt log、dead-letter 狀態及管理員重試面板。
7. 將 Email、Push、站內通知改為獨立冪等工作，不阻塞供應商履約。
8. 正式環境嚴格拒絕 TGT signature mismatch，並保存安全事件。
