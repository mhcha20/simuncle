import "dotenv/config";
import express from "express";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../stripe";
import { handleTgtCallback } from "../tgtCallback";
import { handleScheduledSync } from "../scheduledSync";
import { handleScheduledEmailRetry } from "../scheduledEmailRetry";
import { handleScheduledExpiryReminder } from "../scheduledExpiryReminder";
import { handleScheduledLowUsageAlert } from "../scheduledLowUsageAlert";
import { handleScheduledReconcile } from "../scheduledReconcile";
import { handleScheduledPendingReminder } from "../scheduledPendingReminder";
import { handleScheduledUpdateExchangeRates } from "../scheduledUpdateExchangeRates";
import { handleScheduledSoroSync } from "../scheduledSoroSync";
import { generateAndStoreSeoArticles } from "../generateSeoArticles";
import { sdk } from "./sdk";
import { handleSitemap } from "../sitemap";
import { scheduledSeoOpportunityHandler } from "../scheduledSeoOpportunity";
import { handleScheduledTgtSync } from "../scheduledTgtSync";
import { handleScheduledMonthlyReport } from "../scheduledMonthlyReport";
import { handleScheduledTgtSyncMonitor } from "../scheduledTgtSyncMonitor";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable gzip/deflate compression for all responses
  app.use(compression());

  // www → non-www 301 redirect (must be first middleware)
  // Ensures simuncle.com is the canonical domain for SEO
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      const nonWwwHost = host.slice(4);
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      return res.redirect(301, `${proto}://${nonWwwHost}${req.originalUrl}`);
    }
    next();
  });

  // IMPORTANT: Stripe webhook must be registered BEFORE express.json()
  // so it can receive raw body for signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerAuthRoutes(app);
  // Scheduled cron handlers
  app.post("/api/scheduled/sync-products", handleScheduledSync);
  app.post("/api/scheduled/email-retry", handleScheduledEmailRetry);
  app.post("/api/scheduled/expiry-reminder", handleScheduledExpiryReminder);
  app.post("/api/scheduled/low-usage-alert", handleScheduledLowUsageAlert);
  app.post("/api/scheduled/reconcileOrders", handleScheduledReconcile);
  app.post("/api/scheduled/pending-reminder", handleScheduledPendingReminder);
  app.post("/api/scheduled/update-exchange-rates", handleScheduledUpdateExchangeRates);
  app.post("/api/scheduled/sync-soro-articles", handleScheduledSoroSync);
  app.post("/api/scheduled/seo-opportunity", scheduledSeoOpportunityHandler);
  app.post("/api/scheduled/sync-tgt-products", handleScheduledTgtSync);
  app.post("/api/scheduled/monthly-traffic-report", handleScheduledMonthlyReport);
  app.post("/api/scheduled/check-tgt-sync-status", handleScheduledTgtSyncMonitor);
  app.post("/api/scheduled/generate-seo-articles", async (req, res) => {
    try {
      // Allow cron trigger OR admin user
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user?.isCron && user?.role !== "admin") {
        return res.status(403).json({ error: "admin or cron only" });
      }
      const result = await generateAndStoreSeoArticles(req as unknown as { query?: { topic?: string } });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });
  // TGT eSIM callback (async delivery of QR codes)
  app.post("/api/tgt/callback", handleTgtCallback);
  // Sitemap
  app.get("/sitemap.xml", handleSitemap);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
