# TGT API Notes

## API 4.8 - Query Order Information by Conditions

### Endpoint
- URL: POST BaseUrl+/eSIMApi/v2/order/query
- Auth: Bearer token in Authorization header

### Request Parameters (all optional, at least one required)
| Field | Type | Description |
|-------|------|-------------|
| orderNo | String | TGT system order number |
| iccid | String | ICCID of the eSIM card |
| channelOrderNo | String | Channel order number (our SU{orderId}) |
| lang | String | Language: en / ja-JP / zh-CN, default English |

### Response - OrderInfo Object Fields
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| orderNo | String | TG2025... | TGT order number |
| productCode | String | ptsk-6 | Product code |
| productName | String | SKTeSIM-10days_V | Product name |
| activatedStartTime | String | 2025-08-01T00:00:00Z | Activation start date |
| activatedEndTime | String | 2025-08-05T23:59:59Z | Activation expiry date |
| latestActivationTime | String | 2025-08-05T23:59:59Z | Latest activation time |
| renewExpirationTime | String | 2025-08-05T23:59:59Z | Latest renewal date |
| createdTime | String | 2025-08-05T23:59:59Z | Order creation time |
| orderStatus | String | NOTACTIVE | NOTACTIVE / ACTIVATED / INUSE / USED / EXPIRED / ABANDON / TERMINATION |
| profileStatus | String | nodownload | Inactive/unavailable, Activated/activated, Deleted/deleted, Downloading/downloaded, Disabled/disabled, Not downloaded/nodownload, Download failed/downloadfail, Generation failed/failed, Not generated/ungenerated |
| qrCode | String | LPA:1$... | eSIM QR code (LPA format) |
| channelOrderNo | String | 88963589 | Channel order number |
| orderType | String | DAYPASS | DAYPASS / DAILY / MULTIPLEMONTHS / MULTIPLEMONTHS_AUTO |
| cardInfo.iccid | String | 898205... | ICCID |
| cardInfo.imsi | String | 07894... | IMSI |
| cardInfo.msisdn | String | 12345464 | Mobile phone number |
| cardInfo.rentalContractNumber | String | 8180508970 | Lease code |

### Notes
- NO real-time data usage field in this endpoint
- Error 5032: orderNo, iccid, channelOrderNo - at least one must not be empty
- Our channelOrderNo format: SU{orderId} (e.g., SU2220001)

---

## API 4.10 - Real-time Traffic Data Query (= Section 3.1.10 in overview)

### Endpoint
- URL: POST BaseUrl+/eSIMApi/v2/order/usage
- QPS Limit: 50, Response Time: 800ms

### Request Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderNo | String | true | TGT system order number (SE...) — NOT channelOrderNo |

### Response - UsageInfo Object Fields
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| dataTotal | String | 1000 | Total data for cycle, in MB (NOT returned for daily packages) |
| dataUsage | String | 100 | Current cycle data usage, in MB |
| dataResidual | String | 900 | Remaining data for current billing cycle, in MB (NOT returned for daily packages) |
| refuelingTotal | String | 0 | Daily refueling package data total, in MB |
| qtaconsumption | String | 100 | Daily high-speed data usage, in MB |

### Error Codes
- 5002: The order does not exist
- 5005: Order card type does not support real-time traffic query
- 4068: Real-time traffic calculation in progress, please try again later

### Implementation Notes
- Requires TGT orderNo (SE...) NOT channelOrderNo
- Daily packages: dataTotal and dataResidual are NOT returned
- Strategy: call 4.8 first (with channelOrderNo=SU{orderId}) to get TGT orderNo, then call 4.10 for usage
- Or: combine both calls in one procedure to return both status and usage
