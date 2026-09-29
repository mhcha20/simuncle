import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import Navbar from "./components/Navbar";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { WhatsAppButton } from "./components/WhatsAppButton";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { useEffect, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-load all pages to split the bundle and reduce initial download
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const CheckoutResult = lazy(() => import("./pages/CheckoutResult"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));
const HowToInstall = lazy(() => import("./pages/HowToInstall"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Blog = lazy(() => import("./pages/Blog"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminArticles = lazy(() => import("./pages/AdminArticles"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const AdminSEO = lazy(() => import("./pages/AdminSEO"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DestinationPage = lazy(() => import("./pages/DestinationPage"));
const Referral = lazy(() => import("./pages/Referral"));
const AdminReferral = lazy(() => import("./pages/AdminReferral"));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col gap-4 p-8 max-w-2xl mx-auto animate-pulse">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/orders" component={Orders} />
        <Route path="/checkout/result" component={CheckoutResult} />
        <Route path="/admin" component={AdminSettings} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/announcements" component={AdminAnnouncements} />
        <Route path="/how-to-install" component={HowToInstall} />
        <Route path="/track-order" component={TrackOrder} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/articles" component={AdminArticles} />
        <Route path="/admin/seo" component={AdminSEO} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={ArticleDetail} />
        <Route path="/esim/:destination" component={DestinationPage} />
        <Route path="/referral" component={Referral} />
        <Route path="/admin/referral" component={AdminReferral} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // React 載入後立即隱藏 HTML splash（index.html 裡的純 HTML 版本）
  useEffect(() => {
    if (typeof window !== "undefined" && typeof (window as any).__hideSplash === "function") {
      // React mount 後立即隱藏 splash（100ms 讓首幀渲染完成）
      const t = setTimeout(() => (window as any).__hideSplash(), 100);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <div className="min-h-screen flex flex-col">
              <AnnouncementBanner />
              <Navbar />
              <main className="flex-1">
                <Router />
              </main>
              <WhatsAppButton />
              <PWAInstallBanner />
            </div>
          </TooltipProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
