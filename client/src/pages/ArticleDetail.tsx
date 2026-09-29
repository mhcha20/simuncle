import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { marked } from "marked";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, FileText, ChevronRight } from "lucide-react";

type Lang = "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th";

function getLocalizedField(article: Record<string, any>, field: string, lang: string): string {
  const langMap: Record<string, string> = {
    "zh-TW": "ZhTW",
    "zh-CN": "ZhCN",
    en: "En",
    ja: "Ja",
    ko: "Ko",
    th: "Th",
  };
  const suffix = langMap[lang] ?? "ZhTW";
  return article[`${field}${suffix}`] || article[`${field}ZhTW`] || article[`${field}En`] || "";
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  "travel-tips":       { "zh-TW": "旅遊攻略", "zh-CN": "旅游攻略", en: "Travel Tips", ja: "旅行のヒント", ko: "여행 팁", th: "เคล็ดลับการเดินทาง" },
  "esim-guide":        { "zh-TW": "eSIM 教學", "zh-CN": "eSIM 教程", en: "eSIM Guide", ja: "eSIMガイド", ko: "eSIM 가이드", th: "คู่มือ eSIM" },
  "destination-guide": { "zh-TW": "目的地指南", "zh-CN": "目的地指南", en: "Destination Guide", ja: "目的地ガイド", ko: "여행지 가이드", th: "คู่มือจุดหมาย" },
  news:                { "zh-TW": "最新消息", "zh-CN": "最新消息", en: "News", ja: "ニュース", ko: "뉴스", th: "ข่าวสาร" },
};

const RELATED_HEADING: Record<string, string> = {
  "zh-TW": "相關文章",
  "zh-CN": "相关文章",
  en: "Related Articles",
  ja: "関連記事",
  ko: "관련 기사",
  th: "บทความที่เกี่ยวข้อง",
};

export default function ArticleDetail() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { language } = useLanguage();

  const articleQuery = trpc.articles.bySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug, retry: false }
  );

  const article = articleQuery.data;

  const relatedQuery = trpc.articles.related.useQuery(
    {
      category: article?.category ?? undefined,
      excludeSlug: params.slug ?? "",
      limit: 3,
    },
    { enabled: !!article }
  );

  const title = article ? getLocalizedField(article, "title", language) : "";
  const excerpt = article ? getLocalizedField(article, "excerpt", language) : "";
  const rawContent = article ? getLocalizedField(article, "content", language) : "";
  const content = useMemo(() => {
    if (!rawContent) return "";
    if (rawContent.includes("##") || rawContent.includes("**") || rawContent.includes("\n\n")) {
      return marked.parse(rawContent) as string;
    }
    return rawContent;
  }, [rawContent]);

  if (articleQuery.isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (articleQuery.isError || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg mb-4">
          {language === "en" ? "Article not found" : language === "zh-CN" ? "找不到此文章" : language === "ja" ? "記事が見つかりません" : language === "ko" ? "기사를 찾을 수 없습니다" : language === "th" ? "ไม่พบบทความนี้" : "找不到此文章"}
        </p>
        <Button variant="outline" onClick={() => navigate("/blog")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {language === "en" ? "Back to Tips & Info" : language === "zh-CN" ? "返回实用资讯" : language === "ja" ? "お役立ち情報に戻る" : language === "ko" ? "유용한 정보로 돌아가기" : language === "th" ? "กลับไปยังข้อมูลที่เป็นประโยชน์" : "返回實用資訊"}
        </Button>
      </div>
    );
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": excerpt || title,
    "image": article.coverImage ? [article.coverImage] : undefined,
    "datePublished": article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    "dateModified": article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
    "author": { "@type": "Organization", "name": "SIM uncle" },
    "publisher": {
      "@type": "Organization",
      "name": "SIM uncle",
      "logo": { "@type": "ImageObject", "url": "https://simuncle.com/manus-storage/simuncle-logo-new_0fbd503a.webp", "width": 260, "height": 80 }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `https://simuncle.com/blog/${article.slug}` }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": language === "en" ? "Home" : language === "zh-CN" ? "首页" : language === "ja" ? "ホーム" : language === "ko" ? "홈" : language === "th" ? "หน้าแรก" : "首頁", "item": "https://simuncle.com" },
      { "@type": "ListItem", "position": 2, "name": language === "en" ? "Tips & Info" : language === "zh-CN" ? "实用资讯" : language === "ja" ? "お役立ち情報" : language === "ko" ? "유용한 정보" : language === "th" ? "ข้อมูลที่เป็นประโยชน์" : "實用資訊", "item": "https://simuncle.com/blog" },
      { "@type": "ListItem", "position": 3, "name": title, "item": `https://simuncle.com/blog/${article.slug}` }
    ]
  };

  const relatedArticles = relatedQuery.data ?? [];
  const langKey = (["zh-TW", "zh-CN", "en", "ja", "ko", "th"] as const).includes(language as any)
    ? (language as Lang) : "en";

  return (
    <>
      <CustomSEO
        title={`${title} | SIM uncle`}
        description={excerpt || title}
        path={`/blog/${article.slug}`}
        ogImage={article.coverImage ?? undefined}
        jsonLd={[articleJsonLd, breadcrumbJsonLd] as unknown as object}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/blog")} className="gap-2 mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          {language === "en" ? "Back to Tips & Info" : language === "zh-CN" ? "返回实用资讯" : language === "ja" ? "お役立ち情報に戻る" : language === "ko" ? "유용한 정보로 돌아가기" : language === "th" ? "กลับไปยังข้อมูลที่เป็นประโยชน์" : "返回實用資訊"}
        </Button>

        {/* Cover image */}
        {article.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-8 aspect-[16/7]">
            <img
              src={article.coverImage}
              alt={title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Category badge */}
        {article.category && CATEGORY_LABELS[article.category] && (
          <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-4">
            {CATEGORY_LABELS[article.category][langKey] ?? CATEGORY_LABELS[article.category]["en"]}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold leading-tight mb-3">{title}</h1>

        {/* Meta */}
        {article.publishedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Calendar className="w-4 h-4" />
            <span>{new Date(article.publishedAt).toLocaleDateString(language === "en" ? "en-US" : language, { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        )}

        {/* Excerpt */}
        {excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-4 border-primary pl-4 italic">
            {excerpt}
          </p>
        )}

        {/* Content */}
        {content ? (
          <div
            className="prose prose-green max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-muted-foreground">
            {language === "en" ? "No content available for this language." : language === "zh-CN" ? "此语言版本暂无内容。" : language === "ja" ? "この言語のコンテンツはまだありません。" : language === "ko" ? "이 언어의 콘텐츠가 없습니다." : language === "th" ? "ยังไม่มีเนื้อหาในภาษานี้" : "此語言版本尚無內容。"}
          </p>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-14 pt-10 border-t border-border">
            <h2 className="text-xl font-bold mb-6">
              {RELATED_HEADING[langKey] ?? RELATED_HEADING["en"]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => {
                const relTitle = getLocalizedField(rel as any, "title", language);
                const relExcerpt = getLocalizedField(rel as any, "excerpt", language);
                return (
                  <article
                    key={rel.id}
                    className="group cursor-pointer bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    onClick={() => navigate(`/blog/${rel.slug}`)}
                  >
                    {rel.coverImage ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={rel.coverImage}
                          alt={relTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width={300}
                          height={169}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-primary/30" />
                      </div>
                    )}
                    <div className="p-4">
                      {rel.category && CATEGORY_LABELS[rel.category] && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2 inline-block">
                          {CATEGORY_LABELS[rel.category][langKey] ?? CATEGORY_LABELS[rel.category]["en"]}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1">
                        {relTitle || rel.slug}
                      </h3>
                      {relExcerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{relExcerpt}</p>
                      )}
                      <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                        {language === "en" ? "Read more" : language === "zh-CN" ? "阅读更多" : language === "ja" ? "続きを読む" : language === "ko" ? "더 읽기" : language === "th" ? "อ่านเพิ่มเติม" : "閱讀更多"}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
