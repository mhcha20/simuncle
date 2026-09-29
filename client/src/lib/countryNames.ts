/**
 * Country name translations
 * Maps country code (ISO 3166-1 alpha-2) and English name to Traditional/Simplified Chinese, Japanese, Korean, Thai
 */
import { toDisplayChinese } from "./zhConvert";
import type { Language } from "@/contexts/LanguageContext";

export const countryNameMap: Record<string, { zhTW: string; zhCN: string; en: string; ja: string; ko: string; th: string }> = {
  // Asia Pacific
  JP: { zhTW: "日本", zhCN: "日本", en: "Japan", ja: "日本", ko: "일본", th: "ญี่ปุ่น" },
  KR: { zhTW: "韓國", zhCN: "韩国", en: "South Korea", ja: "韓国", ko: "한국", th: "เกาหลีใต้" },
  CN: { zhTW: "中國", zhCN: "中国", en: "China", ja: "中国", ko: "중국", th: "จีน" },
  HK: { zhTW: "香港", zhCN: "香港", en: "Hong Kong", ja: "香港", ko: "홍콩", th: "ฮ่องกง" },
  TW: { zhTW: "台灣", zhCN: "台湾", en: "Taiwan", ja: "台湾", ko: "대만", th: "ไต้หวัน" },
  MO: { zhTW: "澳門", zhCN: "澳门", en: "Macao", ja: "マカオ", ko: "마카오", th: "มาเก๊า" },
  SG: { zhTW: "新加坡", zhCN: "新加坡", en: "Singapore", ja: "シンガポール", ko: "싱가포르", th: "สิงคโปร์" },
  MY: { zhTW: "馬來西亞", zhCN: "马来西亚", en: "Malaysia", ja: "マレーシア", ko: "말레이시아", th: "มาเลเซีย" },
  TH: { zhTW: "泰國", zhCN: "泰国", en: "Thailand", ja: "タイ", ko: "태국", th: "ไทย" },
  VN: { zhTW: "越南", zhCN: "越南", en: "Vietnam", ja: "ベトナム", ko: "베트남", th: "เวียดนาม" },
  PH: { zhTW: "菲律賓", zhCN: "菲律宾", en: "Philippines", ja: "フィリピン", ko: "필리핀", th: "ฟิลิปปินส์" },
  ID: { zhTW: "印尼", zhCN: "印度尼西亚", en: "Indonesia", ja: "インドネシア", ko: "인도네시아", th: "อินโดนีเซีย" },
  MM: { zhTW: "緬甸", zhCN: "缅甸", en: "Myanmar", ja: "ミャンマー", ko: "미얀마", th: "เมียนมาร์" },
  KH: { zhTW: "柬埔寨", zhCN: "柬埔寨", en: "Cambodia", ja: "カンボジア", ko: "캄보디아", th: "กัมพูชา" },
  LA: { zhTW: "老撾", zhCN: "老挝", en: "Laos", ja: "ラオス", ko: "라오스", th: "ลาว" },
  BN: { zhTW: "汶萊", zhCN: "文莱", en: "Brunei", ja: "ブルネイ", ko: "브루나이", th: "บรูไน" },
  IN: { zhTW: "印度", zhCN: "印度", en: "India", ja: "インド", ko: "인도", th: "อินเดีย" },
  PK: { zhTW: "巴基斯坦", zhCN: "巴基斯坦", en: "Pakistan", ja: "パキスタン", ko: "파키스탄", th: "ปากีสถาน" },
  BD: { zhTW: "孟加拉", zhCN: "孟加拉国", en: "Bangladesh", ja: "バングラデシュ", ko: "방글라데시", th: "บังกลาเทศ" },
  LK: { zhTW: "斯里蘭卡", zhCN: "斯里兰卡", en: "Sri Lanka", ja: "スリランカ", ko: "스리랑카", th: "ศรีลังกา" },
  NP: { zhTW: "尼泊爾", zhCN: "尼泊尔", en: "Nepal", ja: "ネパール", ko: "네팔", th: "เนปาล" },
  MV: { zhTW: "馬爾代夫", zhCN: "马尔代夫", en: "Maldives", ja: "モルディブ", ko: "몰디브", th: "มัลดีฟส์" },
  BT: { zhTW: "不丹", zhCN: "不丹", en: "Bhutan", ja: "ブータン", ko: "부탄", th: "ภูฏาน" },
  TL: { zhTW: "東帝汶", zhCN: "东帝汶", en: "Timor-Leste", ja: "東ティモール", ko: "동티모르", th: "ติมอร์-เลสเต" },
  AU: { zhTW: "澳大利亞", zhCN: "澳大利亚", en: "Australia", ja: "オーストラリア", ko: "호주", th: "ออสเตรเลีย" },
  NZ: { zhTW: "新西蘭", zhCN: "新西兰", en: "New Zealand", ja: "ニュージーランド", ko: "뉴질랜드", th: "นิวซีแลนด์" },
  FJ: { zhTW: "斐濟", zhCN: "斐济", en: "Fiji", ja: "フィジー", ko: "피지", th: "ฟิจิ" },
  PG: { zhTW: "巴布亞新幾內亞", zhCN: "巴布亚新几内亚", en: "Papua New Guinea", ja: "パプアニューギニア", ko: "파푸아뉴기니", th: "ปาปัวนิวกินี" },
  WS: { zhTW: "薩摩亞", zhCN: "萨摩亚", en: "Samoa", ja: "サモア", ko: "사모아", th: "ซามัว" },
  TO: { zhTW: "湯加", zhCN: "汤加", en: "Tonga", ja: "トンガ", ko: "통가", th: "ตองกา" },
  VU: { zhTW: "瓦努阿圖", zhCN: "瓦努阿图", en: "Vanuatu", ja: "バヌアツ", ko: "바누아투", th: "วานูอาตู" },
  SB: { zhTW: "所羅門群島", zhCN: "所罗门群岛", en: "Solomon Islands", ja: "ソロモン諸島", ko: "솔로몬 제도", th: "หมู่เกาะโซโลมอน" },
  KI: { zhTW: "基里巴斯", zhCN: "基里巴斯", en: "Kiribati", ja: "キリバス", ko: "키리바시", th: "คิริบาส" },
  GU: { zhTW: "關島", zhCN: "关岛", en: "Guam", ja: "グアム", ko: "괌", th: "กวม" },
  MN: { zhTW: "蒙古", zhCN: "蒙古", en: "Mongolia", ja: "モンゴル", ko: "몽골", th: "มองโกเลีย" },
  KZ: { zhTW: "哈薩克", zhCN: "哈萨克斯坦", en: "Kazakhstan", ja: "カザフスタン", ko: "카자흐스탄", th: "คาซัคสถาน" },
  UZ: { zhTW: "烏茲別克", zhCN: "乌兹别克斯坦", en: "Uzbekistan", ja: "ウズベキスタン", ko: "우즈베키스탄", th: "อุซเบกิสถาน" },
  KG: { zhTW: "吉爾吉斯", zhCN: "吉尔吉斯斯坦", en: "Kyrgyzstan", ja: "キルギス", ko: "키르기스스탄", th: "คีร์กีซสถาน" },
  TJ: { zhTW: "塔吉克", zhCN: "塔吉克斯坦", en: "Tajikistan", ja: "タジキスタン", ko: "타지키스탄", th: "ทาจิกิสถาน" },
  TM: { zhTW: "土庫曼", zhCN: "土库曼斯坦", en: "Turkmenistan", ja: "トルクメニスタン", ko: "투르크메니스탄", th: "เติร์กเมนิสถาน" },

  // Europe
  GB: { zhTW: "英國", zhCN: "英国", en: "United Kingdom", ja: "イギリス", ko: "영국", th: "สหราชอาณาจักร" },
  DE: { zhTW: "德國", zhCN: "德国", en: "Germany", ja: "ドイツ", ko: "독일", th: "เยอรมนี" },
  FR: { zhTW: "法國", zhCN: "法国", en: "France", ja: "フランス", ko: "프랑스", th: "ฝรั่งเศส" },
  IT: { zhTW: "意大利", zhCN: "意大利", en: "Italy", ja: "イタリア", ko: "이탈리아", th: "อิตาลี" },
  ES: { zhTW: "西班牙", zhCN: "西班牙", en: "Spain", ja: "スペイン", ko: "스페인", th: "สเปน" },
  PT: { zhTW: "葡萄牙", zhCN: "葡萄牙", en: "Portugal", ja: "ポルトガル", ko: "포르투갈", th: "โปรตุเกส" },
  NL: { zhTW: "荷蘭", zhCN: "荷兰", en: "Netherlands", ja: "オランダ", ko: "네덜란드", th: "เนเธอร์แลนด์" },
  BE: { zhTW: "比利時", zhCN: "比利时", en: "Belgium", ja: "ベルギー", ko: "벨기에", th: "เบลเยียม" },
  CH: { zhTW: "瑞士", zhCN: "瑞士", en: "Switzerland", ja: "スイス", ko: "스위스", th: "สวิตเซอร์แลนด์" },
  AT: { zhTW: "奧地利", zhCN: "奥地利", en: "Austria", ja: "オーストリア", ko: "오스트리아", th: "ออสเตรีย" },
  SE: { zhTW: "瑞典", zhCN: "瑞典", en: "Sweden", ja: "スウェーデン", ko: "스웨덴", th: "สวีเดน" },
  NO: { zhTW: "挪威", zhCN: "挪威", en: "Norway", ja: "ノルウェー", ko: "노르웨이", th: "นอร์เวย์" },
  DK: { zhTW: "丹麥", zhCN: "丹麦", en: "Denmark", ja: "デンマーク", ko: "덴마크", th: "เดนมาร์ก" },
  FI: { zhTW: "芬蘭", zhCN: "芬兰", en: "Finland", ja: "フィンランド", ko: "핀란드", th: "ฟินแลนด์" },
  PL: { zhTW: "波蘭", zhCN: "波兰", en: "Poland", ja: "ポーランド", ko: "폴란드", th: "โปแลนด์" },
  CZ: { zhTW: "捷克", zhCN: "捷克", en: "Czech Republic", ja: "チェコ", ko: "체코", th: "เช็กเกีย" },
  SK: { zhTW: "斯洛伐克", zhCN: "斯洛伐克", en: "Slovakia", ja: "スロバキア", ko: "슬로바키아", th: "สโลวาเกีย" },
  HU: { zhTW: "匈牙利", zhCN: "匈牙利", en: "Hungary", ja: "ハンガリー", ko: "헝가리", th: "ฮังการี" },
  RO: { zhTW: "羅馬尼亞", zhCN: "罗马尼亚", en: "Romania", ja: "ルーマニア", ko: "루마니아", th: "โรมาเนีย" },
  BG: { zhTW: "保加利亞", zhCN: "保加利亚", en: "Bulgaria", ja: "ブルガリア", ko: "불가리아", th: "บัลแกเรีย" },
  HR: { zhTW: "克羅地亞", zhCN: "克罗地亚", en: "Croatia", ja: "クロアチア", ko: "크로아티아", th: "โครเอเชีย" },
  SI: { zhTW: "斯洛文尼亞", zhCN: "斯洛文尼亚", en: "Slovenia", ja: "スロベニア", ko: "슬로베니아", th: "สโลวีเนีย" },
  RS: { zhTW: "塞爾維亞", zhCN: "塞尔维亚", en: "Serbia", ja: "セルビア", ko: "세르비아", th: "เซอร์เบีย" },
  GR: { zhTW: "希臘", zhCN: "希腊", en: "Greece", ja: "ギリシャ", ko: "그리스", th: "กรีซ" },
  TR: { zhTW: "土耳其", zhCN: "土耳其", en: "Turkey", ja: "トルコ", ko: "터키", th: "ตุรกี" },
  RU: { zhTW: "俄羅斯", zhCN: "俄罗斯", en: "Russia", ja: "ロシア", ko: "러시아", th: "รัสเซีย" },
  UA: { zhTW: "烏克蘭", zhCN: "乌克兰", en: "Ukraine", ja: "ウクライナ", ko: "우크라이나", th: "ยูเครน" },
  IE: { zhTW: "愛爾蘭", zhCN: "爱尔兰", en: "Ireland", ja: "アイルランド", ko: "아일랜드", th: "ไอร์แลนด์" },
  IS: { zhTW: "冰島", zhCN: "冰岛", en: "Iceland", ja: "アイスランド", ko: "아이슬란드", th: "ไอซ์แลนด์" },
  LU: { zhTW: "盧森堡", zhCN: "卢森堡", en: "Luxembourg", ja: "ルクセンブルク", ko: "룩셈부르크", th: "ลักเซมเบิร์ก" },
  MT: { zhTW: "馬耳他", zhCN: "马耳他", en: "Malta", ja: "マルタ", ko: "몰타", th: "มอลตา" },
  CY: { zhTW: "塞浦路斯", zhCN: "塞浦路斯", en: "Cyprus", ja: "キプロス", ko: "키프로스", th: "ไซปรัส" },
  EE: { zhTW: "愛沙尼亞", zhCN: "爱沙尼亚", en: "Estonia", ja: "エストニア", ko: "에스토니아", th: "เอสโตเนีย" },
  LV: { zhTW: "拉脫維亞", zhCN: "拉脱维亚", en: "Latvia", ja: "ラトビア", ko: "라트비아", th: "ลัตเวีย" },
  LT: { zhTW: "立陶宛", zhCN: "立陶宛", en: "Lithuania", ja: "リトアニア", ko: "리투아니아", th: "ลิทัวเนีย" },
  AL: { zhTW: "阿爾巴尼亞", zhCN: "阿尔巴尼亚", en: "Albania", ja: "アルバニア", ko: "알바니아", th: "แอลเบเนีย" },
  MK: { zhTW: "北馬其頓", zhCN: "北马其顿", en: "Republic Of North Macedonia", ja: "北マケドニア", ko: "북마케도니아", th: "มาซิโดเนียเหนือ" },
  BA: { zhTW: "波斯尼亞", zhCN: "波斯尼亚", en: "Bosnia and Herzegovina", ja: "ボスニア・ヘルツェゴビナ", ko: "보스니아 헤르체고비나", th: "บอสเนียและเฮอร์เซโกวีนา" },
  ME: { zhTW: "黑山", zhCN: "黑山", en: "Montenegro", ja: "モンテネグロ", ko: "몬테네그로", th: "มอนเตเนโกร" },
  MD: { zhTW: "摩爾多瓦", zhCN: "摩尔多瓦", en: "Moldova", ja: "モルドバ", ko: "몰도바", th: "มอลโดวา" },
  BY: { zhTW: "白俄羅斯", zhCN: "白俄罗斯", en: "Belarus", ja: "ベラルーシ", ko: "벨라루스", th: "เบลารุส" },
  GE: { zhTW: "格魯吉亞", zhCN: "格鲁吉亚", en: "Georgia", ja: "ジョージア", ko: "조지아", th: "จอร์เจีย" },
  AM: { zhTW: "亞美尼亞", zhCN: "亚美尼亚", en: "Armenia", ja: "アルメニア", ko: "아르메니아", th: "อาร์เมเนีย" },
  AZ: { zhTW: "阿塞拜疆", zhCN: "阿塞拜疆", en: "Azerbaijan", ja: "アゼルバイジャン", ko: "아제르바이잔", th: "อาเซอร์ไบจาน" },
  AD: { zhTW: "安道爾", zhCN: "安道尔", en: "Andorra", ja: "アンドラ", ko: "안도라", th: "อันดอร์รา" },
  LI: { zhTW: "列支敦士登", zhCN: "列支敦士登", en: "Liechtenstein", ja: "リヒテンシュタイン", ko: "리히텐슈타인", th: "ลิกเตนสไตน์" },
  SM: { zhTW: "聖馬力諾", zhCN: "圣马力诺", en: "San Marino", ja: "サンマリノ", ko: "산마리노", th: "ซานมารีโน" },
  VA: { zhTW: "梵蒂岡", zhCN: "梵蒂冈", en: "Vatican City", ja: "バチカン", ko: "바티칸", th: "นครวาติกัน" },
  GI: { zhTW: "直布羅陀", zhCN: "直布罗陀", en: "Gibraltar", ja: "ジブラルタル", ko: "지브롤터", th: "ยิบรอลตาร์" },
  IM: { zhTW: "曼島", zhCN: "曼岛", en: "Isle of Man", ja: "マン島", ko: "맨 섬", th: "เกาะแมน" },
  GG: { zhTW: "根西島", zhCN: "根西岛", en: "Guernsey", ja: "ガーンジー", ko: "건지 섬", th: "เกิร์นซีย์" },
  JE: { zhTW: "澤西島", zhCN: "泽西岛", en: "Jersey", ja: "ジャージー", ko: "저지 섬", th: "เจอร์ซีย์" },
  FO: { zhTW: "法羅群島", zhCN: "法罗群岛", en: "Faroe Islands", ja: "フェロー諸島", ko: "페로 제도", th: "หมู่เกาะแฟโร" },
  AX: { zhTW: "奧蘭群島", zhCN: "奥兰群岛", en: "Aland Islands", ja: "オーランド諸島", ko: "올란드 제도", th: "หมู่เกาะโอลันด์" },
  BL: { zhTW: "巴利阿里群島", zhCN: "巴利阿里群岛", en: "Balearic Islands", ja: "バレアレス諸島", ko: "발레아레스 제도", th: "หมู่เกาะแบลีแอริก" },

  // Americas
  US: { zhTW: "美國", zhCN: "美国", en: "United States", ja: "アメリカ", ko: "미국", th: "สหรัฐอเมริกา" },
  CA: { zhTW: "加拿大", zhCN: "加拿大", en: "Canada", ja: "カナダ", ko: "캐나다", th: "แคนาดา" },
  MX: { zhTW: "墨西哥", zhCN: "墨西哥", en: "Mexico", ja: "メキシコ", ko: "멕시코", th: "เม็กซิโก" },
  BR: { zhTW: "巴西", zhCN: "巴西", en: "Brazil", ja: "ブラジル", ko: "브라질", th: "บราซิล" },
  AR: { zhTW: "阿根廷", zhCN: "阿根廷", en: "Argentina", ja: "アルゼンチン", ko: "아르헨티나", th: "อาร์เจนตินา" },
  CL: { zhTW: "智利", zhCN: "智利", en: "Chile", ja: "チリ", ko: "칠레", th: "ชิลี" },
  CO: { zhTW: "哥倫比亞", zhCN: "哥伦比亚", en: "Colombia", ja: "コロンビア", ko: "콜롬비아", th: "โคลอมเบีย" },
  PE: { zhTW: "秘魯", zhCN: "秘鲁", en: "Peru", ja: "ペルー", ko: "페루", th: "เปรู" },
  VE: { zhTW: "委內瑞拉", zhCN: "委内瑞拉", en: "Venezuela", ja: "ベネズエラ", ko: "베네수엘라", th: "เวเนซุเอลา" },
  EC: { zhTW: "厄瓜多爾", zhCN: "厄瓜多尔", en: "Ecuador", ja: "エクアドル", ko: "에콰도르", th: "เอกวาดอร์" },
  BO: { zhTW: "玻利維亞", zhCN: "玻利维亚", en: "Bolivia", ja: "ボリビア", ko: "볼리비아", th: "โบลิเวีย" },
  PY: { zhTW: "巴拉圭", zhCN: "巴拉圭", en: "Paraguay", ja: "パラグアイ", ko: "파라과이", th: "ปารากวัย" },
  UY: { zhTW: "烏拉圭", zhCN: "乌拉圭", en: "Uruguay", ja: "ウルグアイ", ko: "우루과이", th: "อุรุกวัย" },
  CR: { zhTW: "哥斯達黎加", zhCN: "哥斯达黎加", en: "Costa Rica", ja: "コスタリカ", ko: "코스타리카", th: "คอสตาริกา" },
  PA: { zhTW: "巴拿馬", zhCN: "巴拿马", en: "Panama", ja: "パナマ", ko: "파나마", th: "ปานามา" },
  GT: { zhTW: "危地馬拉", zhCN: "危地马拉", en: "Guatemala", ja: "グアテマラ", ko: "과테말라", th: "กัวเตมาลา" },
  HN: { zhTW: "洪都拉斯", zhCN: "洪都拉斯", en: "Honduras", ja: "ホンジュラス", ko: "온두라스", th: "ฮอนดูรัส" },
  SV: { zhTW: "薩爾瓦多", zhCN: "萨尔瓦多", en: "El Salvador", ja: "エルサルバドル", ko: "엘살바도르", th: "เอลซัลวาดอร์" },
  NI: { zhTW: "尼加拉瓜", zhCN: "尼加拉瓜", en: "Nicaragua", ja: "ニカラグア", ko: "니카라과", th: "นิการากัว" },
  CU: { zhTW: "古巴", zhCN: "古巴", en: "Cuba", ja: "キューバ", ko: "쿠바", th: "คิวบา" },
  DO: { zhTW: "多明尼加", zhCN: "多米尼加", en: "Dominican Republic", ja: "ドミニカ共和国", ko: "도미니카 공화국", th: "สาธารณรัฐโดมินิกัน" },
  JM: { zhTW: "牙買加", zhCN: "牙买加", en: "Jamaica", ja: "ジャマイカ", ko: "자메이카", th: "จาเมกา" },
  TT: { zhTW: "千里達", zhCN: "特立尼达和多巴哥", en: "Trinidad and Tobago", ja: "トリニダード・トバゴ", ko: "트리니다드 토바고", th: "ตรินิแดดและโตเบโก" },
  BB: { zhTW: "巴巴多斯", zhCN: "巴巴多斯", en: "Barbados", ja: "バルバドス", ko: "바베이도스", th: "บาร์เบโดส" },
  PR: { zhTW: "波多黎各", zhCN: "波多黎各", en: "Puerto Rico", ja: "プエルトリコ", ko: "푸에르토리코", th: "เปอร์โตริโก" },
  BS: { zhTW: "巴哈馬", zhCN: "巴哈马", en: "Bahamas", ja: "バハマ", ko: "바하마", th: "บาฮามาส" },
  BZ: { zhTW: "伯利茲", zhCN: "伯利兹", en: "Belize", ja: "ベリーズ", ko: "벨리즈", th: "เบลีซ" },
  AG: { zhTW: "安提瓜和巴布達", zhCN: "安提瓜和巴布达", en: "Antigua and Barbuda", ja: "アンティグア・バーブーダ", ko: "앤티가 바부다", th: "แอนติกาและบาร์บูดา" },
  AI: { zhTW: "安圭拉", zhCN: "安圭拉", en: "Anguilla", ja: "アンギラ", ko: "앵귈라", th: "แองกวิลลา" },
  AW: { zhTW: "阿魯巴", zhCN: "阿鲁巴", en: "Aruba", ja: "アルバ", ko: "아루바", th: "อารูบา" },
  BM: { zhTW: "百慕達", zhCN: "百慕达", en: "Bermuda", ja: "バミューダ", ko: "버뮤다", th: "เบอร์มิวดา" },
  BQ: { zhTW: "博內爾、聖尤斯特歇斯和薩巴", zhCN: "博内尔、圣尤斯特歇斯和萨巴", en: "Bonaire, Sint Eustatius and Saba", ja: "ボネール島、シント・ユースタティウスおよびサバ", ko: "보네르, 신트외스타티위스, 사바", th: "โบแนร์ ซินต์เอิสตาทิอุส และซาบา" },
  VG: { zhTW: "英屬維爾京群島", zhCN: "英属维尔京群岛", en: "British Virgin Islands", ja: "英領ヴァージン諸島", ko: "영국령 버진아일랜드", th: "หมู่เกาะบริติชเวอร์จิน" },
  VI: { zhTW: "美屬維爾京群島", zhCN: "美属维尔京群岛", en: "United States Virgin Islands", ja: "米領ヴァージン諸島", ko: "미국령 버진아일랜드", th: "หมู่เกาะเวอร์จินของสหรัฐอเมริกา" },
  CW: { zhTW: "庫拉索", zhCN: "库拉索", en: "Curacao", ja: "キュラソー", ko: "퀴라소", th: "กือราเซา" },
  DM: { zhTW: "多米尼加", zhCN: "多米尼加", en: "Dominica", ja: "ドミニカ国", ko: "도미니카", th: "โดมินิกา" },
  GD: { zhTW: "格林納達", zhCN: "格林纳达", en: "Grenada", ja: "グレナダ", ko: "그레나다", th: "เกรเนดา" },
  GP: { zhTW: "瓜德羅普", zhCN: "瓜德罗普", en: "Guadeloupe", ja: "グアドループ", ko: "과들루프", th: "กัวเดอลูป" },
  HT: { zhTW: "海地", zhCN: "海地", en: "Haiti", ja: "ハイチ", ko: "아이티", th: "เฮติ" },
  KN: { zhTW: "聖基茨和尼維斯", zhCN: "圣基茨和尼维斯", en: "Saint Kitts and Nevis", ja: "セントクリストファー・ネイビス", ko: "세인트키츠 네비스", th: "เซนต์คิตส์และเนวิส" },
  LC: { zhTW: "聖盧西亞", zhCN: "圣卢西亚", en: "Saint Lucia", ja: "セントルシア", ko: "세인트루시아", th: "เซนต์ลูเซีย" },
  MF: { zhTW: "聖馬丁島", zhCN: "圣马丁岛", en: "Saint Martin", ja: "サン・マルタン", ko: "생마르탱", th: "เซนต์มาร์ติน" },
  MQ: { zhTW: "馬提尼克", zhCN: "马提尼克", en: "Martinique", ja: "マルティニーク", ko: "마르티니크", th: "มาร์ตินีก" },
  MP: { zhTW: "馬德拉", zhCN: "马德拉", en: "Madeira", ja: "マデイラ", ko: "마데이라", th: "มาเดรา" },
  GF: { zhTW: "法屬圭亞那", zhCN: "法属圭亚那", en: "French Guiana", ja: "フランス領ギアナ", ko: "프랑스령 기아나", th: "เฟรนช์เกียนา" },
  PF: { zhTW: "法屬波利尼西亞", zhCN: "法属波利尼西亚", en: "French Polynesia", ja: "フランス領ポリネシア", ko: "프랑스령 폴리네시아", th: "เฟรนช์โปลินีเซีย" },
  VC: { zhTW: "聖文森特和格林納丁斯", zhCN: "圣文森特和格林纳丁斯", en: "Saint Vincent and the Grenadines", ja: "セントビンセント・グレナディーン", ko: "세인트빈센트 그레나딘", th: "เซนต์วินเซนต์และเกรนาดีนส์" },
  TC: { zhTW: "特克斯和凱科斯群島", zhCN: "特克斯和凯科斯群岛", en: "Turks and Caicos Islands", ja: "タークス・カイコス諸島", ko: "터크스 케이커스 제도", th: "หมู่เกาะเติกส์และเคคอส" },
  CV: { zhTW: "佛得角", zhCN: "佛得角", en: "Cape Verde", ja: "カーボベルデ", ko: "카보베르데", th: "กาบูเวร์ดี" },
  KY: { zhTW: "開曼群島", zhCN: "开曼群岛", en: "Cayman Islands", ja: "ケイマン諸島", ko: "케이맨 제도", th: "หมู่เกาะเคย์แมน" },
  AA: { zhTW: "亞速群島", zhCN: "亚速群岛", en: "Azores", ja: "アゾレス諸島", ko: "아조레스 제도", th: "หมู่เกาะอาโซเรส" },

  // Middle East
  AE: { zhTW: "阿聯酋", zhCN: "阿联酋", en: "United Arab Emirates", ja: "アラブ首長国連邦", ko: "아랍에미리트", th: "สหรัฐอาหรับเอมิเรตส์" },
  SA: { zhTW: "沙特阿拉伯", zhCN: "沙特阿拉伯", en: "Saudi Arabia", ja: "サウジアラビア", ko: "사우디아라비아", th: "ซาอุดีอาระเบีย" },
  QA: { zhTW: "卡塔爾", zhCN: "卡塔尔", en: "Qatar", ja: "カタール", ko: "카타르", th: "กาตาร์" },
  KW: { zhTW: "科威特", zhCN: "科威特", en: "Kuwait", ja: "クウェート", ko: "쿠웨이트", th: "คูเวต" },
  BH: { zhTW: "巴林", zhCN: "巴林", en: "Bahrain", ja: "バーレーン", ko: "바레인", th: "บาห์เรน" },
  OM: { zhTW: "阿曼", zhCN: "阿曼", en: "Oman", ja: "オマーン", ko: "오만", th: "โอมาน" },
  IL: { zhTW: "以色列", zhCN: "以色列", en: "Israel", ja: "イスラエル", ko: "이스라엘", th: "อิสราเอล" },
  JO: { zhTW: "約旦", zhCN: "约旦", en: "Jordan", ja: "ヨルダン", ko: "요르단", th: "จอร์แดน" },
  LB: { zhTW: "黎巴嫩", zhCN: "黎巴嫩", en: "Lebanon", ja: "レバノン", ko: "레바논", th: "เลบานอน" },
  IQ: { zhTW: "伊拉克", zhCN: "伊拉克", en: "Iraq", ja: "イラク", ko: "이라크", th: "อิรัก" },
  IR: { zhTW: "伊朗", zhCN: "伊朗", en: "Iran", ja: "イラン", ko: "이란", th: "อิหร่าน" },
  YE: { zhTW: "也門", zhCN: "也门", en: "Yemen", ja: "イエメン", ko: "예멘", th: "เยเมน" },
  SY: { zhTW: "敘利亞", zhCN: "叙利亚", en: "Syria", ja: "シリア", ko: "시리아", th: "ซีเรีย" },

  // Africa
  ZA: { zhTW: "南非", zhCN: "南非", en: "South Africa", ja: "南アフリカ", ko: "남아프리카", th: "แอฟริกาใต้" },
  NG: { zhTW: "尼日利亞", zhCN: "尼日利亚", en: "Nigeria", ja: "ナイジェリア", ko: "나이지리아", th: "ไนจีเรีย" },
  EG: { zhTW: "埃及", zhCN: "埃及", en: "Egypt", ja: "エジプト", ko: "이집트", th: "อียิปต์" },
  KE: { zhTW: "肯尼亞", zhCN: "肯尼亚", en: "Kenya", ja: "ケニア", ko: "케냐", th: "เคนยา" },
  ET: { zhTW: "埃塞俄比亞", zhCN: "埃塞俄比亚", en: "Ethiopia", ja: "エチオピア", ko: "에티오피아", th: "เอธิโอเปีย" },
  GH: { zhTW: "加納", zhCN: "加纳", en: "Ghana", ja: "ガーナ", ko: "가나", th: "กานา" },
  TZ: { zhTW: "坦桑尼亞", zhCN: "坦桑尼亚", en: "Tanzania", ja: "タンザニア", ko: "탄자니아", th: "แทนซาเนีย" },
  UG: { zhTW: "烏干達", zhCN: "乌干达", en: "Uganda", ja: "ウガンダ", ko: "우간다", th: "ยูกันดา" },
  MA: { zhTW: "摩洛哥", zhCN: "摩洛哥", en: "Morocco", ja: "モロッコ", ko: "모로코", th: "โมร็อกโก" },
  TN: { zhTW: "突尼斯", zhCN: "突尼斯", en: "Tunisia", ja: "チュニジア", ko: "튀니지", th: "ตูนิเซีย" },
  DZ: { zhTW: "阿爾及利亞", zhCN: "阿尔及利亚", en: "Algeria", ja: "アルジェリア", ko: "알제리", th: "แอลจีเรีย" },
  SN: { zhTW: "塞內加爾", zhCN: "塞内加尔", en: "Senegal", ja: "セネガル", ko: "세네갈", th: "เซเนกัล" },
  CI: { zhTW: "科特迪瓦", zhCN: "科特迪瓦", en: "Ivory Coast", ja: "コートジボワール", ko: "코트디부아르", th: "โกตดิวัวร์" },
  CM: { zhTW: "喀麥隆", zhCN: "喀麦隆", en: "Cameroon", ja: "カメルーン", ko: "카메룬", th: "แคเมอรูน" },
  ZM: { zhTW: "贊比亞", zhCN: "赞比亚", en: "Zambia", ja: "ザンビア", ko: "잠비아", th: "แซมเบีย" },
  ZW: { zhTW: "津巴布韋", zhCN: "津巴布韦", en: "Zimbabwe", ja: "ジンバブエ", ko: "짐바브웨", th: "ซิมบับเว" },

  // Additional countries from Vizlync
  GL: { zhTW: "全球地區", zhCN: "全球地区", en: "Global Territory", ja: "グローバル", ko: "글로벌", th: "ทั่วโลก" },
  EU33: { zhTW: "歐洲 33 國", zhCN: "欧洲 33 国", en: "Europe 33", ja: "ヨーロッパ33カ国", ko: "유럽 33개국", th: "ยุโรป 33 ประเทศ" },
  GM: { zhTW: "岡比亞", zhCN: "冈比亚", en: "Gambia", ja: "ガンビア", ko: "감비아", th: "แกมเบีย" },
  GN: { zhTW: "幾內亞", zhCN: "几内亚", en: "Guinea", ja: "ギニア", ko: "기니", th: "กินี" },
  GW: { zhTW: "幾內亞比紹", zhCN: "几内亚比绍", en: "Guinea-Bissau", ja: "ギニアビサウ", ko: "기니비사우", th: "กินี-บิสเซา" },
  GY: { zhTW: "圭亞那", zhCN: "圭亚那", en: "Guyana", ja: "ガイアナ", ko: "가이아나", th: "กายอานา" },
  HI: { zhTW: "夏威夷", zhCN: "夏威夷", en: "Hawaii", ja: "ハワイ", ko: "하와이", th: "ฮาวาย" },
  LR: { zhTW: "利比里亞", zhCN: "利比里亚", en: "Liberia", ja: "リベリア", ko: "라이베리아", th: "ไลบีเรีย" },
  LS: { zhTW: "萊索托", zhCN: "莱索托", en: "Lesotho", ja: "レソト", ko: "레소토", th: "เลโซโท" },
  MC: { zhTW: "摩納哥", zhCN: "摩纳哥", en: "Monaco", ja: "モナコ", ko: "모나코", th: "โมนาโก" },
  MS: { zhTW: "蒙特塞拉特", zhCN: "蒙特塞拉特", en: "Montserrat", ja: "モントセラト", ko: "몬트세랫", th: "มอนต์เซอร์รัต" },
  NC: { zhTW: "新喀里多尼亞", zhCN: "新喀里多尼亚", en: "New Caledonia", ja: "ニューカレドニア", ko: "뉴칼레도니아", th: "นิวแคลิโดเนีย" },
  NR: { zhTW: "諾魯", zhCN: "瑙鲁", en: "Nauru", ja: "ナウル", ko: "나우루", th: "นาอูรู" },
  SC: { zhTW: "塞舌爾", zhCN: "塞舌尔", en: "Seychelles", ja: "セーシェル", ko: "세이셸", th: "เซเชลส์" },
  SJ: { zhTW: "斯瓦爾巴", zhCN: "斯瓦尔巴", en: "Svalbard and Jan Mayen", ja: "スバールバル諸島", ko: "스발바르 얀마옌", th: "สวาลบาร์ดและยานไมเอน" },
  SP: { zhTW: "薩丁尼亞", zhCN: "撒丁岛", en: "Sardinia", ja: "サルデーニャ", ko: "사르데냐", th: "ซาร์ดิเนีย" },
  SR: { zhTW: "蘇利南", zhCN: "苏里南", en: "Suriname", ja: "スリナム", ko: "수리남", th: "ซูรินาม" },
  SX: { zhTW: "荷屬聖馬丁", zhCN: "荷属圣马丁", en: "Sint Maarten", ja: "シント・マールテン", ko: "신트마르턴", th: "ซินต์มาร์เทิน" },
  SZ: { zhTW: "斯威士蘭", zhCN: "斯威士兰", en: "Eswatini", ja: "エスワティニ", ko: "에스와티니", th: "เอสวาตินี" },
  TG: { zhTW: "多哥", zhCN: "多哥", en: "Togo", ja: "トーゴ", ko: "토고", th: "โตโก" },
  MZ: { zhTW: "莫桑比克", zhCN: "莫桑比克", en: "Mozambique", ja: "モザンビーク", ko: "모잠비크", th: "โมซัมบิก" },
  RW: { zhTW: "盧旺達", zhCN: "卢旺达", en: "Rwanda", ja: "ルワンダ", ko: "르완다", th: "รวันดา" },
  MU: { zhTW: "毛里求斯", zhCN: "毛里求斯", en: "Mauritius", ja: "モーリシャス", ko: "모리셔스", th: "มอริเชียส" },
  RE: { zhTW: "留尼汪", zhCN: "留尼汪", en: "Reunion", ja: "レユニオン", ko: "레위니옹", th: "เรอูนียง" },
  MG: { zhTW: "馬達加斯加", zhCN: "马达加斯加", en: "Madagascar", ja: "マダガスカル", ko: "마다가스카르", th: "มาดากัสการ์" },
  MW: { zhTW: "馬拉維", zhCN: "马拉维", en: "Malawi", ja: "マラウイ", ko: "말라위", th: "มาลาวี" },
  ML: { zhTW: "馬里", zhCN: "马里", en: "Mali", ja: "マリ", ko: "말리", th: "มาลี" },
  NE: { zhTW: "尼日爾", zhCN: "尼日尔", en: "Niger", ja: "ニジェール", ko: "니제르", th: "ไนเจอร์" },
  BF: { zhTW: "布基納法索", zhCN: "布基纳法索", en: "Burkina Faso", ja: "ブルキナファソ", ko: "부르키나파소", th: "บูร์กินาฟาโซ" },
  BJ: { zhTW: "貝寧", zhCN: "贝宁", en: "Benin", ja: "ベナン", ko: "베냉", th: "เบนิน" },
  GA: { zhTW: "加蓬", zhCN: "加蓬", en: "Gabon", ja: "ガボン", ko: "가봉", th: "กาบอง" },
  CG: { zhTW: "剛果共和國", zhCN: "刚果共和国", en: "Congo Republic", ja: "コンゴ共和国", ko: "콩고 공화국", th: "สาธารณรัฐคองโก" },
  CD: { zhTW: "剛果民主共和國", zhCN: "刚果民主共和国", en: "Democratic Republic of the Congo", ja: "コンゴ民主共和国", ko: "콩고 민주 공화국", th: "สาธารณรัฐประชาธิปไตยคองโก" },
  CF: { zhTW: "中非共和國", zhCN: "中非共和国", en: "Central African Republic", ja: "中央アフリカ共和国", ko: "중앙아프리카 공화국", th: "สาธารณรัฐแอฟริกากลาง" },
  TD: { zhTW: "乍得", zhCN: "乍得", en: "Chad", ja: "チャド", ko: "차드", th: "ชาด" },
  SL: { zhTW: "塞拉利昂", zhCN: "塞拉利昂", en: "Sierra Leone", ja: "シエラレオネ", ko: "시에라리온", th: "เซียร์ราลีโอน" },
  BW: { zhTW: "博茨瓦納", zhCN: "博茨瓦纳", en: "Botswana", ja: "ボツワナ", ko: "보츠와나", th: "บอตสวานา" },
  YT: { zhTW: "馬約特島", zhCN: "马约特岛", en: "Mayotte", ja: "マヨット", ko: "마요트", th: "มายอต" },

  // Special codes
  "US-HI": { zhTW: "夏威夷（美）", zhCN: "夏威夷（美）", en: "Hawaii (US)", ja: "ハワイ（米）", ko: "하와이 (미국)", th: "ฮาวาย (สหรัฐฯ)" },

  // Previously missing countries (added from Vizlync data)
  AF: { zhTW: "阿富汗", zhCN: "阿富汗", en: "Afghanistan", ja: "アフガニスタン", ko: "아프가니스탄", th: "อัฟกานิสถาน" },
  AO: { zhTW: "安哥拉", zhCN: "安哥拉", en: "Angola", ja: "アンゴラ", ko: "앙골라", th: "แองโกลา" },
  BI: { zhTW: "布隆迪", zhCN: "布隆迪", en: "Burundi", ja: "ブルンジ", ko: "부룬디", th: "บุรุนดี" },
  KM: { zhTW: "科摩羅", zhCN: "科摩罗", en: "Comoros", ja: "コモロ", ko: "코모로", th: "คอโมโรส" },
  CK: { zhTW: "科孚島", zhCN: "科孚岛", en: "Corfu", ja: "コルフ島", ko: "코르푸", th: "คอร์ฟู" },
  DJ: { zhTW: "吉布提", zhCN: "吉布提", en: "Djibouti", ja: "ジブチ", ko: "지부티", th: "จิบูตี" },
  GQ: { zhTW: "赤道幾內亞", zhCN: "赤道几内亚", en: "Equatorial Guinea", ja: "赤道ギニア", ko: "적도 기니", th: "อิเควทอเรียลกินี" },
  ER: { zhTW: "厄立特里亞", zhCN: "厄立特里亚", en: "Eritrea", ja: "エリトリア", ko: "에리트레아", th: "เอริเทรีย" },
  XK: { zhTW: "科索沃", zhCN: "科索沃", en: "Kosovo", ja: "コソボ", ko: "코소보", th: "โคโซโว" },
  LY: { zhTW: "利比亞", zhCN: "利比亚", en: "Libya", ja: "リビア", ko: "리비아", th: "ลิเบีย" },
  MH: { zhTW: "馬紹爾群島", zhCN: "马绍尔群岛", en: "Marshall Islands", ja: "マーシャル諸島", ko: "마셜 제도", th: "หมู่เกาะมาร์แชลล์" },
  MR: { zhTW: "毛里塔尼亞", zhCN: "毛里塔尼亚", en: "Mauritania", ja: "モーリタニア", ko: "모리타니", th: "มอริเตเนีย" },
  FM: { zhTW: "密克羅尼西亞", zhCN: "密克罗尼西亚", en: "Micronesia", ja: "ミクロネシア", ko: "미크로네시아", th: "ไมโครนีเซีย" },
  NA: { zhTW: "納米比亞", zhCN: "纳米比亚", en: "Namibia", ja: "ナミビア", ko: "나미비아", th: "นามิเบีย" },
  PW: { zhTW: "帛琉", zhCN: "帕劳", en: "Palau", ja: "パラオ", ko: "팔라우", th: "ปาเลา" },
  PS: { zhTW: "巴勒斯坦", zhCN: "巴勒斯坦", en: "Palestine", ja: "パレスチナ", ko: "팔레스타인", th: "ปาเลสไตน์" },
  ST: { zhTW: "聖多美和普林西比", zhCN: "圣多美和普林西比", en: "São Tomé and Príncipe", ja: "サントメ・プリンシペ", ko: "상투메 프린시페", th: "เซาตูเมและปรินซิปี" },
  SO: { zhTW: "索馬里", zhCN: "索马里", en: "Somalia", ja: "ソマリア", ko: "소말리아", th: "โซมาเลีย" },
  SS: { zhTW: "南蘇丹", zhCN: "南苏丹", en: "South Sudan", ja: "南スーダン", ko: "남수단", th: "ซูดานใต้" },
  SD: { zhTW: "蘇丹", zhCN: "苏丹", en: "Sudan", ja: "スーダン", ko: "수단", th: "ซูดาน" },
  TV: { zhTW: "圖瓦盧", zhCN: "图瓦卢", en: "Tuvalu", ja: "ツバル", ko: "투발루", th: "ตูวาลู" },
};


/**
 * Maps ISO country code to region name (matching Vizlync region values)
 */
export const countryRegionMap: Record<string, string> = {
  // Asia
  JP: "Asia", KR: "Asia", CN: "Asia", HK: "Asia", TW: "Asia", MO: "Asia",
  SG: "Asia", MY: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", ID: "Asia",
  MM: "Asia", KH: "Asia", LA: "Asia", BN: "Asia", IN: "Asia", PK: "Asia",
  BD: "Asia", LK: "Asia", NP: "Asia", MV: "Asia", BT: "Asia", TL: "Asia",
  MN: "Asia", KZ: "Asia", UZ: "Asia", KG: "Asia", TJ: "Asia", TM: "Asia",
  // Oceania
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania", WS: "Oceania",
  TO: "Oceania", VU: "Oceania", SB: "Oceania", KI: "Oceania", GU: "Oceania",
  // Europe
  GB: "Europe", DE: "Europe", FR: "Europe", IT: "Europe", ES: "Europe",
  PT: "Europe", NL: "Europe", BE: "Europe", CH: "Europe", AT: "Europe",
  SE: "Europe", NO: "Europe", DK: "Europe", FI: "Europe", PL: "Europe",
  CZ: "Europe", SK: "Europe", HU: "Europe", RO: "Europe", BG: "Europe",
  HR: "Europe", SI: "Europe", RS: "Europe", GR: "Europe", TR: "Europe",
  RU: "Europe", UA: "Europe", IE: "Europe", IS: "Europe", LU: "Europe",
  MT: "Europe", CY: "Europe", EE: "Europe", LV: "Europe", LT: "Europe",
  AL: "Europe", MK: "Europe", BA: "Europe", ME: "Europe", MD: "Europe",
  BY: "Europe", GE: "Europe", AM: "Europe", AZ: "Europe", AD: "Europe",
  LI: "Europe", SM: "Europe", VA: "Europe", GI: "Europe", IM: "Europe",
  GG: "Europe", JE: "Europe", FO: "Europe", AX: "Europe", BL: "Europe",
  // North America
  US: "North America", CA: "North America", MX: "North America",
  "US-HI": "North America",
  // South America
  BR: "South America", AR: "South America", CL: "South America",
  CO: "South America", PE: "South America", VE: "South America",
  EC: "South America", BO: "South America", PY: "South America",
  UY: "South America", GF: "South America",
  // Caribbean & Central America
  CR: "Caribbean", PA: "Caribbean", GT: "Caribbean", HN: "Caribbean",
  SV: "Caribbean", NI: "Caribbean", CU: "Caribbean", DO: "Caribbean",
  JM: "Caribbean", TT: "Caribbean", BB: "Caribbean", PR: "Caribbean",
  BS: "Caribbean", BZ: "Caribbean", AG: "Caribbean", AI: "Caribbean",
  AW: "Caribbean", BM: "Caribbean", BQ: "Caribbean", VG: "Caribbean",
  VI: "Caribbean", CW: "Caribbean", DM: "Caribbean", GD: "Caribbean",
  GP: "Caribbean", HT: "Caribbean", KN: "Caribbean", LC: "Caribbean",
  MF: "Caribbean", MQ: "Caribbean", MP: "Caribbean", PF: "Caribbean",
  VC: "Caribbean", TC: "Caribbean", KY: "Caribbean", AA: "Caribbean",
  // Middle East
  AE: "Middle East", SA: "Middle East", QA: "Middle East", KW: "Middle East",
  BH: "Middle East", OM: "Middle East", IL: "Middle East", JO: "Middle East",
  LB: "Middle East", IQ: "Middle East", IR: "Middle East", YE: "Middle East",
  SY: "Middle East",
  // Africa
  ZA: "Africa", NG: "Africa", EG: "Africa", KE: "Africa", ET: "Africa",
  GH: "Africa", TZ: "Africa", UG: "Africa", MA: "Africa", TN: "Africa",
  DZ: "Africa", SN: "Africa", CI: "Africa", CM: "Africa", ZM: "Africa",
  ZW: "Africa", MZ: "Africa", RW: "Africa", MU: "Africa", RE: "Africa",
  MG: "Africa", MW: "Africa", ML: "Africa", NE: "Africa", BF: "Africa",
  BJ: "Africa", GA: "Africa", CG: "Africa", CD: "Africa", CF: "Africa",
  TD: "Africa", SL: "Africa", BW: "Africa", YT: "Africa", CV: "Africa",
};

/**
 * Get countries belonging to a given region (for country dropdown filter)
 * Supports composite region aliases like "Americas"
 */
export function getCountriesByRegion(region: string): string[] {
  const regionAliasMap: Record<string, string[]> = {
    Americas: ["North America", "South America", "Caribbean"],
    "Asia Pacific": ["Asia", "Oceania"],
  };
  const targetRegions = regionAliasMap[region] ?? [region];
  return Object.entries(countryRegionMap)
    .filter(([, r]) => targetRegions.includes(r))
    .map(([code]) => code);
}

/**
 * Translate country name based on current language
 */
export function translateCountry(
  country: { id: string; name: string },
  lang: Language
): string {
  const entry = countryNameMap[country.id];
  if (!entry) return country.name; // fallback to English
  if (lang === "zh-TW") return entry.zhTW;
  if (lang === "zh-CN") return entry.zhCN;
  if (lang === "ja") return entry.ja;
  if (lang === "ko") return entry.ko;
  if (lang === "th") return entry.th;
  return entry.en;
}

/**
 * Translate a list of countries
 */
export function translateCountries(
  countries: { id: string; name: string }[],
  lang: Language
): { id: string; name: string }[] {
  return countries.map((c) => ({
    id: c.id,
    name: translateCountry(c, lang),
  }));
}

/**
 * Translate region name
 */
export function translateRegion(region: string, lang: Language): string {
  const regionMap: Record<string, { zhTW: string; zhCN: string; ja: string; ko: string; th: string }> = {
    Asia: { zhTW: "亞洲", zhCN: "亚洲", ja: "アジア", ko: "아시아", th: "เอเชีย" },
    "Asia Pacific": { zhTW: "亞太", zhCN: "亚太", ja: "アジア太平洋", ko: "아시아 태평양", th: "เอเชียแปซิฟิก" },
    Europe: { zhTW: "歐洲", zhCN: "欧洲", ja: "ヨーロッパ", ko: "유럽", th: "ยุโรป" },
    Americas: { zhTW: "美洲", zhCN: "美洲", ja: "アメリカ大陸", ko: "아메리카", th: "อเมริกา" },
    "North America": { zhTW: "北美洲", zhCN: "北美洲", ja: "北アメリカ", ko: "북아메리카", th: "อเมริกาเหนือ" },
    "South America": { zhTW: "南美洲", zhCN: "南美洲", ja: "南アメリカ", ko: "남아메리카", th: "อเมริกาใต้" },
    "Middle East": { zhTW: "中東", zhCN: "中东", ja: "中東", ko: "중동", th: "ตะวันออกกลาง" },
    Africa: { zhTW: "非洲", zhCN: "非洲", ja: "アフリカ", ko: "아프리카", th: "แอฟริกา" },
    Oceania: { zhTW: "大洋洲", zhCN: "大洋洲", ja: "オセアニア", ko: "오세아니아", th: "โอเชียเนีย" },
    Caribbean: { zhTW: "加勒比海", zhCN: "加勒比海", ja: "カリブ海", ko: "카리브해", th: "แคริบเบียน" },
    Global: { zhTW: "全球", zhCN: "全球", ja: "グローバル", ko: "글로벌", th: "ทั่วโลก" },
    Worldwide: { zhTW: "全球", zhCN: "全球", ja: "全世界", ko: "전 세계", th: "ทั่วโลก" },
  };
  if (lang === "en") return region;
  const entry = regionMap[region];
  if (!entry) return region;
  if (lang === "zh-TW") return entry.zhTW;
  if (lang === "zh-CN") return entry.zhCN;
  if (lang === "ja") return entry.ja;
  if (lang === "ko") return entry.ko;
  if (lang === "th") return entry.th;
  return region;
}

/**
 * Build a reverse lookup map: English name -> { id, zhTW, zhCN, ja, ko, th }
 * Used to translate country names that appear in plan names
 */
export const nameToEntry: Record<string, { id: string; zhTW: string; zhCN: string; ja: string; ko: string; th: string }> = {};
for (const [id, entry] of Object.entries(countryNameMap)) {
  nameToEntry[entry.en.toLowerCase()] = { id, zhTW: entry.zhTW, zhCN: entry.zhCN, ja: entry.ja, ko: entry.ko, th: entry.th };
}

// Aliases for non-standard country names used in Vizlync product descriptions
const countryAliases: Record<string, string> = {
  "czech": "CZ",
  "czech republic": "CZ",
  "republic of ireland": "IE",
  "ireland": "IE",
  "martinique island": "MQ",
  "martinique": "MQ",
  "republic of montenegro": "ME",
  "montenegro": "ME",
  "macedonia": "MK",
  "republic of north macedonia": "MK",
  "north macedonia": "MK",
  "u.s.a": "US",
  "u.s.a.": "US",
  "usa": "US",
  "united states of america": "US",
  "reunion": "RE",
  "faroe islands": "FO",
  "svalbard and jan mayen": "SJ",
  "sardinia": "SP",
  "sint maarten": "SX",
  "cayman islands": "KY",
  "new caledonia": "NC",
  "mayotte": "YT",
  "sint maarten (dutch part)": "SX",
  "hawaii": "HI",
  "azores": "AA",
  "madeira": "MP",
  "balearic islands": "BL",
  "global territory": "GL",
  // Vizlync non-standard names
  "virgin islands (uk)": "VG",
  "virgin islands (british)": "VG",
  "british virgin islands": "VG",
  "virgin islands (us)": "VI",
  "virgin islands (u.s.)": "VI",
  "mongolian characteristic": "MN",
  "mongolia": "MN",
  "st. kitts and nevis": "KN",
  "saint kitts and nevis": "KN",
  "st kitts and nevis": "KN",
  "the state of dominic": "DM",
  "state of dominica": "DM",
  "commonwealth of dominica": "DM",
  "tukesi and caicos": "TC",
  "turks and caicos": "TC",
  "turks & caicos": "TC",
  "turks and caicos islands": "TC",
  "st. lucia": "LC",
  "saint lucia": "LC",
  "st. vincent and the grenadines": "VC",
  "saint vincent and the grenadines": "VC",
  "st. vincent & the grenadines": "VC",
  "antigua and barbuda": "AG",
  "antigua & barbuda": "AG",
  "trinidad and tobago": "TT",
  "trinidad & tobago": "TT",
  "sao tome and principe": "ST",
  "são tomé and príncipe": "ST",
  "bosnia and herzegovina": "BA",
  "bosnia & herzegovina": "BA",
  "republic of kosovo": "XK",
  "kosovo": "XK",
  "democratic republic of the congo": "CD",
  "dr congo": "CD",
  "republic of the congo": "CG",
  "central african republic": "CF",
  "equatorial guinea": "GQ",
  "guinea-bissau": "GW",
  "guinea bissau": "GW",
  "sierra leone": "SL",
  "burkina faso": "BF",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  "south sudan": "SS",
  "western sahara": "EH",
  "eswatini": "SZ",
  "swaziland": "SZ",
  "cabo verde": "CV",
  "cape verde": "CV",
  "comoros": "KM",
  "djibouti": "DJ",
  "eritrea": "ER",
  "lesotho": "LS",
  "malawi": "MW",
  "mozambique": "MZ",
  "namibia": "NA",
  "niger": "NE",
  "rwanda": "RW",
  "somalia": "SO",
  "south africa": "ZA",
  "togo": "TG",
  "zambia": "ZM",
  "zimbabwe": "ZW",
  "papua new guinea": "PG",
  "solomon islands": "SB",
  "vanuatu": "VU",
  "samoa": "WS",
  "tonga": "TO",
  "fiji": "FJ",
  "timor-leste": "TL",
  "east timor": "TL",
  "brunei": "BN",
  "brunei darussalam": "BN",
  "myanmar": "MM",
  "burma": "MM",
  "cambodia": "KH",
  "laos": "LA",
  "maldives": "MV",
  "bhutan": "BT",
  "nepal": "NP",
  "bangladesh": "BD",
  "sri lanka": "LK",
  "kyrgyzstan": "KG",
  "tajikistan": "TJ",
  "turkmenistan": "TM",
  "uzbekistan": "UZ",
  "armenia": "AM",
  "georgia": "GE",
  "moldova": "MD",
  "belarus": "BY",
  "ukraine": "UA",
  "albania": "AL",
  "andorra": "AD",
  "liechtenstein": "LI",
  "luxembourg": "LU",
  "malta": "MT",
  "monaco": "MC",
  "san marino": "SM",
  "vatican": "VA",
  "holy see": "VA",
  // Macau aliases (Vizlync uses "Macau" while ISO uses "Macao")
  "macau": "MO",
  "macau (china)": "MO",
  "macao (china)": "MO",
  "macao sar": "MO",
  "macau sar": "MO",
  // Additional Vizlync non-standard names (from coverage table scan)
  "columbia": "CO",
  "uae": "AE",
  "united arab emirates": "AE",
  "virgin islands (united states)": "VI",
  "saintmartin(france)": "MF",
  "saint martin (france)": "MF",
  "saint barthélemy": "BL",
  "saint barthelemy": "BL",
  "st. barthélemy": "BL",
  "s.korea": "KR",
  "cote d\u2019ivoire": "CI",
  "congo": "CG",
  "democratic republic of congo": "CD",
  "belize city": "BZ",
};

// Merge aliases into nameToEntry
for (const [alias, id] of Object.entries(countryAliases)) {
  const entry = countryNameMap[id];
  if (entry) {
    nameToEntry[alias] = { id, zhTW: entry.zhTW, zhCN: entry.zhCN, ja: entry.ja, ko: entry.ko, th: entry.th };
  }
}

/**
 * Translate plan name — strip/replace common English patterns
 * e.g. "Japan 3GB / 7 Days" -> "日本 3GB / 7天" or "日本 3GB / 7日"
 */
export function translatePlanName(
  name: string,
  lang: Language,
  countries: { id: string; name: string }[]
): string {
  // Pre-process: remove "of X days" / "of X day" suffix from all languages
  // e.g. "eSIM Carrier of 90 days" → "eSIM Carrier"
  let result = name.replace(/\s*\bof\s+\d+\s+days?\b/gi, "").trim();

  // Pre-process: normalize kbps spacing for all languages
  // e.g. "低速384kbps" → "低速 384 kbps", "Low Speed384kbps" → "Low Speed 384 kbps"
  result = result.replace(/(\d+)\s*kbps\b/gi, " $1 kbps").trim();

  // Pre-process: remove provider prefix "CO" that appears glued to country names
  // e.g. "COSaudi Arabia" → "Saudi Arabia", "COJapan" → "Japan"
  // Also handles Chinese after CO: "CO沙特阿拉伯" → "沙特阿拉伯"
  // Also remove "-CO-OTA eSIM Carrier" suffix
  result = result.replace(/^CO(?=[A-Z\u4e00-\u9fff])/g, "").trim();
  result = result.replace(/-?CO-OTA\s+eSIM\s+Carrier\b/gi, "").trim();
  result = result.replace(/-?CO-OTA\b/gi, "").trim();

  // Pre-process: normalize format
  // Remove parenthesised day count at end: "(7 Days)" / "(7 Day)" / "(7天)"
  result = result.replace(/\s*\(\d+\s*(Days?|天|日|일|วัน|日間)\)/gi, "").trim();
  // Collapse multiple consecutive dashes/spaces into single dash
  result = result.replace(/[-]{2,}/g, "-").trim();
  // Remove trailing/leading dashes
  result = result.replace(/^-+|-+$/g, "").trim();

  if (lang === "en") {
    // Reverse-translate Chinese keywords that may appear in provider-supplied names
    // Country names: replace zhTW/zhCN forms with English
    for (const entry of Object.values(countryNameMap)) {
      if (entry.zhTW && result.includes(entry.zhTW)) {
        result = result.split(entry.zhTW).join(entry.en);
      }
      if (entry.zhCN && entry.zhCN !== entry.zhTW && result.includes(entry.zhCN)) {
        result = result.split(entry.zhCN).join(entry.en);
      }
    }
    // Common Chinese keywords → English (add trailing space to separate from adjacent text)
    result = result
      .replace(/每日/g, "Daily ")
      .replace(/每天/g, "Daily ")
      .replace(/日曆天/g, "Calendar Days")
      .replace(/日历天/g, "Calendar Days")
      .replace(/有效期/g, "Validity")
      .replace(/無限總量/g, "Unlimited Total")
      .replace(/无限总量/g, "Unlimited Total")
      .replace(/無限/g, "Unlimited")
      .replace(/无限/g, "Unlimited")
      .replace(/高速/g, " High Speed")
      .replace(/低速/g, " Low Speed")
      .replace(/降速至/g, " Throttled to ")
      .replace(/降速/g, " Throttled")
      .replace(/自選/g, "Choice")
      .replace(/自选/g, "Choice")
      .replace(/全球/g, "Global")
      .replace(/東南亞/g, "Southeast Asia")
      .replace(/东南亚/g, "Southeast Asia")
      .replace(/南亞/g, "South Asia")
      .replace(/南亚/g, "South Asia")
      .replace(/東亞/g, "East Asia")
      .replace(/东亚/g, "East Asia")
      .replace(/亞太/g, "Asia Pacific")
      .replace(/亚太/g, "Asia Pacific")
      .replace(/亞洲/g, "Asia")
      .replace(/亚洲/g, "Asia")
      .replace(/歐洲/g, "Europe")
      .replace(/欧洲/g, "Europe")
      .replace(/美洲/g, "Americas")
      .replace(/中東/g, "Middle East")
      .replace(/中东/g, "Middle East")
      .replace(/非洲/g, "Africa")
      .replace(/大洋洲/g, "Oceania")
      .replace(/數據/g, "Data")
      .replace(/数据/g, "Data")
      .replace(/方案/g, "Plan")
      .replace(/漫遊/g, "Roaming")
      .replace(/漫游/g, "Roaming")
      .replace(/旅遊/g, "Travel")
      .replace(/旅游/g, "Travel")
      .replace(/語音/g, "Voice")
      .replace(/语音/g, "Voice")
      .replace(/短訊/g, "SMS")
      .replace(/短信/g, "SMS")
      .replace(/熱點/g, "Hotspot")
      .replace(/热点/g, "Hotspot")
      .replace(/高級/g, "Premium")
      .replace(/高级/g, "Premium")
      .replace(/標準/g, "Standard")
      .replace(/标准/g, "Standard")
      .replace(/基本/g, "Basic")
      .replace(/月費/g, "Monthly")
      .replace(/月费/g, "Monthly")
      .replace(/週費/g, "Weekly")
      .replace(/周费/g, "Weekly")
      .replace(/日費/g, "Daily")
      .replace(/日费/g, "Daily")
      .replace(/年費/g, "Annual")
      .replace(/年费/g, "Annual")
      .replace(/個月/g, " Months")
      .replace(/个月/g, " Months")
      .replace(/週/g, " Weeks")
      .replace(/周/g, " Weeks")
      .replace(/天/g, " Days");
    // Add space between English letter and digit (e.g. "High Speed1GB" → "High Speed 1GB")
    result = result.replace(/([a-zA-Z])(\d)/g, "$1 $2");
    // Clean up extra spaces introduced by translations (e.g. "Daily  High Speed" → "Daily High Speed")
    result = result.replace(/\s{2,}/g, " ").replace(/\s+-/g, "-").replace(/-\s+/g, "-").trim();
    return result;
  }

  // Replace country names from the provided countries list
  for (const c of countries) {
    const entry = countryNameMap[c.id];
    if (!entry) continue;
    let localName: string;
    if (lang === "zh-TW") localName = entry.zhTW;
    else if (lang === "zh-CN") localName = entry.zhCN;
    else if (lang === "ja") localName = entry.ja;
    else if (lang === "ko") localName = entry.ko;
    else if (lang === "th") localName = entry.th;
    else localName = entry.en;
    result = result.replace(new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi"), localName);
  }

  // Also scan all known country names in the plan name
  for (const [engName, entry] of Object.entries(nameToEntry)) {
    if (result.toLowerCase().includes(engName)) {
      let localName: string;
      if (lang === "zh-TW") localName = entry.zhTW;
      else if (lang === "zh-CN") localName = entry.zhCN;
      else if (lang === "ja") localName = entry.ja;
      else if (lang === "ko") localName = entry.ko;
      else if (lang === "th") localName = entry.th;
      else localName = engName;
      const safeEng = engName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`\\b${safeEng}\\b`, "gi"), localName);
    }
  }

  // Replace common English day/data patterns based on language
  if (lang === "zh-TW" || lang === "zh-CN") {
    result = result
      .replace(/\bvalidity of\b/gi, lang === "zh-TW" ? "有效期" : "有效期")
      .replace(/\bNatural days?\b/gi, lang === "zh-TW" ? "日曆天" : "日历天")
      .replace(/\bNatural Day\b/gi, lang === "zh-TW" ? "日曆天" : "日历天")
      .replace(/\bNatural\b/gi, lang === "zh-TW" ? "日曆" : "日历")
      .replace(/\bdays?\b/gi, "天")
      .replace(/\bof\b\s*(\d)/g, "$1")
      .replace(/\bmonths?\b/gi, lang === "zh-TW" ? "個月" : "个月")
      .replace(/\bweeks?\b/gi, lang === "zh-TW" ? "週" : "周")
      .replace(/\bUnlimited\b/gi, lang === "zh-TW" ? "無限" : "无限")
      .replace(/\bGlobal\b/gi, "全球")
      .replace(/\bWorldwide\b/gi, "全球")
      .replace(/\bSoutheast Asia\b/gi, lang === "zh-TW" ? "東南亞" : "东南亚")
      .replace(/\bSouth Asia\b/gi, lang === "zh-TW" ? "南亞" : "南亚")
      .replace(/\bEast Asia\b/gi, lang === "zh-TW" ? "東亞" : "东亚")
      .replace(/\bNorth Asia\b/gi, lang === "zh-TW" ? "北亞" : "北亚")
      .replace(/\bCentral Asia\b/gi, lang === "zh-TW" ? "中亞" : "中亚")
      .replace(/\bAsia Pacific\b/gi, lang === "zh-TW" ? "亞太" : "亚太")
      .replace(/\bAsia\b/gi, lang === "zh-TW" ? "亞洲" : "亚洲")
      .replace(/\bEurope\b/gi, lang === "zh-TW" ? "歐洲" : "欧洲")
      .replace(/\bAmericas?\b/gi, "美洲")
      .replace(/\bMiddle East\b/gi, "中東")
      .replace(/\bAfrica\b/gi, "非洲")
      .replace(/\bOceania\b/gi, lang === "zh-TW" ? "大洋洲" : "大洋洲")
      .replace(/\bData\b/gi, lang === "zh-TW" ? "數據" : "数据")
      .replace(/\bPlan\b/gi, "方案")
      .replace(/\beSIM\b/gi, "eSIM")
      .replace(/\bSIM\b/gi, "SIM")
      .replace(/\bRoaming\b/gi, lang === "zh-TW" ? "漫遊" : "漫游")
      .replace(/\bTravel\b/gi, lang === "zh-TW" ? "旅遊" : "旅游")
      .replace(/\bVoice\b/gi, lang === "zh-TW" ? "語音" : "语音")
      .replace(/\bSMS\b/gi, "短訊")
      .replace(/\bHotspot\b/gi, lang === "zh-TW" ? "熱點" : "热点")
      .replace(/\bHigh Speed\b/gi, "高速")
      .replace(/\bPremium\b/gi, lang === "zh-TW" ? "高級" : "高级")
      .replace(/\bStandard\b/gi, lang === "zh-TW" ? "標準" : "标准")
      .replace(/\bBasic\b/gi, "基本")
      .replace(/\bMonthly\b/gi, lang === "zh-TW" ? "月費" : "月费")
      .replace(/\bWeekly\b/gi, lang === "zh-TW" ? "週費" : "周费")
      .replace(/\bDaily\b/gi, lang === "zh-TW" ? "日費" : "日费")
      .replace(/\bAnnual\b/gi, lang === "zh-TW" ? "年費" : "年费")
      .replace(/\bthrottle to\b/gi, lang === "zh-TW" ? "降速至" : "降速至")
      .replace(/\bthrottled to\b/gi, lang === "zh-TW" ? "降速至" : "降速至")
      .replace(/\bthrottle\b/gi, lang === "zh-TW" ? "降速" : "降速")
      .replace(/\bthrottled\b/gi, lang === "zh-TW" ? "降速" : "降速");
    return toDisplayChinese(result, lang);
  }

  if (lang === "ja") {
    result = result
      .replace(/\bvalidity of\b/gi, "有効期間")
      .replace(/\bdays?\b/gi, "日")
      .replace(/\bof\b\s*(\d)/g, "$1")
      .replace(/\bmonths?\b/gi, "ヶ月")
      .replace(/\bweeks?\b/gi, "週間")
      .replace(/\bUnlimited\b/gi, "無制限")
      .replace(/\bGlobal\b/gi, "グローバル")
      .replace(/\bWorldwide\b/gi, "全世界")
      .replace(/\bAsia Pacific\b/gi, "アジア太平洋")
      .replace(/\bAsia\b/gi, "アジア")
      .replace(/\bEurope\b/gi, "ヨーロッパ")
      .replace(/\bAmericas?\b/gi, "アメリカ大陸")
      .replace(/\bMiddle East\b/gi, "中東")
      .replace(/\bAfrica\b/gi, "アフリカ")
      .replace(/\bOceania\b/gi, "オセアニア")
      .replace(/\bData\b/gi, "データ")
      .replace(/\bPlan\b/gi, "プラン")
      .replace(/\bRoaming\b/gi, "ローミング")
      .replace(/\bTravel\b/gi, "旅行")
      .replace(/\bDaily\b/gi, "デイリー")
      .replace(/\bHigh Speed\b/gi, "高速")
      .replace(/\bPremium\b/gi, "プレミアム")
      .replace(/\beSIM Carrier\b/gi, "eSIMキャリア")
      .replace(/\bCarriers?\b/gi, "キャリア")
      .replace(/\bCountries\b/gi, "か国")
      .replace(/\bCountry\b/gi, "国")
      .replace(/\bNatural days?\b/gi, "暦日")
      .replace(/\bNatural Day\b/gi, "暦日")
      .replace(/\bNatural\b/gi, "暦")
      .replace(/\bthrottle to\b/gi, "速度制限")
      .replace(/\bthrottled to\b/gi, "速度制限")
      .replace(/\bthrottle\b/gi, "速度制限")
      .replace(/\bthrottled\b/gi, "速度制限")
      // Chinese keywords → Japanese
      .replace(/全球(\d+)地/g, (_, n) => `${n}か国・地域`)
      .replace(/全球/g, "全世界")
      .replace(/自選/g, "自由選択")
      .replace(/自选/g, "自由選択")
      .replace(/每日/g, "毎日")
      .replace(/高速/g, "高速")
      .replace(/低速/g, "低速")
      .replace(/無限/g, "無制限")
      .replace(/无限/g, "無制限")
      .replace(/日曆天/g, "暦日")
      .replace(/日历天/g, "暦日")
      .replace(/降速至/g, "速度制限")
      .replace(/降速/g, "速度制限")
      // Chinese country/region names → Japanese
      .replace(/美國/g, "アメリカ")
      .replace(/美国/g, "アメリカ")
      .replace(/日本/g, "日本")
      .replace(/韓國/g, "韓国")
      .replace(/韓国/g, "韓国")
      .replace(/中國/g, "中国")
      .replace(/中国/g, "中国")
      .replace(/香港/g, "香港")
      .replace(/台灣/g, "台湾")
      .replace(/台湾/g, "台湾")
      .replace(/澳門/g, "マカオ")
      .replace(/澳门/g, "マカオ")
      .replace(/新加坡/g, "シンガポール")
      .replace(/泰國/g, "タイ")
      .replace(/泰国/g, "タイ")
      .replace(/越南/g, "ベトナム")
      .replace(/馬來西亞/g, "マレーシア")
      .replace(/马来西亚/g, "マレーシア")
      .replace(/印尼/g, "インドネシア")
      .replace(/菲律賓/g, "フィリピン")
      .replace(/菲律宾/g, "フィリピン")
      .replace(/印度/g, "インド")
      .replace(/英國/g, "イギリス")
      .replace(/英国/g, "イギリス")
      .replace(/法國/g, "フランス")
      .replace(/法国/g, "フランス")
      .replace(/德國/g, "ドイツ")
      .replace(/德国/g, "ドイツ")
      .replace(/義大利/g, "イタリア")
      .replace(/意大利/g, "イタリア")
      .replace(/西班牙/g, "スペイン")
      .replace(/澳洲/g, "オーストラリア")
      .replace(/紐西蘭/g, "ニュージーランド")
      .replace(/加拿大/g, "カナダ")
      .replace(/巴西/g, "ブラジル")
      .replace(/歐洲/g, "ヨーロッパ")
      .replace(/欧洲/g, "ヨーロッパ")
      .replace(/東南亞/g, "東南アジア")
      .replace(/东南亚/g, "東南アジア")
      .replace(/亞洲/g, "アジア")
      .replace(/亚洲/g, "アジア")
      .replace(/大洋洲/g, "オセアニア")
      .replace(/非洲/g, "アフリカ")
      .replace(/中東/g, "中東")
      .replace(/中东/g, "中東");
    return result;
  }

  if (lang === "ko") {
    result = result
      .replace(/\bvalidity of\b/gi, "유효 기간")
      .replace(/\bdays?\b/gi, "일")
      .replace(/\bof\b\s*(\d)/g, "$1")
      .replace(/\bmonths?\b/gi, "개월")
      .replace(/\bweeks?\b/gi, "주")
      .replace(/\bUnlimited\b/gi, "무제한")
      .replace(/\bGlobal\b/gi, "글로벌")
      .replace(/\bWorldwide\b/gi, "전 세계")
      .replace(/\bAsia Pacific\b/gi, "아시아 태평양")
      .replace(/\bAsia\b/gi, "아시아")
      .replace(/\bEurope\b/gi, "유럽")
      .replace(/\bAmericas?\b/gi, "아메리카")
      .replace(/\bMiddle East\b/gi, "중동")
      .replace(/\bAfrica\b/gi, "아프리카")
      .replace(/\bOceania\b/gi, "오세아니아")
      .replace(/\bData\b/gi, "데이터")
      .replace(/\bPlan\b/gi, "플랜")
      .replace(/\bRoaming\b/gi, "로밍")
      .replace(/\bTravel\b/gi, "여행")
      .replace(/\bDaily\b/gi, "데일리")
      .replace(/\bHigh Speed\b/gi, "고속")
      .replace(/\bPremium\b/gi, "프리미엄")
      .replace(/\beSIM Carrier\b/gi, "eSIM 통신사")
      .replace(/\bCarriers?\b/gi, "통신사")
      .replace(/\bCountries\b/gi, "개국")
      .replace(/\bCountry\b/gi, "국가")
      .replace(/\bNatural days?\b/gi, "역일")
      .replace(/\bNatural Day\b/gi, "역일")
      .replace(/\bNatural\b/gi, "역")
      .replace(/\bthrottle to\b/gi, "속도 제한")
      .replace(/\bthrottled to\b/gi, "속도 제한")
      .replace(/\bthrottle\b/gi, "속도 제한")
      .replace(/\bthrottled\b/gi, "속도 제한")
      // Chinese keywords → Korean
      .replace(/全球(\d+)地/g, (_, n) => `${n}개국`)
      .replace(/全球/g, "전 세계")
      .replace(/自選/g, "자유 선택")
      .replace(/自选/g, "자유 선택")
      .replace(/每日/g, "매일")
      .replace(/高速/g, "고속")
      .replace(/低速/g, "저속")
      .replace(/無限/g, "무제한")
      .replace(/无限/g, "무제한")
      .replace(/日曆天/g, "역일")
      .replace(/日历天/g, "역일")
      .replace(/降速至/g, "속도 제한")
      .replace(/降速/g, "속도 제한")
      // Chinese country/region names → Korean
      .replace(/美國/g, "미국")
      .replace(/美国/g, "미국")
      .replace(/日本/g, "일본")
      .replace(/韓國/g, "한국")
      .replace(/韓国/g, "한국")
      .replace(/中國/g, "중국")
      .replace(/中国/g, "중국")
      .replace(/香港/g, "홍콩")
      .replace(/台灣/g, "대만")
      .replace(/台湾/g, "대만")
      .replace(/澳門/g, "마카오")
      .replace(/澳门/g, "마카오")
      .replace(/新加坡/g, "싱가포르")
      .replace(/泰國/g, "태국")
      .replace(/泰国/g, "태국")
      .replace(/越南/g, "베트남")
      .replace(/馬來西亞/g, "말레이시아")
      .replace(/马来西亚/g, "말레이시아")
      .replace(/印尼/g, "인도네시아")
      .replace(/菲律賓/g, "필리핀")
      .replace(/菲律宾/g, "필리핀")
      .replace(/印度/g, "인도")
      .replace(/英國/g, "영국")
      .replace(/英国/g, "영국")
      .replace(/法國/g, "프랑스")
      .replace(/法国/g, "프랑스")
      .replace(/德國/g, "독일")
      .replace(/德国/g, "독일")
      .replace(/義大利/g, "이탈리아")
      .replace(/意大利/g, "이탈리아")
      .replace(/西班牙/g, "스페인")
      .replace(/澳洲/g, "호주")
      .replace(/紐西蘭/g, "뉴질랜드")
      .replace(/加拿大/g, "캐나다")
      .replace(/巴西/g, "브라질")
      .replace(/歐洲/g, "유럽")
      .replace(/欧洲/g, "유럽")
      .replace(/東南亞/g, "동남아시아")
      .replace(/东南亚/g, "동남아시아")
      .replace(/亞洲/g, "아시아")
      .replace(/亚洲/g, "아시아")
      .replace(/大洋洲/g, "오세아니아")
      .replace(/非洲/g, "아프리카")
      .replace(/中東/g, "중동")
      .replace(/中东/g, "중동");
    return result;
  }

  if (lang === "th") {
    result = result
      .replace(/\bvalidity of\b/gi, "ระยะเวลา")
      .replace(/\bdays?\b/gi, "วัน")
      .replace(/\bof\b\s*(\d)/g, "$1")
      .replace(/\bmonths?\b/gi, "เดือน")
      .replace(/\bweeks?\b/gi, "สัปดาห์")
      .replace(/\bUnlimited\b/gi, "ไม่จำกัด")
      .replace(/\bGlobal\b/gi, "ทั่วโลก")
      .replace(/\bWorldwide\b/gi, "ทั่วโลก")
      .replace(/\bAsia Pacific\b/gi, "เอเชียแปซิฟิก")
      .replace(/\bAsia\b/gi, "เอเชีย")
      .replace(/\bEurope\b/gi, "ยุโรป")
      .replace(/\bAmericas?\b/gi, "อเมริกา")
      .replace(/\bMiddle East\b/gi, "ตะวันออกกลาง")
      .replace(/\bAfrica\b/gi, "แอฟริกา")
      .replace(/\bOceania\b/gi, "โอเชียเนีย")
      .replace(/\bData\b/gi, "ข้อมูล")
      .replace(/\bPlan\b/gi, "แพ็กเกจ")
      .replace(/\bRoaming\b/gi, "โรมมิ่ง")
      .replace(/\bTravel\b/gi, "ท่องเที่ยว")
      .replace(/\bDaily\b/gi, "รายวัน")
      .replace(/\bHigh Speed\b/gi, "ความเร็วสูง")
      .replace(/\bPremium\b/gi, "พรีเมียม")
      .replace(/\beSIM Carrier\b/gi, "eSIM เครือข่าย")
      .replace(/\bCarriers?\b/gi, "เครือข่าย")
      .replace(/\bCountries\b/gi, "ประเทศ")
      .replace(/\bCountry\b/gi, "ประเทศ")
      .replace(/\bNatural days?\b/gi, "วันปฏิทิน")
      .replace(/\bNatural Day\b/gi, "วันปฏิทิน")
      .replace(/\bNatural\b/gi, "ปฏิทิน")
      .replace(/\bthrottle to\b/gi, "จำกัดความเร็ว")
      .replace(/\bthrottled to\b/gi, "จำกัดความเร็ว")
      .replace(/\bthrottle\b/gi, "จำกัดความเร็ว")
      .replace(/\bthrottled\b/gi, "จำกัดความเร็ว")
      // Chinese keywords → Thai
      .replace(/全球(\d+)地/g, (_, n) => `${n} ประเทศ`)
      .replace(/全球/g, "ทั่วโลก")
      .replace(/自選/g, "เลือกได้")
      .replace(/自选/g, "เลือกได้")
      .replace(/每日/g, "รายวัน")
      .replace(/高速/g, "ความเร็วสูง")
      .replace(/低速/g, "ความเร็วต่ำ")
      .replace(/無限/g, "ไม่จำกัด")
      .replace(/无限/g, "ไม่จำกัด")
      .replace(/日曆天/g, "วันปฏิทิน")
      .replace(/日历天/g, "วันปฏิทิน")
      .replace(/降速至/g, "จำกัดความเร็ว")
      .replace(/降速/g, "จำกัดความเร็ว")
      // Chinese country/region names → Thai
      .replace(/美國/g, "สหรัฐอเมริกา")
      .replace(/美国/g, "สหรัฐอเมริกา")
      .replace(/日本/g, "ญี่ปุ่น")
      .replace(/韓國/g, "เกาหลีใต้")
      .replace(/韓国/g, "เกาหลีใต้")
      .replace(/中國/g, "จีน")
      .replace(/中国/g, "จีน")
      .replace(/香港/g, "ฮ่องกง")
      .replace(/台灣/g, "ไต้หวัน")
      .replace(/台湾/g, "ไต้หวัน")
      .replace(/澳門/g, "มาเก๊า")
      .replace(/澳门/g, "มาเก๊า")
      .replace(/新加坡/g, "สิงคโปร์")
      .replace(/泰國/g, "ไทย")
      .replace(/泰国/g, "ไทย")
      .replace(/越南/g, "เวียดนาม")
      .replace(/馬來西亞/g, "มาเลเซีย")
      .replace(/马来西亚/g, "มาเลเซีย")
      .replace(/印尼/g, "อินโดนีเซีย")
      .replace(/菲律賓/g, "ฟิลิปปินส์")
      .replace(/菲律宾/g, "ฟิลิปปินส์")
      .replace(/印度/g, "อินเดีย")
      .replace(/英國/g, "สหราชอาณาจักร")
      .replace(/英国/g, "สหราชอาณาจักร")
      .replace(/法國/g, "ฝรั่งเศส")
      .replace(/法国/g, "ฝรั่งเศส")
      .replace(/德國/g, "เยอรมนี")
      .replace(/德国/g, "เยอรมนี")
      .replace(/義大利/g, "อิตาลี")
      .replace(/意大利/g, "อิตาลี")
      .replace(/西班牙/g, "สเปน")
      .replace(/澳洲/g, "ออสเตรเลีย")
      .replace(/紐西蘭/g, "นิวซีแลนด์")
      .replace(/加拿大/g, "แคนาดา")
      .replace(/巴西/g, "บราซิล")
      .replace(/歐洲/g, "ยุโรป")
      .replace(/欧洲/g, "ยุโรป")
      .replace(/東南亞/g, "เอเชียตะวันออกเฉียงใต้")
      .replace(/东南亚/g, "เอเชียตะวันออกเฉียงใต้")
      .replace(/亞洲/g, "เอเชีย")
      .replace(/亚洲/g, "เอเชีย")
      .replace(/大洋洲/g, "โอเชียเนีย")
      .replace(/非洲/g, "แอฟริกา")
      .replace(/中東/g, "ตะวันออกกลาง")
      .replace(/中东/g, "ตะวันออกกลาง");
    return result;
  }

  return result;
}

/**
 * Translate product field values (speed, activationPolicy, profile, etc.)
 * These are fixed English strings from Vizlync API
 */
export function translateProductValue(
  value: string,
  lang: Language
): string {
  if (lang === "en") return value;

  const map: Record<string, { zhTW: string; zhCN: string; ja: string; ko: string; th: string }> = {
    "Unrestricted": { zhTW: "不限速", zhCN: "不限速", ja: "無制限", ko: "무제한", th: "ไม่จำกัด" },
    "unrestricted": { zhTW: "不限速", zhCN: "不限速", ja: "無制限", ko: "무제한", th: "ไม่จำกัด" },
    "Restricted": { zhTW: "有限速*", zhCN: "有限速*", ja: "制限あり*", ko: "제한 있음*", th: "จำกัด*" },
    "restricted": { zhTW: "有限速*", zhCN: "有限速*", ja: "制限あり*", ko: "제한 있음*", th: "จำกัด*" },
    "Unlimited": { zhTW: "無限速", zhCN: "无限速", ja: "無制限", ko: "무제한", th: "ไม่จำกัด" },
    "unlimited": { zhTW: "無限速", zhCN: "无限速", ja: "無制限", ko: "무제한", th: "ไม่จำกัด" },
    "High Speed": { zhTW: "高速", zhCN: "高速", ja: "高速", ko: "고속", th: "ความเร็วสูง" },
    "high speed": { zhTW: "高速", zhCN: "高速", ja: "高速", ko: "고속", th: "ความเร็วสูง" },
    "Low Speed": { zhTW: "低速", zhCN: "低速", ja: "低速", ko: "저속", th: "ความเร็วต่ำ" },
    "low speed": { zhTW: "低速", zhCN: "低速", ja: "低速", ko: "저속", th: "ความเร็วต่ำ" },
    "Activation upon first usage": { zhTW: "首次使用時啟用", zhCN: "首次使用时激活", ja: "初回使用時に有効化", ko: "첫 사용 시 활성화", th: "เปิดใช้งานเมื่อใช้ครั้งแรก" },
    "activation upon first usage": { zhTW: "首次使用時啟用", zhCN: "首次使用时激活", ja: "初回使用時に有効化", ko: "첫 사용 시 활성화", th: "เปิดใช้งานเมื่อใช้ครั้งแรก" },
    "Activation upon purchase": { zhTW: "購買後立即啟用", zhCN: "购买后立即激活", ja: "購入後すぐに有効化", ko: "구매 후 즉시 활성화", th: "เปิดใช้งานทันทีหลังซื้อ" },
    "activation upon purchase": { zhTW: "購買後立即啟用", zhCN: "购买后立即激活", ja: "購入後すぐに有効化", ko: "구매 후 즉시 활성화", th: "เปิดใช้งานทันทีหลังซื้อ" },
    "Manual activation": { zhTW: "手動啟用", zhCN: "手动激活", ja: "手動で有効化", ko: "수동 활성화", th: "เปิดใช้งานด้วยตนเอง" },
    "manual activation": { zhTW: "手動啟用", zhCN: "手动激活", ja: "手動で有効化", ko: "수동 활성화", th: "เปิดใช้งานด้วยตนเอง" },
    "Auto activation": { zhTW: "自動啟用", zhCN: "自动激活", ja: "自動で有効化", ko: "자동 활성화", th: "เปิดใช้งานอัตโนมัติ" },
    "auto activation": { zhTW: "自動啟用", zhCN: "自动激活", ja: "自動で有効化", ko: "자동 활성화", th: "เปิดใช้งานอัตโนมัติ" },
    "roaming": { zhTW: "漫遊", zhCN: "漫游", ja: "ローミング", ko: "로밍", th: "โรมมิ่ง" },
    "Roaming": { zhTW: "漫遊", zhCN: "漫游", ja: "ローミング", ko: "로밍", th: "โรมมิ่ง" },
    "local": { zhTW: "本地", zhCN: "本地", ja: "ローカル", ko: "로컬", th: "ท้องถิ่น" },
    "Local": { zhTW: "本地", zhCN: "本地", ja: "ローカル", ko: "로컬", th: "ท้องถิ่น" },
    "data": { zhTW: "數據", zhCN: "数据", ja: "データ", ko: "데이터", th: "ข้อมูล" },
    "Data": { zhTW: "數據", zhCN: "数据", ja: "データ", ko: "데이터", th: "ข้อมูล" },
    "voice": { zhTW: "語音", zhCN: "语音", ja: "音声", ko: "음성", th: "เสียง" },
    "Voice": { zhTW: "語音", zhCN: "语音", ja: "音声", ko: "음성", th: "เสียง" },
    "data+voice": { zhTW: "數據+語音", zhCN: "数据+语音", ja: "データ+音声", ko: "데이터+음성", th: "ข้อมูล+เสียง" },
    "Data+Voice": { zhTW: "數據+語音", zhCN: "数据+语音", ja: "データ+音声", ko: "데이터+음성", th: "ข้อมูล+เสียง" },
    // TGT activation policy codes
    "AUTO_ACTIVATE": { zhTW: "首次連網自動啟用", zhCN: "首次联网自动激活", ja: "初回接続時に自動有効化", ko: "첫 연결 시 자동 활성화", th: "เปิดใช้งานอัตโนมัติเมื่อเชื่อมต่อครั้งแรก" },
    "ACTIVATE_ON_ORDER": { zhTW: "下單後立即啟用計時", zhCN: "下单后立即开始计时", ja: "注文後すぐに有効期間開始", ko: "주문 후 즉시 유효기간 시작", th: "เริ่มนับเวลาทันทีหลังสั่งซื้อ" },
    "MANUAL_ACTIVATE": { zhTW: "手動選擇啟用日期", zhCN: "手动选择激活日期", ja: "手動で有効化日を選択", ko: "수동으로 활성화 날짜 선택", th: "เลือกวันเปิดใช้งานด้วยตนเอง" },
  };

  const entry = map[value];
  if (entry) {
    if (lang === "zh-TW") return entry.zhTW;
    if (lang === "zh-CN") return entry.zhCN;
    if (lang === "ja") return entry.ja;
    if (lang === "ko") return entry.ko;
    if (lang === "th") return entry.th;
  }

  // Fallback: try case-insensitive match
  const lower = value.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (key.toLowerCase() === lower) {
      if (lang === "zh-TW") return val.zhTW;
      if (lang === "zh-CN") return val.zhCN;
      if (lang === "ja") return val.ja;
      if (lang === "ko") return val.ko;
      if (lang === "th") return val.th;
    }
  }

  return value;
}

/**
 * Translate a search query to English for backend search.
 * Handles Chinese, Japanese, Korean, Thai input.
 */
export function translateSearchQuery(query: string, lang: Language): string {
  if (lang === "en" || !query.trim()) return query;

  const q = query.trim();

  // 1. Try exact match against country names
  for (const entry of Object.values(countryNameMap)) {
    let localName: string;
    if (lang === "zh-TW") localName = entry.zhTW;
    else if (lang === "zh-CN") localName = entry.zhCN;
    else if (lang === "ja") localName = entry.ja;
    else if (lang === "ko") localName = entry.ko;
    else if (lang === "th") localName = entry.th;
    else localName = entry.en;
    if (localName === q) return entry.en;
  }

  // 2. Try partial match
  let result = q;
  for (const entry of Object.values(countryNameMap)) {
    let localName: string;
    if (lang === "zh-TW") localName = entry.zhTW;
    else if (lang === "zh-CN") localName = entry.zhCN;
    else if (lang === "ja") localName = entry.ja;
    else if (lang === "ko") localName = entry.ko;
    else if (lang === "th") localName = entry.th;
    else localName = entry.en;
    if (localName && result.includes(localName)) {
      result = result.replace(localName, entry.en);
    }
  }

  // 3. Replace common keywords
  const keywordMap: [string, string][] = [
    // Chinese (Traditional)
    ["日本", "Japan"], ["韓國", "Korea"], ["中國", "China"], ["香港", "Hong Kong"],
    ["台灣", "Taiwan"], ["新加坡", "Singapore"], ["泰國", "Thailand"], ["越南", "Vietnam"],
    ["菲律賓", "Philippines"], ["印尼", "Indonesia"], ["馬來西亞", "Malaysia"],
    ["澳大利亞", "Australia"], ["新西蘭", "New Zealand"], ["美國", "United States"],
    ["加拿大", "Canada"], ["英國", "United Kingdom"], ["德國", "Germany"],
    ["法國", "France"], ["意大利", "Italy"], ["西班牙", "Spain"],
    ["全球", "Global"], ["歐洲", "Europe"], ["亞洲", "Asia"], ["美洲", "Americas"],
    ["非洲", "Africa"], ["中東", "Middle East"], ["大洋洲", "Oceania"],
    ["無限", "Unlimited"], ["漫遊", "Roaming"], ["旅遊", "Travel"],
    // Chinese (Simplified)
    ["韩国", "Korea"], ["中国", "China"], ["台湾", "Taiwan"], ["泰国", "Thailand"],
    ["菲律宾", "Philippines"], ["马来西亚", "Malaysia"], ["澳大利亚", "Australia"],
    ["新西兰", "New Zealand"], ["美国", "United States"], ["英国", "United Kingdom"],
    ["德国", "Germany"], ["法国", "France"], ["欧洲", "Europe"], ["亚洲", "Asia"],
    ["无限", "Unlimited"], ["漫游", "Roaming"], ["旅游", "Travel"],
    // Japanese
    ["日本", "Japan"], ["韓国", "Korea"], ["中国", "China"], ["香港", "Hong Kong"],
    ["台湾", "Taiwan"], ["シンガポール", "Singapore"], ["タイ", "Thailand"],
    ["ベトナム", "Vietnam"], ["フィリピン", "Philippines"], ["インドネシア", "Indonesia"],
    ["マレーシア", "Malaysia"], ["オーストラリア", "Australia"], ["アメリカ", "United States"],
    ["イギリス", "United Kingdom"], ["ドイツ", "Germany"], ["フランス", "France"],
    ["ヨーロッパ", "Europe"], ["アジア", "Asia"], ["グローバル", "Global"],
    ["無制限", "Unlimited"],
    // Korean
    ["일본", "Japan"], ["한국", "Korea"], ["중국", "China"], ["홍콩", "Hong Kong"],
    ["대만", "Taiwan"], ["싱가포르", "Singapore"], ["태국", "Thailand"],
    ["베트남", "Vietnam"], ["필리핀", "Philippines"], ["인도네시아", "Indonesia"],
    ["말레이시아", "Malaysia"], ["호주", "Australia"], ["미국", "United States"],
    ["영국", "United Kingdom"], ["독일", "Germany"], ["프랑스", "France"],
    ["유럽", "Europe"], ["아시아", "Asia"], ["글로벌", "Global"], ["무제한", "Unlimited"],
    // Thai
    ["ญี่ปุ่น", "Japan"], ["เกาหลีใต้", "Korea"], ["จีน", "China"], ["ฮ่องกง", "Hong Kong"],
    ["ไต้หวัน", "Taiwan"], ["สิงคโปร์", "Singapore"], ["ไทย", "Thailand"],
    ["เวียดนาม", "Vietnam"], ["ฟิลิปปินส์", "Philippines"], ["อินโดนีเซีย", "Indonesia"],
    ["มาเลเซีย", "Malaysia"], ["ออสเตรเลีย", "Australia"], ["สหรัฐอเมริกา", "United States"],
    ["สหราชอาณาจักร", "United Kingdom"], ["เยอรมนี", "Germany"], ["ฝรั่งเศส", "France"],
    ["ยุโรป", "Europe"], ["เอเชีย", "Asia"], ["ทั่วโลก", "Global"], ["ไม่จำกัด", "Unlimited"],
  ];

  for (const [local, en] of keywordMap) {
    if (result.includes(local)) {
      result = result.replace(local, en);
    }
  }

  return result;
}
