import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const BASE_URL = "https://simuncle.com";

// Per-page SEO metadata map
const PAGE_META: Record<string, { title: string; description: string; h1: string }> = {
  "/": {
    title: "SIM uncle - 全球 eSIM 即買即用 | 覆蓋 200+ 國家地區",
    description: "購買全球 eSIM 數據方案，覆蓋 200+ 個國家及地區。無需換 SIM 卡，掃碼即用，支援 4G/5G 網絡，港幣結算，即時收到 QR Code。",
    h1: "Global eSIM, Ready Instantly",
  },
  "/products": {
    title: "eSIM 方案目錄 | SIM uncle - 全球 200+ 國家地區",
    description: "瀏覽 SIM uncle 全球 eSIM 數據方案，涵蓋亞洲、歐洲、美洲、中東等 200+ 國家地區。按地區、數據量、有效期篩選，即時購買即時啟用。",
    h1: "eSIM Plans for 200+ Countries",
  },
  "/how-to-install": {
    title: "如何安裝 eSIM | SIM uncle 安裝教學 - iPhone 及 Android",
    description: "詳細圖文步驟教你如何在 iPhone 及 Android 手機安裝 eSIM。掃描 QR Code 即可完成設定，全程 5 分鐘，出發前輕鬆搞定。",
    h1: "How to Install Your eSIM",
  },
  "/blog": {
    title: "旅遊 eSIM 資訊 | SIM uncle 旅遊貼士及有用資訊",
    description: "SIM uncle 旅遊資訊中心：eSIM 使用教學、各國網絡攻略、旅遊貼士及最新優惠。出發前必讀，讓你的旅程網絡暢通無阻。",
    h1: "Travel Tips & eSIM Guides",
  },
  "/track-order": {
    title: "查詢訂單 | SIM uncle eSIM 訂單追蹤",
    description: "輸入電郵地址及訂單號碼查詢你的 SIM uncle eSIM 訂單狀態，取得 QR Code 啟動碼及 LPA 字串，隨時查看數據用量。",
    h1: "Track Your eSIM Order",
  },
};

// Fallback static meta for dynamic pages (used in dev mode / when DB unavailable)
function getStaticPageMeta(urlPath: string) {
  if (PAGE_META[urlPath]) return PAGE_META[urlPath];
  if (urlPath.startsWith("/blog/")) {
    return {
      title: "旅遊 eSIM 資訊 | SIM uncle",
      description: "SIM uncle 旅遊資訊：eSIM 使用教學、各國網絡攻略及旅遊貼士。",
      h1: "Travel Tips & eSIM Guides",
    };
  }
  if (urlPath.startsWith("/products/")) {
    return {
      title: "eSIM 方案詳情 | SIM uncle",
      description: "查看 SIM uncle eSIM 方案詳情，包括覆蓋國家、數據量、有效期及價格。即買即用，無需換 SIM 卡。",
      h1: "eSIM Plan Details",
    };
  }
  return PAGE_META["/"];
}

// Dynamic meta lookup from DB for product and blog pages
// Returns null if not found (caller should fall back to static)
async function getDynamicPageMeta(urlPath: string): Promise<{ title: string; description: string; h1: string } | null> {
  try {
    // Product detail: /products/:productId
    if (urlPath.startsWith("/products/")) {
      const slug = urlPath.replace("/products/", "").split("?")[0].trim();
      if (!slug) return null;
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool(process.env.DATABASE_URL as string);
      // Try exact slug first, then tgt_ prefixed variant (hidden supplier prefix support)
      const candidates = [slug];
      if (!slug.startsWith("tgt_") && !slug.startsWith("vizlync_")) {
        candidates.push(`tgt_${slug}`);
      }
      let rows: any[] = [];
      let productId = slug;
      for (const candidate of candidates) {
        const [r] = await pool.query(
          "SELECT name, customName, dataAmount, dataUnit, validityDays, countries FROM products_cache WHERE productId = ? AND isActive = 1 LIMIT 1",
          [candidate]
        ) as any[];
        if (r && r.length > 0) { rows = r; productId = candidate; break; }
      }
      if (!rows || rows.length === 0) { await pool.end(); return null; }
      const p = rows[0];
      const baseName = p.customName || p.name || "eSIM 方案";
      // Check if this name is duplicated across products — if so, append short productId suffix
      const [dupRows] = await pool.query(
        "SELECT COUNT(*) as cnt FROM products_cache WHERE name = ? AND isActive = 1",
        [p.name]
      ) as any[];
      await pool.end();
      const isDup = dupRows[0]?.cnt > 1;
      const displayName = isDup ? `${baseName} (${productId.slice(-6)})` : baseName;
      // Parse countries for description
      let countriesText = "";
      try {
        const countriesArr = typeof p.countries === "string" ? JSON.parse(p.countries) : (p.countries || []);
        if (Array.isArray(countriesArr) && countriesArr.length > 0) {
          const names = countriesArr.slice(0, 3).map((c: any) => c.name || c.id).filter(Boolean);
          if (names.length > 0) {
            countriesText = names.join("、") + (countriesArr.length > 3 ? ` 等 ${countriesArr.length} 個國家地區` : "");
          }
        }
      } catch {}
      const dataStr = p.dataAmount && p.dataUnit ? `${parseFloat(p.dataAmount)}${p.dataUnit}` : "";
      const validityStr = p.validityDays ? `${p.validityDays} 天` : "";
      const detailStr = [dataStr, validityStr].filter(Boolean).join("、");
      // Truncate title to max 60 chars: suffix " | SIM uncle eSIM 方案" is 17 chars, so name max = 43 chars
      const suffix = " | SIM uncle eSIM 方案";
      const maxNameLen = 60 - suffix.length; // 43
      const truncatedName = displayName.length > maxNameLen
        ? displayName.slice(0, maxNameLen - 1) + "…"
        : displayName;
      const title = `${truncatedName}${suffix}`;
      const rawDesc = countriesText
        ? `${displayName}：${detailStr ? detailStr + "，" : ""}覆蓋 ${countriesText}。SIM uncle 即買即用，無需換 SIM 卡，掃碼啟用，港幣結算。`
        : `${displayName}：${detailStr ? detailStr + "。" : ""}SIM uncle eSIM 即買即用，無需換 SIM 卡，掃碼啟用，港幣結算。`;
      const description = rawDesc.length > 160 ? rawDesc.slice(0, 159) + "…" : rawDesc;
      return { title, description, h1: displayName };
    }

    // Blog article: /blog/:slug
    if (urlPath.startsWith("/blog/")) {
      const slug = urlPath.replace("/blog/", "").split("?")[0].trim();
      if (!slug) return null;
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool(process.env.DATABASE_URL as string);
      const [rows] = await pool.query(
        "SELECT titleZhTW, excerptZhTW FROM articles WHERE slug = ? AND article_status = 'published' LIMIT 1",
        [slug]
      ) as any[];
      await pool.end();
      if (!rows || rows.length === 0) return null;
      const a = rows[0];
      const title = a.titleZhTW ? `${a.titleZhTW} | SIM uncle` : "旅遊 eSIM 資訊 | SIM uncle";
      const description = a.excerptZhTW
        ? a.excerptZhTW.slice(0, 160)
        : "SIM uncle 旅遊資訊：eSIM 使用教學、各國網絡攻略及旅遊貼士。";
      return { title, description, h1: a.titleZhTW || "Travel Tips & eSIM Guides" };
    }
  } catch (e) {
    // DB errors should not crash the page — fall back to static
    console.error("[SEO] getDynamicPageMeta error:", (e as Error).message);
  }
  return null;
}

function injectPageMeta(html: string, meta: { title: string; description: string; h1: string }, urlPath: string): string {
  const canonicalUrl = `${BASE_URL}${urlPath === "/" ? "" : urlPath}`;

  // Escape special chars for HTML attribute safety
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Replace title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(meta.description)}" />`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Replace og:url
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  // Replace og:title
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${esc(meta.title)}" />`
  );

  // Replace og:description
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${esc(meta.description)}" />`
  );

  // Replace static H1 (hidden SEO H1 for crawlers)
  html = html.replace(
    /<h1 style="position:absolute[^>]*>[^<]*<\/h1>/,
    `<h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">${esc(meta.h1)}</h1>`
  );

  return html;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Inject per-page SEO meta (title, description, canonical, H1)
      const pagePath = url.split("?")[0];
      const staticMeta = getStaticPageMeta(pagePath);
      template = injectPageMeta(template, staticMeta, pagePath);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve hashed assets with long-term cache (1 year), HTML with no-cache
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders(res, filePath) {
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('manifest.json') ||
        filePath.endsWith('sw.js')
      ) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  // Inject per-page SEO meta tags for all requests (title, description, canonical, H1, OG)
  app.use("*", async (req, res, next) => {
    // Skip API routes and XML/text files — let them be handled by their own routes
    const url = req.originalUrl.split("?")[0];
    if (url.endsWith(".xml") || url.endsWith(".txt") || url.startsWith("/api/")) {
      return next();
    }
    const ua = req.headers["user-agent"] ?? "";
    const isCrawler = /facebookexternalhit|Twitterbot|WhatsApp|Slackbot|TelegramBot|LinkedInBot|Discordbot|Googlebot|bingbot|Applebot|curl|python-requests|SERankingBot|AhrefsBot|SemrushBot|MJ12bot/i.test(ua);

    const indexPath = path.resolve(distPath, "index.html");

    try {
      let html = fs.readFileSync(indexPath, "utf-8");

      // Try dynamic DB lookup for product/blog pages, fall back to static
      let meta = getStaticPageMeta(url);
      if (url.startsWith("/products/") || url.startsWith("/blog/")) {
        const dynamicMeta = await getDynamicPageMeta(url);
        if (dynamicMeta) meta = dynamicMeta;
      }

      // Inject per-page title, description, canonical, og:url, og:title, og:description, H1
      html = injectPageMeta(html, meta, url);

      // For social crawlers, also inject extra OG image meta tags
      if (isCrawler) {
        const ogImageMeta = `
    <meta property="og:image" content="https://simuncle.com/manus-storage/simuncle-banner_90bf4280.png" />
    <meta property="og:image:width" content="1424" />
    <meta property="og:image:height" content="752" />
    <meta property="og:image:alt" content="SIM uncle eSIM - 一鍵開啟，探索全球" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://simuncle.com/manus-storage/simuncle-banner_90bf4280.png" />`;
        html = html.replace("</head>", `${ogImageMeta}\n  </head>`);
      }

      return res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch {
      // fall through to sendFile
    }

    res.sendFile(indexPath);
  });
}
