# eSIM 叔叔（SIM uncle）

多語言（繁中／簡中／English／日本語／한국어／ไทย）全球 eSIM 網店：目的地搜尋、Stripe 付款、Vizlync／TGT 供應商自動履約、會員訂單／用量／增購、推薦佣金、部落格與 SEO 自動化、管理後台。

- **技術：** React 19 + Vite + Tailwind 4、Express + tRPC 11、Drizzle ORM + MySQL、Stripe、Resend、Cloudflare R2
- **部署：** [DEPLOY.md](./DEPLOY.md)（Railway）
- **文件：** [功能規格](docs/functional-spec.md) · [技術架構](docs/architecture.md) · [輪詢與 TGT callback 重試策略](docs/retry-strategy.md) · [對帳與鎖設計](docs/locking-design.md) · [TGT API 筆記](docs/TGT-API-2.0-notes.md)

## 本機開發

```bash
pnpm install
cp .env.example .env      # 填 DATABASE_URL、JWT_SECRET 等
pnpm db:setup             # 建立／更新資料庫表
pnpm dev
```

| 指令 | 用途 |
| --- | --- |
| `pnpm dev` | 開發伺服器 |
| `pnpm check` | TypeScript 檢查 |
| `pnpm test` | 單元測試（需要真實密鑰嘅測試會自動跳過） |
| `pnpm build` / `pnpm start` | 正式建置／啟動 |
| `pnpm db:setup` | 行 migration（可重複執行） |
| `pnpm db:generate` | 改咗 `drizzle/schema.ts` 之後產生新 migration |

## 目錄

```
client/    React 前端（頁面、元件、六語言字串）
server/    Express + tRPC 後端、Stripe／Vizlync／TGT 整合、排程
drizzle/   資料庫 schema 同 migration
shared/    前後端共用
docs/      功能與架構文件
```
