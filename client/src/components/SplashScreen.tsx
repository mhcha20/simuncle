import { useEffect, useState } from "react";

/**
 * SplashScreen — Airalo 風格
 * 1. 米白背景 + 彩色幾何裝飾
 * 2. Logo 置中 + 品牌名稱 + 旋轉載入圈
 * 3. 過渡：Logo 放大，主頁面淡入，Logo 淡出
 */

type Phase = "hold" | "exit";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("hold");

  useEffect(() => {
    // 靜止顯示 1.6s 後開始退場
    const t1 = setTimeout(() => setPhase("exit"), 1600);
    // 退場動畫 0.6s 後通知父層
    const t2 = setTimeout(() => onDone(), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  const isExiting = phase === "exit";

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        backgroundColor: "#FAF8F4",
        transition: "opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
        opacity: isExiting ? 0 : 1,
        pointerEvents: isExiting ? "none" : "all",
      }}
    >
      {/* ── 彩色幾何裝飾 ── */}
      {/* 左上 — 淡綠圓 */}
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full" style={{ backgroundColor: "#C8E6C9" }} />
      {/* 右上 — 淡橙半圓 */}
      <div className="absolute -top-10 -right-6 w-28 h-28 rounded-full" style={{ backgroundColor: "#FFD0A0" }} />
      {/* 上中 — 淡藍方塊（旋轉） */}
      <div
        className="absolute top-16 left-1/2 w-14 h-14"
        style={{ backgroundColor: "#B3E5FC", transform: "translateX(-50%) rotate(30deg)", borderRadius: "6px" }}
      />
      {/* 左中 — 淡綠三角 */}
      <svg className="absolute top-1/3 -left-4 w-20 h-20" viewBox="0 0 80 80">
        <polygon points="40,5 75,70 5,70" fill="#C8E6C9" />
      </svg>
      {/* 右中 — 淡橙圓 */}
      <div className="absolute top-2/5 -right-6 w-24 h-24 rounded-full" style={{ backgroundColor: "#FFCC80" }} />
      {/* 左下 — 淡黃半圓 */}
      <div className="absolute -bottom-8 left-8 w-24 h-24 rounded-full" style={{ backgroundColor: "#FFF9C4" }} />
      {/* 下中 — 淡綠圓 */}
      <div className="absolute -bottom-10 left-1/2 w-28 h-28 rounded-full -translate-x-1/2" style={{ backgroundColor: "#C8E6C9" }} />
      {/* 右下 — 淡藍藥丸 */}
      <div
        className="absolute -bottom-4 -right-4 w-28 h-14"
        style={{ backgroundColor: "#B3E5FC", borderRadius: "999px", transform: "rotate(-30deg)" }}
      />

      {/* ── 主體內容 ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        style={{
          transition: "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          transform: isExiting ? "scale(1.35)" : "scale(1)",
          opacity: isExiting ? 0 : 1,
        }}
      >
        {/* Logo */}
        <img
          src="/manus-storage/logo-optimized_e921ee9c.webp"
          alt="SIM Uncle"
          className="w-28 h-28 object-contain"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.10))" }}
        />

        {/* 品牌名稱 */}
        <p
          className="text-2xl font-bold tracking-wide"
          style={{ color: "#2D2D2D", fontFamily: "sans-serif", letterSpacing: "0.04em" }}
        >
          SIM Uncle
        </p>

        {/* 旋轉載入圈 */}
        <div className="mt-2">
          <svg
            className="w-7 h-7 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="#D0D0D0"
              strokeWidth="2.5"
            />
            <path
              d="M12 2 A10 10 0 0 1 22 12"
              stroke="#4CAF50"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
