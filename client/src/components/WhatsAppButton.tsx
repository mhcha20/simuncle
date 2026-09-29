import { trpc } from "@/lib/trpc";
import { MessageCircle, Bot, X, Sparkles } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Message } from "@/components/AIChatBox";

// Lazy-load AIChatBox so streamdown/mermaid are NOT in the initial bundle
const AIChatBox = lazy(() =>
  import("@/components/AIChatBox").then((m) => ({ default: m.AIChatBox }))
);

export function WhatsAppButton() {
  const settingsQuery = trpc.settings.getAll.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const whatsappNumber = settingsQuery.data?.["whatsapp_number"] || "98885159";
  const cleaned = whatsappNumber.replace(/\D/g, "");
  const waUrl = `https://wa.me/852${cleaned}`;

  const { language } = useLanguage();

  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const chatMutation = trpc.ai.supportChat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "zh-TW"
              ? "抱歉，暫時無法回應，請稍後再試或聯絡 WhatsApp 客服。"
              : language === "zh-CN"
              ? "抱歉，暂时无法回应，请稍后再试或联系 WhatsApp 客服。"
              : language === "ja"
              ? "申し訳ございません。只今応答できません。しばらくしてから再度お試しいただくか、WhatsAppサポートにお問い合わせください。"
              : language === "ko"
              ? "죄송합니다. 현재 응답이 어렵습니다. 잠시 후 다시 시도하거나 WhatsApp 고객센터로 문의해 주세요."
              : language === "th"
              ? "ขอโทษ ไม่สามารถตอบกลับได้ในขณะนี้ กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายสนับสนุน WhatsApp"
              : "Sorry, I'm unable to respond right now. Please try again or contact WhatsApp support.",
        },
      ]);
    },
  });

  const handleSend = (content: string) => {
    const newMsg: Message = { role: "user", content };
    const updated = [...messages, newMsg];
    setMessages(updated);
    chatMutation.mutate({
      messages: updated
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      language,
    });
  };

  const openChat = () => {
    setMenuOpen(false);
    setChatOpen(true);
    if (messages.length === 0) {
      const greeting =
        language === "zh-TW"
          ? "你好！我係 SIM uncle eSIM 客服助手 🌐\n有咩可以幫到你？例如：\n- 點樣安裝 eSIM？\n- 我的裝置支援 eSIM 嗎？\n- 點樣查看訂單狀態？"
          : language === "zh-CN"
          ? "你好！我是 SIM uncle eSIM 客服助手 🌐\n有什么可以帮到你？例如：\n- 如何安装 eSIM？\n- 我的设备支持 eSIM 吗？\n- 如何查看订单状态？"
          : language === "ja"
          ? "こんにちは！SIM uncle eSIM サポートアシスタントです 🌐\nどんなことでもお気軽にどうぞ：\n- eSIMのインストール方法は？\n- 私の端末は対応していますか？\n- 注文状況の確認方法は？"
          : language === "ko"
          ? "안녕하세요! SIM uncle eSIM 고객센터 어시스턴트입니다 🌐\n무엇을 도와드릴까요? 예를 들어요:\n- eSIM 설치 방법은?\n- 제 기기가 호환되나요?\n- 주문 상태 확인 방법은?"
          : language === "th"
          ? "สวัสดี! ฉันคือผู้ช่วยเหลือ SIM uncle eSIM 🌐\nฉันช่วยอะไรได้บ้าง? ตัวอย่างเช่น:\n- วิธีติดตั้ง eSIM?\n- อุปกรณ์ของฉันรองรับไหม?\n- วิธีตรวจสอบสถานะคำสั่งซื้อ?"
          : "Hi! I'm SIM uncle eSIM support assistant 🌐\nHow can I help you? For example:\n- How to install eSIM?\n- Is my device compatible?\n- How to check order status?";
      setMessages([{ role: "assistant", content: greeting }]);
    }
  };

  const aiLabel =
    language === "zh-TW"
      ? "AI 客服"
      : language === "zh-CN"
      ? "AI 客服"
      : language === "ja"
      ? "AI サポート"
      : language === "ko"
      ? "AI 고객센터"
      : language === "th"
      ? "AI ช่วยเหลือ"
      : "AI Support";
  const waLabel =
    language === "zh-TW"
      ? "WhatsApp 客服"
      : language === "zh-CN"
      ? "WhatsApp 客服"
      : language === "ja"
      ? "WhatsApp サポート"
      : language === "ko"
      ? "WhatsApp 고객센터"
      : language === "th"
      ? "WhatsApp ช่วยเหลือ"
      : "WhatsApp Support";
  const chatTitle =
    language === "zh-TW"
      ? "AI 客服助手"
      : language === "zh-CN"
      ? "AI 客服助手"
      : language === "ja"
      ? "AI サポートアシスタント"
      : language === "ko"
      ? "AI 고객센터 어시스턴트"
      : language === "th"
      ? "AI ผู้ช่วยเหลือ"
      : "AI Support";
  const chatPlaceholder =
    language === "zh-TW"
      ? "輸入問題..."
      : language === "zh-CN"
      ? "输入问题..."
      : language === "ja"
      ? "質問を入力..."
      : language === "ko"
      ? "질문을 입력..."
      : language === "th"
      ? "พิมพ์คำถาม..."
      : "Type your question...";

  return (
    <>
      {/* AI Chat Panel — only rendered (and loaded) when user opens chat */}
      {chatOpen && (
        <div
          className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm shadow-2xl rounded-2xl overflow-hidden border border-border bg-background flex flex-col"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">{chatTitle}</span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Chat Box — lazy loaded */}
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  載入中…
                </div>
              }
            >
              <AIChatBox
                messages={messages}
                onSendMessage={handleSend}
                isLoading={chatMutation.isPending}
                placeholder={chatPlaceholder}
                height="100%"
                className="border-0 rounded-none shadow-none h-full"
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Expanded Menu */}
      {menuOpen && !chatOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 items-end">
          {/* AI Support Button */}
          <button
            onClick={openChat}
            className="flex items-center gap-3 bg-background border border-border rounded-full px-4 py-3 shadow-lg hover:bg-accent transition-all duration-150 active:scale-95 text-sm font-semibold text-foreground"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
          >
            <span>{aiLabel}</span>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
          </button>
          {/* WhatsApp Button */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-background border border-border rounded-full px-4 py-3 shadow-lg hover:bg-accent transition-all duration-150 active:scale-95 text-sm font-semibold text-foreground"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
          >
            <span>{waLabel}</span>
            <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white fill-white" />
            </div>
          </a>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => {
          if (chatOpen) {
            setChatOpen(false);
            setMenuOpen(false);
          } else {
            setMenuOpen((v) => !v);
          }
        }}
        aria-label="Customer Support"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-[#25D366] hover:bg-[#20BA5A] active:scale-95 transition-all duration-150"
        style={{ boxShadow: "0 4px 20px rgba(37,211,102,0.45)" }}
      >
        {menuOpen || chatOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <MessageCircle className="w-7 h-7 text-white fill-white" />
        )}
      </button>
    </>
  );
}
