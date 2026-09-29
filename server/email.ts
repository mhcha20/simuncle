/**
 * Email notification helper using Resend API.
 * Sends order confirmation emails to customers after successful payment.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "SIM​uncle <support@simuncle.com>";

export interface OrderEmailData {
  customerEmail: string;
  customerName: string;
  orderId: number;
  productName: string;
  totalAmount: string; // e.g. "HK$156"
  lpaString?: string;
  activationCode?: string;
  iccid?: string;
  smdpAddress?: string;
  preferredLang?: string; // "zh-TW" | "zh-CN" | "en"
}

function buildOrderConfirmationHtml(data: OrderEmailData): string {
  const lang = data.preferredLang ?? "zh-TW";
  const t = {
    "zh-TW": {
      globalEsim: "全球 eSIM 即買即用",
      paymentSuccess: "✅ 付款成功確認",
      greeting: `親愛的 ${data.customerName}，感謝您的購買！`,
      trackOrder: "訂單查詢頁面",
      trackOrderText: "您可以隨時到",
      trackOrderText2: "輸入電郵及訂單號碼查看 eSIM 狀態。",
      orderNo: "訂單編號",
      product: "產品",
      amount: "金額",
      esimReady: "📱 您的 eSIM 已準備就緒",
      scanQr: "用手機相機掃描以下 QR Code 安裝 eSIM",
      viewOrder: "📲 查看訂單詳情 →",
      manualTitle: "📋 eSIM 啟動資料（手動輸入用）",
      lpaLabel: "LPA 啟動碼",
      iccidLabel: "ICCID",
      processingMsg: "您的 eSIM 正在處理中，請稍後到",
      trackLink: "訂單查詢頁面",
      processingMsg2: "查看。",
      myOrderBtn: "🔍 查詢我的訂單 #",
      installTitle: "📖 eSIM 安裝教學",
      installNote: "⚠️ 建議於出發前、有 Wi-Fi 時先安裝，抵達目的地後才開啟漫遊",
      iphoneSteps: [
        "前往「設定 &gt; 行動網路」，點擊「加入 eSIM」",
        "選擇「使用 QR Code」並掃描上方 QR Code",
        "點擊「繼續」完成安裝（約1–2 分鐘）",
        "抵達目的地後，開啟「資料漫遊」即可上網",
      ],
      androidSteps: [
        "前往「設定 &gt; 網路與網際網路 &gt; SIM 卡」",
        "點擊「新增 eSIM」或「+」按鈕",
        "掃描上方 QR Code 並確認安裝",
        "將新 eSIM 設為行動數據，並開啟漫遊",
      ],
      fullGuide: "查看完整安裝教學 →",
      faqTitle: "❓ 常見問題",
      faqItems: [
        "QR Code 掃不到點算？",
        "點查看 eSIM 剩餘數據用量？",
        "到達目的地後連不上網？",
        "其他問題？聯絡 WhatsApp 客服",
      ],
      contactText: "如有疑問，請聯絡 SIM​uncle 客服",
      copyright: "© 2026 SIM​uncle",
    },
    "zh-CN": {
      globalEsim: "全球 eSIM 即购即用",
      paymentSuccess: "✅ 付款成功确认",
      greeting: `亲爱的 ${data.customerName}，感谢您的购买！`,
      trackOrder: "订单查询页面",
      trackOrderText: "您可以随时到",
      trackOrderText2: "输入邮筱及订单号码查看 eSIM 状态。",
      orderNo: "订单编号",
      product: "产品",
      amount: "金额",
      esimReady: "📱 您的 eSIM 已准备就绪",
      scanQr: "用手机相机扫描以下 QR Code 安装 eSIM",
      viewOrder: "📲 查看订单详情 →",
      manualTitle: "📋 eSIM 激活资料（手动输入用）",
      lpaLabel: "LPA 激活码",
      iccidLabel: "ICCID",
      processingMsg: "您的 eSIM 正在处理中，请稍后到",
      trackLink: "订单查询页面",
      processingMsg2: "查看。",
      myOrderBtn: "🔍 查询我的订单 #",
      installTitle: "📖 eSIM 安装教程",
      installNote: "⚠️ 建议在出发前、有 Wi-Fi 时先安装，到达目的地后再开启漫游",
      iphoneSteps: [
        "前往「设置 &gt; 蜂窝网络」，点击「添加 eSIM」",
        "选择「使用 QR 码」并扫描上方 QR 码",
        "点击「继续」完成安装（约1–2 分钟）",
        "到达目的地后，开启「数据漫游」即可上网",
      ],
      androidSteps: [
        "前往「设置 &gt; 网络与互联网 &gt; SIM 卡」",
        "点击「添加 eSIM」或「+」按鈕",
        "扫描上方 QR 码并确认安装",
        "将新 eSIM 设为移动数据，并开启漫游",
      ],
      fullGuide: "查看完整安装教程 →",
      faqTitle: "❓ 常见问题",
      faqItems: [
        "QR 码扫不到怎么办？",
        "怎查看 eSIM 剩余流量？",
        "到达目的地后连不上网？",
        "其他问题？联系 WhatsApp 客服",
      ],
      contactText: "如有疑问，请联系 SIM​uncle 客服",
      copyright: "© 2026 SIM​uncle",
    },
    "ja": {
      globalEsim: "グローバル eSIM - 購入してすぐ接続",
      paymentSuccess: "✅ お支払い確認",
      greeting: `${data.customerName} 様、ご購入ありがとうございます！`,
      trackOrder: "注文確認ページ",
      trackOrderText: "いつでも",
      trackOrderText2: "でメールアドレスと注文番号を入力して eSIM の状態をご確認いただけます。",
      orderNo: "注文番号",
      product: "商品",
      amount: "金額",
      esimReady: "📱 eSIM の準備ができました",
      scanQr: "スマートフォンのカメラで下記 QR コードをスキャンして eSIM をインストールしてください",
      viewOrder: "📲 注文詳細を見る →",
      manualTitle: "📋 eSIM アクティベーション情報（手動入力用）",
      lpaLabel: "LPA アクティベーションコード",
      iccidLabel: "ICCID",
      processingMsg: "eSIM を処理中です。しばらくしてから",
      trackLink: "注文確認ページ",
      processingMsg2: "でご確認ください。",
      myOrderBtn: "🔍 注文を確認する #",
      installTitle: "📖 eSIM インストールガイド",
      installNote: "⚠️ 出発前に Wi-Fi 環境でインストールし、目的地到着後にローミングを有効にしてください",
      iphoneSteps: [
        "「設定 &gt; モバイル通信」に移動し、「eSIM を追加」をタップ",
        "「QR コードを使用」を選択し、上記 QR コードをスキャン",
        "「続ける」をタップしてインストール完了（約1〜2分）",
        "目的地到着後、「データローミング」を有効にして接続",
      ],
      androidSteps: [
        "「設定 &gt; ネットワークとインターネット &gt; SIM」に移動",
        "「eSIM を追加」または「+」ボタンをタップ",
        "上記 QR コードをスキャンしてインストールを確認",
        "新しい eSIM をモバイルデータに設定し、ローミングを有効化",
      ],
      fullGuide: "インストール完全ガイドを見る →",
      faqTitle: "❓ よくある質問",
      faqItems: [
        "QR コードがスキャンできない場合は？",
        "残りデータ量の確認方法は？",
        "目的地到着後に接続できない場合は？",
        "その他のご質問は WhatsApp サポートへ",
      ],
      contactText: "ご不明な点は SIM uncle サポートまでお問い合わせください",
      copyright: "© 2026 SIM uncle",
    },
    "ko": {
      globalEsim: "글로벌 eSIM - 구매 즉시 연결",
      paymentSuccess: "✅ 결제 확인",
      greeting: `${data.customerName} 님, 구매해 주셔서 감사합니다!`,
      trackOrder: "주문 조회 페이지",
      trackOrderText: "언제든지",
      trackOrderText2: "에서 이메일과 주문 번호를 입력하여 eSIM 상태를 확인하실 수 있습니다.",
      orderNo: "주문 번호",
      product: "상품",
      amount: "금액",
      esimReady: "📱 eSIM이 준비되었습니다",
      scanQr: "스마트폰 카메라로 아래 QR 코드를 스캔하여 eSIM을 설치하세요",
      viewOrder: "📲 주문 상세 보기 →",
      manualTitle: "📋 eSIM 활성화 정보（수동 입력용）",
      lpaLabel: "LPA 활성화 코드",
      iccidLabel: "ICCID",
      processingMsg: "eSIM을 처리 중입니다. 잠시 후",
      trackLink: "주문 조회 페이지",
      processingMsg2: "에서 확인해 주세요.",
      myOrderBtn: "🔍 주문 조회 #",
      installTitle: "📖 eSIM 설치 가이드",
      installNote: "⚠️ 출발 전 Wi-Fi 환경에서 설치하고, 목적지 도착 후 로밍을 활성화하세요",
      iphoneSteps: [
        "「설정 &gt; 셀룰러」로 이동하여 「eSIM 추가」를 탭",
        "「QR 코드 사용」을 선택하고 위의 QR 코드를 스캔",
        "「계속」을 탭하여 설치 완료（약 1~2분）",
        "목적지 도착 후 「데이터 로밍」을 활성화하여 연결",
      ],
      androidSteps: [
        "「설정 &gt; 네트워크 및 인터넷 &gt; SIM 카드」로 이동",
        "「eSIM 추가」또는 「+」버튼을 탭",
        "위의 QR 코드를 스캔하고 설치 확인",
        "새 eSIM을 모바일 데이터로 설정하고 로밍 활성화",
      ],
      fullGuide: "전체 설치 가이드 보기 →",
      faqTitle: "❓ 자주 묻는 질문",
      faqItems: [
        "QR 코드를 스캔할 수 없는 경우?",
        "남은 데이터 확인 방법은?",
        "목적지 도착 후 연결이 안 되는 경우?",
        "기타 문의사항은 WhatsApp 고객센터로",
      ],
      contactText: "문의사항이 있으시면 SIM uncle 고객센터로 연락해 주세요",
      copyright: "© 2026 SIM uncle",
    },
    "th": {
      globalEsim: "eSIM ทั่วโลก - ซื้อแล้วเชื่อมต่อได้ทันที",
      paymentSuccess: "✅ ยืนยันการชำระเงิน",
      greeting: `${data.customerName} ขอบคุณสำหรับการซื้อของคุณ!`,
      trackOrder: "หน้าติดตามคำสั่งซื้อ",
      trackOrderText: "คุณสามารถเยี่ยมชม",
      trackOrderText2: "ได้ตลอดเวลาเพื่อตรวจสอบสถานะ eSIM ของคุณ",
      orderNo: "หมายเลขคำสั่งซื้อ",
      product: "สินค้า",
      amount: "จำนวนเงิน",
      esimReady: "📱 eSIM ของคุณพร้อมใช้งานแล้ว",
      scanQr: "สแกน QR โค้ดด้านล่างด้วยกล้องโทรศัพท์เพื่อติดตั้ง eSIM",
      viewOrder: "📲 ดูรายละเอียดคำสั่งซื้อ →",
      manualTitle: "📋 ข้อมูลการเปิดใช้งาน eSIM（สำหรับป้อนด้วยตนเอง）",
      lpaLabel: "รหัสเปิดใช้งาน LPA",
      iccidLabel: "ICCID",
      processingMsg: "eSIM ของคุณกำลังดำเนินการ กรุณาเยี่ยมชม",
      trackLink: "หน้าติดตามคำสั่งซื้อ",
      processingMsg2: "เพื่อตรวจสอบสถานะ",
      myOrderBtn: "🔍 ติดตามคำสั่งซื้อของฉัน #",
      installTitle: "📖 คู่มือการติดตั้ง eSIM",
      installNote: "⚠️ ติดตั้งก่อนออกเดินทางขณะเชื่อมต่อ Wi-Fi และเปิดใช้งานโรมมิ่งหลังจากถึงจุดหมาย",
      iphoneSteps: [
        "ไปที่ 「การตั้งค่า &gt; เซลลูลาร์」แตะ 「เพิ่ม eSIM」",
        "เลือก 「ใช้ QR โค้ด」และสแกน QR โค้ดด้านบน",
        "แตะ 「ดำเนินการต่อ」เพื่อติดตั้งให้เสร็จสมบูรณ์（ประมาณ 1-2 นาที）",
        "หลังจากถึงจุดหมาย เปิดใช้งาน 「Data Roaming」เพื่อเชื่อมต่อ",
      ],
      androidSteps: [
        "ไปที่ 「การตั้งค่า &gt; เครือข่ายและอินเทอร์เน็ต &gt; ซิมการ์ด」",
        "แตะ 「เพิ่ม eSIM」หรือปุ่ม 「+」",
        "สแกน QR โค้ดด้านบนและยืนยันการติดตั้ง",
        "ตั้ง eSIM ใหม่เป็นข้อมูลมือถือและเปิดใช้งานโรมมิ่ง",
      ],
      fullGuide: "ดูคู่มือการติดตั้งฉบับสมบูรณ์ →",
      faqTitle: "❓ คำถามที่พบบ่อย",
      faqItems: [
        "สแกน QR โค้ดไม่ได้?",
        "วิธีตรวจสอบข้อมูลที่เหลืออยู่?",
        "เชื่อมต่อไม่ได้หลังจากถึงจุดหมาย?",
        "คำถามอื่นๆ ติดต่อ WhatsApp Support",
      ],
      contactText: "หากมีคำถาม กรุณาติดต่อฝ่ายสนับสนุน SIM uncle",
      copyright: "© 2026 SIM uncle",
    },
    "en": {
      globalEsim: "Global eSIM - Buy & Connect Instantly",
      paymentSuccess: "✅ Payment Confirmed",
      greeting: `Dear ${data.customerName}, thank you for your purchase!`,
      trackOrder: "Order Tracking Page",
      trackOrderText: "You can visit the",
      trackOrderText2: "anytime to check your eSIM status.",
      orderNo: "Order No.",
      product: "Product",
      amount: "Amount",
      esimReady: "📱 Your eSIM is Ready",
      scanQr: "Scan the QR code below with your phone camera to install your eSIM",
      viewOrder: "📲 View Order Details →",
      manualTitle: "📋 eSIM Activation Details (Manual Entry)",
      lpaLabel: "LPA Activation Code",
      iccidLabel: "ICCID",
      processingMsg: "Your eSIM is being processed. Please visit the",
      trackLink: "Order Tracking Page",
      processingMsg2: "to check status.",
      myOrderBtn: "🔍 Track My Order #",
      installTitle: "📖 eSIM Installation Guide",
      installNote: "⚠️ Install before departure while connected to Wi-Fi. Enable roaming after arriving at your destination.",
      iphoneSteps: [
        "Go to Settings &gt; Cellular, tap Add eSIM",
        "Choose Use QR Code and scan the QR code above",
        "Tap Continue to complete installation (~1-2 min)",
        "After arrival, enable Data Roaming to connect",
      ],
      androidSteps: [
        "Go to Settings &gt; Network &amp; Internet &gt; SIM cards",
        "Tap Add eSIM or the + button",
        "Scan the QR code above and confirm installation",
        "Set new eSIM as mobile data and enable roaming",
      ],
      fullGuide: "View Full Installation Guide →",
      faqTitle: "❓ FAQ",
      faqItems: [
        "Can't scan the QR code?",
        "How to check remaining data?",
        "Can't connect after arrival?",
        "Other questions? Contact WhatsApp Support",
      ],
      contactText: "For any questions, contact SIM​uncle support",
      copyright: "© 2026 SIM​uncle",
    },
  };
  const i = t[lang as keyof typeof t] ?? t["en"];
  const qrCodeUrl = data.lpaString
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.lpaString)}&size=200x200&margin=10`
    : null;

  const qrSection = data.lpaString
    ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <h3 style="color:#15803d;margin:0 0 12px 0;">${i.esimReady}</h3>
      <p style="color:#374151;margin:0 0 12px 0;font-size:14px;">${i.scanQr}</p>
      <img src="${qrCodeUrl}" alt="eSIM QR Code" width="200" height="200" style="display:block;margin:0 auto 12px auto;border:1px solid #d1fae5;border-radius:8px;" />
      <a href="https://simuncle.com/track-order?orderId=${data.orderId}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;margin-top:4px;">${i.viewOrder}</a>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#6b7280;font-size:12px;font-weight:600;margin:0 0 8px 0;">${i.manualTitle}</p>
      <p style="color:#6b7280;font-size:11px;margin:0 0 4px 0;">${i.lpaLabel}</p>
      <code style="font-size:11px;word-break:break-all;color:#1f2937;background:#fff;border:1px solid #d1d5db;border-radius:4px;padding:8px;display:block;margin-bottom:8px;">${data.lpaString}</code>
      ${data.iccid ? `<p style="color:#6b7280;font-size:11px;margin:8px 0 4px 0;">${i.iccidLabel}</p><code style="font-size:11px;word-break:break-all;color:#1f2937;background:#fff;border:1px solid #d1d5db;border-radius:4px;padding:8px;display:block;">${data.iccid}</code>` : ""}
    </div>`
    : `
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="color:#713f12;margin:0;">⏳ ${i.processingMsg} <a href="https://simuncle.com/track-order?orderId=${data.orderId}" style="color:#92400e;font-weight:600;">${i.trackLink}</a> ${i.processingMsg2}</p>
    </div>`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:28px 24px;text-align:center;">
      <img src="https://simuncle.com/manus-storage/logo-full-transparent_061e610c.png" alt="SIM​uncle" width="160" height="auto" style="display:block;margin:0 auto 12px auto;max-width:160px;" />
      <p style="color:#15803d;margin:0;font-size:14px;">${i.globalEsim}</p>
    </div>
    <!-- Body -->
    <div style="padding:24px;">
      <h2 style="color:#111827;margin:0 0 8px 0;">${i.paymentSuccess}</h2>
      <p style="color:#6b7280;margin:0 0 20px 0;">${i.greeting}</p>
      <p style="color:#6b7280;font-size:13px;margin:0 0 16px 0;">${i.trackOrderText} <a href="https://simuncle.com/track-order?orderId=${data.orderId}" style="color:#16a34a;font-weight:600;">${i.trackOrder}</a> ${i.trackOrderText2}</p>

      <!-- Order Summary -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${i.orderNo}</td>
            <td style="color:#111827;font-weight:600;text-align:right;">#${data.orderId}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${i.product}</td>
            <td style="color:#111827;text-align:right;font-size:13px;">${data.productName}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${i.amount}</td>
            <td style="color:#16a34a;font-weight:700;text-align:right;font-size:16px;">${data.totalAmount}</td>
          </tr>
        </table>
      </div>

      ${qrSection}

      <!-- Track Order Button -->
      <div style="text-align:center;margin:20px 0 8px 0;">
        <a href="https://simuncle.com/track-order?orderId=${data.orderId}" style="display:inline-block;background:#f0fdf4;color:#16a34a;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;border:1px solid #bbf7d0;font-size:14px;">${i.myOrderBtn}${data.orderId}</a>
      </div>

      <!-- How to install -->
      <div style="margin-top:24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#f0fdf4;padding:14px 16px;border-bottom:1px solid #d1fae5;">
          <h3 style="color:#15803d;font-size:15px;font-weight:700;margin:0;">${i.installTitle}</h3>
          <p style="color:#6b7280;font-size:12px;margin:6px 0 0 0;">${i.installNote}</p>
        </div>
        <div style="padding:16px;">
          <!-- iPhone -->
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 8px 0;">🍎 iPhone</p>
          <ol style="color:#6b7280;font-size:13px;margin:0 0 16px 0;padding-left:20px;line-height:1.8;">
            ${i.iphoneSteps.map((s: string) => `<li>${s}</li>`).join('')}
          </ol>
          <!-- Android -->
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 8px 0;">🤖 Android</p>
          <ol style="color:#6b7280;font-size:13px;margin:0 0 16px 0;padding-left:20px;line-height:1.8;">
            ${i.androidSteps.map((s: string) => `<li>${s}</li>`).join('')}
          </ol>
          <a href="https://simuncle.com/how-to-install" style="display:inline-block;color:#16a34a;font-size:13px;font-weight:600;text-decoration:none;">${i.fullGuide}</a>
        </div>
      </div>

      <!-- FAQ -->
      <div style="margin-top:20px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 10px 0;">${i.faqTitle}</p>
        <table style="width:100%;border-collapse:collapse;">
          ${i.faqItems.map((item: string, idx: number) => `<tr><td style="padding:6px 0;${idx < i.faqItems.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}"><a href="${idx === i.faqItems.length - 1 ? 'https://wa.me/85298885159' : 'https://simuncle.com/how-to-install'}" style="color:#16a34a;font-size:13px;text-decoration:none;">${item}</a></td></tr>`).join('')}
        </table>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 12px 0;">
        <a href="https://www.instagram.com/esim_uncle/" style="display:inline-block;text-decoration:none;" title="Follow us on Instagram">
          <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" width="28" height="28" style="border-radius:6px;vertical-align:middle;" />
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">${i.contactText}</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">© 2026 SIM​uncle · <a href="https://simuncle.com" style="color:#9ca3af;">simuncle.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.to],
        reply_to: "support@simuncle.com",
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn("[Email] Resend send failed:", res.status, body);
      return false;
    }

    const result = await res.json() as { id?: string };
    console.log(`[Email] Sent via Resend, id=${result.id}, to=${params.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Error calling Resend API:", err);
    return false;
  }
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
  const html = buildOrderConfirmationHtml(data);
  const lang = data.preferredLang ?? "zh-TW";
  const subjectMap: Record<string, string> = {
    "zh-TW": `✅ 付款成功 - 訂單 #${data.orderId} | SIM uncle`,
    "zh-CN": `✅ 付款成功 - 订单 #${data.orderId} | SIM uncle`,
    "en": `✅ Payment Confirmed - Order #${data.orderId} | SIM uncle`,
    "ja": `✅ お支払い確認 - 注文 #${data.orderId} | SIM uncle`,
    "ko": `✅ 결제 확인 - 주문 #${data.orderId} | SIM uncle`,
    "th": `✅ ยืนยันการชำระเงิน - คำสั่งซื้อ #${data.orderId} | SIM uncle`,
  };
  const textMap: Record<string, string> = {
    "zh-TW": `訂單 #${data.orderId} 付款成功。產品：${data.productName}。金額：${data.totalAmount}。請前往 https://simuncle.com/track-order?orderId=${data.orderId} 查看 QR Code。`,
    "zh-CN": `订单 #${data.orderId} 付款成功。产品：${data.productName}。金额：${data.totalAmount}。请前往 https://simuncle.com/track-order?orderId=${data.orderId} 查看 QR 码。`,
    "en": `Order #${data.orderId} payment confirmed. Product: ${data.productName}. Amount: ${data.totalAmount}. Visit https://simuncle.com/track-order?orderId=${data.orderId} to view your QR code.`,
    "ja": `注文 #${data.orderId} のお支払いが確認されました。商品：${data.productName}。金額：${data.totalAmount}。https://simuncle.com/track-order?orderId=${data.orderId} で QR コードをご確認ください。`,
    "ko": `주문 #${data.orderId} 결제가 확인되었습니다. 상품: ${data.productName}. 금액: ${data.totalAmount}. https://simuncle.com/track-order?orderId=${data.orderId} 에서 QR 코드를 확인하세요.`,
    "th": `คำสั่งซื้อ #${data.orderId} ชำระเงินเรียบร้อยแล้ว สินค้า: ${data.productName} จำนวนเงิน: ${data.totalAmount} เยี่ยมชม https://simuncle.com/track-order?orderId=${data.orderId} เพื่อดู QR โค้ด`,
  };
  const subject = subjectMap[lang] ?? subjectMap["en"];
  const text = textMap[lang] ?? textMap["en"];

  const ok = await sendViaResend({ to: data.customerEmail, subject, html, text });
  if (ok) {
    console.log(`[Email] Confirmation sent to ${data.customerEmail} for order #${data.orderId}`);
  }
  return ok;
}

export async function sendCustomEmailToCustomer(params: {
  to: string;
  subject: string;
  content: string;
  ctaUrl?: string;   // optional call-to-action button URL
  ctaText?: string;  // optional call-to-action button label
}): Promise<boolean> {
  const ctaBlock = params.ctaUrl
    ? `<div style="text-align:center;margin:28px 0;">
  <a href="${params.ctaUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;">${params.ctaText ?? params.ctaUrl}</a>
</div>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
  <!-- Header with Logo -->
  <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:28px 24px;text-align:center;">
    <img src="https://simuncle.com/manus-storage/logo-full-transparent_061e610c.png" alt="SIM uncle" width="160" height="auto" style="display:block;margin:0 auto 8px auto;max-width:160px;" />
    <p style="color:#15803d;margin:0;font-size:13px;">全球 eSIM 即買即用</p>
  </div>
  <!-- Body -->
  <div style="padding:28px 24px;">
    <div style="color:#374151;line-height:1.8;font-size:15px;white-space:pre-wrap;">${params.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    ${ctaBlock}
  </div>
  <!-- Footer -->
  <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 12px 0;">
      <a href="https://www.instagram.com/esim_uncle/" style="display:inline-block;text-decoration:none;" title="Follow us on Instagram">
        <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" width="28" height="28" style="border-radius:6px;vertical-align:middle;" />
      </a>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">此電郵由 SIM uncle 客服發送。如有疑問，請回覆此電郵。</p>
    <p style="color:#9ca3af;font-size:11px;margin:0;">© 2026 SIM uncle · <a href="https://simuncle.com" style="color:#9ca3af;">simuncle.com</a></p>
  </div>
</div>
</body>
</html>`;

  return sendViaResend({ to: params.to, subject: params.subject, html, text: params.content });
}

export interface TerminationEmailData {
  customerEmail: string;
  customerName: string;
  orderId: number;
  productName: string;
  terminatedAt: Date;
  preferredLang?: string;
}

function buildTerminationHtml(data: TerminationEmailData): string {
  const lang = data.preferredLang ?? "zh-TW";
  const terminatedAtStr = data.terminatedAt.toLocaleString(
    lang === "zh-TW" ? "zh-HK" :
    lang === "zh-CN" ? "zh-CN" :
    lang === "ja" ? "ja-JP" :
    lang === "ko" ? "ko-KR" :
    lang === "th" ? "th-TH" : "en-GB",
    { timeZone: "Asia/Hong_Kong", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  const t = {
    "zh-TW": {
      subject: `⚡ Top-up 已提前啟動 - 訂單 #${data.orderId}`,
      title: "⚡ 您的 Top-up 方案已提前啟動",
      greeting: `親愛的 ${data.customerName}，`,
      body: "您的主方案已成功終止，Top-up 增値方案已立即啟動。以下是詳情：",
      orderNo: "訂單編號",
      product: "產品",
      terminatedAt: "啟動時間",
      warning: "✅ Top-up 方案已成功啟動，您可繼續使用數據。",
      ctaText: "📱 查看我的 eSIM →",
      contactText: "如有疑問，請聯絡 SIM uncle 客服",
    },
    "zh-CN": {
      subject: `⚡ Top-up 已提前启动 - 订单 #${data.orderId}`,
      title: "⚡ 您的 Top-up 方案已提前启动",
      greeting: `亲爱的 ${data.customerName}，`,
      body: "您的主方案已成功终止，Top-up 增値方案已立即启动。以下是详情：",
      orderNo: "订单编号",
      product: "产品",
      terminatedAt: "启动时间",
      warning: "✅ Top-up 方案已成功启动，您可继续使用数据。",
      ctaText: "📱 查看我的 eSIM →",
      contactText: "如有疑问，请联系 SIM uncle 客服",
    },
    "en": {
      subject: `⚡ Top-up Activated Early - Order #${data.orderId}`,
      title: "⚡ Your Top-up Plan Has Been Activated",
      greeting: `Dear ${data.customerName},`,
      body: "Your main plan has been terminated and your Top-up plan has been immediately activated. Here are the details:",
      orderNo: "Order No.",
      product: "Product",
      terminatedAt: "Activated At",
      warning: "✅ Your Top-up plan is now active. You can continue using your data.",
      ctaText: "📱 View My eSIM →",
      contactText: "For any questions, contact SIM uncle support",
    },
    "ja": {
      subject: `⚡ Top-upが早期起動されました - 注文 #${data.orderId}`,
      title: "⚡ Top-up プランが起動されました",
      greeting: `${data.customerName} 様、`,
      body: "メインプランが終了され、Top-up プランが即座に起動されました。詳細は以下の通りです：",
      orderNo: "注文番号",
      product: "商品",
      terminatedAt: "起動日時",
      warning: "✅ Top-up プランが有効になりました。引き続きデータをご利用いただけます。",
      ctaText: "📱 eSIMを確認 →",
      contactText: "ご不明な点は SIM uncle サポートまでお問い合わせください",
    },
    "ko": {
      subject: `⚡ Top-up이 조기 활성화되었습니다 - 주문 #${data.orderId}`,
      title: "⚡ Top-up 플랜이 활성화되었습니다",
      greeting: `${data.customerName} 님,`,
      body: "메인 플랜이 종료되고 Top-up 플랜이 즉시 활성화되었습니다. 아래에서 세부 정보를 확인하세요:",
      orderNo: "주문 번호",
      product: "상품",
      terminatedAt: "활성화 시간",
      warning: "✅ Top-up 플랜이 활성화되었습니다. 계속 데이터를 사용할 수 있습니다.",
      ctaText: "📱 eSIM 확인 →",
      contactText: "문의사항이 있으시면 SIM uncle 고객센터로 연락해 주세요",
    },
    "th": {
      subject: `⚡ Top-up ถูกเปิดใช้ก่อนกำหนด - คำสั่งซื้อ #${data.orderId}`,
      title: "⚡ แผน Top-up ของคุณถูกเปิดใช้แล้ว",
      greeting: `${data.customerName} `,
      body: "แผนหลักของคุณถูกยุติและแผน Top-up ถูกเปิดใช้ทันที นี่คือรายละเอียด:",
      orderNo: "หมายเลขคำสั่งซื้อ",
      product: "สินค้า",
      terminatedAt: "เวลาเปิดใช้",
      warning: "✅ แผน Top-up ของคุณเปิดใช้งานแล้ว คุณสามารถใช้ข้อมูลต่อได้",
      ctaText: "📱 ดู eSIM ของฉัน →",
      contactText: "หากมีคำถาม กรุณาติดต่อฝ่ายสนับสนุน SIM uncle",
    },
  };

  const i = t[lang as keyof typeof t] ?? t["en"];

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);padding:28px 24px;text-align:center;">
      <img src="https://simuncle.com/manus-storage/logo-full-transparent_061e610c.png" alt="SIM uncle" width="160" height="auto" style="display:block;margin:0 auto 12px auto;max-width:160px;" />
    </div>
    <!-- Body -->
    <div style="padding:24px;">
      <h2 style="color:#111827;margin:0 0 8px 0;">${i.title}</h2>
      <p style="color:#6b7280;margin:0 0 8px 0;">${i.greeting}</p>
      <p style="color:#6b7280;margin:0 0 20px 0;">${i.body}</p>

      <!-- Order Summary -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${i.orderNo}</td>
            <td style="color:#111827;font-weight:600;text-align:right;">#${data.orderId}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${i.product}</td>
            <td style="color:#111827;text-align:right;font-size:13px;">${data.productName}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${i.terminatedAt}</td>
            <td style="color:#dc2626;font-weight:600;text-align:right;font-size:13px;">${terminatedAtStr}</td>
          </tr>
        </table>
      </div>

      <!-- Warning -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
        <p style="color:#991b1b;margin:0;font-size:13px;line-height:1.6;">${i.warning}</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="https://simuncle.com/products" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">${i.ctaText}</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 12px 0;">
        <a href="https://www.instagram.com/esim_uncle/" style="display:inline-block;text-decoration:none;" title="Follow us on Instagram">
          <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" width="28" height="28" style="border-radius:6px;vertical-align:middle;" />
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">${i.contactText}</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">© 2026 SIM uncle · <a href="https://simuncle.com" style="color:#9ca3af;">simuncle.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendTerminationEmail(data: TerminationEmailData): Promise<boolean> {
  const lang = data.preferredLang ?? "zh-TW";
  const i = {
    "zh-TW": { subject: `❌ 方案已終止 - 訂單 #${data.orderId} | SIM uncle`, text: `您的 eSIM 方案（訂單 #${data.orderId}）已終止。如需繼續上網，請前往 https://simuncle.com/products 購買新方案。` },
    "zh-CN": { subject: `❌ 方案已终止 - 订单 #${data.orderId} | SIM uncle`, text: `您的 eSIM 方案（订单 #${data.orderId}）已终止。如需继续上网，请前往 https://simuncle.com/products 购买新方案。` },
    "en":    { subject: `❌ Plan Terminated - Order #${data.orderId} | SIM uncle`, text: `Your eSIM plan (Order #${data.orderId}) has been terminated. Visit https://simuncle.com/products to buy a new plan.` },
    "ja":    { subject: `❌ プランが終了されました - 注文 #${data.orderId} | SIM uncle`, text: `eSIM プラン（注文 #${data.orderId}）が終了されました。新しいプランは https://simuncle.com/products でご購入いただけます。` },
    "ko":    { subject: `❌ 플랜이 종료되었습니다 - 주문 #${data.orderId} | SIM uncle`, text: `eSIM 플랜（주문 #${data.orderId}）이 종료되었습니다. 새 플랜은 https://simuncle.com/products 에서 구매하세요.` },
    "th":    { subject: `❌ แผนถูกยกเลิกแล้ว - คำสั่งซื้อ #${data.orderId} | SIM uncle`, text: `แผน eSIM ของคุณ（คำสั่งซื้อ #${data.orderId}）ถูกยกเลิกแล้ว ซื้อแผนใหม่ได้ที่ https://simuncle.com/products` },
  };
  const { subject, text } = (i as Record<string, { subject: string; text: string }>)[lang] ?? i["en"];
  const html = buildTerminationHtml(data);
  const ok = await sendViaResend({ to: data.customerEmail, subject, html, text });
  if (ok) {
    console.log(`[Email] Termination email sent to ${data.customerEmail} for order #${data.orderId}`);
  }
  return ok;
}

// ---- Data Exhausted Email ----

export interface TopupPlanOption {
  productId: string;
  name: string;
  priceHkd: number;
  dataLabel?: string; // e.g. "3 GB"
}

export interface DataExhaustedEmailData {
  customerEmail: string;
  customerName: string;
  orderId: number;
  productName: string;
  vizlyncOrderId: string; // for topup checkout link
  preferredLang?: string;
  topupPlans?: TopupPlanOption[]; // up to 3 representative plans (low/mid/high)
  topUpAvailable: boolean;
}

function buildDataExhaustedHtml(data: DataExhaustedEmailData): string {
  const lang = data.preferredLang ?? "zh-TW";
  const i18n: Record<string, {
    title: string; greeting: string; body: string;
    orderNo: string; product: string;
    topupTitle: string; topupBtn: string; topupNote: string;
    terminateTitle: string; terminateBody: string;
    noTopupBody: string; buyNewBtn: string;
    contactText: string;
  }> = {
    "zh-TW": {
      title: "📵 您的 eSIM 數據已用完",
      greeting: `親愛的 ${data.customerName}，`,
      body: "您的 eSIM 數據已全部用完，目前無法上網。",
      orderNo: "訂單編號", product: "產品",
      topupTitle: "🔋 立即增值繼續上網",
      topupBtn: "立即增值",
      topupNote: "💡 提示：若您已購買增值卡，可提早終止主卡，讓增值卡即時生效。",
      terminateTitle: "⚡ 已有增值卡？提早終止主卡",
      terminateBody: "終止主卡後，增值卡將立即啟用，無需等待主卡到期。",
      noTopupBody: "此方案不支援增值，建議購買新的 eSIM 方案繼續上網。",
      buyNewBtn: "購買新方案",
      contactText: "如有疑問，請聯絡 SIM uncle 客服",
    },
    "zh-CN": {
      title: "📵 您的 eSIM 数据已用完",
      greeting: `亲爱的 ${data.customerName}，`,
      body: "您的 eSIM 数据已全部用完，目前无法上网。",
      orderNo: "订单编号", product: "产品",
      topupTitle: "🔋 立即充值继续上网",
      topupBtn: "立即充值",
      topupNote: "💡 提示：若您已购买充值卡，可提前终止主卡，让充值卡立即生效。",
      terminateTitle: "⚡ 已有充值卡？提前终止主卡",
      terminateBody: "终止主卡后，充值卡将立即启用，无需等待主卡到期。",
      noTopupBody: "此方案不支持充值，建议购买新的 eSIM 方案继续上网。",
      buyNewBtn: "购买新方案",
      contactText: "如有疑问，请联系 SIM uncle 客服",
    },
    "en": {
      title: "📵 Your eSIM Data is Exhausted",
      greeting: `Dear ${data.customerName},`,
      body: "Your eSIM data has been fully used up. You are currently unable to browse the internet.",
      orderNo: "Order No.", product: "Product",
      topupTitle: "🔋 Top Up Now to Stay Connected",
      topupBtn: "Top Up Now",
      topupNote: "💡 Tip: If you already have a top-up plan, you can terminate the main plan early so the top-up activates immediately.",
      terminateTitle: "⚡ Already Have a Top-Up? Terminate Early",
      terminateBody: "Once you terminate the main plan, your top-up plan will activate immediately without waiting for expiry.",
      noTopupBody: "This plan does not support top-ups. We recommend purchasing a new eSIM plan to stay connected.",
      buyNewBtn: "Buy New Plan",
      contactText: "For assistance, please contact SIM uncle support",
    },
    "ja": {
      title: "📵 eSIM のデータが使い切られました",
      greeting: `${data.customerName} 様、`,
      body: "eSIM のデータが使い切られました。現在インターネットに接続できません。",
      orderNo: "注文番号", product: "商品",
      topupTitle: "🔋 今すぐチャージして接続を続ける",
      topupBtn: "今すぐチャージ",
      topupNote: "💡 ヒント：すでにチャージプランをお持ちの場合、メインプランを早期終了すると即座に有効になります。",
      terminateTitle: "⚡ チャージ済み？メインプランを早期終了",
      terminateBody: "メインプランを終了すると、チャージプランが即座に有効になります。",
      noTopupBody: "このプランはチャージに対応していません。新しい eSIM プランのご購入をお勧めします。",
      buyNewBtn: "新しいプランを購入",
      contactText: "ご不明な点は SIM uncle サポートまでお問い合わせください",
    },
    "ko": {
      title: "📵 eSIM 데이터가 소진되었습니다",
      greeting: `${data.customerName} 고객님,`,
      body: "eSIM 데이터가 모두 소진되어 현재 인터넷에 연결할 수 없습니다.",
      orderNo: "주문 번호", product: "상품",
      topupTitle: "🔋 지금 충전하여 계속 연결하세요",
      topupBtn: "지금 충전",
      topupNote: "💡 팁: 이미 충전 플랜이 있다면 메인 플랜을 조기 종료하면 즉시 활성화됩니다.",
      terminateTitle: "⚡ 충전 플랜 보유 중? 메인 플랜 조기 종료",
      terminateBody: "메인 플랜을 종료하면 충전 플랜이 즉시 활성화됩니다.",
      noTopupBody: "이 플랜은 충전을 지원하지 않습니다. 새 eSIM 플랜 구매를 권장합니다.",
      buyNewBtn: "새 플랜 구매",
      contactText: "문의 사항은 SIM uncle 고객 지원에 문의하세요",
    },
    "th": {
      title: "📵 ข้อมูล eSIM ของคุณหมดแล้ว",
      greeting: `เรียน ${data.customerName},`,
      body: "ข้อมูล eSIM ของคุณถูกใช้หมดแล้ว ขณะนี้ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้",
      orderNo: "หมายเลขคำสั่งซื้อ", product: "สินค้า",
      topupTitle: "🔋 เติมเงินตอนนี้เพื่อเชื่อมต่อต่อไป",
      topupBtn: "เติมเงินตอนนี้",
      topupNote: "💡 เคล็ดลับ: หากคุณมีแผนเติมเงินอยู่แล้ว คุณสามารถยกเลิกแผนหลักก่อนกำหนดเพื่อให้แผนเติมเงินเริ่มใช้งานได้ทันที",
      terminateTitle: "⚡ มีแผนเติมเงินแล้ว? ยกเลิกแผนหลักก่อนกำหนด",
      terminateBody: "เมื่อยกเลิกแผนหลัก แผนเติมเงินของคุณจะเริ่มใช้งานได้ทันที",
      noTopupBody: "แผนนี้ไม่รองรับการเติมเงิน แนะนำให้ซื้อแผน eSIM ใหม่",
      buyNewBtn: "ซื้อแผนใหม่",
      contactText: "หากมีคำถาม กรุณาติดต่อฝ่ายสนับสนุน SIM uncle",
    },
  };
  const t = i18n[lang] ?? i18n["en"];

  // Build topup plans rows (max 3, representative low/mid/high)
  let topupSection = "";
  if (data.topUpAvailable && data.topupPlans && data.topupPlans.length > 0) {
    const planRows = data.topupPlans.map(p => `
      <tr>
        <td style="padding:8px 0;color:#111827;font-size:13px;">${p.name}${p.dataLabel ? ` <span style="color:#6b7280;">(${p.dataLabel})</span>` : ""}</td>
        <td style="padding:8px 0;color:#16a34a;font-weight:600;text-align:right;font-size:13px;">HK$${p.priceHkd}</td>
        <td style="padding:8px 0;text-align:right;">
          <a href="https://simuncle.com/orders" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;">${t.topupBtn}</a>
        </td>
      </tr>`).join("");

    topupSection = `
      <div style="margin-bottom:20px;">
        <h3 style="color:#111827;font-size:15px;margin:0 0 12px 0;">${t.topupTitle}</h3>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;">
          <table style="width:100%;border-collapse:collapse;">${planRows}</table>
        </div>
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-top:12px;">
          <p style="color:#92400e;margin:0;font-size:13px;line-height:1.6;">${t.topupNote}</p>
        </div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <h4 style="color:#1d4ed8;margin:0 0 6px 0;font-size:14px;">${t.terminateTitle}</h4>
        <p style="color:#1e40af;margin:0;font-size:13px;line-height:1.6;">${t.terminateBody}</p>
        <div style="text-align:center;margin-top:12px;">
          <a href="https://simuncle.com/orders" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;">📋 ${lang === "zh-TW" ? "前往訂單頁面" : lang === "zh-CN" ? "前往订单页面" : lang === "ja" ? "注文ページへ" : lang === "ko" ? "주문 페이지로" : lang === "th" ? "ไปที่หน้าคำสั่งซื้อ" : "Go to My Orders"}</a>
        </div>
      </div>`;
  } else {
    topupSection = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p style="color:#991b1b;margin:0;font-size:13px;line-height:1.6;">${t.noTopupBody}</p>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="https://simuncle.com/products" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">${t.buyNewBtn}</a>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:28px 24px;text-align:center;">
      <img src="https://simuncle.com/manus-storage/logo-full-transparent_061e610c.png" alt="SIM uncle" width="160" height="auto" style="display:block;margin:0 auto 12px auto;max-width:160px;" />
    </div>
    <div style="padding:24px;">
      <h2 style="color:#111827;margin:0 0 8px 0;">${t.title}</h2>
      <p style="color:#6b7280;margin:0 0 8px 0;">${t.greeting}</p>
      <p style="color:#6b7280;margin:0 0 20px 0;">${t.body}</p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${t.orderNo}</td>
            <td style="color:#111827;font-weight:600;text-align:right;">#${data.orderId}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${t.product}</td>
            <td style="color:#111827;text-align:right;font-size:13px;">${data.productName}</td>
          </tr>
        </table>
      </div>
      ${topupSection}
    </div>
    <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 12px 0;">
        <a href="https://www.instagram.com/esim_uncle/" style="display:inline-block;text-decoration:none;" title="Follow us on Instagram">
          <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" width="28" height="28" style="border-radius:6px;vertical-align:middle;" />
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">${t.contactText}</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">© 2026 SIM uncle · <a href="https://simuncle.com" style="color:#9ca3af;">simuncle.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendDataExhaustedEmail(data: DataExhaustedEmailData): Promise<boolean> {
  const lang = data.preferredLang ?? "zh-TW";
  const subjects: Record<string, string> = {
    "zh-TW": `📵 您的 eSIM 數據已用完 - 訂單 #${data.orderId} | SIM uncle`,
    "zh-CN": `📵 您的 eSIM 数据已用完 - 订单 #${data.orderId} | SIM uncle`,
    "en":    `📵 Your eSIM Data is Exhausted - Order #${data.orderId} | SIM uncle`,
    "ja":    `📵 eSIM のデータが使い切られました - 注文 #${data.orderId} | SIM uncle`,
    "ko":    `📵 eSIM 데이터가 소진되었습니다 - 주문 #${data.orderId} | SIM uncle`,
    "th":    `📵 ข้อมูล eSIM ของคุณหมดแล้ว - คำสั่งซื้อ #${data.orderId} | SIM uncle`,
  };
  const subject = subjects[lang] ?? subjects["en"];
  const html = buildDataExhaustedHtml(data);
  const text = `[SIM uncle] Order #${data.orderId} (${data.productName}) data exhausted. ${data.topUpAvailable ? "Top up at https://simuncle.com/orders" : "Buy a new plan at https://simuncle.com/products"}`;
  const ok = await sendViaResend({ to: data.customerEmail, subject, html, text });
  if (ok) {
    console.log(`[Email] Data exhausted email sent to ${data.customerEmail} for order #${data.orderId}`);
  }
  return ok;
}
