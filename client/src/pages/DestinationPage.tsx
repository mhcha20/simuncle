import { useParams, Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { trpc } from "@/lib/trpc";
import { CustomSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Wifi, Clock, ChevronRight, Star, Shield, Zap, BookOpen, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import NotFound from "./NotFound";
import { translatePlanName, translateCountry } from "@/lib/countryNames";
import { toDisplayChinese } from "@/lib/zhConvert";
import { encodeProductSlug } from "@shared/productSlug";

// ---- Filter constants (same as Products.tsx) ----
const DURATION_OPTIONS = [
  { label: "1 天", labelEn: "1 Day", labelCN: "1 天", labelJa: "1 日", labelKo: "1일", labelTh: "1 วัน", min: 1, max: 1 },
  { label: "2–3 天", labelEn: "2–3 Days", labelCN: "2–3 天", labelJa: "2–3 日", labelKo: "2–3일", labelTh: "2–3 วัน", min: 2, max: 3 },
  { label: "4–7 天", labelEn: "4–7 Days", labelCN: "4–7 天", labelJa: "4–7 日", labelKo: "4–7일", labelTh: "4–7 วัน", min: 4, max: 7 },
  { label: "8–15 天", labelEn: "8–15 Days", labelCN: "8–15 天", labelJa: "8–15 日", labelKo: "8–15일", labelTh: "8–15 วัน", min: 8, max: 15 },
  { label: "16–30 天", labelEn: "16–30 Days", labelCN: "16–30 天", labelJa: "16–30 日", labelKo: "16–30일", labelTh: "16–30 วัน", min: 16, max: 30 },
  { label: "30+ 天", labelEn: "30+ Days", labelCN: "30+ 天", labelJa: "30日以上", labelKo: "30일 이상", labelTh: "30+ วัน", min: 31, max: undefined },
];

const DATA_SIZES = [
  { label: "1 GB", labelEn: "≤1 GB", labelCN: "≤1 GB", labelJa: "≤1 GB", labelKo: "≤1 GB", labelTh: "≤1 GB", min: 0, max: 1 },
  { label: "1–3 GB", labelEn: "1–3 GB", labelCN: "1–3 GB", labelJa: "1–3 GB", labelKo: "1–3 GB", labelTh: "1–3 GB", min: 1, max: 3 },
  { label: "3–10 GB", labelEn: "3–10 GB", labelCN: "3–10 GB", labelJa: "3–10 GB", labelKo: "3–10 GB", labelTh: "3–10 GB", min: 3, max: 10 },
  { label: "10–20 GB", labelEn: "10–20 GB", labelCN: "10–20 GB", labelJa: "10–20 GB", labelKo: "10–20 GB", labelTh: "10–20 GB", min: 10, max: 20 },
  { label: "20+ GB", labelEn: "20+ GB", labelCN: "20+ GB", labelJa: "20+ GB", labelKo: "20+ GB", labelTh: "20+ GB", min: 20, max: undefined },
  { label: "Unlimited", labelEn: "Unlimited", labelCN: "无限流量", labelJa: "無制限", labelKo: "무제한", labelTh: "ไม่จำกัด", min: 99999, max: undefined },
];

// ---- Destination config ----
interface DestinationConfig {
  slug: string;
  countryCode?: string;
  region?: string;
  searchQuery?: string;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  keywords: Record<string, string[]>;
  emoji: string;
  highlights: Record<string, string[]>;
  faqs: Record<string, { q: string; a: string }[]>;
}

const DESTINATIONS: DestinationConfig[] = [
  {
    slug: "japan",
    searchQuery: "Japan",
    names: {
      "zh-TW": "日本 eSIM 推薦 2026",
      "zh-CN": "日本 eSIM 推荐 2026",
      en: "Best eSIM for Japan 2026",
      ja: "日本eSIM おすすめ 2026",
      ko: "일본 eSIM 추천 2026",
      th: "eSIM ญี่ปุ่น แนะนำ 2026",
    },
    descriptions: {
      "zh-TW": "前往日本旅遊？選購 SIM uncle 日本 eSIM，即買即用，支援 4G/5G 網絡，無需換 SIM 卡。多款日本 eSIM 方案比較，按天數和數據量篩選，找到最適合你的日本上網卡。",
      "zh-CN": "前往日本旅游？选购 SIM uncle 日本 eSIM，即买即用，支持 4G/5G 网络，无需换 SIM 卡。多款日本 eSIM 方案比较，按天数和流量筛选，找到最适合你的日本上网卡。",
      en: "Traveling to Japan? Buy a Japan eSIM from SIM uncle — instant activation, 4G/5G coverage, no SIM swap needed. Compare Japan eSIM plans by data and duration to find the best deal.",
      ja: "日本旅行にeSIMを。SIM uncleの日本eSIMは即時開通、4G/5G対応、SIMカード交換不要。データ量・日数で比較して最適なプランを見つけよう。",
      ko: "일본 여행에 eSIM을. SIM uncle 일본 eSIM은 즉시 개통, 4G/5G 지원, SIM 교체 불필요. 데이터와 기간으로 비교해 최적의 요금제를 찾아보세요.",
      th: "เดินทางไปญี่ปุ่น? ซื้อ eSIM ญี่ปุ่นจาก SIM uncle — เปิดใช้งานทันที รองรับ 4G/5G ไม่ต้องเปลี่ยนซิม เปรียบเทียบแผน eSIM ญี่ปุ่นตามข้อมูลและระยะเวลา",
    },
    keywords: {
      "zh-TW": ["日本 eSIM", "日本上網卡", "日本旅遊 eSIM", "日本 eSIM 推薦", "日本 SIM 卡"],
      "zh-CN": ["日本 eSIM", "日本上网卡", "日本旅游 eSIM", "日本 eSIM 推荐"],
      en: ["Japan eSIM", "best eSIM for Japan", "Japan travel eSIM", "Japan data SIM", "eSIM Japan 2026"],
      ja: ["日本eSIM", "日本 eSIM おすすめ", "日本旅行 eSIM", "日本 データSIM"],
      ko: ["일본 eSIM", "일본 eSIM 추천", "일본 여행 eSIM"],
      th: ["eSIM ญี่ปุ่น", "ซิมญี่ปุ่น", "eSIM ท่องเที่ยวญี่ปุ่น"],
    },
    emoji: "🇯🇵",
    highlights: {
      "zh-TW": ["覆蓋全日本 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "多款天數及數據量選擇"],
      en: ["Full Japan 4G/5G coverage", "Instant activation via QR code", "No SIM swap needed", "Multiple data & duration options"],
      ja: ["日本全国4G/5G対応", "QRコードで即時開通", "SIM交換不要", "データ量・日数が選べる"],
      ko: ["일본 전국 4G/5G 지원", "QR코드로 즉시 개통", "SIM 교체 불필요", "다양한 데이터·기간 선택"],
      th: ["ครอบคลุม 4G/5G ทั่วญี่ปุ่น", "เปิดใช้งานทันทีผ่าน QR Code", "ไม่ต้องเปลี่ยนซิม", "เลือกข้อมูลและระยะเวลาได้หลากหลาย"],
      "zh-CN": ["覆盖全日本 4G/5G 网络", "即时激活，扫码即用", "无需换 SIM 卡", "多款天数及流量选择"],
    },
    faqs: {
      "zh-TW": [
        { q: "日本 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達日本後掃描 QR Code 即可激活，全程不需換 SIM 卡。" },
        { q: "日本 eSIM 支援哪些網絡？", a: "我們的日本 eSIM 方案支援 NTT Docomo、SoftBank 或 KDDI 網絡，覆蓋全日本 4G/5G 訊號。" },
        { q: "日本 eSIM 可以打電話嗎？", a: "大部分 eSIM 方案只提供數據，如需通話功能請選擇含通話的方案或使用 WhatsApp/LINE 等 VoIP 應用。" },
        { q: "我的手機支援 eSIM 嗎？", a: "大部分 2018 年後推出的 iPhone（XS 或以上）及 Samsung Galaxy S20 以上均支援 eSIM。請在設定中確認你的手機是否支援 eSIM。" },
      ],
      en: [
        { q: "How do I activate my Japan eSIM?", a: "After purchase, you'll receive a QR code instantly. Scan it when you arrive in Japan to activate — no SIM swap needed." },
        { q: "Which networks does Japan eSIM support?", a: "Our Japan eSIM plans run on NTT Docomo, SoftBank, or KDDI networks with nationwide 4G/5G coverage." },
        { q: "Can I make calls with Japan eSIM?", a: "Most plans are data-only. For calls, choose a plan that includes voice, or use VoIP apps like WhatsApp or LINE." },
        { q: "Is my phone compatible with eSIM?", a: "Most iPhones from XS (2018) onwards and Samsung Galaxy S20+ support eSIM. Check your phone settings to confirm." },
      ],
    },
  },
  {
    slug: "europe",
    region: "Europe",
    names: {
      "zh-TW": "歐洲 eSIM 推薦 2026",
      "zh-CN": "欧洲 eSIM 推荐 2026",
      en: "Best eSIM for Europe 2026",
      ja: "ヨーロッパeSIM おすすめ 2026",
      ko: "유럽 eSIM 추천 2026",
      th: "eSIM ยุโรป แนะนำ 2026",
    },
    descriptions: {
      "zh-TW": "遊覽歐洲多國？選購 SIM uncle 歐洲 eSIM，一張 eSIM 暢遊多國，支援 30+ 歐洲國家，4G/5G 網絡覆蓋，即買即用。",
      "zh-CN": "游览欧洲多国？选购 SIM uncle 欧洲 eSIM，一张 eSIM 畅游多国，支持 30+ 欧洲国家，4G/5G 网络覆盖，即买即用。",
      en: "Traveling across Europe? Get a Europe eSIM from SIM uncle — one eSIM for 30+ countries, 4G/5G coverage, instant activation.",
      ja: "ヨーロッパ旅行に。SIM uncleのヨーロッパeSIMは30カ国以上対応、4G/5G対応、即時開通。",
      ko: "유럽 여행에 eSIM을. SIM uncle 유럽 eSIM은 30개국 이상 지원, 4G/5G, 즉시 개통.",
      th: "เดินทางทั่วยุโรป? eSIM ยุโรปจาก SIM uncle — eSIM เดียวใช้ได้ 30+ ประเทศ 4G/5G เปิดใช้งานทันที",
    },
    keywords: {
      "zh-TW": ["歐洲 eSIM", "歐洲上網卡", "歐洲旅遊 eSIM", "歐洲多國 eSIM"],
      "zh-CN": ["欧洲 eSIM", "欧洲上网卡", "欧洲旅游 eSIM"],
      en: ["Europe eSIM", "best eSIM for Europe", "European travel eSIM", "multi-country Europe eSIM"],
      ja: ["ヨーロッパeSIM", "ヨーロッパ旅行 eSIM", "ヨーロッパ データSIM"],
      ko: ["유럽 eSIM", "유럽 여행 eSIM", "유럽 데이터 eSIM"],
      th: ["eSIM ยุโรป", "ซิมยุโรป", "eSIM ท่องเที่ยวยุโรป"],
    },
    emoji: "🇪🇺",
    highlights: {
      "zh-TW": ["覆蓋 30+ 歐洲國家", "一張 eSIM 多國通用", "即時激活，掃碼即用", "無需換 SIM 卡"],
      en: ["30+ European countries covered", "One eSIM for multiple countries", "Instant activation via QR code", "No SIM swap needed"],
      ja: ["30カ国以上対応", "1枚のeSIMで複数国", "QRコードで即時開通", "SIM交換不要"],
      ko: ["30개국 이상 지원", "하나의 eSIM으로 여러 나라", "QR코드로 즉시 개통", "SIM 교체 불필요"],
      th: ["ครอบคลุม 30+ ประเทศในยุโรป", "eSIM เดียวใช้ได้หลายประเทศ", "เปิดใช้งานทันทีผ่าน QR Code", "ไม่ต้องเปลี่ยนซิม"],
      "zh-CN": ["覆盖 30+ 欧洲国家", "一张 eSIM 多国通用", "即时激活，扫码即用", "无需换 SIM 卡"],
    },
    faqs: {
      "zh-TW": [
        { q: "歐洲 eSIM 可以用在哪些國家？", a: "我們的歐洲 eSIM 方案覆蓋英國、法國、德國、意大利、西班牙、荷蘭等 30+ 個歐洲國家。" },
        { q: "歐洲 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達歐洲後掃描 QR Code 即可激活，全程不需換 SIM 卡。" },
        { q: "歐洲 eSIM 數據用完後怎辦？", a: "數據用完後可以在 SIM uncle 購買加值方案（Top-up），或重新購買新方案。" },
      ],
      en: [
        { q: "Which countries does the Europe eSIM cover?", a: "Our Europe eSIM covers 30+ countries including UK, France, Germany, Italy, Spain, Netherlands, and more." },
        { q: "How do I activate my Europe eSIM?", a: "After purchase, you'll receive a QR code instantly. Scan it when you arrive in Europe to activate." },
        { q: "What happens when I run out of data?", a: "You can purchase a top-up from SIM uncle or buy a new plan." },
      ],
    },
  },
  {
    slug: "thailand",
    searchQuery: "Thailand",
    names: {
      "zh-TW": "泰國 eSIM 推薦 2026",
      "zh-CN": "泰国 eSIM 推荐 2026",
      en: "Best eSIM for Thailand 2026",
      ja: "タイeSIM おすすめ 2026",
      ko: "태국 eSIM 추천 2026",
      th: "eSIM ไทย แนะนำ 2026",
    },
    descriptions: {
      "zh-TW": "去泰國旅遊？選購 SIM uncle 泰國 eSIM，即買即用，支援 4G/5G 網絡，曼谷、清邁、普吉島全覆蓋，無需換 SIM 卡。",
      "zh-CN": "去泰国旅游？选购 SIM uncle 泰国 eSIM，即买即用，支持 4G/5G 网络，曼谷、清迈、普吉岛全覆盖，无需换 SIM 卡。",
      en: "Visiting Thailand? Get a Thailand eSIM from SIM uncle — instant activation, 4G/5G coverage across Bangkok, Chiang Mai, Phuket and more.",
      ja: "タイ旅行に。SIM uncleのタイeSIMはバンコク・チェンマイ・プーケット全域4G/5G対応、即時開通。",
      ko: "태국 여행에 eSIM을. SIM uncle 태국 eSIM은 방콕, 치앙마이, 푸켓 전역 4G/5G 지원, 즉시 개통.",
      th: "เที่ยวไทย? eSIM ไทยจาก SIM uncle — เปิดใช้งานทันที 4G/5G ครอบคลุมกรุงเทพฯ เชียงใหม่ ภูเก็ต",
    },
    keywords: {
      "zh-TW": ["泰國 eSIM", "泰國上網卡", "泰國旅遊 eSIM", "泰國 eSIM 推薦"],
      "zh-CN": ["泰国 eSIM", "泰国上网卡", "泰国旅游 eSIM"],
      en: ["Thailand eSIM", "best eSIM for Thailand", "Thailand travel eSIM", "Bangkok eSIM"],
      ja: ["タイeSIM", "タイ旅行 eSIM", "バンコク eSIM"],
      ko: ["태국 eSIM", "태국 여행 eSIM", "방콕 eSIM"],
      th: ["eSIM ไทย", "ซิมไทย", "eSIM ท่องเที่ยวไทย"],
    },
    emoji: "🇹🇭",
    highlights: {
      "zh-TW": ["覆蓋全泰國 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "曼谷、清邁、普吉島全覆蓋"],
      en: ["Full Thailand 4G/5G coverage", "Instant activation via QR code", "No SIM swap needed", "Bangkok, Chiang Mai, Phuket covered"],
      ja: ["タイ全土4G/5G対応", "QRコードで即時開通", "SIM交換不要", "バンコク・チェンマイ・プーケット対応"],
      ko: ["태국 전역 4G/5G 지원", "QR코드로 즉시 개통", "SIM 교체 불필요", "방콕, 치앙마이, 푸켓 지원"],
      th: ["ครอบคลุม 4G/5G ทั่วไทย", "เปิดใช้งานทันทีผ่าน QR Code", "ไม่ต้องเปลี่ยนซิม", "กรุงเทพฯ เชียงใหม่ ภูเก็ต"],
      "zh-CN": ["覆盖全泰国 4G/5G 网络", "即时激活，扫码即用", "无需换 SIM 卡", "曼谷、清迈、普吉岛全覆盖"],
    },
    faqs: {
      "zh-TW": [
        { q: "泰國 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達泰國後掃描 QR Code 即可激活，全程不需換 SIM 卡。" },
        { q: "泰國 eSIM 支援哪些網絡？", a: "我們的泰國 eSIM 方案支援 AIS、DTAC 或 True Move H 網絡，覆蓋全泰國 4G/5G 訊號。" },
        { q: "泰國 eSIM 有無限數據嗎？", a: "有！我們提供多款泰國無限數據 eSIM 方案，適合長期旅遊或需要大量數據的用戶。" },
      ],
      en: [
        { q: "How do I activate my Thailand eSIM?", a: "After purchase, you'll receive a QR code instantly. Scan it when you arrive in Thailand to activate." },
        { q: "Which networks does Thailand eSIM support?", a: "Our Thailand eSIM plans run on AIS, DTAC, or True Move H networks with nationwide 4G/5G coverage." },
        { q: "Is unlimited data available for Thailand?", a: "Yes! We offer unlimited data Thailand eSIM plans, perfect for extended stays or heavy data users." },
      ],
    },
  },
  {
    slug: "korea",
    searchQuery: "Korea",
    names: {
      "zh-TW": "韓國 eSIM 推薦 2026",
      "zh-CN": "韩国 eSIM 推荐 2026",
      en: "Best eSIM for Korea 2026",
      ja: "韓国eSIM おすすめ 2026",
      ko: "한국 eSIM 추천 2026",
      th: "eSIM เกาหลี แนะนำ 2026",
    },
    descriptions: {
      "zh-TW": "去韓國旅遊？選購 SIM uncle 韓國 eSIM，即買即用，支援 4G/5G 網絡，首爾、釜山、濟州島全覆蓋，無需換 SIM 卡。",
      "zh-CN": "去韩国旅游？选购 SIM uncle 韩国 eSIM，即买即用，支持 4G/5G 网络，首尔、釜山、济州岛全覆盖，无需换 SIM 卡。",
      en: "Visiting Korea? Get a Korea eSIM from SIM uncle — instant activation, 4G/5G coverage across Seoul, Busan, Jeju Island and more.",
      ja: "韓国旅行に。SIM uncleの韓国eSIMはソウル・釜山・済州島全域4G/5G対応、即時開通。",
      ko: "한국 여행에 eSIM을. SIM uncle 한국 eSIM은 서울, 부산, 제주도 전역 4G/5G 지원, 즉시 개통.",
      th: "เที่ยวเกาหลี? eSIM เกาหลีจาก SIM uncle — เปิดใช้งานทันที 4G/5G ครอบคลุมโซล ปูซาน เกาะเชจู",
    },
    keywords: {
      "zh-TW": ["韓國 eSIM", "韓國上網卡", "韓國旅遊 eSIM", "韓國 eSIM 推薦"],
      "zh-CN": ["韩国 eSIM", "韩国上网卡", "韩国旅游 eSIM"],
      en: ["Korea eSIM", "best eSIM for Korea", "South Korea travel eSIM", "Seoul eSIM"],
      ja: ["韓国eSIM", "韓国旅行 eSIM", "ソウル eSIM"],
      ko: ["한국 eSIM", "한국 여행 eSIM", "서울 eSIM"],
      th: ["eSIM เกาหลี", "ซิมเกาหลี", "eSIM ท่องเที่ยวเกาหลี"],
    },
    emoji: "🇰🇷",
    highlights: {
      "zh-TW": ["覆蓋全韓國 4G/5G 網絡", "首爾、釜山、濟州島全覆蓋", "即時激活，掃碼即用", "無需換 SIM 卡"],
      en: ["Full Korea 4G/5G coverage", "Seoul, Busan, Jeju covered", "Instant activation via QR code", "No SIM swap needed"],
      ja: ["韓国全土4G/5G対応", "ソウル・釜山・済州島対応", "QRコードで即時開通", "SIM交換不要"],
      ko: ["한국 전역 4G/5G 지원", "서울, 부산, 제주도 지원", "QR코드로 즉시 개통", "SIM 교체 불필요"],
      th: ["ครอบคลุม 4G/5G ทั่วเกาหลี", "โซล ปูซาน เกาะเชจู", "เปิดใช้งานทันทีผ่าน QR Code", "ไม่ต้องเปลี่ยนซิม"],
      "zh-CN": ["覆盖全韩国 4G/5G 网络", "首尔、釜山、济州岛全覆盖", "即时激活，扫码即用", "无需换 SIM 卡"],
    },
    faqs: {
      "zh-TW": [
        { q: "韓國 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達韓國後掃描 QR Code 即可激活，全程不需換 SIM 卡。" },
        { q: "韓國 eSIM 支援哪些網絡？", a: "我們的韓國 eSIM 方案支援 SK Telecom、KT 或 LG U+ 網絡，覆蓋全韓國 4G/5G 訊號。" },
        { q: "韓國 eSIM 可以在首爾地鐵使用嗎？", a: "可以！我們的韓國 eSIM 方案在首爾地鐵全線均有訊號覆蓋，方便你隨時導航。" },
      ],
      "zh-CN": [
        { q: "韩国 eSIM 如何激活？", a: "购买后即时收到 QR Code，到达韩国后扫描 QR Code 即可激活，全程不需换 SIM 卡。" },
        { q: "韩国 eSIM 支持哪些网络？", a: "我们的韩国 eSIM 方案支持 SK Telecom、KT 或 LG U+ 网络，覆盖全韩国 4G/5G 信号。" },
        { q: "韩国 eSIM 可以在首尔地铁使用吗？", a: "可以！我们的韩国 eSIM 方案在首尔地铁全线均有信号覆盖，方便随时导航。" },
      ],
      en: [
        { q: "How do I activate my Korea eSIM?", a: "After purchase, you'll receive a QR code instantly. Scan it when you arrive in Korea to activate." },
        { q: "Which networks does Korea eSIM support?", a: "Our Korea eSIM plans run on SK Telecom, KT, or LG U+ networks with nationwide 4G/5G coverage." },
        { q: "Does Korea eSIM work on Seoul Metro?", a: "Yes! Our Korea eSIM plans have full coverage on the Seoul Metro, so you can navigate anytime." },
      ],
      ja: [
        { q: "韓国eSIMの開通方法は？", a: "購入後すぐにQRコードが届きます。韓国到着後にQRコードをスキャンして開通してください。SIM交換は不要です。" },
        { q: "韓国eSIMはどのネットワークに対応していますか？", a: "SK Telecom、KT、LG U+ネットワークに対応し、韓国全土で4G/5Gをご利用いただけます。" },
        { q: "ソウルの地下鉄でも使えますか？", a: "はい！ソウル地下鉄全線でご利用いただけます。" },
      ],
      ko: [
        { q: "한국 eSIM은 어떻게 개통하나요?", a: "구매 후 즉시 QR코드를 받으실 수 있습니다. 한국 도착 후 QR코드를 스캔하면 개통됩니다. SIM 교체가 필요 없습니다." },
        { q: "한국 eSIM은 어떤 네트워크를 지원하나요?", a: "SK텔레콤, KT, LG U+ 네트워크를 지원하며 전국 4G/5G 커버리지를 제공합니다." },
        { q: "서울 지하철에서도 사용할 수 있나요?", a: "네! 서울 지하철 전 노선에서 사용 가능합니다." },
      ],
      th: [
        { q: "วิธีเปิดใช้งาน eSIM เกาหลีอย่างไร?", a: "หลังจากซื้อจะได้รับ QR Code ทันที เมื่อถึงเกาหลีให้สแกน QR Code เพื่อเปิดใช้งาน ไม่ต้องเปลี่ยนซิม" },
        { q: "eSIM เกาหลีรองรับเครือข่ายอะไรบ้าง?", a: "รองรับเครือข่าย SK Telecom, KT และ LG U+ ครอบคลุม 4G/5G ทั่วเกาหลี" },
        { q: "ใช้งานในรถไฟใต้ดินโซลได้ไหม?", a: "ได้เลย! ครอบคลุมทุกสายรถไฟใต้ดินในโซล" },
      ],
    },
  },
  {
    slug: "taiwan",
    searchQuery: "Taiwan",
    names: { "zh-TW": "台灣 eSIM 推薦 2026", "zh-CN": "台湾 eSIM 推荐 2026", en: "Best eSIM for Taiwan 2026", ja: "台湾eSIM おすすめ 2026", ko: "대만 eSIM 추천 2026", th: "eSIM ไต้หวัน แนะนำ 2026" },
    descriptions: { "zh-TW": "去台灣旅遊？選購 SIM uncle 台灣 eSIM，即買即用，支援 4G/5G 網絡，台北、高雄、台南全覆蓋。", "zh-CN": "去台湾旅游？选购 SIM uncle 台湾 eSIM，即买即用，支持 4G/5G 网络。", en: "Visiting Taiwan? Get a Taiwan eSIM from SIM uncle — instant activation, 4G/5G coverage across Taipei, Kaohsiung and more.", ja: "台湾旅行にeSIMを。SIM uncleの台湾eSIMは台北・高雄全域4G/5G対応、即時開通。", ko: "대만 여행에 eSIM을. SIM uncle 대만 eSIM은 타이베이, 가오슝 전역 4G/5G 지원, 즉시 개통.", th: "เที่ยวไต้หวัน? eSIM ไต้หวันจาก SIM uncle — เปิดใช้งานทันที 4G/5G ครอบคลุมไทเป เกาสง" },
    keywords: { "zh-TW": ["台灣 eSIM", "台灣上網卡", "台灣旅遊 eSIM", "台北 eSIM"], "zh-CN": ["台湾 eSIM", "台湾上网卡", "台北 eSIM"], en: ["Taiwan eSIM", "best eSIM for Taiwan", "Taipei eSIM", "Taiwan travel eSIM"], ja: ["台湾eSIM", "台北eSIM"], ko: ["대만 eSIM", "타이베이 eSIM"], th: ["eSIM ไต้หวัน", "eSIM ไทเป"] },
    emoji: "🇹🇼",
    highlights: {
      "zh-TW": ["覆蓋全台灣 4G/5G 網絡", "台北、高雄、台南均有覆蓋", "即時激活，掃碼即用", "無需換 SIM 卡"],
      "zh-CN": ["覆盖全台湾 4G/5G 网络", "台北、高雄、台南全覆盖", "即时激活，扫码即用", "无需换 SIM 卡"],
      en: ["Full Taiwan 4G/5G coverage", "Covers Taipei, Kaohsiung & Tainan", "Instant QR activation", "No SIM swap"],
      ja: ["台湾全土4G/5G対応", "台北・高雄・台南対応", "QRコードで即時開通", "SIM交換不要"],
      ko: ["대만 전역 4G/5G 지원", "타이베이, 가오슝, 타이난 지원", "QR코드로 즉시 개통", "SIM 교체 불필요"],
      th: ["ครอบคลุม 4G/5G ทั่วไต้หวัน", "ไทเป เกาสง ไถหนาน", "เปิดใช้งานทันทีผ่าน QR Code", "ไม่ต้องเปลี่ยนซิม"],
    },
    faqs: {
      "zh-TW": [
        { q: "台灣 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達台灣後掃描 QR Code 即可激活，全程不需換 SIM 卡。" },
        { q: "台灣 eSIM 支援哪些網絡？", a: "我們的台灣 eSIM 方案支援中華電信、台灣大哥大或遠傳電信網絡，覆蓋全台灣 4G/5G 訊號。" },
        { q: "台灣 eSIM 可以在台北捷運使用嗎？", a: "可以！我們的台灣 eSIM 方案在台北捷運全線均有訊號覆蓋，方便你隨時導航。" },
      ],
      "zh-CN": [
        { q: "台湾 eSIM 如何激活？", a: "购买后即时收到 QR Code，到达台湾后扫描 QR Code 即可激活，全程不需换 SIM 卡。" },
        { q: "台湾 eSIM 支持哪些网络？", a: "我们的台湾 eSIM 方案支持中华电信、台湾大哥大或远传电信网络，覆盖全台湾 4G/5G 信号。" },
        { q: "台湾 eSIM 可以在台北捷运使用吗？", a: "可以！我们的台湾 eSIM 方案在台北捷运全线均有信号覆盖，方便随时导航。" },
      ],
      en: [
        { q: "How do I activate my Taiwan eSIM?", a: "After purchase, scan the QR code upon arrival in Taiwan to activate. No SIM swap needed." },
        { q: "Which networks does Taiwan eSIM support?", a: "Our Taiwan eSIM plans run on Chunghwa Telecom, Taiwan Mobile, or FarEasTone networks with nationwide 4G/5G coverage." },
        { q: "Does Taiwan eSIM work on Taipei MRT?", a: "Yes! Our Taiwan eSIM plans have full coverage on the Taipei MRT, so you can navigate anytime." },
      ],
      ja: [
        { q: "台湾eSIMの開通方法は？", a: "購入後すぐにQRコードが届きます。台湾到着後にQRコードをスキャンして開通してください。SIM交換は不要です。" },
        { q: "台湾eSIMはどのネットワークに対応していますか？", a: "中華電信、台湾大哥大、遠傳電信ネットワークに対応し、台湾全土で4G/5Gをご利用いただけます。" },
        { q: "台北MRTでも使えますか？", a: "はい！台北MRT全線でご利用いただけます。" },
      ],
      ko: [
        { q: "대만 eSIM은 어떻게 개통하나요?", a: "구매 후 즉시 QR코드를 받으실 수 있습니다. 대만 도착 후 QR코드를 스캔하면 개통됩니다. SIM 교체가 필요 없습니다." },
        { q: "대만 eSIM은 어떤 네트워크를 지원하나요?", a: "중화전신, 대만대가대, 원전전신 네트워크를 지원하며 전국 4G/5G 커버리지를 제공합니다." },
        { q: "타이베이 MRT에서도 사용할 수 있나요?", a: "네! 타이베이 MRT 전 노선에서 사용 가능합니다." },
      ],
      th: [
        { q: "วิธีเปิดใช้งาน eSIM ไต้หวันอย่างไร?", a: "หลังจากซื้อจะได้รับ QR Code ทันที เมื่อถึงไต้หวันให้สแกน QR Code เพื่อเปิดใช้งาน ไม่ต้องเปลี่ยนซิม" },
        { q: "eSIM ไต้หวันรองรับเครือข่ายอะไรบ้าง?", a: "รองรับเครือข่าย Chunghwa Telecom, Taiwan Mobile และ FarEasTone ครอบคลุม 4G/5G ทั่วไต้หวัน" },
        { q: "ใช้งานในรถไฟฟ้า MRT ไทเปได้ไหม?", a: "ได้เลย! ครอบคลุมทุกสายรถไฟฟ้า MRT ในไทเป" },
      ],
    },
  },
  {
    slug: "singapore",
    searchQuery: "Singapore",
    names: { "zh-TW": "新加坡 eSIM 推薦 2026", "zh-CN": "新加坡 eSIM 推荐 2026", en: "Best eSIM for Singapore 2026", ja: "シンガポールeSIM おすすめ 2026", ko: "싱가포르 eSIM 추천 2026", th: "eSIM สิงคโปร์ แนะนำ 2026" },
    descriptions: { "zh-TW": "去新加坡旅遊？選購 SIM uncle 新加坡 eSIM，即買即用，支援 4G/5G 網絡，無需換 SIM 卡。", "zh-CN": "去新加坡旅游？选购 SIM uncle 新加坡 eSIM，即买即用，支持 4G/5G 网络。", en: "Visiting Singapore? Get a Singapore eSIM from SIM uncle — instant activation, 4G/5G coverage, no SIM swap needed.", ja: "シンガポール旅行にeSIMを。SIM uncleのシンガポールeSIMは即時開通、4G/5G対応。", ko: "싱가포르 여행에 eSIM을. SIM uncle 싱가포르 eSIM은 즉시 개통, 4G/5G 지원.", th: "เที่ยวสิงคโปร์? eSIM สิงคโปร์จาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["新加坡 eSIM", "新加坡上網卡", "新加坡旅遊 eSIM"], "zh-CN": ["新加坡 eSIM", "新加坡上网卡"], en: ["Singapore eSIM", "best eSIM for Singapore", "Singapore travel eSIM"], ja: ["シンガポールeSIM"], ko: ["싱가포르 eSIM"], th: ["eSIM สิงคโปร์"] },
    emoji: "🇸🇬",
    highlights: { "zh-TW": ["覆蓋全新加坡 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "港幣結算"], en: ["Full Singapore 4G/5G coverage", "Instant QR activation", "No SIM swap", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "新加坡 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達新加坡後掃描 QR Code 即可激活。" }], en: [{ q: "How do I activate my Singapore eSIM?", a: "After purchase, scan the QR code upon arrival in Singapore to activate." }] },
  },
  {
    slug: "usa",
    searchQuery: "United States",
    names: { "zh-TW": "美國 eSIM 推薦 2026", "zh-CN": "美国 eSIM 推荐 2026", en: "Best eSIM for USA 2026", ja: "アメリカeSIM おすすめ 2026", ko: "미국 eSIM 추천 2026", th: "eSIM สหรัฐอเมริกา แนะนำ 2026" },
    descriptions: { "zh-TW": "去美國旅遊？選購 SIM uncle 美國 eSIM，即買即用，支援 4G/5G 網絡，紐約、洛杉磯、拉斯維加斯全覆蓋。", "zh-CN": "去美国旅游？选购 SIM uncle 美国 eSIM，即买即用，支持 4G/5G 网络，纽约、洛杉矶、拉斯维加斯全覆盖。", en: "Visiting the USA? Get a USA eSIM from SIM uncle — instant activation, 4G/5G coverage across New York, Los Angeles, Las Vegas and more.", ja: "アメリカ旅行にeSIMを。SIM uncleのアメリカeSIMはニューヨーク・ロサンゼルス全域4G/5G対応、即時開通。", ko: "미국 여행에 eSIM을. SIM uncle 미국 eSIM은 뉴욕, LA, 라스베가스 전역 4G/5G 지원, 즉시 개통.", th: "เที่ยวสหรัฐอเมริกา? eSIM USA จาก SIM uncle — เปิดใช้งานทันที 4G/5G ครอบคลุมนิวยอร์ก แอลเอ ลาสเวกัส" },
    keywords: { "zh-TW": ["美國 eSIM", "美國上網卡", "美國旅遊 eSIM", "紐約 eSIM"], "zh-CN": ["美国 eSIM", "美国上网卡", "纽约 eSIM"], en: ["USA eSIM", "best eSIM for USA", "America eSIM", "New York eSIM"], ja: ["アメリカeSIM", "ニューヨークeSIM"], ko: ["미국 eSIM", "뉴욕 eSIM"], th: ["eSIM USA", "eSIM นิวยอร์ก"] },
    emoji: "🇺🇸",
    highlights: { "zh-TW": ["覆蓋全美國 4G/5G 網絡", "紐約、洛杉磯、拉斯維加斯均有覆蓋", "即時激活，掃碼即用", "無需換 SIM 卡"], en: ["Full USA 4G/5G coverage", "Covers NY, LA, Las Vegas & more", "Instant QR activation", "No SIM swap"] },
    faqs: { "zh-TW": [{ q: "美國 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達美國後掃描 QR Code 即可激活。" }, { q: "美國 eSIM 覆蓋哪些州份？", a: "我們的美國 eSIM 覆蓋全美 50 個州，包括夏威夷及阿拉斯加。" }], en: [{ q: "How do I activate my USA eSIM?", a: "After purchase, scan the QR code upon arrival in the USA to activate." }, { q: "Which states does the USA eSIM cover?", a: "Our USA eSIM covers all 50 states including Hawaii and Alaska." }] },
  },
  {
    slug: "china",
    searchQuery: "China",
    names: { "zh-TW": "中國 eSIM 推薦 2026", "zh-CN": "中国 eSIM 推荐 2026", en: "Best eSIM for China 2026", ja: "中国eSIM おすすめ 2026", ko: "중국 eSIM 추천 2026", th: "eSIM จีน แนะนำ 2026" },
    descriptions: { "zh-TW": "去中國旅遊？選購 SIM uncle 中國 eSIM，即買即用，支援 4G/5G 網絡，北京、上海、廣州全覆蓋，無需換 SIM 卡。", "zh-CN": "去中国旅游？选购 SIM uncle 中国 eSIM，即买即用，支持 4G/5G 网络，北京、上海、广州全覆盖。", en: "Visiting China? Get a China eSIM from SIM uncle — instant activation, 4G/5G coverage across Beijing, Shanghai, Guangzhou and more.", ja: "中国旅行にeSIMを。SIM uncleの中国eSIMは北京・上海・広州全域4G/5G対応、即時開通。", ko: "중국 여행에 eSIM을. SIM uncle 중국 eSIM은 베이징, 상하이, 광저우 전역 4G/5G 지원, 즉시 개통.", th: "เที่ยวจีน? eSIM จีนจาก SIM uncle — เปิดใช้งานทันที 4G/5G ครอบคลุมปักกิ่ง เซี่ยงไฮ้ กวางโจว" },
    keywords: { "zh-TW": ["中國 eSIM", "中國上網卡", "中國旅遊 eSIM", "北京 eSIM"], "zh-CN": ["中国 eSIM", "中国上网卡", "北京 eSIM"], en: ["China eSIM", "best eSIM for China", "Beijing eSIM", "Shanghai eSIM"], ja: ["中国eSIM", "北京eSIM"], ko: ["중국 eSIM", "베이징 eSIM"], th: ["eSIM จีน", "eSIM ปักกิ่ง"] },
    emoji: "🇨🇳",
    highlights: { "zh-TW": ["覆蓋全中國 4G/5G 網絡", "北京、上海、廣州均有覆蓋", "即時激活，掃碼即用", "無需換 SIM 卡"], en: ["Full China 4G/5G coverage", "Covers Beijing, Shanghai & Guangzhou", "Instant QR activation", "No SIM swap"] },
    faqs: { "zh-TW": [{ q: "中國 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達中國後掃描 QR Code 即可激活。" }, { q: "中國 eSIM 可以訪問 Google 嗎？", a: "部分中國 eSIM 方案包含 VPN 功能，可訪問 Google、YouTube 等服務。請選擇含 VPN 的方案。" }], en: [{ q: "How do I activate my China eSIM?", a: "After purchase, scan the QR code upon arrival in China to activate." }, { q: "Can I access Google with China eSIM?", a: "Some China eSIM plans include VPN functionality to access Google, YouTube and other services. Choose a plan that includes VPN." }] },
  },
  {
    slug: "india",
    searchQuery: "India",
    names: { "zh-TW": "印度 eSIM 推薦 2026", "zh-CN": "印度 eSIM 推荐 2026", en: "Best eSIM for India 2026", ja: "インドeSIM おすすめ 2026", ko: "인도 eSIM 추천 2026", th: "eSIM อินเดีย แนะนำ 2026" },
    descriptions: { "zh-TW": "去印度旅遊？選購 SIM uncle 印度 eSIM，即買即用，支援 4G/5G 網絡，無需換 SIM 卡。", "zh-CN": "去印度旅游？选购 SIM uncle 印度 eSIM，即买即用，支持 4G/5G 网络。", en: "Visiting India? Get an India eSIM from SIM uncle — instant activation, 4G/5G coverage, no SIM swap needed.", ja: "インド旅行にeSIMを。SIM uncleのインドeSIMは即時開通、4G/5G対応。", ko: "인도 여행에 eSIM을. SIM uncle 인도 eSIM은 즉시 개통, 4G/5G 지원.", th: "เที่ยวอินเดีย? eSIM อินเดียจาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["印度 eSIM", "印度上網卡", "印度旅遊 eSIM"], "zh-CN": ["印度 eSIM", "印度上网卡"], en: ["India eSIM", "best eSIM for India", "India travel eSIM"], ja: ["インドeSIM"], ko: ["인도 eSIM"], th: ["eSIM อินเดีย"] },
    emoji: "🇮🇳",
    highlights: { "zh-TW": ["覆蓋全印度 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "港幣結算"], en: ["Full India 4G/5G coverage", "Instant QR activation", "No SIM swap", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "印度 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達印度後掃描 QR Code 即可激活。" }], en: [{ q: "How do I activate my India eSIM?", a: "After purchase, scan the QR code upon arrival in India to activate." }] },
  },
  {
    slug: "australia",
    searchQuery: "Australia",
    names: { "zh-TW": "澳洲 eSIM 推薦 2026", "zh-CN": "澳大利亚 eSIM 推荐 2026", en: "Best eSIM for Australia 2026", ja: "オーストラリアeSIM おすすめ 2026", ko: "호주 eSIM 추천 2026", th: "eSIM ออสเตรเลีย แนะนำ 2026" },
    descriptions: { "zh-TW": "前往澳洲旅遊？選購 SIM uncle 澳洲 eSIM，即買即用，支援 4G/5G 網絡。", "zh-CN": "前往澳大利亚旅游？选购 SIM uncle 澳大利亚 eSIM，即买即用，支持 4G/5G 网络。", en: "Traveling to Australia? Get an Australia eSIM from SIM uncle — instant activation, 4G/5G coverage.", ja: "オーストラリア旅行にeSIMを。即時開通、4G/5G対応。", ko: "호주 여행에 eSIM을. 즉시 개통, 4G/5G 지원.", th: "เดินทางไปออสเตรเลีย? eSIM ออสเตรเลียจาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["澳洲 eSIM", "澳洲上網卡", "澳洲旅遊 eSIM"], "zh-CN": ["澳大利亚 eSIM", "澳洲上网卡"], en: ["Australia eSIM", "best eSIM for Australia", "Australia travel eSIM"], ja: ["オーストラリアeSIM"], ko: ["호주 eSIM"], th: ["eSIM ออสเตรเลีย"] },
    emoji: "🇦🇺",
    highlights: { "zh-TW": ["覆蓋全澳洲 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "港幣結算"], en: ["Full Australia 4G/5G coverage", "Instant QR activation", "No SIM swap", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "澳洲 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達澳洲後掃描 QR Code 即可激活。" }], en: [{ q: "How do I activate my Australia eSIM?", a: "After purchase, scan the QR code upon arrival in Australia to activate." }] },
  },
  {
    slug: "dubai",
    searchQuery: "UAE",
    names: { "zh-TW": "杜拜 eSIM 推薦 2026", "zh-CN": "迪拜 eSIM 推荐 2026", en: "Best eSIM for Dubai 2026", ja: "ドバイeSIM おすすめ 2026", ko: "두바이 eSIM 추천 2026", th: "eSIM ดูไบ แนะนำ 2026" },
    descriptions: { "zh-TW": "前往杜拜旅遊？選購 SIM uncle 杜拜 eSIM，即買即用，支援 4G/5G 網絡，無需換 SIM 卡。", "zh-CN": "前往迪拜旅游？选购 SIM uncle 迪拜 eSIM，即买即用，支持 4G/5G 网络。", en: "Traveling to Dubai? Get a Dubai eSIM from SIM uncle — instant activation, 4G/5G coverage, no SIM swap needed.", ja: "ドバイ旅行にeSIMを。SIM uncleのドバイeSIMは即時開通、4G/5G対応。", ko: "두바이 여행에 eSIM을. SIM uncle 두바이 eSIM은 즉시 개통, 4G/5G 지원.", th: "เดินทางไปดูไบ? eSIM ดูไบจาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["杜拜 eSIM", "杜拜上網卡", "杜拜旅遊 eSIM", "UAE eSIM"], "zh-CN": ["迪拜 eSIM", "迪拜上网卡", "UAE eSIM"], en: ["Dubai eSIM", "best eSIM for Dubai", "UAE eSIM", "Dubai travel eSIM"], ja: ["ドバイeSIM", "UAEeSIM"], ko: ["두바이 eSIM", "UAE eSIM"], th: ["eSIM ดูไบ", "eSIM UAE"] },
    emoji: "🇦🇪",
    highlights: { "zh-TW": ["覆蓋杜拜及全 UAE 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "港幣結算"], en: ["Dubai & UAE 4G/5G coverage", "Instant QR activation", "No SIM swap", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "杜拜 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達杜拜後掃描 QR Code 即可激活。" }, { q: "杜拜 eSIM 覆蓋哪些地區？", a: "我們的杜拜 eSIM 方案覆蓋整個阿聯酋（UAE），包括杜拜、阿布扎比、沙迦等城市。" }], en: [{ q: "How do I activate my Dubai eSIM?", a: "After purchase, scan the QR code upon arrival in Dubai to activate instantly." }, { q: "What areas does the Dubai eSIM cover?", a: "Our Dubai eSIM covers the entire UAE including Dubai, Abu Dhabi, and Sharjah." }] },
  },
  {
    slug: "uae",
    searchQuery: "UAE",
    names: { "zh-TW": "阿聯酋 eSIM 推薦 2026", "zh-CN": "阿联酋 eSIM 推荐 2026", en: "Best eSIM for UAE 2026", ja: "UAEeSIM おすすめ 2026", ko: "UAE eSIM 추천 2026", th: "eSIM UAE แนะนำ 2026" },
    descriptions: { "zh-TW": "前往阿聯酋旅遊？選購 SIM uncle 阿聯酋 eSIM，即買即用，支援 4G/5G 網絡。", "zh-CN": "前往阿联酋旅游？选购 SIM uncle 阿联酋 eSIM，即买即用，支持 4G/5G 网络。", en: "Traveling to UAE? Get a UAE eSIM from SIM uncle — instant activation, 4G/5G coverage.", ja: "UAE旅行にeSIMを。即時開通、4G/5G対応。", ko: "UAE 여행에 eSIM을. 즉시 개통, 4G/5G 지원.", th: "เดินทางไป UAE? eSIM UAE จาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["阿聯酋 eSIM", "UAE eSIM", "阿布扎比 eSIM"], "zh-CN": ["阿联酋 eSIM", "UAE eSIM"], en: ["UAE eSIM", "best eSIM for UAE", "Abu Dhabi eSIM"], ja: ["UAEeSIM"], ko: ["UAE eSIM"], th: ["eSIM UAE"] },
    emoji: "🇦🇪",
    highlights: { "zh-TW": ["覆蓋全 UAE 4G/5G 網絡", "即時激活，掃碼即用", "無需換 SIM 卡", "港幣結算"], en: ["Full UAE 4G/5G coverage", "Instant QR activation", "No SIM swap", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "阿聯酋 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達阿聯酋後掃描 QR Code 即可激活。" }], en: [{ q: "How do I activate my UAE eSIM?", a: "After purchase, scan the QR code upon arrival in UAE to activate." }] },
  },
  {
    slug: "turkey",
    searchQuery: "Turkey",
    names: { "zh-TW": "土耳其 eSIM 推薦 2026", "zh-CN": "土耳其 eSIM 推荐 2026", en: "Best eSIM for Turkey 2026", ja: "トルコeSIM おすすめ 2026", ko: "터키 eSIM 추천 2026", th: "eSIM ตุรกี แนะนำ 2026" },
    descriptions: { "zh-TW": "前往土耳其旅遊？選購 SIM uncle 土耳其 eSIM，即買即用，支援 4G/5G 網絡，無需換 SIM 卡。", "zh-CN": "前往土耳其旅游？选购 SIM uncle 土耳其 eSIM，即买即用，支持 4G/5G 网络。", en: "Traveling to Turkey? Get a Turkey eSIM from SIM uncle — instant activation, 4G/5G coverage, no SIM swap needed.", ja: "トルコ旅行にeSIMを。SIM uncleのトルコeSIMは即時開通、4G/5G対応。", ko: "터키 여행에 eSIM을. SIM uncle 터키 eSIM은 즉시 개통, 4G/5G 지원.", th: "เดินทางไปตุรกี? eSIM ตุรกีจาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["土耳其 eSIM", "土耳其上網卡", "土耳其旅遊 eSIM", "伊斯坦堡 eSIM"], "zh-CN": ["土耳其 eSIM", "土耳其上网卡", "伊斯坦布尔 eSIM"], en: ["Turkey eSIM", "best eSIM for Turkey", "Istanbul eSIM", "Turkey travel eSIM"], ja: ["トルコeSIM", "イスタンブールeSIM"], ko: ["터키 eSIM", "이스탄불 eSIM"], th: ["eSIM ตุรกี", "eSIM อิสตันบูล"] },
    emoji: "🇹🇷",
    highlights: { "zh-TW": ["覆蓋全土耳其 4G/5G 網絡", "伊斯坦堡、卡帕多奇亞均有覆蓋", "即時激活，掃碼即用", "港幣結算"], en: ["Full Turkey 4G/5G coverage", "Covers Istanbul & Cappadocia", "Instant QR activation", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "土耳其 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達土耳其後掃描 QR Code 即可激活。" }, { q: "土耳其 eSIM 覆蓋哪些城市？", a: "我們的土耳其 eSIM 覆蓋全國，包括伊斯坦堡、安卡拉、卡帕多奇亞等熱門旅遊地點。" }], en: [{ q: "How do I activate my Turkey eSIM?", a: "After purchase, scan the QR code upon arrival in Turkey to activate instantly." }, { q: "Which cities does Turkey eSIM cover?", a: "Our Turkey eSIM covers the entire country including Istanbul, Ankara, and Cappadocia." }] },
  },
  {
    slug: "uk",
    searchQuery: "United Kingdom",
    names: { "zh-TW": "英國 eSIM 推薦 2026", "zh-CN": "英国 eSIM 推荐 2026", en: "Best eSIM for UK 2026", ja: "イギリスeSIM おすすめ 2026", ko: "영국 eSIM 추천 2026", th: "eSIM สหราชอาณาจักร แนะนำ 2026" },
    descriptions: { "zh-TW": "前往英國旅遊？選購 SIM uncle 英國 eSIM，即買即用，支援 4G/5G 網絡。", "zh-CN": "前往英国旅游？选购 SIM uncle 英国 eSIM，即买即用，支持 4G/5G 网络。", en: "Traveling to the UK? Get a UK eSIM from SIM uncle — instant activation, 4G/5G coverage.", ja: "イギリス旅行にeSIMを。即時開通、4G/5G対応。", ko: "영국 여행에 eSIM을. 즉시 개통, 4G/5G 지원.", th: "เดินทางไปสหราชอาณาจักร? eSIM UK จาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["英國 eSIM", "英國上網卡", "英國旅遊 eSIM", "倫敦 eSIM"], "zh-CN": ["英国 eSIM", "英国上网卡", "伦敦 eSIM"], en: ["UK eSIM", "best eSIM for UK", "London eSIM", "England eSIM"], ja: ["イギリスeSIM", "ロンドンeSIM"], ko: ["영국 eSIM", "런던 eSIM"], th: ["eSIM UK", "eSIM ลอนดอน"] },
    emoji: "🇬🇧",
    highlights: { "zh-TW": ["覆蓋全英國 4G/5G 網絡", "倫敦、愛丁堡均有覆蓋", "即時激活，掃碼即用", "港幣結算"], en: ["Full UK 4G/5G coverage", "Covers London & Edinburgh", "Instant QR activation", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "英國 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達英國後掃描 QR Code 即可激活。" }], en: [{ q: "How do I activate my UK eSIM?", a: "After purchase, scan the QR code upon arrival in the UK to activate." }] },
  },
  {
    slug: "canada",
    searchQuery: "Canada",
    names: { "zh-TW": "加拿大 eSIM 推薦 2026", "zh-CN": "加拿大 eSIM 推荐 2026", en: "Best eSIM for Canada 2026", ja: "カナダeSIM おすすめ 2026", ko: "캐나다 eSIM 추천 2026", th: "eSIM แคนาดา แนะนำ 2026" },
    descriptions: { "zh-TW": "前往加拿大旅遊？選購 SIM uncle 加拿大 eSIM，即買即用，支援 4G/5G 網絡，無需換 SIM 卡。", "zh-CN": "前往加拿大旅游？选购 SIM uncle 加拿大 eSIM，即买即用，支持 4G/5G 网络。", en: "Traveling to Canada? Get a Canada eSIM from SIM uncle — instant activation, 4G/5G coverage, no SIM swap needed.", ja: "カナダ旅行にeSIMを。SIM uncleのカナダeSIMは即時開通、4G/5G対応。", ko: "캐나다 여행에 eSIM을. SIM uncle 캐나다 eSIM은 즉시 개통, 4G/5G 지원.", th: "เดินทางไปแคนาดา? eSIM แคนาดาจาก SIM uncle — เปิดใช้งานทันที 4G/5G" },
    keywords: { "zh-TW": ["加拿大 eSIM", "加拿大上網卡", "加拿大旅遊 eSIM", "多倫多 eSIM"], "zh-CN": ["加拿大 eSIM", "加拿大上网卡", "多伦多 eSIM"], en: ["Canada eSIM", "best eSIM for Canada", "Toronto eSIM", "Vancouver eSIM"], ja: ["カナダeSIM", "トロントeSIM"], ko: ["캐나다 eSIM", "토론토 eSIM"], th: ["eSIM แคนาดา", "eSIM โตรอนโต"] },
    emoji: "🇨🇦",
    highlights: { "zh-TW": ["覆蓋全加拿大 4G/5G 網絡", "多倫多、溫哥華均有覆蓋", "即時激活，掃碼即用", "港幣結算"], en: ["Full Canada 4G/5G coverage", "Covers Toronto & Vancouver", "Instant QR activation", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "加拿大 eSIM 如何啟動？", a: "購買後即時收到 QR Code，到達加拿大後掃描 QR Code 即可激活。" }, { q: "加拿大 eSIM 覆蓋哪些城市？", a: "我們的加拿大 eSIM 覆蓋全國，包括多倫多、溫哥華、卡加利、蒙特利爾等主要城市。" }], en: [{ q: "How do I activate my Canada eSIM?", a: "After purchase, scan the QR code upon arrival in Canada to activate instantly." }, { q: "Which cities does Canada eSIM cover?", a: "Our Canada eSIM covers major cities including Toronto, Vancouver, Calgary, and Montreal." }] },
  },
  {
    slug: "asia",
    region: "Asia",
    names: { "zh-TW": "亞洲 eSIM 推薦 2026", "zh-CN": "亚洲 eSIM 推荐 2026", en: "Best Asia eSIM 2026", ja: "アジアeSIM おすすめ 2026", ko: "아시아 eSIM 추천 2026", th: "eSIM เอเชีย แนะนำ 2026" },
    descriptions: { "zh-TW": "計劃遊覽多個亞洲國家？選購 SIM uncle 亞洲多國 eSIM，一張 eSIM 覆蓋多個亞洲國家，即買即用。", "zh-CN": "计划游览多个亚洲国家？选购 SIM uncle 亚洲多国 eSIM，一张 eSIM 覆盖多个亚洲国家。", en: "Planning to visit multiple Asian countries? Get an Asia multi-country eSIM from SIM uncle — one eSIM covers multiple destinations.", ja: "アジア複数国を旅行するなら。SIM uncleのアジア周遊eSIMは一枚で複数国に対応。", ko: "여러 아시아 국가를 여행한다면. SIM uncle 아시아 멀티 eSIM은 하나로 여러 나라 커버.", th: "วางแผนเที่ยวหลายประเทศในเอเชีย? eSIM เอเชียจาก SIM uncle — ซิมเดียวครอบคลุมหลายประเทศ" },
    keywords: { "zh-TW": ["亞洲 eSIM", "亞洲多國 eSIM", "亞洲旅遊 eSIM"], "zh-CN": ["亚洲 eSIM", "亚洲多国 eSIM"], en: ["Asia eSIM", "Asia multi-country eSIM", "Asia travel eSIM"], ja: ["アジアeSIM", "アジア周遊eSIM"], ko: ["아시아 eSIM", "아시아 멀티 eSIM"], th: ["eSIM เอเชีย", "eSIM ท่องเที่ยวเอเชีย"] },
    emoji: "🌏",
    highlights: { "zh-TW": ["一張 eSIM 覆蓋多個亞洲國家", "即時激活，掃碼即用", "無需換 SIM 卡", "港幣結算"], en: ["One eSIM for multiple Asian countries", "Instant QR activation", "No SIM swap", "HKD pricing"] },
    faqs: { "zh-TW": [{ q: "亞洲多國 eSIM 覆蓋哪些國家？", a: "我們的亞洲多國 eSIM 方案覆蓋日本、韓國、泰國、新加坡、台灣、香港等多個亞洲熱門目的地，具體覆蓋國家視乎所選方案。" }], en: [{ q: "Which countries does the Asia eSIM cover?", a: "Our Asia multi-country eSIM covers popular destinations including Japan, Korea, Thailand, Singapore, Taiwan, and Hong Kong. Coverage varies by plan." }] },
  },
  {
    slug: "global",
    names: { "zh-TW": "全球 eSIM 推薦 2026", "zh-CN": "全球 eSIM 推荐 2026", en: "Best Global eSIM 2026", ja: "グローバルeSIM おすすめ 2026", ko: "글로벌 eSIM 추천 2026", th: "eSIM โลก แนะนำ 2026" },
    descriptions: { "zh-TW": "計劃環遊世界？選購 SIM uncle 全球 eSIM，一張 eSIM 覆蓋全球多個國家，即買即用，無需換 SIM 卡。", "zh-CN": "计划环游世界？选购 SIM uncle 全球 eSIM，一张 eSIM 覆盖全球多个国家。", en: "Planning a world trip? Get a Global eSIM from SIM uncle — one eSIM covers multiple countries worldwide, instant activation.", ja: "世界旅行するなら。SIM uncleのグローバルeSIMは世界中の複数国に対応。", ko: "세계 여행을 계획한다면. SIM uncle 글로벌 eSIM은 전 세계 여러 나라 커버.", th: "วางแผนเที่ยวรอบโลก? eSIM โลกจาก SIM uncle — ซิมเดียวครอบคลุมหลายประเทศทั่วโลก" },
    keywords: { "zh-TW": ["全球 eSIM", "全球上網卡", "全球旅遊 eSIM"], "zh-CN": ["全球 eSIM", "全球上网卡"], en: ["Global eSIM", "worldwide eSIM", "international eSIM"], ja: ["グローバルeSIM", "世界対応eSIM"], ko: ["글로벌 eSIM", "전세계 eSIM"], th: ["eSIM โลก", "eSIM นานาชาติ"] },
    emoji: "🌍",
    highlights: { "zh-TW": ["覆蓋全球多個國家", "一張 eSIM 多國通用", "即時激活，掃碼即用", "無需換 SIM 卡"], en: ["Covers multiple countries worldwide", "One eSIM for multiple countries", "Instant QR activation", "No SIM swap"] },
    faqs: { "zh-TW": [{ q: "全球 eSIM 覆蓋哪些國家？", a: "我們的全球 eSIM 方案覆蓋 100+ 個國家，具體覆蓋國家視乎所選方案。" }], en: [{ q: "Which countries does the Global eSIM cover?", a: "Our Global eSIM covers 100+ countries worldwide. Coverage varies by plan." }] },
  },
];

const DEST_MAP = Object.fromEntries(DESTINATIONS.map((d) => [d.slug, d]));

// ---- Product Card (with translation) ----
function DestProductCard({
  product,
  markupPct = 0,
}: {
  product: Record<string, unknown>;
  markupPct?: number;
}) {
  const { language } = useLanguage();
  const { formatPrice, currency } = useCurrency();
  const costPrice = parseFloat(String(product.price ?? 0));
  const displayPrice = formatPrice(costPrice, markupPct);

  const rawData = product.dataAmount != null ? parseFloat(String(product.dataAmount)) : null;
  const isUnlimited = rawData !== null && rawData < 0;
  const dataUnit = String(product.dataUnit ?? "GB");
  const isTgt = String(product.productId ?? "").startsWith("tgt_") || String(product.supplier ?? "") === "tgt";
  const isDbDailyPlan = dataUnit.includes("/天") || dataUnit.toLowerCase().includes("/day");

  // Detect daily-quota plans
  const productName = String(product.name ?? "");
  const dailyRe = /(?:([\d.]+)\s*(GB|MB|TB)\/(?:Natural\s+)?day|daily\s+([\d.]+)\s*(GB|MB|TB))/i;
  const dailyMatch = dailyRe.exec(productName);
  const isDailyPlan = isDbDailyPlan || !!(dailyMatch);
  const dailyAmt = isDbDailyPlan && rawData != null && rawData > 0
    ? String(rawData)
    : dailyMatch ? (dailyMatch[1] ?? dailyMatch[3]) : null;
  const dailyUnit = isDbDailyPlan
    ? dataUnit.replace("/天", "").replace("/day", "")
    : dailyMatch ? (dailyMatch[2] ?? dailyMatch[4]).toUpperCase() : null;
  const dailyLabel = isDailyPlan && dailyAmt && dailyUnit
    ? `${dailyAmt}${dailyUnit}/${language === "en" ? "day" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "日"}`
    : null;

  const dataLabel = isUnlimited
    ? (language === "en" ? "Unlimited" : language === "zh-CN" ? "无限" : language === "ja" ? "無制限" : language === "ko" ? "무제한" : language === "th" ? "ไม่จำกัด" : "無限")
    : dailyLabel
    ? dailyLabel
    : rawData != null && rawData > 0
    ? `${rawData}${dataUnit}`
    : "N/A";
  // TGT unlimited: daily plan with positive dataAmount (high-speed cap + unlimited reduced speed)
  const isTgtUnlimited = isTgt && isDbDailyPlan && rawData != null && rawData > 0;
  // Parse throttle speed from product name
  const destThrottleSpeed = (() => {
    const kbpsMatch = productName.match(/(?:低速|throttle(?:d)?\s+(?:to\s+)?)(\d+)\s*kbps/i);
    const mbpsMatch = productName.match(/(?:throttle(?:d)?\s+(?:to\s+)?)(\d+)\s*Mbps/i);
    if (kbpsMatch) return `${kbpsMatch[1]} kbps`;
    if (mbpsMatch) return `${mbpsMatch[1]} Mbps`;
    return null;
  })();
  const destThrottleLabel = isTgtUnlimited
    ? (destThrottleSpeed
        ? (language === "en" ? `+ ${destThrottleSpeed} Unlimited` : language === "zh-CN" ? `+ 降速${destThrottleSpeed}不限量` : language === "ja" ? `+ 低速${destThrottleSpeed}無制限` : language === "ko" ? `+ ${destThrottleSpeed} 무제한` : language === "th" ? `+ ${destThrottleSpeed} ไม่จำกัด` : `+ 降速${destThrottleSpeed}不限量`)
        : (language === "en" ? "+ Unlimited" : language === "zh-CN" ? "+ 降速不限量" : language === "ja" ? "+ 低速無制限" : language === "ko" ? "+ 속도 제한 무제한" : language === "th" ? "+ ไม่จำกัด" : "+ 降速不限量"))
    : null;

  const validityDays = Number(product.validityDays ?? 0);
  const days = `${validityDays} ${language === "en" ? "days" : language === "zh-CN" ? "天" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "天"}`;

  const countries = (product.countries as { id: string; name: string }[]) ?? [];
  const customName = (product as Record<string, unknown>).customName as string | null | undefined;
  const translatedName = toDisplayChinese(
    customName || translatePlanName(productName, language, countries),
    language
  );

  return (
    <Link href={`/products/${encodeProductSlug(String(product.productId ?? ""))}`}>
      <div className="border border-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card group h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3 flex-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-card-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1.5">{translatedName}</h3>
            <div className="flex flex-wrap gap-1">
              {countries.slice(0, 2).map((c) => (
                <Badge key={c.id} variant="secondary" className="text-xs px-1.5 py-0">
                  {translateCountry(c, language)}
                </Badge>
              ))}
              {countries.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">+{countries.length - 2}</Badge>
              )}
            </div>
          </div>
          <div className="text-right ml-2 shrink-0">
            <div className="text-base font-bold text-primary whitespace-nowrap">{displayPrice}</div>
            <div className="text-xs text-muted-foreground">{currency.code}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-foreground">{dataLabel}</div>
            {isDailyPlan
              ? <div className="text-xs text-amber-600">{language === "en" ? "per day" : language === "zh-CN" ? "每日" : language === "ja" ? "毎日" : language === "ko" ? "매일" : language === "th" ? "ต่อวัน" : "每日"}</div>
              : <div className="text-xs text-muted-foreground">{language === "en" ? "Data" : language === "zh-CN" ? "流量" : language === "ja" ? "データ" : language === "ko" ? "데이터" : language === "th" ? "ข้อมูล" : "數據"}</div>
            }
            {destThrottleLabel && (
              <div className="text-xs text-primary/70 font-medium mt-0.5">{destThrottleLabel}</div>
            )}
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-foreground">{validityDays}</div>
            <div className="text-xs text-muted-foreground">{language === "en" ? "Days" : language === "zh-CN" ? "天" : language === "ja" ? "日" : language === "ko" ? "일" : language === "th" ? "วัน" : "天"}</div>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-foreground truncate">{String(product.networkType ?? "4G")}</div>
            <div className="text-xs text-muted-foreground">{language === "en" ? "Network" : language === "zh-CN" ? "网络" : language === "ja" ? "ネット" : language === "ko" ? "네트워크" : language === "th" ? "เครือข่าย" : "網絡"}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---- Main Page ----
export default function DestinationPage() {
  const params = useParams<{ destination: string }>();
  const destination = params.destination?.toLowerCase();
  const config = destination ? DEST_MAP[destination] : undefined;
  const { language } = useLanguage();

  // Filter state
  const [duration, setDuration] = useState("all");
  const [dataSize, setDataSize] = useState("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "validity" | "data">("price_asc");
  const [showAll, setShowAll] = useState(false);

  // Search keyword for related articles
  const articleSearchKeyword = useMemo(() => {
    if (!config) return "";
    const zhName = config.names["zh-TW"] ?? "";
    return zhName.replace(/ eSIM.*$/, "").trim();
  }, [config]);

  const langKey = (["zh-TW", "zh-CN", "en", "ja", "ko", "th"] as const).includes(
    language as "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th"
  )
    ? (language as "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th")
    : "en";

  // Build filter params for query
  const durationFilter = useMemo(() => {
    if (duration === "all") return {};
    const found = DURATION_OPTIONS.find(d => d.label === duration);
    if (!found) return {};
    return { minDays: found.min, maxDays: found.max };
  }, [duration]);

  const dataSizeFilter = useMemo(() => {
    if (dataSize === "all") return {};
    const found = DATA_SIZES.find(d => d.label === dataSize);
    if (!found) return {};
    return { minData: found.min, maxData: found.max };
  }, [dataSize]);

  const queryInput = useMemo(() => ({
    region: config?.region,
    search: config?.searchQuery,
    ...durationFilter,
    ...dataSizeFilter,
    limit: 50,
    offset: 0,
    sortBy,
  }), [config, durationFilter, dataSizeFilter, sortBy]);

  // Fetch settings for markup
  const { data: settings } = trpc.settings.getAll.useQuery(undefined, { staleTime: 60_000 });
  const markupPct = parseFloat(settings?.["markup_pct"] ?? "0");
  const { formatPrice } = useCurrency();

  // Fetch related articles
  const { data: relatedArticles } = trpc.articles.search.useQuery(
    { keyword: articleSearchKeyword, limit: 3 },
    { enabled: !!config && articleSearchKeyword.length > 0, staleTime: 300_000 }
  );

  // Fetch products
  const { data: productsData, isLoading } = trpc.products.list.useQuery(
    queryInput,
    { enabled: !!config, staleTime: 60_000 }
  );

  const products = useMemo(() => {
    const all = (productsData?.products ?? []) as Record<string, unknown>[];
    return showAll ? all : all.slice(0, 9);
  }, [productsData, showAll]);

  if (!config) return <NotFound />;

  const title = config.names[langKey] ?? config.names["en"];
  const description = config.descriptions[langKey] ?? config.descriptions["en"];
  const keywords = config.keywords[langKey] ?? config.keywords["en"];
  const highlights = config.highlights[langKey] ?? config.highlights["en"];
  const faqs = config.faqs[langKey] ?? config.faqs["en"] ?? [];
  const totalCount = productsData?.total ?? 0;

  // Active filter count
  const activeFilters = [duration !== "all", dataSize !== "all"].filter(Boolean).length;

  // Filter label helpers
  const getDurationLabel = (d: typeof DURATION_OPTIONS[0]) => {
    if (langKey === "en") return d.labelEn;
    if (langKey === "zh-CN") return d.labelCN;
    if (langKey === "ja") return d.labelJa;
    if (langKey === "ko") return d.labelKo;
    if (langKey === "th") return d.labelTh;
    return d.label;
  };
  const getDataLabel = (d: typeof DATA_SIZES[0]) => {
    if (langKey === "en") return d.labelEn;
    if (langKey === "zh-CN") return d.labelCN;
    if (langKey === "ja") return d.labelJa;
    if (langKey === "ko") return d.labelKo;
    if (langKey === "th") return d.labelTh;
    return d.label;
  };

  // JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: langKey === "en" ? "Home" : langKey === "zh-CN" ? "首页" : langKey === "ja" ? "ホーム" : langKey === "ko" ? "홈" : langKey === "th" ? "หน้าแรก" : "首頁", item: "https://simuncle.com" },
      { "@type": "ListItem", position: 2, name: langKey === "en" ? "eSIM Plans" : langKey === "zh-CN" ? "eSIM 方案" : langKey === "ja" ? "eSIM プラン" : langKey === "ko" ? "eSIM 요금제" : langKey === "th" ? "แผน eSIM" : "eSIM 方案", item: "https://simuncle.com/products" },
      { "@type": "ListItem", position: 3, name: title, item: `https://simuncle.com/esim/${destination}` },
    ],
  };

  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  } : null;

  // ItemList Schema — list of eSIM products for this destination
  // Uses top-9 products (same as default display) so Google sees real offers
  const allProducts = (productsData?.products ?? []) as Record<string, unknown>[];
  const itemListJsonLd = allProducts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    description: description,
    url: `https://simuncle.com/esim/${destination}`,
    numberOfItems: Math.min(allProducts.length, 9),
    itemListElement: allProducts.slice(0, 9).map((p, idx) => {
      const costPrice = parseFloat(String(p.price ?? 0));
      const displayPriceStr = formatPrice(costPrice, markupPct);
      const rawData = p.dataAmount != null ? parseFloat(String(p.dataAmount)) : null;
      const isUnlimited = rawData !== null && rawData < 0;
      const dataLabel = isUnlimited ? "Unlimited" : rawData != null && rawData > 0 ? `${rawData}${String(p.dataUnit ?? "GB")}` : "";
      const validityDays = Number(p.validityDays ?? 0);
      const pName = String(p.name ?? "");
      const countries = (p.countries as { id: string; name: string }[]) ?? [];
      const translatedPName = toDisplayChinese(translatePlanName(pName, langKey, countries), langKey);
      return {
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Product",
          name: translatedPName,
          description: `${dataLabel ? dataLabel + " data, " : ""}${validityDays} days validity eSIM for ${config.names["en"]}`,
          url: `https://simuncle.com/products/${encodeProductSlug(String(p.productId ?? ""))}`,
          brand: { "@type": "Brand", name: "SIM uncle" },
          category: "eSIM",
          offers: {
            "@type": "Offer",
            priceCurrency: "HKD",
            price: displayPriceStr.replace(/[^0-9.]/g, ""),
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "SIM uncle" },
            url: `https://simuncle.com/products/${encodeProductSlug(String(p.productId ?? ""))}`,
          },
        },
      };
    }),
  } : null;

  const jsonLdArray = [
    breadcrumbJsonLd,
    ...(faqJsonLd ? [faqJsonLd] : []),
    ...(itemListJsonLd ? [itemListJsonLd] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <CustomSEO
        title={title}
        description={description}
        path={`/esim/${destination}`}
        keywords={keywords}
        jsonLd={jsonLdArray as unknown as object}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="container py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">{langKey === "en" ? "Home" : langKey === "zh-CN" ? "首页" : langKey === "ja" ? "ホーム" : langKey === "ko" ? "홈" : langKey === "th" ? "หน้าแรก" : "首頁"}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/products" className="hover:text-primary transition-colors">{langKey === "en" ? "eSIM Plans" : langKey === "zh-CN" ? "eSIM 方案" : langKey === "ja" ? "eSIM プラン" : langKey === "ko" ? "eSIM 요금제" : langKey === "th" ? "แผน eSIM" : "eSIM 方案"}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{title}</span>
          </nav>

          <div className="flex items-start gap-4">
            <span className="text-5xl md:text-6xl">{config.emoji}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl">{description}</p>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 bg-background/80 border border-border rounded-lg p-3">
                {i === 0 && <Wifi className="w-4 h-4 text-primary shrink-0" />}
                {i === 1 && <Zap className="w-4 h-4 text-primary shrink-0" />}
                {i === 2 && <Shield className="w-4 h-4 text-primary shrink-0" />}
                {i === 3 && <Star className="w-4 h-4 text-primary shrink-0" />}
                <span className="text-sm text-foreground">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container py-10">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            {langKey === "en" ? "Filter" : langKey === "zh-CN" ? "筛选" : langKey === "ja" ? "絞り込み" : langKey === "ko" ? "필터" : langKey === "th" ? "กรอง" : "篩選"}
            {activeFilters > 0 && (
              <Badge className="bg-primary text-white text-xs px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                {activeFilters}
              </Badge>
            )}
          </div>

          {/* Duration filter */}
          <Select value={duration} onValueChange={(v) => { setDuration(v); setShowAll(false); }}>
            <SelectTrigger className="w-auto min-w-[130px] h-9 text-sm">
              <SelectValue placeholder={langKey === "en" ? "Duration" : langKey === "zh-CN" ? "天数" : langKey === "ja" ? "日数" : langKey === "ko" ? "기간" : langKey === "th" ? "ระยะเวลา" : "天數"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {langKey === "en" ? "All Durations" : langKey === "zh-CN" ? "所有天数" : langKey === "ja" ? "すべての日数" : langKey === "ko" ? "모든 기간" : langKey === "th" ? "ทุกระยะเวลา" : "所有天數"}
              </SelectItem>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d.label} value={d.label}>{getDurationLabel(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Data size filter */}
          <Select value={dataSize} onValueChange={(v) => { setDataSize(v); setShowAll(false); }}>
            <SelectTrigger className="w-auto min-w-[130px] h-9 text-sm">
              <SelectValue placeholder={langKey === "en" ? "Data" : langKey === "zh-CN" ? "流量" : langKey === "ja" ? "データ量" : langKey === "ko" ? "데이터" : langKey === "th" ? "ข้อมูล" : "數據量"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {langKey === "en" ? "All Data" : langKey === "zh-CN" ? "所有流量" : langKey === "ja" ? "すべてのデータ" : langKey === "ko" ? "모든 데이터" : langKey === "th" ? "ข้อมูลทั้งหมด" : "所有數據量"}
              </SelectItem>
              {DATA_SIZES.map((d) => (
                <SelectItem key={d.label} value={d.label}>{getDataLabel(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as typeof sortBy); setShowAll(false); }}>
            <SelectTrigger className="w-auto min-w-[130px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">{langKey === "en" ? "Price: Low to High" : langKey === "zh-CN" ? "价格：低到高" : langKey === "ja" ? "価格：安い順" : langKey === "ko" ? "가격: 낮은 순" : langKey === "th" ? "ราคา: ต่ำ-สูง" : "價格：低至高"}</SelectItem>
              <SelectItem value="price_desc">{langKey === "en" ? "Price: High to Low" : langKey === "zh-CN" ? "价格：高到低" : langKey === "ja" ? "価格：高い順" : langKey === "ko" ? "가격: 높은 순" : langKey === "th" ? "ราคา: สูง-ต่ำ" : "價格：高至低"}</SelectItem>
              <SelectItem value="validity">{langKey === "en" ? "Duration" : langKey === "zh-CN" ? "天数" : langKey === "ja" ? "日数" : langKey === "ko" ? "기간" : langKey === "th" ? "ระยะเวลา" : "天數"}</SelectItem>
              <SelectItem value="data">{langKey === "en" ? "Data Amount" : langKey === "zh-CN" ? "流量" : langKey === "ja" ? "データ量" : langKey === "ko" ? "데이터" : langKey === "th" ? "ข้อมูล" : "數據量"}</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm text-muted-foreground hover:text-foreground gap-1"
              onClick={() => { setDuration("all"); setDataSize("all"); setShowAll(false); }}
            >
              <X className="w-3 h-3" />
              {langKey === "en" ? "Clear" : langKey === "zh-CN" ? "清除" : langKey === "ja" ? "クリア" : langKey === "ko" ? "초기화" : langKey === "th" ? "ล้าง" : "清除"}
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            {langKey === "en" ? `${totalCount} plans` : langKey === "zh-CN" ? `${totalCount} 个方案` : langKey === "ja" ? `${totalCount} 件` : langKey === "ko" ? `${totalCount}개` : langKey === "th" ? `${totalCount} แผน` : `${totalCount} 個方案`}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <p>{langKey === "en" ? "No plans match your filters." : langKey === "zh-CN" ? "没有符合筛选条件的方案。" : langKey === "ja" ? "条件に合うプランがありません。" : langKey === "ko" ? "필터 조건에 맞는 요금제가 없습니다." : langKey === "th" ? "ไม่มีแผนที่ตรงกับตัวกรอง" : "沒有符合篩選條件的方案。"}</p>
            <Button variant="link" className="mt-2" onClick={() => { setDuration("all"); setDataSize("all"); }}>
              {langKey === "en" ? "Clear filters" : langKey === "zh-CN" ? "清除筛选" : langKey === "ja" ? "フィルターをクリア" : langKey === "ko" ? "필터 초기화" : langKey === "th" ? "ล้างตัวกรอง" : "清除篩選"}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <DestProductCard key={String(p.productId)} product={p} markupPct={markupPct} />
              ))}
            </div>
            {!showAll && (productsData?.products?.length ?? 0) > 9 && (
              <div className="text-center mt-6">
                <Button variant="outline" onClick={() => setShowAll(true)}>
                  {langKey === "en" ? `Show All ${totalCount} Plans` : langKey === "zh-CN" ? `显示全部 ${totalCount} 个方案` : langKey === "ja" ? `全${totalCount}件を表示` : langKey === "ko" ? `전체 ${totalCount}개 보기` : langKey === "th" ? `ดูทั้งหมด ${totalCount} แผน` : `顯示全部 ${totalCount} 個方案`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <div className="container py-10 border-t border-border">
          <h2 className="text-xl font-bold text-foreground mb-6">
            {langKey === "en" ? "Frequently Asked Questions" : langKey === "zh-CN" ? "常见问题" : langKey === "ja" ? "よくある質問" : langKey === "ko" ? "자주 묻는 질문" : langKey === "th" ? "คำถามที่พบบ่อย" : "常見問題"}
          </h2>
          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Articles Section */}
      {relatedArticles && relatedArticles.length > 0 && (
        <div className="container py-10 border-t border-border">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {langKey === "en" ? "Related Tips & Info" : langKey === "zh-CN" ? "相关有用资讯" : langKey === "ja" ? "関連情報" : langKey === "ko" ? "관련 유용한 정보" : langKey === "th" ? "ข้อมูลที่เกี่ยวข้อง" : "相關有用資訊"}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedArticles.map((article) => {
              const artTitle =
                (langKey === "zh-TW" ? article.titleZhTW :
                 langKey === "zh-CN" ? article.titleZhCN :
                 langKey === "ja" ? article.titleJa :
                 langKey === "ko" ? article.titleKo :
                 langKey === "th" ? article.titleTh :
                 article.titleEn) ?? article.titleZhTW ?? article.titleEn ?? "";
              const artExcerpt =
                (langKey === "zh-TW" ? article.excerptZhTW :
                 article.excerptEn) ?? article.excerptZhTW ?? "";
              return (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <div className="border border-border rounded-xl overflow-hidden hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card group h-full flex flex-col">
                    {article.coverImage && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={article.coverImage}
                          alt={artTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-sm text-card-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                        {artTitle}
                      </h3>
                      {artExcerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{artExcerpt}</p>
                      )}
                      <span className="text-xs text-primary mt-3 font-medium">
                        {langKey === "en" ? "Read more →" : langKey === "zh-CN" ? "阅读更多 →" : langKey === "ja" ? "詳しく見る →" : langKey === "ko" ? "자세히 보기 →" : langKey === "th" ? "อ่านเพิ่มเติม →" : "閱讀更多 →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 text-right">
            <Link href="/blog" className="text-sm text-primary hover:underline">
              {langKey === "en" ? "View all tips & info →" : langKey === "zh-CN" ? "查看所有有用资讯 →" : langKey === "ja" ? "すべての情報を見る →" : langKey === "ko" ? "모든 유용한 정보 보기 →" : langKey === "th" ? "ดูข้อมูลทั้งหมด →" : "查看所有有用資訊 →"}
            </Link>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-primary/5 border-t border-border">
        <div className="container py-10 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {langKey === "en" ? `Ready to buy ${title}?` : langKey === "zh-CN" ? `准备购买 ${title}？` : langKey === "ja" ? `${title}を購入する準備はできましたか？` : langKey === "ko" ? `${title}를 구매할 준비가 되셨나요?` : langKey === "th" ? `พร้อมซื้อ ${title} แล้วหรือยัง?` : `準備購買 ${title}？`}
          </h2>
          <p className="text-muted-foreground mb-6">
            {langKey === "en" ? "Browse all plans and find the best deal for your trip." : langKey === "zh-CN" ? "浏览所有方案，找到最适合你旅程的选择。" : langKey === "ja" ? "すべてのプランを確認して、旅行に最適なプランを見つけましょう。" : langKey === "ko" ? "모든 요금제를 살펴보고 여행에 가장 적합한 요금제를 찾아보세요." : langKey === "th" ? "ดูแผนทั้งหมดและค้นหาข้อเสนอที่ดีที่สุดสำหรับการเดินทางของคุณ" : "瀏覽所有方案，找到最適合你旅程的選擇。"}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/products?search=${config.searchQuery ?? config.region ?? ""}`}>
              <Button size="lg" className="gap-2">
                <MapPin className="w-4 h-4" />
                {langKey === "en" ? "Browse All Plans" : langKey === "zh-CN" ? "浏览所有方案" : langKey === "ja" ? "すべてのプランを見る" : langKey === "ko" ? "모든 요금제 보기" : langKey === "th" ? "ดูแผนทั้งหมด" : "瀏覽所有方案"}
              </Button>
            </Link>
            <Link href="/how-to-install">
              <Button size="lg" variant="outline">
                {langKey === "en" ? "How to Install eSIM" : langKey === "zh-CN" ? "如何安装 eSIM" : langKey === "ja" ? "eSIMのインストール方法" : langKey === "ko" ? "eSIM 설치 방법" : langKey === "th" ? "วิธีติดตั้ง eSIM" : "如何安裝 eSIM"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
