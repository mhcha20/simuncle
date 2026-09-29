import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomSEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronRight, FileText, BookOpen, Map, Newspaper, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const BLOG_LABELS: Record<string, {
  title: string; description: string; heading: string; subtitle: string;
  readMore: string; noArticles: string; allArticles: string; articleCount: string;
  categories: Record<string, string>;
}> = {
  "zh-TW": {
    title: "實用資訊 - eSIM 旅遊攻略 | SIM uncle",
    description: "SIM uncle 實用資訊：最新 eSIM 使用教學、旅遊上網攻略、各地網絡評測，助你出行無憂。",
    heading: "實用資訊",
    subtitle: "最新 eSIM 教學、旅遊上網攻略與各地網絡評測",
    readMore: "閱讀更多",
    noArticles: "暫無文章，敬請期待！",
    allArticles: "全部",
    articleCount: "篇文章",
    categories: {
      "travel-tips": "旅遊攻略",
      "esim-guide": "eSIM 教學",
      "destination-guide": "目的地指南",
      "news": "最新消息",
    },
  },
  "zh-CN": {
    title: "实用资讯 - eSIM 旅游攻略 | SIM uncle",
    description: "SIM uncle 实用资讯：最新 eSIM 使用教程、旅游上网攻略、各地网络评测，助你出行无忧。",
    heading: "实用资讯",
    subtitle: "最新 eSIM 教程、旅游上网攻略与各地网络评测",
    readMore: "阅读更多",
    noArticles: "暂无文章，敬请期待！",
    allArticles: "全部",
    articleCount: "篇文章",
    categories: {
      "travel-tips": "旅游攻略",
      "esim-guide": "eSIM 教程",
      "destination-guide": "目的地指南",
      "news": "最新消息",
    },
  },
  en: {
    title: "Tips & Info - eSIM Travel Guides | SIM uncle",
    description: "SIM uncle Tips & Info: eSIM setup guides, travel data tips, network reviews and travel hacks to keep you connected abroad.",
    heading: "Tips & Info",
    subtitle: "eSIM guides, travel tips & network reviews for travellers",
    readMore: "Read more",
    noArticles: "No articles yet. Stay tuned!",
    allArticles: "All",
    articleCount: "articles",
    categories: {
      "travel-tips": "Travel Tips",
      "esim-guide": "eSIM Guide",
      "destination-guide": "Destination Guide",
      "news": "News",
    },
  },
  ja: {
    title: "お役立ち情報 - eSIM 旅行ガイド | SIM uncle",
    description: "SIM uncle お役立ち情報：eSIMの使い方ガイド、旅行データのヒント、各地のネットワークレビューで海外旅行を快適に。",
    heading: "お役立ち情報",
    subtitle: "eSIMの使い方ガイド・旅行のヒント・ネットワークレビュー",
    readMore: "続きを読む",
    noArticles: "記事はまだありません。お楽しみに！",
    allArticles: "すべて",
    articleCount: "件の記事",
    categories: {
      "travel-tips": "旅行のヒント",
      "esim-guide": "eSIMガイド",
      "destination-guide": "目的地ガイド",
      "news": "ニュース",
    },
  },
  ko: {
    title: "유용한 정보 - eSIM 여행 가이드 | SIM uncle",
    description: "SIM uncle 유용한 정보: eSIM 설정 가이드, 여행 데이터 팁, 네트워크 리뷰로 해외여행을 편리하게.",
    heading: "유용한 정보",
    subtitle: "eSIM 설정 가이드, 여행 팁 및 네트워크 리뷰",
    readMore: "더 읽기",
    noArticles: "아직 게시물이 없습니다. 기대해 주세요!",
    allArticles: "전체",
    articleCount: "개 게시물",
    categories: {
      "travel-tips": "여행 팁",
      "esim-guide": "eSIM 가이드",
      "destination-guide": "여행지 가이드",
      "news": "뉴스",
    },
  },
  th: {
    title: "ข้อมูลที่เป็นประโยชน์ - เคล็ดลับ eSIM ท่องเที่ยว | SIM uncle",
    description: "ข้อมูลที่เป็นประโยชน์ SIM uncle: คู่มือการตั้งค่า eSIM, เคล็ดลับข้อมูลท่องเที่ยว, รีวิวเครือข่าย เพื่อการเดินทางที่ราบรื่น",
    heading: "ข้อมูลที่เป็นประโยชน์",
    subtitle: "คู่มือ eSIM, เคล็ดลับการเดินทาง และรีวิวเครือข่ายสำหรับนักเดินทาง",
    readMore: "อ่านเพิ่มเติม",
    noArticles: "ยังไม่มีบทความ โปรดติดตาม!",
    allArticles: "ทั้งหมด",
    articleCount: "บทความ",
    categories: {
      "travel-tips": "เคล็ดลับการเดินทาง",
      "esim-guide": "คู่มือ eSIM",
      "destination-guide": "คู่มือจุดหมายปลายทาง",
      "news": "ข่าวสาร",
    },
  },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "travel-tips": Lightbulb,
  "esim-guide": BookOpen,
  "destination-guide": Map,
  "news": Newspaper,
};

const CATEGORIES = ["travel-tips", "esim-guide", "destination-guide", "news"] as const;

function getLocalizedField(article: Record<string, any>, field: string, lang: string): string {
  const langMap: Record<string, string> = {
    "zh-TW": "ZhTW", "zh-CN": "ZhCN", en: "En", ja: "Ja", ko: "Ko", th: "Th",
  };
  const suffix = langMap[lang] ?? "ZhTW";
  return article[`${field}${suffix}`] || article[`${field}ZhTW`] || article[`${field}En`] || "";
}

export default function Blog() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const PAGE_SIZE = 12;

  const langKey = (["zh-TW", "zh-CN", "en", "ja", "ko", "th"] as const).includes(
    language as any
  ) ? (language as keyof typeof BLOG_LABELS) : "en";
  const labels = BLOG_LABELS[langKey];

  const articlesQuery = trpc.articles.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    category: activeCategory === "all" ? undefined : activeCategory,
  });
  const countQuery = trpc.articles.count.useQuery({
    category: activeCategory === "all" ? undefined : activeCategory,
  });
  const categoryCountsQuery = trpc.articles.categoryCounts.useQuery();

  // Reset accumulated articles when category changes
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(0);
    setAllArticles([]);
  };

  // Accumulate new page data into allArticles
  useEffect(() => {
    if (articlesQuery.isSuccess && articlesQuery.data) {
      if (page === 0) {
        setAllArticles(articlesQuery.data);
      } else {
        setAllArticles((prev) => {
          const existingIds = new Set(prev.map((a: any) => a.id));
          const newOnes = articlesQuery.data!.filter((a: any) => !existingIds.has(a.id));
          return [...prev, ...newOnes];
        });
      }
    }
  }, [articlesQuery.data, articlesQuery.isSuccess, page]);

  const hasMore = (articlesQuery.data?.length ?? 0) === PAGE_SIZE;
  const articles = allArticles;
  const totalCount = countQuery.data?.total ?? 0;
  const categoryCounts = categoryCountsQuery.data ?? [];

  // Build category count map
  const catCountMap: Record<string, number> = {};
  let totalAll = 0;
  for (const row of categoryCounts) {
    if (row.category) {
      catCountMap[row.category] = row.count;
      totalAll += row.count;
    } else {
      totalAll += row.count; // uncategorized
    }
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: language === "en" ? "Home" : language === "zh-CN" ? "首页" : language === "ja" ? "ホーム" : language === "ko" ? "홈" : language === "th" ? "หน้าหลัก" : "首頁", item: "https://simuncle.com" },
      { "@type": "ListItem", position: 2, name: labels.heading, item: "https://simuncle.com/blog" },
    ],
  };

  return (
    <>
      <CustomSEO
        title={labels.title.replace(" | SIM uncle", "")}
        description={labels.description}
        path="/blog"
        keywords={["eSIM", "旅遊eSIM", "travel eSIM", "eSIM guide", "SIM uncle tips", "實用資訊"]}
        jsonLd={breadcrumbJsonLd}
      />
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
          <div className="container py-10 md:py-14">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {labels.heading}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">{labels.subtitle}</p>

            {/* Article count */}
            {!countQuery.isLoading && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{totalCount}</span>{" "}
                {labels.articleCount}
              </p>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="container">
            <div className="flex gap-1 overflow-x-auto py-3 scrollbar-none">
              {/* All tab */}
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150",
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {labels.allArticles}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeCategory === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                )}>
                  {categoryCountsQuery.isLoading ? "…" : totalAll}
                </span>
              </button>

              {/* Category tabs */}
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const count = catCountMap[cat] ?? 0;
                if (count === 0 && !categoryCountsQuery.isLoading) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150",
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {labels.categories[cat]}
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      activeCategory === cat ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                    )}>
                      {categoryCountsQuery.isLoading ? "…" : count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Article List */}
        <div className="container py-8 md:py-12">
          {articlesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">{labels.noArticles}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => {
                const title = getLocalizedField(article, "title", language);
                const excerpt = getLocalizedField(article, "excerpt", language);
                const catLabel = article.category ? labels.categories[article.category] : null;
                const CatIcon = article.category ? CATEGORY_ICONS[article.category] : null;
                return (
                  <article
                    key={article.id}
                    className="group cursor-pointer bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                    onClick={() => navigate(`/blog/${article.slug}`)}
                  >
                    {/* Cover Image */}
                    {article.coverImage ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={article.coverImage}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width={400}
                          height={225}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-primary/30" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      {/* Category badge */}
                      {catLabel && CatIcon && (
                        <div className="flex items-center gap-1 mb-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <CatIcon className="w-3 h-3" />
                            {catLabel}
                          </span>
                        </div>
                      )}
                      <h2 className="font-bold text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {title || article.slug}
                      </h2>
                      {excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{excerpt}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {article.publishedAt && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(article.publishedAt).toLocaleDateString(language === "en" ? "en-US" : language, { year: "numeric", month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                        <span className="text-xs text-primary font-medium flex items-center gap-0.5 ml-auto">
                          {labels.readMore} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {articles.length > 0 && hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={articlesQuery.isFetching}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all duration-150 active:scale-[0.97]"
              >
                {articlesQuery.isFetching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {langKey === "zh-TW" ? "載入中..." : langKey === "zh-CN" ? "加载中..." : langKey === "ja" ? "読み込み中..." : langKey === "ko" ? "로딩 중..." : langKey === "th" ? "กำลังโหลด..." : "Loading..."}
                  </>
                ) : (
                  langKey === "zh-TW" ? "載入更多" : langKey === "zh-CN" ? "加载更多" : langKey === "ja" ? "もっと読み込む" : langKey === "ko" ? "더 보기" : langKey === "th" ? "โหลดเพิ่มเติม" : "Load more"
                )}
              </button>
            </div>
          )}
          {articles.length > 0 && !hasMore && !articlesQuery.isFetching && (
            <p className="text-center text-sm text-muted-foreground mt-8">
              {langKey === "zh-TW" ? "已顯示全部文章" : langKey === "zh-CN" ? "已显示全部文章" : langKey === "ja" ? "すべての記事を表示しました" : langKey === "ko" ? "모든 게시물을 표시했습니다" : langKey === "th" ? "แสดงบทความทั้งหมดแล้ว" : "All articles shown"}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
