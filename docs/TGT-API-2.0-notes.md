# TGT eSIM API 2.0 文件重點筆記

## 文件來源
- 檔案：`/home/ubuntu/upload/TGTTechnologyGlobal-eSIMAPI_2.0_EN(2).pdf`
- 文件名稱：**TGT Technology Global eSIM API 2.0**

## 目前已確認的重點

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| 產品查詢返回欄位 | 產品查詢回應包含 `productCode`、`productName`、`productType`、`countryCodeList`、`nccList`、`netPrice`、`periodType`、`usagePeriod`、`validityPeriod`、`dataLimited`、`dataTotal`、`dataUnit`、`activeType`、`operatorDesc`、`apnDesc` | 第 20 頁 |
| Card Feature Inquiry | `BaseUrl + /eSIMApi/v2/card` 可查卡類型能力 | 第 21 頁 |
| 續費能力 | `renewFlag` 布林值表示是否支援 renewal | 第 21-22 頁 |
| 即時用量能力 | `supportGetUsage` 布林值表示是否支援 real-time data queries | 第 22 頁 |
| 同時有效訂單上限 | `renewCount` 整數值表示同時間最多可有多少 active orders | 第 22 頁 |
| 下單模式 | Standard eSIM 下單端點為 `BaseUrl + /eSIMApi/v2/order/create`，並採用**非同步通知 callback 機制**，不是同步直接返回完整卡資料 | 第 22-23 頁 |
| Callback 要求 | 需預先配置 callback address；TGT 完成 eSIM 訂單後會主動推送完整 eSIM 卡資訊到 callback | 第 23 頁 |
| Retry / Idempotency | 重試時必須傳入相同 `idempotencyKey`，避免重複建立無效訂單；官方建議用 UUID v4，全域唯一，長度不超過 64 字元 | 第 23-24 頁 |
| 下單參數 | `productCode` 必填；`startDate` 視啟用方式而定；`email` 可填以便發送 QR code；`channelOrderNo` 必填；`idempotencyKey` 必填 | 第 24 頁 |

## 對目前網站可直接啟發的功能方向

| 功能方向 | 依據 | 初步價值 |
| --- | --- | --- |
| 在產品頁顯示「支援即時用量」標籤 | `supportGetUsage` | 幫助用戶知道哪些卡可即時查詢流量 |
| 在產品頁或詳情頁顯示「可續費 / 可加值」標籤 | `renewFlag` | 幫助用戶購買前判斷是否能續費 |
| 在下單流程支援寄送 QR Code 到客戶電郵 | 下單 `email` 參數 | 降低用戶找不到安裝碼的機率 |
| 強化 callback 與重試保護 | callback + `idempotencyKey` | 降低重複訂單與同步失敗風險 |

## 待續讀重點
- 訂單查詢與狀態同步 API
- 即時用量查詢 API 細節
- 續費 / top-up / renewal 的具體端點與參數
- 卡片管理、停用、啟用、失效等更多生命週期接口
- Callback payload 結構與錯誤碼

## 補充：訂單查詢與狀態欄位（第 35-39 頁）

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| 分頁訂單查詢 | `BaseUrl + /eSIMApi/v2/order/list` 可按 `pageNum`、`pageSize`、`orderStatus`、`orderTypeList`、`createdStartTime`、`createdEndTime`、`lang` 查詢訂單列表 | 第 35-36 頁 |
| 可用狀態 | `orderStatus` 支援 `NOTACTIVE`、`ACTIVATED`、`INUSE`、`USED`、`EXPIRED`、`ABANDON`、`TERMINATION` | 第 35、37 頁 |
| 可用訂單類型 | `orderTypeList` 可包含 `DAYPASS`、`DAILY`、`MULTIPLEMONTHS_AUTO`、`MULTIPLEMONTHS` | 第 35、37 頁 |
| 訂單列表返回的重要欄位 | `orderNo`、`productCode`、`productName`、`activatedStartTime`、`activatedEndTime`、`latestActivationTime`、`renewExpirationTime`、`createdTime`、`orderStatus`、`profileStatus`、`qrCode`、`channelOrderNo`、`orderType`、`cardInfo` | 第 36-38 頁 |
| profileStatus 值 | 文件列出的卡狀態包括 `unavailable`、`activated`、`deleted`、`downloaded`（activation unsuccessful）、`disabled`、`nodownload`、`downloadfail`、`failed`、`ungenerated` | 第 37 頁 |
| Card 資料 | `cardInfo` 內含 `iccid`、`imsi`、`msisdn`、`rentalContractNumber` | 第 38 頁 |
| 進一步查單 | 第 39 頁開始另有 `BaseUrl + /eSIMApi/v2/order/orders`，可按 `orderNo`、`channelOrder`、`ICCID` 取回更精準的訂單詳情 | 第 39 頁 |

## 從這批內容可延伸的 UX 功能

| 功能方向 | 依據 | 價值 |
| --- | --- | --- |
| 訂單頁加入更多狀態語意與說明 | `orderStatus`、`profileStatus` 可更精細區分 | 讓用戶明白是未下載、已下載未啟用、已失效、已停用還是已使用完 |
| 顯示實際啟用 / 到期 / 最近續費時間 | `activatedStartTime`、`activatedEndTime`、`renewExpirationTime` | 提升訂單時間資訊透明度 |
| 會員中心加入 ICCID / IMSI 詳情折疊區 | `cardInfo` 可返回更多卡資訊 | 方便客服與進階用戶排查問題 |
| 後台建立 TGT 訂單對帳 / 搜尋工具 | 可按 `orderNo`、`channelOrderNo`、`ICCID` 查詢 | 降低人工客服查單時間 |

## 補充：Top-up 訂單查詢（第 55-59 頁）

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| Top-up 訂單欄位 | top-up 訂單列表可返回 `iccid`、`orderNo`、`topupNumber`、`productName`、`productType`、`topupName`、`quantity`、`channelStartTime`、`channelEndTime`、`settlementCurrency`、`settlementAmount`、`channelCreatedTime` | 第 55-56、58-59 頁 |
| 查詢關聯 top-up 訂單 | `BaseUrl + /eSIMApi/v2/order/topups` 可按 `orderNo`、`iccid`、`topupNumber` 查詢與原訂單關聯的 top-up | 第 56-57 頁 |
| 查詢限制 | `orderNo`、`iccid`、`topupNumber` 三者至少要提供其中一個 | 第 57、59 頁 |
| 國際化名稱 | `productName` 會依 `lang` 返回對應語言名稱 | 第 55、58 頁 |

## 從 top-up 內容可延伸的 UX 功能

| 功能方向 | 依據 | 價值 |
| --- | --- | --- |
| 訂單詳情加入「加值紀錄」時間軸 | 可查到 `topupNumber`、建立時間、開始/結束時間 | 用戶能清楚看到每次加值何時生效、何時到期 |
| 會員中心顯示歷史加值總額 | `settlementAmount`、`settlementCurrency` | 提升用戶對花費與使用歷程的理解 |
| 建立原卡 + top-up 關聯視圖 | 可按 `orderNo` / `iccid` 查關聯 | 減少用戶以為買了多張不同卡的混淆 |
| 加值成功後自動刷新訂單卡 | 有明確 top-up 查詢接口 | 讓加值結果更即時、可驗證 |

## 補充：Webhook 回調與簽章（第 60-64 頁）

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| Callback 成功回應格式 | channel 收到 TGT callback 後，必須回傳 `application/json`，且固定格式為 `{ "code": "0000", "msg": "success" }` | 第 60-61 頁 |
| Callback 超時限制 | callback 需在 **10 秒內**回應，否則視為 timeout | 第 61 頁 |
| Retry 規則 | callback 失敗後，TGT 會**每 5 秒重試一次，最多 2 小時** | 第 61 頁 |
| 簽章驗證 | 需用請求參數重新計算 `sign`，只接受簽章匹配的請求 | 第 61 頁 |
| 簽章排序規則 | 排除 `sign` 與空值 / 空字串 / 二進位欄位，其他欄位按 ASCII 升序排序後直接串接 `key + value` | 第 61-62 頁 |
| 簽章演算法 | 最終字串格式為 `secret + concatenated_params + secret`，再做 **MD5** 產生 `sign` | 第 61-62 頁 |
| 安全建議 | 文件建議加入 `timestamp` 參數以限制簽章有效期 | 第 62 頁 |

## 從 webhook / 簽章可延伸的 UX 與系統能力

| 功能方向 | 依據 | 價值 |
| --- | --- | --- |
| 建立 TGT callback 事件日誌 | callback retry 與 10 秒限制 | 方便排查為何某些訂單未即時同步 |
| 建立後台「同步失敗重試」面板 | callback 可能失敗並重試 2 小時 | 客服能手動補救同步異常 |
| 建立即時狀態通知 | callback 能推送訂單完成 / 卡資料 | 用戶不必手動刷新即可收到 eSIM 就緒通知 |
| 強化安全審計 | MD5 sign + timestamp 驗證 | 降低假 callback 或參數篡改風險 |

## 補充：eSIM 建卡 / 續費 callback payload（第 65-69 頁）

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| 建卡 callback 事件 | `eventType = 1` 代表 Card Issuance Notification | 第 66-67 頁 |
| 續費 callback 事件 | `eventType = 2` 代表 Renewal Notification | 第 69 頁 |
| callback 主要欄位 | `idempotencyKey`、`orderInfo.orderNo`、`iccid`、`qrCode`、`channelOrderNo`、`imsi`、`msisdn`、`rentalContractNumber`、`activatedStartTime`、`activatedEndTime`、`latestActivationTime`、`renewExpirationTime`、`createdTime`、`orderType` | 第 67-69 頁 |
| 建卡錯誤碼 | 文件列出多個下單失敗碼，如 `5044`、`4012`、`4007`、`4009`、`4011`、`4013`、`4008`、`4016`、`4010`、`4000`、`4004` | 第 68-69 頁 |

## 從 callback payload 可延伸的 UX 功能

| 功能方向 | 依據 | 價值 |
| --- | --- | --- |
| eSIM 準備完成即時站內通知 / 推播 / 電郵 | 建卡 callback 已帶 `qrCode` 與卡資訊 | 用戶不用反覆進入訂單頁手動刷新 |
| 訂單詳情頁顯示更完整技術資訊 | `imsi`、`msisdn`、`renewExpirationTime` 等欄位可用 | 提升透明度，也方便客服排查 |
| 自動標記續費成功與新到期時間 | Renewal callback 已帶續費事件 | 用戶可即時看到續費是否成功 |
| 錯誤碼人性化翻譯 | 建卡錯誤碼表完整 | 將技術錯誤轉成「裝置不支援 eSIM」、「產品暫時下架」等可理解提示 |

## 補充：SMS Push eSIM callback 與通用錯誤碼（第 70-74 頁）

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| SMS Push eSIM 建卡 callback | `eventType = 3` 代表 SMS Push eSIM 的建卡通知 | 第 71-72 頁 |
| SMS Push callback 欄位 | 主要返回 `orderNo`、`channelOrderNo`、`activatedStartTime`、`activatedEndTime`、`createdTime`、`orderType=DAYPASS` | 第 72 頁 |
| 通用參數錯誤 | `1003` 代表參數空白、格式錯、長度錯等 | 第 73 頁 |
| 分頁錯誤 | `1004` 代表 page 參數錯誤，`pageNum >= 1` 且 `pageSize <= 100` | 第 74 頁 |
| 編碼錯誤 | `1005` 代表 request charset 錯誤，文件要求 UTF-8 | 第 74 頁 |
| 服務暫不可用 | `2000` 代表服務不可用，需稍後重試 | 第 74 頁 |
| 權限與 token 問題 | `2001` 介面權限不足；`2003` token invalid；`2004` token unknown | 第 74 頁 |
| 頻率限制 | `0429` 代表請求過於頻繁，有限流規則 | 第 74 頁 |
| 遠端服務錯誤 | `5000` 代表 remote service error，需參考具體業務錯誤碼 | 第 74 頁 |
| Sandbox 與 Production 差異 | sandbox 可測全部 API 但不產生真實卡費，且 eSIM 不能在實體裝置啟用；production 為商業環境、需預充值 | 第 74 頁 |

## 從錯誤碼與 FAQ 可延伸的 UX / 營運功能

| 功能方向 | 依據 | 價值 |
| --- | --- | --- |
| 將 TGT 技術錯誤轉為人話提示 | 1003/2003/0429/5000 等錯誤碼 | 降低用戶困惑，減少客服負擔 |
| 建立 API 限流與重試策略 | `0429`、`2000` | 避免高峰時段查詢失敗體驗差 |
| 後台加入 token 健康檢查 | `2003`、`2004` | 及早發現憑證失效，避免整站查詢失敗 |
| 會員端加入 DAYPASS 專屬顯示 | `orderType=DAYPASS` | 為日費卡提供更準確的到期、用量與狀態文案 |

## 補充：FAQ、Universal Link 與產品附錄（第 75-79 頁）

| 主題 | 內容 | 來源頁碼 |
| --- | --- | --- |
| Sandbox 成功驗證方式 | 測試下單後，可登入 TGT sandbox portal 檢查訂單詳情 | 第 75 頁 |
| 啟用模式差異 | `AUTO_ACTIVATE` 可在 validity 內任何一天啟用，啟用後才開始實際使用期；`ACTIVATE_ON_ORDER` 則於下單時指定啟用日期，使用期固定不刷新 | 第 75 頁 |
| Cycle Type / 時區 | 24 小時制或 calendar day 依營運商規則決定，且可能跟營運商時區有關（例：UTC+8） | 第 75 頁 |
| 產品更新策略 | 產品包沒有固定更新時程，建議用產品查詢 API 定期拉取並自行存庫 | 第 75 頁 |
| Callback 是否必要 | 文件明確說明 callback **是必要的**，否則只能反覆查詢 order API，且官方不建議這樣整合 | 第 75 頁 |
| QR Code 產生方式 | 建卡後 callback 會回傳 `qrCode` 欄位；如要顯示掃碼圖，可自行轉為 scannable QR image | 第 75 頁 |
| 自訂產品名稱 | 系統內可自訂前台顯示名稱，只要正確映射對應 `productCode` 即可 | 第 75 頁 |
| Renewal vs Data Add-on | Renewal 可延長流量與有效期；Data Add-on / Place top up order 主要給 C4 日費卡補高速流量或增加天數，不一定延長整體 eSIM 可用期 | 第 76 頁 |
| iOS Universal Link | iOS 17.4+ 可用 Apple Universal Link 直接安裝 eSIM，格式為 `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata={qrcode}` | 第 76 頁 |
| 附錄內容 | 附錄提供產品 code 範例、product type、card type coding，以及 countryCode/mcc 對照 | 第 76-79 頁 |

## 從 FAQ 可延伸的 UX 功能

| 功能方向 | 依據 | 價值 |
| --- | --- | --- |
| iPhone 一鍵安裝 eSIM | iOS Universal Link | 大幅減少 iPhone 用戶手動掃碼步驟 |
| 顯示啟用方式與時區說明 | AUTO_ACTIVATE / ACTIVATE_ON_ORDER / cycle timezone | 減少用戶誤解「為何今天啟用、明天就過期」 |
| 區分 Renewal 與 Data Add-on 操作文案 | FAQ 對兩者定義不同 | 避免用戶誤買，提升加值轉化率 |
| 建立產品別名 / 行銷命名系統 | 可自訂產品名稱 | 讓前台命名更易懂、更好賣 |
