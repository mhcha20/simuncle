import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "th";

export interface Translations {
  // Navigation
  nav: {
    home: string;
    products: string;
    orders: string;
    cart: string;
    login: string;
    logout: string;
    account: string;
    myOrders: string;
  };
  // Home page
  home: {
    heroTitle: string;
    heroSubtitle: string;
    heroBtn: string;
    popularPlans: string;
    browseByRegion: string;
    whyUs: string;
    whyUsDesc: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    feature4Title: string;
    feature4Desc: string;
    viewAll: string;
    from: string;
    day: string;
    days: string;
  };
  // Regions
  regions: {
    asia: string;
    europe: string;
    americas: string;
    middleEast: string;
    africa: string;
    oceania: string;
    global: string;
    allRegions: string;
  };
  // Products page
  products: {
    title: string;
    subtitle: string;
    search: string;
    filterRegion: string;
    filterCountry: string;
    filterData: string;
    sortBy: string;
    sortPrice: string;
    sortPriceDesc: string;
    sortDuration: string;
    sortData: string;
    noResults: string;
    loading: string;
    data: string;
    validity: string;
    network: string;
    hotspot: string;
    voice: string;
    sms: string;
    buyNow: string;
    addToCart: string;
    viewDetails: string;
    allCountries: string;
    allData: string;
    topupOnlyNote: string;
    results: string;
    perDay: string;
    filterDuration: string;
    allDuration: string;
  };
  // Product detail
  productDetail: {
    overview: string;
    countries: string;
    features: string;
    howToUse: string;
    dataAmount: string;
    validity: string;
    network: string;
    activation: string;
    hotspot: string;
    voice: string;
    sms: string;
    speed: string;
    profile: string;
    local: string;
    roaming: string;
    unrestricted: string;
    restricted: string;
    available: string;
    notAvailable: string;
    addToCart: string;
    buyNow: string;
    selectDate: string;
    startDate: string;
    qty: string;
    total: string;
    supportedCountries: string;
    planInfoNote: string;
    tabOverview: string;
    tabCoverage: string;
    tabHowToUse: string;
    coverageCountry: string;
    coverageOperator: string;
    coverageNetwork: string;
    coverageApn: string;
    coverageSearch: string;
    coverageNoResults: string;
  };
  // Cart
  cart: {
    title: string;
    empty: string;
    emptyDesc: string;
    browsePlans: string;
    remove: string;
    qty: string;
    subtotal: string;
    total: string;
    checkout: string;
    continueShopping: string;
    item: string;
    items: string;
  };
  // Checkout / Payment
  checkout: {
    title: string;
    processing: string;
    success: string;
    successDesc: string;
    failed: string;
    failedDesc: string;
    viewOrders: string;
    tryAgain: string;
    loginRequired: string;
    loginRequiredDesc: string;
    redirecting: string;
    securePayment: string;
  };
  // Orders
  orders: {
    title: string;
    empty: string;
    emptyDesc: string;
    orderId: string;
    product: string;
    amount: string;
    status: string;
    date: string;
    viewEsim: string;
    topUp: string;
    checkUsage: string;
    pending: string;
    paid: string;
    processing: string;
    completed: string;
    failed: string;
    refunded: string;
    qrCode: string;
    activationCode: string;
    copyCode: string;
    copied: string;
    usageTitle: string;
    used: string;
    remaining: string;
    total: string;
    expires: string;
    usageLoading: string;
    usageNotAvailable: string;
    usageRealtime: string;
    usageUpdated: string;
    usagePercentUsed: string;
    statusActive: string;
    statusExpired: string;
    statusNotActivated: string;
    statusQueued: string;
    statusUnused: string;
    statusDataDepleted: string;
    statusTerminated: string;
    statusTerminatedSwitched: string;
    terminatedTopupNote: string;
    topupDataDepletedNote: string;
    parentOrderLabel: string;
    usageRefresh: string;
    coverage: string;
    expiryDate: string;
    validity: string;
    validityHint: string;
    topupIncluded: string;
    topupQueuedNote: string;
    mainCard: string;
    shareLpa: string;
    shareEsim: string;
    shareTitle: string;
    shareText: string;
    copyLpa: string;
    iosInstall: string;
    iosInstallNote: string;
    buyAgain: string;
    pushTitle: string;
    pushDesc: string;
    pushEnable: string;
    pushEnabled: string;
    pushUnsubscribe: string;
    pushProcessing: string;
    pushSuccessToast: string;
    pushErrorPermission: string;
    pushErrorFailed: string;
    pushDisabledToast: string;
    pushDisabledError: string;
    filterAll: string;
    filterPending: string;
    filterProcessing: string;
    filterCompleted: string;
    filterFailed: string;
    filterUnused: string;
    filterInUse: string;
    filterExpired: string;
    continuePayment: string;
    tgtCheckStatus: string;
    tgtStatusTitle: string;
    tgtOrderStatus: string;
    tgtProfileStatus: string;
    tgtActivatedStart: string;
    tgtActivatedEnd: string;
    tgtIccid: string;
    tgtUsageTitle: string;
    tgtDataTotal: string;
    tgtDataUsage: string;
    tgtDataResidual: string;
    tgtUsageNotSupported: string;
    tgtNotFound: string;
    tgtStatusNOTACTIVE: string;
    tgtStatusACTIVATED: string;
    tgtStatusINUSE: string;
    tgtStatusUSED: string;
    tgtStatusEXPIRED: string;
    tgtStatusABANDON: string;
    tgtStatusTERMINATION: string;
    tgtStatusNODOWNLOAD: string;
    tgtStatusDELETED: string;
    tgtHighSpeedLimit: string;
    tgtThrottled: string;
    tgtThrottledNote: string;
  };
  // Top-up
  topup: {
    title: string;
    availablePlans: string;
    noPlans: string;
    purchase: string;
    confirm: string;
    success: string;
    failed: string;
    canTopUp: string;
    noTopupSuggest: string;
    similarPlans: string;
    buyAgain: string;
    redirecting: string;
    history: string;
    historyEmpty: string;
    topupSuccess: string;
    statusPending: string;
    statusPaid: string;
    statusCompleted: string;
    statusFailed: string;
    validityNote: string;
    mainCardActive: string;
    mainCardExpired: string;
    mainCardExpiredNote: string;
    usageLabel: string;
  };
  // Auth
  auth: {
    loginTitle: string;
    loginDesc: string;
    loginBtn: string;
    logoutSuccess: string;
    welcome: string;
  };
  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    close: string;
    confirm: string;
    cancel: string;
    save: string;
    edit: string;
    delete: string;
    back: string;
    next: string;
    submit: string;
    hkd: string;
    gb: string;
    mb: string;
    days: string;
    day: string;
    yes: string;
    no: string;
    comingSoon: string;
  };
}

const translations: Record<Language, Translations> = {
  "zh-TW": {
    nav: {
      home: "首頁",
      products: "eSIM 方案",
      orders: "我的訂單",
      cart: "購物車",
      login: "登入",
      logout: "登出",
      account: "我的帳戶",
      myOrders: "我的訂單",
    },
    home: {
      heroTitle: "全球 eSIM，即買即用",
      heroSubtitle: "覆蓋 200+ 個國家及地區，無需換卡，掃碼即連網",
      heroBtn: "立即選購",
      popularPlans: "熱門方案",
      browseByRegion: "按地區瀏覽",
      whyUs: "為何選擇 SIM uncle？",
      whyUsDesc: "我們提供最優質的全球 eSIM 服務，讓您的旅程更輕鬆",
      feature1Title: "即時啟用",
      feature1Desc: "購買後立即收到 QR Code，掃碼即可啟用，無需等待實體卡",
      feature2Title: "全球覆蓋",
      feature2Desc: "覆蓋 200+ 個國家及地區，一張 eSIM 走遍全球",
      feature3Title: "靈活方案",
      feature3Desc: "多種數據量及有效期選擇，按需選購最適合的方案",
      feature4Title: "安全付款",
      feature4Desc: "採用 Stripe 安全付款系統，保障您的交易安全",
      viewAll: "查看全部",
      from: "低至",
      day: "天",
      days: "天",
    },
    regions: {
      asia: "亞洲",
      europe: "歐洲",
      americas: "美洲",
      middleEast: "中東",
      africa: "非洲",
      oceania: "大洋洲",
      global: "全球",
      allRegions: "所有地區",
    },
    products: {
      title: "全球 eSIM 方案",
      subtitle: "選擇適合您旅程的 eSIM 方案",
      search: "搜尋方案名稱、國家、地區或產品 ID...",
      filterRegion: "地區",
      filterCountry: "國家",
      filterData: "數據量",
      sortBy: "排序",
      sortPrice: "價格由低至高",
      sortPriceDesc: "價格由高至低",
      sortDuration: "有效期",
      sortData: "數據量",
      noResults: "找不到符合條件的方案",
      loading: "載入中...",
      data: "數據",
      validity: "有效期",
      network: "網絡",
      hotspot: "熱點",
      voice: "語音",
      sms: "短訊",
      buyNow: "立即購買",
      addToCart: "加入購物車",
      viewDetails: "查看詳情",
      allCountries: "所有國家",
      allData: "所有數據量",
      topupOnlyNote: "此為增值方案，請從「我的訂單」增購",
      results: "個方案",
      perDay: "每天",
      filterDuration: "天數",
      allDuration: "所有天數",
    },
    productDetail: {
      overview: "方案概覽",
      countries: "覆蓋國家",
      features: "方案特點",
      howToUse: "使用說明",
      dataAmount: "數據量",
      validity: "有效期",
      network: "網絡類型",
      activation: "啟用方式",
      hotspot: "個人熱點",
      voice: "語音通話",
      sms: "短訊",
      speed: "網速",
      profile: "方案類型",
      local: "本地",
      roaming: "漫遊",
      unrestricted: "不限速",
      restricted: "限速",
      available: "支援",
      notAvailable: "不支援",
      addToCart: "加入購物車",
      buyNow: "立即購買",
      selectDate: "選擇開始日期",
      startDate: "開始日期",
      qty: "數量",
      total: "合計",
      supportedCountries: "支援國家",
      planInfoNote: "（以下說明為提供商原文）",
      tabOverview: "概覽",
      tabCoverage: "覆蓋範圍",
      tabHowToUse: "安裝教學",
      coverageCountry: "國家",
      coverageOperator: "電信商",
      coverageNetwork: "網絡",
      coverageApn: "APN",
      coverageSearch: "搜尋目的地…",
      coverageNoResults: "找不到符合的國家",
    },
    cart: {
      title: "購物車",
      empty: "購物車是空的",
      emptyDesc: "立即瀏覽我們的 eSIM 方案，開始您的旅程",
      browsePlans: "瀏覽方案",
      remove: "移除",
      qty: "數量",
      subtotal: "小計",
      total: "合計",
      checkout: "前往結帳",
      continueShopping: "繼續購物",
      item: "件商品",
      items: "件商品",
    },
    checkout: {
      title: "結帳",
      processing: "處理中...",
      success: "付款成功！",
      successDesc: "您的 eSIM 訂單已確認，請前往「我的訂單」查看 QR Code",
      failed: "付款失敗",
      failedDesc: "付款未能完成，請重試或聯絡客服",
      viewOrders: "查看訂單",
      tryAgain: "重試",
      loginRequired: "請先登入",
      loginRequiredDesc: "您需要登入才能完成購買",
      redirecting: "正在跳轉至付款頁面...",
      securePayment: "安全付款，由 Stripe 提供保障",
    },
    orders: {
      title: "我的訂單",
      empty: "暫無訂單",
      emptyDesc: "您尚未購買任何 eSIM 方案",
      orderId: "訂單編號",
      product: "方案",
      amount: "金額",
      status: "狀態",
      date: "日期",
      viewEsim: "查看 eSIM",
      topUp: "增購數據",
      checkUsage: "查看用量",
      pending: "待付款",
      paid: "已付款",
      processing: "處理中",
      completed: "已完成",
      failed: "失敗",
      refunded: "已退款",
      qrCode: "eSIM QR Code",
      activationCode: "啟用碼",
      copyCode: "複製",
      copied: "已複製",
      usageTitle: "數據用量",
      used: "已使用",
      remaining: "剩餘",
      total: "總量",
      expires: "到期日",
      usageLoading: "載入用量中...",
      usageNotAvailable: "暫無用量數據",
      usageRealtime: "即時數據",
      usageUpdated: "更新於",
      usagePercentUsed: "已用",
      statusActive: "使用中",
      statusExpired: "已到期",
      statusNotActivated: "未啟用",
      statusQueued: "增值準備中",
      statusUnused: "未使用",
      statusDataDepleted: "數據已耗盡",
      statusTerminated: "已終止",
      statusTerminatedSwitched: "已終止（已切換增值）",
      terminatedTopupNote: "主卡方案已終止，您有 {count} 個增值方案，可立即啟用使用。",
      topupDataDepletedNote: "母方案已耗盡，您有 {count} 個加值方案正在排隊備用，網絡營運商確認後將自動切換啟用。",
      parentOrderLabel: "主訂單號碼",
      usageRefresh: "刷新用量",
      coverage: "可用地區",
      expiryDate: "到期日",
      validity: "有效期",
      validityHint: "啟用後計算",
      topupIncluded: "已包含加值 +{amount}",
      topupQueuedNote: "您有加值方案正在備用中，母方案數據用完後會自動切換啟用。",
      mainCard: "主卡",
      shareLpa: "分享 eSIM",
      shareEsim: "分享給同行者",
      shareTitle: "eSIM 安裝資訊",
      shareText: "我的 eSIM 安裝碼：",
      copyLpa: "複製 LPA 字串",
      iosInstall: "iPhone 一鍵安裝",
      iosInstallNote: "iOS 17.4 或以上適用",
      buyAgain: "再次購買",
      pushTitle: "開啟推播通知",
      pushDesc: "訂單更新、限時優惠第一時間通知你",
      pushEnable: "開啟通知",
      pushEnabled: "推播通知已開啟",
      pushUnsubscribe: "取消訂閱",
      pushProcessing: "處理中...",
      pushSuccessToast: "已開啟推播通知！",
      pushErrorPermission: "請允許通知權限",
      pushErrorFailed: "訂閱失敗，請稍後再試",
      pushDisabledToast: "已關閉推播通知",
      pushDisabledError: "取消訂閱失敗",
      filterAll: "全部",
      filterPending: "待付款",
      filterProcessing: "未完成",
      filterCompleted: "已完成",
      filterFailed: "失敗",
      filterUnused: "未使用",
      filterInUse: "使用中",
      filterExpired: "已失效",
      continuePayment: "繼續付款",
      tgtCheckStatus: "查詢狀態",
      tgtStatusTitle: "eSIM 狀態查詢",
      tgtOrderStatus: "訂單狀態",
      tgtProfileStatus: "SIM 卡狀態",
      tgtActivatedStart: "啟用開始",
      tgtActivatedEnd: "啟用到期",
      tgtIccid: "ICCID",
      tgtUsageTitle: "即時流量",
      tgtDataTotal: "總流量",
      tgtDataUsage: "已使用",
      tgtDataResidual: "剩餘流量",
      tgtUsageNotSupported: "此方案不支援即時流量查詢",
      tgtNotFound: "查詢不到訂單資訊，請稍後再試",
      tgtStatusNOTACTIVE: "未啟用",
      tgtStatusACTIVATED: "已開通",
      tgtStatusINUSE: "使用中",
      tgtStatusUSED: "已用完",
      tgtStatusEXPIRED: "已到期",
      tgtStatusABANDON: "已取消",
      tgtStatusTERMINATION: "已終止",
      tgtStatusNODOWNLOAD: "未啟用",
      tgtStatusDELETED: "已失效",
      tgtHighSpeedLimit: "高速上限",
      tgtThrottled: "降速中",
      tgtThrottledNote: "高速流量已用盡，降速繼續使用中",
    },
    topup: {
      title: "增購數據",
      availablePlans: "可用增購數據方案",
      noPlans: "暫無可用增購數據方案",
      purchase: "購買加值",
      confirm: "確認加值",
      success: "加值成功",
      failed: "加值失敗",
      canTopUp: "可加值",
      noTopupSuggest: "此方案不支援加值，快用完時可考慮以下相似方案：",
      similarPlans: "相似方案推薦",
      buyAgain: "立即購買",
      redirecting: "正在跳轉至付款頁面...",
      history: "加值記錄",
      historyEmpty: "尚未有加值記錄",
      topupSuccess: "加值成功！流量已增加，正在更新...",
      statusPending: "待付款",
      statusPaid: "已付款",
      statusCompleted: "已完成",
      statusFailed: "失敗",
      validityNote: "加值只增加數據量；有效期以該加值方案為準，並非延長原方案到期日。選有「+天數」較長的方案可獲得較長使用期。長有效期方案的日數由購買後即時起計，不會等原方案用完才開始。",
      mainCardActive: "主卡使用中",
      mainCardExpired: "主卡已到期",
      mainCardExpiredNote: "主卡已到期，此加值方案的流量已隨主卡一同到期。",
      usageLabel: "加值用量",
    },
    auth: {
      loginTitle: "登入 SIM uncle",
      loginDesc: "登入後即可購買及管理您的 eSIM 方案",
      loginBtn: "使用 Manus 帳號登入",
      logoutSuccess: "已成功登出",
      welcome: "歡迎回來",
    },
    common: {
      loading: "載入中...",
      error: "發生錯誤",
      retry: "重試",
      close: "關閉",
      confirm: "確認",
      cancel: "取消",
      save: "儲存",
      edit: "編輯",
      delete: "刪除",
      back: "返回",
      next: "下一步",
      submit: "提交",
      hkd: "HKD",
      gb: "GB",
      mb: "MB",
      days: "天",
      day: "天",
      yes: "是",
      no: "否",
      comingSoon: "即將推出",
    },
  },
  "zh-CN": {
    nav: {
      home: "首页",
      products: "eSIM 方案",
      orders: "我的订单",
      cart: "购物车",
      login: "登录",
      logout: "退出",
      account: "我的账户",
      myOrders: "我的订单",
    },
    home: {
      heroTitle: "全球 eSIM，即买即用",
      heroSubtitle: "覆盖 200+ 个国家及地区，无需换卡，扫码即连网",
      heroBtn: "立即选购",
      popularPlans: "热门方案",
      browseByRegion: "按地区浏览",
      whyUs: "为何选择 SIM uncle？",
      whyUsDesc: "我们提供最优质的全球 eSIM 服务，让您的旅程更轻松",
      feature1Title: "即时激活",
      feature1Desc: "购买后立即收到 QR Code，扫码即可激活，无需等待实体卡",
      feature2Title: "全球覆盖",
      feature2Desc: "覆盖 200+ 个国家及地区，一张 eSIM 走遍全球",
      feature3Title: "灵活方案",
      feature3Desc: "多种数据量及有效期选择，按需选购最适合的方案",
      feature4Title: "安全付款",
      feature4Desc: "采用 Stripe 安全付款系统，保障您的交易安全",
      viewAll: "查看全部",
      from: "低至",
      day: "天",
      days: "天",
    },
    regions: {
      asia: "亚洲",
      europe: "欧洲",
      americas: "美洲",
      middleEast: "中东",
      africa: "非洲",
      oceania: "大洋洲",
      global: "全球",
      allRegions: "所有地区",
    },
    products: {
      title: "全球 eSIM 方案",
      subtitle: "选择适合您旅程的 eSIM 方案",
      search: "搜索方案名称、国家、地区或产品 ID...",
      filterRegion: "地区",
      filterCountry: "国家",
      filterData: "数据量",
      sortBy: "排序",
      sortPrice: "价格由低至高",
      sortPriceDesc: "价格由高至低",
      sortDuration: "有效期",
      sortData: "数据量",
      noResults: "找不到符合条件的方案",
      loading: "加载中...",
      data: "数据",
      validity: "有效期",
      network: "网络",
      hotspot: "热点",
      voice: "语音",
      sms: "短信",
      buyNow: "立即购买",
      addToCart: "加入购物车",
      viewDetails: "查看详情",
      allCountries: "所有国家",
      allData: "所有数据量",
      topupOnlyNote: "此为增值方案，请从「我的订单」增购",
      results: "个方案",
      perDay: "每天",
      filterDuration: "天数",
      allDuration: "所有天数",
    },
    productDetail: {
      overview: "方案概览",
      countries: "覆盖国家",
      features: "方案特点",
      howToUse: "使用说明",
      dataAmount: "数据量",
      validity: "有效期",
      network: "网络类型",
      activation: "激活方式",
      hotspot: "个人热点",
      voice: "语音通话",
      sms: "短信",
      speed: "网速",
      profile: "方案类型",
      local: "本地",
      roaming: "漫游",
      unrestricted: "不限速",
      restricted: "限速",
      available: "支持",
      notAvailable: "不支持",
      addToCart: "加入购物车",
      buyNow: "立即购买",
      selectDate: "选择开始日期",
      startDate: "开始日期",
      qty: "数量",
      total: "合计",
      supportedCountries: "支持国家",
      planInfoNote: "（以下说明为提供商原文）",
      tabOverview: "概览",
      tabCoverage: "覆盖范围",
      tabHowToUse: "安装教程",
      coverageCountry: "国家",
      coverageOperator: "运营商",
      coverageNetwork: "网络",
      coverageApn: "APN",
      coverageSearch: "搜索目的地…",
      coverageNoResults: "找不到符合的国家",
    },
    cart: {
      title: "购物车",
      empty: "购物车是空的",
      emptyDesc: "立即浏览我们的 eSIM 方案，开始您的旅程",
      browsePlans: "浏览方案",
      remove: "移除",
      qty: "数量",
      subtotal: "小计",
      total: "合计",
      checkout: "前往结账",
      continueShopping: "继续购物",
      item: "件商品",
      items: "件商品",
    },
    checkout: {
      title: "结账",
      processing: "处理中...",
      success: "付款成功！",
      successDesc: "您的 eSIM 订单已确认，请前往「我的订单」查看 QR Code",
      failed: "付款失败",
      failedDesc: "付款未能完成，请重试或联系客服",
      viewOrders: "查看订单",
      tryAgain: "重试",
      loginRequired: "请先登录",
      loginRequiredDesc: "您需要登录才能完成购买",
      redirecting: "正在跳转至付款页面...",
      securePayment: "安全付款，由 Stripe 提供保障",
    },
    orders: {
      title: "我的订单",
      empty: "暂无订单",
      emptyDesc: "您尚未购买任何 eSIM 方案",
      orderId: "订单编号",
      product: "方案",
      amount: "金额",
      status: "状态",
      date: "日期",
      viewEsim: "查看 eSIM",
      topUp: "增购数据",
      checkUsage: "查看用量",
      pending: "待付款",
      paid: "已付款",
      processing: "处理中",
      completed: "已完成",
      failed: "失败",
      refunded: "已退款",
      qrCode: "eSIM QR Code",
      activationCode: "激活码",
      copyCode: "复制",
      copied: "已复制",
      usageTitle: "数据用量",
      used: "已使用",
      remaining: "剩余",
      total: "总量",
      expires: "到期日",
      usageLoading: "加载用量中...",
      usageNotAvailable: "暂无用量数据",
      usageRealtime: "实时数据",
      usageUpdated: "更新于",
      usagePercentUsed: "已用",
      statusActive: "使用中",
      statusExpired: "已过期",
      statusNotActivated: "未激活",
      statusQueued: "增值准备中",
      statusUnused: "未使用",
      statusDataDepleted: "数据已耗尽",
      statusTerminated: "已终止",
      statusTerminatedSwitched: "已终止（已切换增值）",
      terminatedTopupNote: "主卡方案已终止，您有 {count} 个增值方案，可立即启用使用。",
      topupDataDepletedNote: "母方案已耗尽，您有 {count} 个加值方案正在排队备用，网络运营商确认后将自动切换启用。",
      parentOrderLabel: "主订单号码",
      usageRefresh: "刷新用量",
      coverage: "可用地区",
      expiryDate: "到期日",
      validity: "有效期",
      validityHint: "激活后计算",
      topupIncluded: "已包含加值 +{amount}",
      topupQueuedNote: "您有加值方案正在备用中，母方案数据用完后会自动切换启用。",
      mainCard: "主卡",
      shareLpa: "分享 eSIM",
      shareEsim: "分享给同行者",
      shareTitle: "eSIM 安装资讯",
      shareText: "我的 eSIM 安装码：",
      copyLpa: "复制 LPA 字符串",
      iosInstall: "iPhone 一键安装",
      iosInstallNote: "适用于 iOS 17.4 或以上",
      buyAgain: "再次购买",
      pushTitle: "开启推送通知",
      pushDesc: "订单更新、限时优惠第一时间通知你",
      pushEnable: "开启通知",
      pushEnabled: "推送通知已开启",
      pushUnsubscribe: "取消订阅",
      pushProcessing: "处理中...",
      pushSuccessToast: "已开启推送通知！",
      pushErrorPermission: "请允许通知权限",
      pushErrorFailed: "订阅失败，请稍后再试",
      pushDisabledToast: "已关闭推送通知",
      pushDisabledError: "取消订阅失败",
      filterAll: "全部",
      filterPending: "待付款",
      filterProcessing: "未完成",
      filterCompleted: "已完成",
      filterFailed: "失败",
      filterUnused: "未使用",
      filterInUse: "使用中",
      filterExpired: "已失效",
      continuePayment: "继续付款",
      tgtCheckStatus: "查询状态",
      tgtStatusTitle: "eSIM 状态查询",
      tgtOrderStatus: "订单状态",
      tgtProfileStatus: "SIM 卡状态",
      tgtActivatedStart: "开始时间",
      tgtActivatedEnd: "到期时间",
      tgtIccid: "ICCID",
      tgtUsageTitle: "实时流量",
      tgtDataTotal: "总流量",
      tgtDataUsage: "已使用",
      tgtDataResidual: "剩余流量",
      tgtUsageNotSupported: "此方案不支持实时流量查询",
      tgtNotFound: "查询不到订单信息，请稍后再试",
      tgtStatusNOTACTIVE: "未激活",
      tgtStatusACTIVATED: "已开通",
      tgtStatusINUSE: "使用中",
      tgtStatusUSED: "已用完",
      tgtStatusEXPIRED: "已到期",
      tgtStatusABANDON: "已取消",
      tgtStatusTERMINATION: "已终止",
      tgtStatusNODOWNLOAD: "未激活",
      tgtStatusDELETED: "已失效",
      tgtHighSpeedLimit: "高速上限",
      tgtThrottled: "降速中",
      tgtThrottledNote: "高速流量已用尽，降速继续使用中",
    },
    topup: {
      title: "增购数据",
      availablePlans: "可用增购数据方案",
      noPlans: "暂无可用增购数据方案",
      purchase: "购买加值",
      confirm: "确认加值",
      success: "加值成功",
      failed: "加值失败",
      canTopUp: "可加值",
      noTopupSuggest: "此方案不支持加值，快用完时可考虑以下相似方案：",
      similarPlans: "相似方案推荐",
      buyAgain: "立即购买",
      redirecting: "正在跳转至付款页面...",
      history: "加值记录",
      historyEmpty: "尚未有加值记录",
      topupSuccess: "加值成功！流量已增加，正在更新...",
      statusPending: "待付款",
      statusPaid: "已付款",
      statusCompleted: "已完成",
      statusFailed: "失败",
      validityNote: "加值只增加数据量；有效期以该加值方案为准，并非延长原方案到期日。选有「+天数」较长的方案可获得较长使用期。长有效期方案的日数由购买后即时起计，不会等原方案用完才开始。",
      mainCardActive: "主卡使用中",
      mainCardExpired: "主卡已到期",
      mainCardExpiredNote: "主卡已到期，此加值方案的流量已随主卡一同到期。",
      usageLabel: "加值用量",
    },
    auth: {
      loginTitle: "登录 SIM uncle",
      loginDesc: "登录后即可购买及管理您的 eSIM 方案",
      loginBtn: "使用 Manus 账号登录",
      logoutSuccess: "已成功退出",
      welcome: "欢迎回来",
    },
    common: {
      loading: "加载中...",
      error: "发生错误",
      retry: "重试",
      close: "关闭",
      confirm: "确认",
      cancel: "取消",
      save: "保存",
      edit: "编辑",
      delete: "删除",
      back: "返回",
      next: "下一步",
      submit: "提交",
      hkd: "HKD",
      gb: "GB",
      mb: "MB",
      days: "天",
      day: "天",
      yes: "是",
      no: "否",
      comingSoon: "即将推出",
    },
  },
  en: {
    nav: {
      home: "Home",
      products: "eSIM Plans",
      orders: "My Orders",
      cart: "Cart",
      login: "Login",
      logout: "Logout",
      account: "My Account",
      myOrders: "My Orders",
    },
    home: {
      heroTitle: "Global eSIM, Ready Instantly",
      heroSubtitle: "Coverage in 200+ countries & regions. No SIM swap needed — just scan and connect.",
      heroBtn: "Shop Now",
      popularPlans: "Popular Plans",
      browseByRegion: "Browse by Region",
      whyUs: "Why eSIM Uncle?",
      whyUsDesc: "We provide the best global eSIM service to make your journey easier",
      feature1Title: "Instant Activation",
      feature1Desc: "Receive your QR Code immediately after purchase. Scan to activate — no physical SIM needed.",
      feature2Title: "Global Coverage",
      feature2Desc: "Coverage in 200+ countries & regions. One eSIM for all your travels.",
      feature3Title: "Flexible Plans",
      feature3Desc: "Multiple data and validity options. Choose the plan that fits your needs.",
      feature4Title: "Secure Payment",
      feature4Desc: "Powered by Stripe's secure payment system to protect every transaction.",
      viewAll: "View All",
      from: "From",
      day: "day",
      days: "days",
    },
    regions: {
      asia: "Asia",
      europe: "Europe",
      americas: "Americas",
      middleEast: "Middle East",
      africa: "Africa",
      oceania: "Oceania",
      global: "Global",
      allRegions: "All Regions",
    },
    products: {
      title: "Global eSIM Plans",
      subtitle: "Choose the perfect eSIM plan for your journey",
      search: "Search plans, countries, regions or product ID...",
      filterRegion: "Region",
      filterCountry: "Country",
      filterData: "Data",
      sortBy: "Sort by",
      sortPrice: "Price: Low to High",
      sortPriceDesc: "Price: High to Low",
      sortDuration: "Validity",
      sortData: "Data Amount",
      noResults: "No plans found matching your criteria",
      loading: "Loading...",
      data: "Data",
      validity: "Validity",
      network: "Network",
      hotspot: "Hotspot",
      voice: "Voice",
      sms: "SMS",
      buyNow: "Buy Now",
      addToCart: "Add to Cart",
      viewDetails: "View Details",
      allCountries: "All Countries",
      allData: "All Data",
      topupOnlyNote: "This is a top-up plan. Please add data from My Orders.",
      results: "plans",
      perDay: "per day",
      filterDuration: "Duration",
      allDuration: "All Durations",
    },
    productDetail: {
      overview: "Plan Overview",
      countries: "Coverage",
      features: "Features",
      howToUse: "How to Use",
      dataAmount: "Data",
      validity: "Validity",
      network: "Network Type",
      activation: "Activation",
      hotspot: "Hotspot",
      voice: "Voice Calls",
      sms: "SMS",
      speed: "Speed",
      profile: "Profile Type",
      local: "Local",
      roaming: "Roaming",
      unrestricted: "Unrestricted",
      restricted: "Restricted",
      available: "Supported",
      notAvailable: "Not Supported",
      addToCart: "Add to Cart",
      buyNow: "Buy Now",
      selectDate: "Select Start Date",
      startDate: "Start Date",
      qty: "Qty",
      total: "Total",
      supportedCountries: "Supported Countries",
      planInfoNote: "(Original provider description)",
      tabOverview: "Overview",
      tabCoverage: "Coverage",
      tabHowToUse: "Installation Guide",
      coverageCountry: "Country",
      coverageOperator: "Operator",
      coverageNetwork: "Network",
      coverageApn: "APN",
      coverageSearch: "Search destination…",
      coverageNoResults: "No results found",
    },
    cart: {
      title: "Shopping Cart",
      empty: "Your cart is empty",
      emptyDesc: "Browse our eSIM plans and start your journey",
      browsePlans: "Browse Plans",
      remove: "Remove",
      qty: "Qty",
      subtotal: "Subtotal",
      total: "Total",
      checkout: "Checkout",
      continueShopping: "Continue Shopping",
      item: "item",
      items: "items",
    },
    checkout: {
      title: "Checkout",
      processing: "Processing...",
      success: "Payment Successful!",
      successDesc: "Your eSIM order is confirmed. Go to My Orders to view your QR Code.",
      failed: "Payment Failed",
      failedDesc: "Your payment could not be completed. Please try again or contact support.",
      viewOrders: "View Orders",
      tryAgain: "Try Again",
      loginRequired: "Login Required",
      loginRequiredDesc: "You need to login to complete your purchase",
      redirecting: "Redirecting to payment page...",
      securePayment: "Secure payment powered by Stripe",
    },
    orders: {
      title: "My Orders",
      empty: "No orders yet",
      emptyDesc: "You haven't purchased any eSIM plans yet",
      orderId: "Order ID",
      product: "Plan",
      amount: "Amount",
      status: "Status",
      date: "Date",
      viewEsim: "View eSIM",
      topUp: "Add Data",
      checkUsage: "Check Usage",
      pending: "Pending",
      paid: "Paid",
      processing: "Processing",
      completed: "Completed",
      failed: "Failed",
      refunded: "Refunded",
      qrCode: "eSIM QR Code",
      activationCode: "Activation Code",
      copyCode: "Copy",
      copied: "Copied",
      usageTitle: "Data Usage",
      used: "Used",
      remaining: "Remaining",
      total: "Total",
      expires: "Expires",
      usageLoading: "Loading usage...",
      usageNotAvailable: "Usage data not available",
      usageRealtime: "Real-time",
      usageUpdated: "Updated",
      usagePercentUsed: "used",
      statusActive: "Active",
      statusExpired: "Expired",
      statusNotActivated: "Not Activated",
      statusQueued: "Add-on Queued",
      statusUnused: "Unused",
      statusDataDepleted: "Data Depleted",
      statusTerminated: "Terminated",
      statusTerminatedSwitched: "Terminated (switched to top-up)",
      terminatedTopupNote: "The main plan has been terminated. You have {count} top-up(s) ready to use immediately.",
      topupDataDepletedNote: "Your base plan is depleted. You have {count} queued top-up(s) that will activate automatically once the operator confirms the switch.",
      parentOrderLabel: "Main Order",
      usageRefresh: "Refresh Usage",
      coverage: "Coverage",
      expiryDate: "Expires",
      validity: "Validity",
      validityHint: "counts from activation",
      topupIncluded: "Includes top-up +{amount}",
      topupQueuedNote: "You have a queued top-up. It will activate automatically once your current plan's data is depleted.",
      mainCard: "Main Card",
      shareLpa: "Share eSIM",
      shareEsim: "Share with Travel Companion",
      shareTitle: "eSIM Installation Info",
      shareText: "My eSIM activation code: ",
      copyLpa: "Copy LPA String",
      iosInstall: "Install on iPhone",
      iosInstallNote: "Requires iOS 17.4 or later",
      buyAgain: "Buy Again",
      pushTitle: "Enable Push Notifications",
      pushDesc: "Get notified instantly for order updates and promotions",
      pushEnable: "Enable",
      pushEnabled: "Push Notifications Enabled",
      pushUnsubscribe: "Unsubscribe",
      pushProcessing: "Processing...",
      pushSuccessToast: "Push notifications enabled!",
      pushErrorPermission: "Please allow notification permission",
      pushErrorFailed: "Subscription failed, please try again",
      pushDisabledToast: "Push notifications disabled",
      pushDisabledError: "Failed to unsubscribe",
      filterAll: "All",
      filterPending: "Pending Payment",
      filterProcessing: "Incomplete",
      filterCompleted: "Completed",
      filterFailed: "Failed",
      filterUnused: "Unused",
      filterInUse: "In Use",
      filterExpired: "Expired",
      continuePayment: "Continue Payment",
      tgtCheckStatus: "Check Status",
      tgtStatusTitle: "eSIM Status",
      tgtOrderStatus: "Order Status",
      tgtProfileStatus: "Profile Status",
      tgtActivatedStart: "Activated From",
      tgtActivatedEnd: "Expires On",
      tgtIccid: "ICCID",
      tgtUsageTitle: "Real-time Usage",
      tgtDataTotal: "Total Data",
      tgtDataUsage: "Used",
      tgtDataResidual: "Remaining",
      tgtUsageNotSupported: "Real-time usage query not supported for this plan",
      tgtNotFound: "Order info not found, please try again later",
      tgtStatusNOTACTIVE: "Not Activated",
      tgtStatusACTIVATED: "Downloaded",
      tgtStatusINUSE: "In Use",
      tgtStatusUSED: "Used Up",
      tgtStatusEXPIRED: "Expired",
      tgtStatusABANDON: "Cancelled",
      tgtStatusTERMINATION: "Terminated",
      tgtStatusNODOWNLOAD: "Not Downloaded",
      tgtStatusDELETED: "Expired/Deleted",
      tgtHighSpeedLimit: "High-Speed Limit",
      tgtThrottled: "Throttled",
      tgtThrottledNote: "High-speed data used up, now running at reduced speed",
    },
    topup: {
      title: "Add Data",
      availablePlans: "Available Add-on Data Plans",
      noPlans: "No add-on data plans available",
      purchase: "Purchase Top-up",
      confirm: "Confirm Top-up",
      success: "Top-up Successful",
      failed: "Top-up Failed",
      canTopUp: "Top-up Available",
      noTopupSuggest: "This plan doesn't support top-up. When running low, consider these similar plans:",
      similarPlans: "Similar Plans",
      buyAgain: "Buy Now",
      redirecting: "Redirecting to payment page...",
      history: "Top-up History",
      historyEmpty: "No top-up history yet",
      topupSuccess: "Top-up successful! Data added, refreshing...",
      statusPending: "Pending",
      statusPaid: "Paid",
      statusCompleted: "Completed",
      statusFailed: "Failed",
      validityNote: "Top-ups add data only. Each top-up's validity follows that plan and does not extend your original plan's expiry. Pick a plan with more '+days' for longer validity. A longer-validity plan's days start counting immediately after purchase, not after your original plan runs out.",
      mainCardActive: "Main Card Active",
      mainCardExpired: "Main Card Expired",
      mainCardExpiredNote: "Your main card has expired. The data from this top-up has also expired along with it.",
      usageLabel: "Top-up Usage",
    },
    auth: {
      loginTitle: "Sign in to SIM uncle",
      loginDesc: "Login to purchase and manage your eSIM plans",
      loginBtn: "Login with Manus",
      logoutSuccess: "Successfully logged out",
      welcome: "Welcome back",
    },
    common: {
      loading: "Loading...",
      error: "An error occurred",
      retry: "Retry",
      close: "Close",
      confirm: "Confirm",
      cancel: "Cancel",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      back: "Back",
      next: "Next",
      submit: "Submit",
      hkd: "HKD",
      gb: "GB",
      mb: "MB",
      days: "days",
      day: "day",
      yes: "Yes",
      no: "No",
      comingSoon: "Coming Soon",
    },
  },
  // ── Japanese ──────────────────────────────────────────────────────────────
  ja: {
    nav: {
      home: "ホーム",
      products: "eSIMプラン",
      orders: "注文履歴",
      cart: "カート",
      login: "ログイン",
      logout: "ログアウト",
      account: "マイアカウント",
      myOrders: "注文履歴",
    },
    home: {
      heroTitle: "グローバルeSIM、すぐに使える",
      heroSubtitle: "200以上の国と地域をカバー。SIM交換不要 — スキャンするだけで接続。",
      heroBtn: "今すぐ購入",
      popularPlans: "人気プラン",
      browseByRegion: "地域で探す",
      whyUs: "eSIM Uncleを選ぶ理由",
      whyUsDesc: "最高品質のグローバルeSIMサービスで、旅をもっと快適に",
      feature1Title: "即時アクティベーション",
      feature1Desc: "購入後すぐにQRコードを受け取り、スキャンするだけで開通。物理SIM不要。",
      feature2Title: "グローバルカバレッジ",
      feature2Desc: "200以上の国と地域をカバー。1枚のeSIMで世界中を旅できます。",
      feature3Title: "柔軟なプラン",
      feature3Desc: "データ量と有効期限を自由に選択。ニーズに合ったプランを。",
      feature4Title: "安全な決済",
      feature4Desc: "Stripeの安全な決済システムで、すべての取引を保護します。",
      viewAll: "すべて見る",
      from: "から",
      day: "日",
      days: "日間",
    },
    regions: {
      asia: "アジア",
      europe: "ヨーロッパ",
      americas: "アメリカ",
      middleEast: "中東",
      africa: "アフリカ",
      oceania: "オセアニア",
      global: "グローバル",
      allRegions: "すべての地域",
    },
    products: {
      title: "グローバルeSIMプラン",
      subtitle: "旅に最適なeSIMプランを選ぼう",
      search: "プラン名、国、地域または製品 ID を検索...",
      filterRegion: "地域",
      filterCountry: "国",
      filterData: "データ量",
      sortBy: "並び替え",
      sortPrice: "価格：安い順",
      sortPriceDesc: "価格：高い順",
      sortDuration: "有効期限",
      sortData: "データ量",
      noResults: "条件に合うプランが見つかりません",
      loading: "読み込み中...",
      data: "データ",
      validity: "有効期限",
      network: "ネットワーク",
      hotspot: "テザリング",
      voice: "音声",
      sms: "SMS",
      buyNow: "今すぐ購入",
      addToCart: "カートに追加",
      viewDetails: "詳細を見る",
      allCountries: "すべての国",
      allData: "すべてのデータ量",
      topupOnlyNote: "これはトップアッププランです。注文履歴からデータを追加してください。",
      results: "件のプラン",
      perDay: "1日あたり",
      filterDuration: "期間",
      allDuration: "すべての期間",
    },
    productDetail: {
      overview: "プラン概要",
      countries: "対応国",
      features: "特徴",
      howToUse: "使い方",
      dataAmount: "データ量",
      validity: "有効期限",
      network: "ネットワーク種別",
      activation: "アクティベーション",
      hotspot: "テザリング",
      voice: "音声通話",
      sms: "SMS",
      speed: "速度",
      profile: "プロファイル種別",
      local: "ローカル",
      roaming: "ローミング",
      unrestricted: "速度制限なし",
      restricted: "速度制限あり",
      available: "対応",
      notAvailable: "非対応",
      addToCart: "カートに追加",
      buyNow: "今すぐ購入",
      selectDate: "開始日を選択",
      startDate: "開始日",
      qty: "数量",
      total: "合計",
      supportedCountries: "対応国",
      planInfoNote: "（以下はプロバイダーの原文説明です）",
      tabOverview: "概要",
      tabCoverage: "カバレッジ",
      tabHowToUse: "インストールガイド",
      coverageCountry: "国",
      coverageOperator: "キャリア",
      coverageNetwork: "ネットワーク",
      coverageApn: "APN",
      coverageSearch: "目的地を検索…",
      coverageNoResults: "該当する国が見つかりません",
    },
    cart: {
      title: "ショッピングカート",
      empty: "カートは空です",
      emptyDesc: "eSIMプランを探して旅を始めましょう",
      browsePlans: "プランを探す",
      remove: "削除",
      qty: "数量",
      subtotal: "小計",
      total: "合計",
      checkout: "チェックアウト",
      continueShopping: "買い物を続ける",
      item: "点",
      items: "点",
    },
    checkout: {
      title: "チェックアウト",
      processing: "処理中...",
      success: "お支払い完了！",
      successDesc: "eSIMのご注文が確認されました。注文履歴でQRコードをご確認ください。",
      failed: "お支払い失敗",
      failedDesc: "お支払いを完了できませんでした。もう一度お試しいただくか、サポートにお問い合わせください。",
      viewOrders: "注文を確認",
      tryAgain: "再試行",
      loginRequired: "ログインが必要です",
      loginRequiredDesc: "購入を完了するにはログインが必要です",
      redirecting: "お支払いページへ移動中...",
      securePayment: "Stripeによる安全な決済",
    },
    orders: {
      title: "注文履歴",
      empty: "注文がありません",
      emptyDesc: "まだeSIMプランを購入していません",
      orderId: "注文ID",
      product: "プラン",
      amount: "金額",
      status: "ステータス",
      date: "日付",
      viewEsim: "eSIMを確認",
      topUp: "データ追加",
      checkUsage: "使用量を確認",
      pending: "支払い待ち",
      paid: "支払済み",
      processing: "処理中",
      completed: "完了",
      failed: "失敗",
      refunded: "返金済み",
      qrCode: "eSIM QRコード",
      activationCode: "アクティベーションコード",
      copyCode: "コピー",
      copied: "コピー済み",
      usageTitle: "データ使用量",
      used: "使用済み",
      remaining: "残り",
      total: "合計",
      expires: "有効期限",
      usageLoading: "使用量を読み込み中...",
      usageNotAvailable: "使用量データがありません",
      usageRealtime: "リアルタイム",
      usageUpdated: "更新日時",
      usagePercentUsed: "使用済み",
      statusActive: "使用中",
      statusExpired: "期限切れ",
      statusNotActivated: "未アクティベーション",
      statusQueued: "トップアップ待機中",
      statusUnused: "未使用",
      statusDataDepleted: "データ使い切り",
      statusTerminated: "終了済み",
      statusTerminatedSwitched: "終了済み（追加プランに切替）",
      terminatedTopupNote: "メインプランは終了しました。{count}件のトップアップがあり、すぐにご利用いただけます。",
      topupDataDepletedNote: "ベースプランのデータが使い切られました。{count}件のトップアップが待機中で、キャリアが確認次第自動的に切り替わります。",
      parentOrderLabel: "メイン注文",
      usageRefresh: "使用量を更新",
      coverage: "対応エリア",
      expiryDate: "有効期限",
      validity: "有効期間",
      validityHint: "アクティベーション後から計算",
      topupIncluded: "トップアップ +{amount} 含む",
      topupQueuedNote: "トップアップが待機中です。現在のプランのデータが使い切られると自動的に切り替わります。",
      mainCard: "メインカード",
      shareLpa: "eSIMをシェア",
      shareEsim: "同行者にシェア",
      shareTitle: "eSIMインストール情報",
      shareText: "私のeSIMアクティベーションコード：",
      copyLpa: "LPA文字列をコピー",
      iosInstall: "iPhoneにインストール",
      iosInstallNote: "iOS 17.4以降が必要",
      buyAgain: "再購入",
      pushTitle: "プッシュ通知を有効にする",
      pushDesc: "注文更新や限定セールを即座にお知らせ",
      pushEnable: "有効にする",
      pushEnabled: "プッシュ通知有効",
      pushUnsubscribe: "登録解除",
      pushProcessing: "処理中...",
      pushSuccessToast: "プッシュ通知を有効にしました！",
      pushErrorPermission: "通知の許可を允可してください",
      pushErrorFailed: "登録に失敗しました。後でもう一度お試しください",
      pushDisabledToast: "プッシュ通知を無効にしました",
      pushDisabledError: "登録解除に失敗しました",
      filterAll: "すべて",
      filterPending: "支払い待ち",
      filterProcessing: "未完了",
      filterCompleted: "完了",
      filterFailed: "失敗",
      filterUnused: "未使用",
      filterInUse: "使用中",
      filterExpired: "失効済み",
      continuePayment: "支払いを続ける",
      tgtCheckStatus: "ステータス確認",
      tgtStatusTitle: "eSIM ステータス",
      tgtOrderStatus: "注文ステータス",
      tgtProfileStatus: "プロファイルステータス",
      tgtActivatedStart: "開始日時",
      tgtActivatedEnd: "有効期限",
      tgtIccid: "ICCID",
      tgtUsageTitle: "リアルタイム通信量",
      tgtDataTotal: "総通信量",
      tgtDataUsage: "使用済み",
      tgtDataResidual: "残り通信量",
      tgtUsageNotSupported: "このプランはリアルタイム通信量查詢に対応していません",
      tgtNotFound: "注文情報が見つかりません。後でもう一度お試しください",
      tgtStatusNOTACTIVE: "未アクティベーション",
      tgtStatusACTIVATED: "ダウンロード済み",
      tgtStatusINUSE: "使用中",
      tgtStatusUSED: "使用済み",
      tgtStatusEXPIRED: "期限切れ",
      tgtStatusABANDON: "キャンセル済み",
      tgtStatusTERMINATION: "終了済み",
      tgtStatusNODOWNLOAD: "未ダウンロード",
      tgtStatusDELETED: "失効済み",
      tgtHighSpeedLimit: "高速上限",
      tgtThrottled: "速度制限中",
      tgtThrottledNote: "高速データを使い切り、低速で継続中",
    },
    topup: {
      title: "データ追加",
      availablePlans: "利用可能なトップアッププラン",
      noPlans: "利用可能なトップアッププランがありません",
      purchase: "トップアップを購入",
      confirm: "トップアップを確認",
      success: "トップアップ成功",
      failed: "トップアップ失敗",
      canTopUp: "トップアップ可能",
      noTopupSuggest: "このプランはトップアップに対応していません。データが少なくなったら、以下の類似プランをご検討ください：",
      similarPlans: "類似プラン",
      buyAgain: "今すぐ購入",
      redirecting: "お支払いページへ移動中...",
      history: "トップアップ履歴",
      historyEmpty: "トップアップ履歴がありません",
      topupSuccess: "トップアップ成功！データが追加されました。更新中...",
      statusPending: "支払い待ち",
      statusPaid: "支払済み",
      statusCompleted: "完了",
      statusFailed: "失敗",
      validityNote: "トップアップはデータのみ追加します。有効期限はそのトップアッププランに従い、元のプランの有効期限は延長されません。",
      mainCardActive: "メインカード使用中",
      mainCardExpired: "メインカード期限切れ",
      mainCardExpiredNote: "メインカードの有効期限が切れました。このトップアップのデータも期限切れになりました。",
      usageLabel: "トップアップ使用量",
    },
    auth: {
      loginTitle: "SIM uncleにサインイン",
      loginDesc: "ログインしてeSIMプランを購入・管理しましょう",
      loginBtn: "Manusアカウントでログイン",
      logoutSuccess: "ログアウトしました",
      welcome: "おかえりなさい",
    },
    common: {
      loading: "読み込み中...",
      error: "エラーが発生しました",
      retry: "再試行",
      close: "閉じる",
      confirm: "確認",
      cancel: "キャンセル",
      save: "保存",
      edit: "編集",
      delete: "削除",
      back: "戻る",
      next: "次へ",
      submit: "送信",
      hkd: "HKD",
      gb: "GB",
      mb: "MB",
      days: "日間",
      day: "日",
      yes: "はい",
      no: "いいえ",
      comingSoon: "近日公開",
    },
  },
  // ── Korean ────────────────────────────────────────────────────────────────
  ko: {
    nav: {
      home: "홈",
      products: "eSIM 요금제",
      orders: "주문 내역",
      cart: "장바구니",
      login: "로그인",
      logout: "로그아웃",
      account: "내 계정",
      myOrders: "주문 내역",
    },
    home: {
      heroTitle: "글로벌 eSIM, 즉시 사용 가능",
      heroSubtitle: "200개 이상의 국가 및 지역 커버. SIM 교체 불필요 — 스캔하고 바로 연결.",
      heroBtn: "지금 구매",
      popularPlans: "인기 요금제",
      browseByRegion: "지역별 탐색",
      whyUs: "eSIM Uncle을 선택하는 이유",
      whyUsDesc: "최고 품질의 글로벌 eSIM 서비스로 여행을 더 편리하게",
      feature1Title: "즉시 개통",
      feature1Desc: "구매 후 즉시 QR 코드 수령. 스캔하면 바로 개통 — 실물 SIM 불필요.",
      feature2Title: "글로벌 커버리지",
      feature2Desc: "200개 이상의 국가 및 지역 커버. eSIM 하나로 전 세계 여행.",
      feature3Title: "유연한 요금제",
      feature3Desc: "다양한 데이터 및 유효기간 옵션. 필요에 맞는 요금제 선택.",
      feature4Title: "안전한 결제",
      feature4Desc: "Stripe 안전 결제 시스템으로 모든 거래를 보호합니다.",
      viewAll: "전체 보기",
      from: "부터",
      day: "일",
      days: "일",
    },
    regions: {
      asia: "아시아",
      europe: "유럽",
      americas: "아메리카",
      middleEast: "중동",
      africa: "아프리카",
      oceania: "오세아니아",
      global: "글로벌",
      allRegions: "전체 지역",
    },
    products: {
      title: "글로벌 eSIM 요금제",
      subtitle: "여행에 완벽한 eSIM 요금제를 선택하세요",
      search: "요금제, 국가, 지역 또는 제품 ID 검색...",
      filterRegion: "지역",
      filterCountry: "국가",
      filterData: "데이터",
      sortBy: "정렬",
      sortPrice: "가격: 낮은 순",
      sortPriceDesc: "가격: 높은 순",
      sortDuration: "유효기간",
      sortData: "데이터 용량",
      noResults: "조건에 맞는 요금제가 없습니다",
      loading: "로딩 중...",
      data: "데이터",
      validity: "유효기간",
      network: "네트워크",
      hotspot: "핫스팟",
      voice: "음성",
      sms: "SMS",
      buyNow: "지금 구매",
      addToCart: "장바구니 담기",
      viewDetails: "상세 보기",
      allCountries: "전체 국가",
      allData: "전체 데이터",
      topupOnlyNote: "이것은 데이터 추가 요금제입니다. 주문 내역에서 데이터를 추가하세요.",
      results: "개 요금제",
      perDay: "일당",
      filterDuration: "기간",
      allDuration: "전체 기간",
    },
    productDetail: {
      overview: "요금제 개요",
      countries: "커버리지",
      features: "특징",
      howToUse: "사용 방법",
      dataAmount: "데이터",
      validity: "유효기간",
      network: "네트워크 유형",
      activation: "개통",
      hotspot: "핫스팟",
      voice: "음성 통화",
      sms: "SMS",
      speed: "속도",
      profile: "프로파일 유형",
      local: "로컬",
      roaming: "로밍",
      unrestricted: "속도 제한 없음",
      restricted: "속도 제한",
      available: "지원",
      notAvailable: "미지원",
      addToCart: "장바구니 담기",
      buyNow: "지금 구매",
      selectDate: "시작일 선택",
      startDate: "시작일",
      qty: "수량",
      total: "합계",
      supportedCountries: "지원 국가",
      planInfoNote: "(아래는 공급업체 원문 설명입니다)",
      tabOverview: "개요",
      tabCoverage: "커버리지",
      tabHowToUse: "설치 가이드",
      coverageCountry: "국가",
      coverageOperator: "통신사",
      coverageNetwork: "네트워크",
      coverageApn: "APN",
      coverageSearch: "목적지 검색…",
      coverageNoResults: "해당 국가를 찾을 수 없습니다",
    },
    cart: {
      title: "장바구니",
      empty: "장바구니가 비어 있습니다",
      emptyDesc: "eSIM 요금제를 탐색하고 여행을 시작하세요",
      browsePlans: "요금제 탐색",
      remove: "삭제",
      qty: "수량",
      subtotal: "소계",
      total: "합계",
      checkout: "결제하기",
      continueShopping: "쇼핑 계속",
      item: "개",
      items: "개",
    },
    checkout: {
      title: "결제",
      processing: "처리 중...",
      success: "결제 완료!",
      successDesc: "eSIM 주문이 확인되었습니다. 주문 내역에서 QR 코드를 확인하세요.",
      failed: "결제 실패",
      failedDesc: "결제를 완료할 수 없습니다. 다시 시도하거나 고객센터에 문의하세요.",
      viewOrders: "주문 확인",
      tryAgain: "다시 시도",
      loginRequired: "로그인 필요",
      loginRequiredDesc: "구매를 완료하려면 로그인이 필요합니다",
      redirecting: "결제 페이지로 이동 중...",
      securePayment: "Stripe 안전 결제",
    },
    orders: {
      title: "주문 내역",
      empty: "주문 없음",
      emptyDesc: "아직 eSIM 요금제를 구매하지 않았습니다",
      orderId: "주문 ID",
      product: "요금제",
      amount: "금액",
      status: "상태",
      date: "날짜",
      viewEsim: "eSIM 확인",
      topUp: "데이터 추가",
      checkUsage: "사용량 확인",
      pending: "결제 대기",
      paid: "결제 완료",
      processing: "처리 중",
      completed: "완료",
      failed: "실패",
      refunded: "환불됨",
      qrCode: "eSIM QR 코드",
      activationCode: "개통 코드",
      copyCode: "복사",
      copied: "복사됨",
      usageTitle: "데이터 사용량",
      used: "사용됨",
      remaining: "남은",
      total: "전체",
      expires: "만료",
      usageLoading: "사용량 로딩 중...",
      usageNotAvailable: "사용량 데이터 없음",
      usageRealtime: "실시간",
      usageUpdated: "업데이트됨",
      usagePercentUsed: "사용됨",
      statusActive: "사용 중",
      statusExpired: "만료됨",
      statusNotActivated: "미개통",
      statusQueued: "추가 데이터 대기 중",
      statusUnused: "미사용",
      statusDataDepleted: "데이터 소진",
      statusTerminated: "종료됨",
      statusTerminatedSwitched: "종료됨 (추가 플랜으로 전환)",
      terminatedTopupNote: "메인 요금제가 종료되었습니다. {count}개의 추가 데이터를 즉시 사용할 수 있습니다.",
      topupDataDepletedNote: "기본 요금제 데이터가 소진되었습니다. {count}개의 추가 데이터가 대기 중이며 통신사 확인 후 자동으로 전환됩니다.",
      parentOrderLabel: "메인 주문",
      usageRefresh: "사용량 새로고침",
      coverage: "커버리지",
      expiryDate: "만료일",
      validity: "유효기간",
      validityHint: "개통 후 계산",
      topupIncluded: "추가 데이터 +{amount} 포함",
      topupQueuedNote: "추가 데이터가 대기 중입니다. 현재 요금제 데이터 소진 시 자동으로 전환됩니다.",
      mainCard: "메인 카드",
      shareLpa: "eSIM 공유",
      shareEsim: "동행자에게 공유",
      shareTitle: "eSIM 설치 정보",
      shareText: "내 eSIM 활성화 코드: ",
      copyLpa: "LPA 문자열 복사",
      iosInstall: "iPhone에 설치",
      iosInstallNote: "iOS 17.4 이상 필요",
      buyAgain: "다시 구매",
      pushTitle: "푸시 알림 활성화",
      pushDesc: "주문 업데이트 및 프로모션을 즉시 알림받으세요",
      pushEnable: "활성화",
      pushEnabled: "푸시 알림 활성화됨",
      pushUnsubscribe: "구독 취소",
      pushProcessing: "처리 중...",
      pushSuccessToast: "푸시 알림이 활성화되었습니다!",
      pushErrorPermission: "알림 권한을 허용해 주세요",
      pushErrorFailed: "구독 실패, 나중에 다시 시도해 주세요",
      pushDisabledToast: "푸시 알림이 비활성화되었습니다",
      pushDisabledError: "구독 취소 실패",
      filterAll: "전체",
      filterPending: "결제 대기",
      filterProcessing: "미완료",
      filterCompleted: "완료",
      filterFailed: "실패",
      filterUnused: "미사용",
      filterInUse: "사용 중",
      filterExpired: "만료됨",
      continuePayment: "결제 계속",
      tgtCheckStatus: "상태 확인",
      tgtStatusTitle: "eSIM 상태",
      tgtOrderStatus: "주문 상태",
      tgtProfileStatus: "프로파일 상태",
      tgtActivatedStart: "개통 시작",
      tgtActivatedEnd: "만료일",
      tgtIccid: "ICCID",
      tgtUsageTitle: "실시간 데이터 사용량",
      tgtDataTotal: "전체 데이터",
      tgtDataUsage: "사용량",
      tgtDataResidual: "남은 데이터",
      tgtUsageNotSupported: "이 요금제는 실시간 데이터 조회를 지원하지 않습니다",
      tgtNotFound: "주문 정보를 찾을 수 없습니다. 나중에 다시 시도해 주세요",
      tgtStatusNOTACTIVE: "미개통",
      tgtStatusACTIVATED: "다운로드됨",
      tgtStatusINUSE: "사용 중",
      tgtStatusUSED: "사용 완료",
      tgtStatusEXPIRED: "만료됨",
      tgtStatusABANDON: "취소됨",
      tgtStatusTERMINATION: "종료됨",
      tgtStatusNODOWNLOAD: "미다운로드",
      tgtStatusDELETED: "만료됨",
      tgtHighSpeedLimit: "고속 한도",
      tgtThrottled: "속도 제한 중",
      tgtThrottledNote: "고속 데이터 소진, 저속으로 계속 사용 중",
    },
    topup: {
      title: "데이터 추가",
      availablePlans: "이용 가능한 데이터 추가 요금제",
      noPlans: "이용 가능한 데이터 추가 요금제 없음",
      purchase: "데이터 추가 구매",
      confirm: "데이터 추가 확인",
      success: "데이터 추가 성공",
      failed: "데이터 추가 실패",
      canTopUp: "데이터 추가 가능",
      noTopupSuggest: "이 요금제는 데이터 추가를 지원하지 않습니다. 데이터가 부족할 때 유사한 요금제를 고려하세요:",
      similarPlans: "유사 요금제",
      buyAgain: "지금 구매",
      redirecting: "결제 페이지로 이동 중...",
      history: "데이터 추가 내역",
      historyEmpty: "데이터 추가 내역 없음",
      topupSuccess: "데이터 추가 성공! 데이터가 추가되었습니다. 새로고침 중...",
      statusPending: "결제 대기",
      statusPaid: "결제 완료",
      statusCompleted: "완료",
      statusFailed: "실패",
      validityNote: "데이터 추가는 데이터만 추가합니다. 유효기간은 해당 추가 요금제를 따르며 기존 요금제 만료일을 연장하지 않습니다.",
      mainCardActive: "메인 카드 사용 중",
      mainCardExpired: "메인 카드 만료됨",
      mainCardExpiredNote: "메인 카드가 만료되었습니다. 이 추가 데이터도 함께 만료되었습니다.",
      usageLabel: "추가 데이터 사용량",
    },
    auth: {
      loginTitle: "SIM uncle에 로그인",
      loginDesc: "로그인하여 eSIM 요금제를 구매하고 관리하세요",
      loginBtn: "Manus 계정으로 로그인",
      logoutSuccess: "로그아웃되었습니다",
      welcome: "다시 오셨군요",
    },
    common: {
      loading: "로딩 중...",
      error: "오류가 발생했습니다",
      retry: "다시 시도",
      close: "닫기",
      confirm: "확인",
      cancel: "취소",
      save: "저장",
      edit: "편집",
      delete: "삭제",
      back: "뒤로",
      next: "다음",
      submit: "제출",
      hkd: "HKD",
      gb: "GB",
      mb: "MB",
      days: "일",
      day: "일",
      yes: "예",
      no: "아니오",
      comingSoon: "출시 예정",
    },
  },
  // ── Thai ──────────────────────────────────────────────────────────────────
  th: {
    nav: {
      home: "หน้าหลัก",
      products: "แพ็กเกจ eSIM",
      orders: "คำสั่งซื้อ",
      cart: "ตะกร้า",
      login: "เข้าสู่ระบบ",
      logout: "ออกจากระบบ",
      account: "บัญชีของฉัน",
      myOrders: "คำสั่งซื้อของฉัน",
    },
    home: {
      heroTitle: "eSIM ทั่วโลก พร้อมใช้ทันที",
      heroSubtitle: "ครอบคลุมกว่า 200 ประเทศและภูมิภาค ไม่ต้องเปลี่ยนซิม — สแกนแล้วเชื่อมต่อได้เลย",
      heroBtn: "ซื้อเลย",
      popularPlans: "แพ็กเกจยอดนิยม",
      browseByRegion: "เลือกตามภูมิภาค",
      whyUs: "ทำไมต้องเลือก eSIM Uncle?",
      whyUsDesc: "เราให้บริการ eSIM ทั่วโลกคุณภาพสูงสุด เพื่อให้การเดินทางของคุณง่ายขึ้น",
      feature1Title: "เปิดใช้งานทันที",
      feature1Desc: "รับ QR Code ทันทีหลังซื้อ สแกนแล้วเปิดใช้งานได้เลย ไม่ต้องรอซิมจริง",
      feature2Title: "ครอบคลุมทั่วโลก",
      feature2Desc: "ครอบคลุมกว่า 200 ประเทศและภูมิภาค eSIM เดียวเที่ยวได้ทั่วโลก",
      feature3Title: "แพ็กเกจยืดหยุ่น",
      feature3Desc: "เลือกปริมาณข้อมูลและระยะเวลาได้หลากหลาย เลือกแพ็กเกจที่เหมาะกับคุณ",
      feature4Title: "ชำระเงินปลอดภัย",
      feature4Desc: "ระบบชำระเงินปลอดภัยด้วย Stripe ปกป้องทุกธุรกรรม",
      viewAll: "ดูทั้งหมด",
      from: "เริ่มต้น",
      day: "วัน",
      days: "วัน",
    },
    regions: {
      asia: "เอเชีย",
      europe: "ยุโรป",
      americas: "อเมริกา",
      middleEast: "ตะวันออกกลาง",
      africa: "แอฟริกา",
      oceania: "โอเชียเนีย",
      global: "ทั่วโลก",
      allRegions: "ทุกภูมิภาค",
    },
    products: {
      title: "แพ็กเกจ eSIM ทั่วโลก",
      subtitle: "เลือกแพ็กเกจ eSIM ที่เหมาะกับการเดินทางของคุณ",
      search: "ค้นหาแพ็กเกจ ประเทศ ภูมิภาค หรือ Product ID...",
      filterRegion: "ภูมิภาค",
      filterCountry: "ประเทศ",
      filterData: "ข้อมูล",
      sortBy: "เรียงตาม",
      sortPrice: "ราคา: ต่ำ-สูง",
      sortPriceDesc: "ราคา: สูง-ต่ำ",
      sortDuration: "ระยะเวลา",
      sortData: "ปริมาณข้อมูล",
      noResults: "ไม่พบแพ็กเกจที่ตรงกับเงื่อนไข",
      loading: "กำลังโหลด...",
      data: "ข้อมูล",
      validity: "ระยะเวลา",
      network: "เครือข่าย",
      hotspot: "ฮอตสปอต",
      voice: "เสียง",
      sms: "SMS",
      buyNow: "ซื้อเลย",
      addToCart: "เพิ่มในตะกร้า",
      viewDetails: "ดูรายละเอียด",
      allCountries: "ทุกประเทศ",
      allData: "ทุกปริมาณข้อมูล",
      topupOnlyNote: "นี่คือแพ็กเกจเติมข้อมูล กรุณาเติมข้อมูลจากหน้าคำสั่งซื้อ",
      results: "แพ็กเกจ",
      perDay: "ต่อวัน",
      filterDuration: "ระยะเวลา",
      allDuration: "ทุกระยะเวลา",
    },
    productDetail: {
      overview: "ภาพรวมแพ็กเกจ",
      countries: "ครอบคลุม",
      features: "คุณสมบัติ",
      howToUse: "วิธีใช้",
      dataAmount: "ข้อมูล",
      validity: "ระยะเวลา",
      network: "ประเภทเครือข่าย",
      activation: "การเปิดใช้งาน",
      hotspot: "ฮอตสปอต",
      voice: "การโทร",
      sms: "SMS",
      speed: "ความเร็ว",
      profile: "ประเภทโปรไฟล์",
      local: "ในประเทศ",
      roaming: "โรมมิ่ง",
      unrestricted: "ไม่จำกัดความเร็ว",
      restricted: "จำกัดความเร็ว",
      available: "รองรับ",
      notAvailable: "ไม่รองรับ",
      addToCart: "เพิ่มในตะกร้า",
      buyNow: "ซื้อเลย",
      selectDate: "เลือกวันเริ่มต้น",
      startDate: "วันเริ่มต้น",
      qty: "จำนวน",
      total: "รวม",
      supportedCountries: "ประเทศที่รองรับ",
      planInfoNote: "(คำอธิบายต้นฉบับจากผู้ให้บริการ)",
      tabOverview: "ภาพรวม",
      tabCoverage: "ครอบคลุม",
      tabHowToUse: "คู่มือการติดตั้ง",
      coverageCountry: "ประเทศ",
      coverageOperator: "ผู้ให้บริการ",
      coverageNetwork: "เครือข่าย",
      coverageApn: "APN",
      coverageSearch: "ค้นหาปลายทาง…",
      coverageNoResults: "ไม่พบประเทศที่ตรงกัน",
    },
    cart: {
      title: "ตะกร้าสินค้า",
      empty: "ตะกร้าว่างเปล่า",
      emptyDesc: "เลือกดูแพ็กเกจ eSIM และเริ่มต้นการเดินทาง",
      browsePlans: "ดูแพ็กเกจ",
      remove: "ลบ",
      qty: "จำนวน",
      subtotal: "ยอดรวมย่อย",
      total: "ยอดรวม",
      checkout: "ชำระเงิน",
      continueShopping: "ซื้อต่อ",
      item: "รายการ",
      items: "รายการ",
    },
    checkout: {
      title: "ชำระเงิน",
      processing: "กำลังดำเนินการ...",
      success: "ชำระเงินสำเร็จ!",
      successDesc: "ยืนยันคำสั่งซื้อ eSIM แล้ว ไปที่คำสั่งซื้อเพื่อดู QR Code",
      failed: "ชำระเงินไม่สำเร็จ",
      failedDesc: "ไม่สามารถชำระเงินได้ กรุณาลองใหม่หรือติดต่อฝ่ายสนับสนุน",
      viewOrders: "ดูคำสั่งซื้อ",
      tryAgain: "ลองใหม่",
      loginRequired: "กรุณาเข้าสู่ระบบ",
      loginRequiredDesc: "คุณต้องเข้าสู่ระบบเพื่อทำการซื้อ",
      redirecting: "กำลังไปยังหน้าชำระเงิน...",
      securePayment: "ชำระเงินปลอดภัยด้วย Stripe",
    },
    orders: {
      title: "คำสั่งซื้อของฉัน",
      empty: "ยังไม่มีคำสั่งซื้อ",
      emptyDesc: "คุณยังไม่ได้ซื้อแพ็กเกจ eSIM",
      orderId: "หมายเลขคำสั่งซื้อ",
      product: "แพ็กเกจ",
      amount: "จำนวนเงิน",
      status: "สถานะ",
      date: "วันที่",
      viewEsim: "ดู eSIM",
      topUp: "เติมข้อมูล",
      checkUsage: "ตรวจสอบการใช้งาน",
      pending: "รอชำระเงิน",
      paid: "ชำระแล้ว",
      processing: "กำลังดำเนินการ",
      completed: "เสร็จสิ้น",
      failed: "ล้มเหลว",
      refunded: "คืนเงินแล้ว",
      qrCode: "QR Code eSIM",
      activationCode: "รหัสเปิดใช้งาน",
      copyCode: "คัดลอก",
      copied: "คัดลอกแล้ว",
      usageTitle: "การใช้งานข้อมูล",
      used: "ใช้แล้ว",
      remaining: "เหลือ",
      total: "ทั้งหมด",
      expires: "หมดอายุ",
      usageLoading: "กำลังโหลดข้อมูลการใช้งาน...",
      usageNotAvailable: "ไม่มีข้อมูลการใช้งาน",
      usageRealtime: "เรียลไทม์",
      usageUpdated: "อัปเดตแล้ว",
      usagePercentUsed: "ใช้แล้ว",
      statusActive: "กำลังใช้งาน",
      statusExpired: "หมดอายุ",
      statusNotActivated: "ยังไม่เปิดใช้งาน",
      statusQueued: "เติมข้อมูลรอดำเนินการ",
      statusUnused: "ยังไม่ใช้",
      statusDataDepleted: "ข้อมูลหมด",
      statusTerminated: "ยกเลิกแล้ว",
      statusTerminatedSwitched: "ยกเลิกแล้ว (สลับไปเติม)",
      terminatedTopupNote: "แผนหลักถูกยกเลิกแล้ว คุณมี {count} แพ็กเกจเติมข้อมูล พร้อมใช้งานทันที",
      topupDataDepletedNote: "แพ็กเกจหลักหมดแล้ว คุณมี {count} แพ็กเกจเติมข้อมูลรอดำเนินการ จะเปิดใช้งานอัตโนมัติเมื่อผู้ให้บริการยืนยัน",
      parentOrderLabel: "คำสั่งซื้อหลัก",
      usageRefresh: "รีเฟรชการใช้งาน",
      coverage: "ครอบคลุม",
      expiryDate: "วันหมดอายุ",
      validity: "ระยะเวลา",
      validityHint: "นับจากวันเปิดใช้งาน",
      topupIncluded: "รวมเติมข้อมูล +{amount}",
      topupQueuedNote: "คุณมีแพ็กเกจเติมข้อมูลรอดำเนินการ จะเปิดใช้งานอัตโนมัติเมื่อข้อมูลแพ็กเกจปัจจุบันหมด",
      mainCard: "การ์ดหลัก",
      shareLpa: "แชร์ eSIM",
      shareEsim: "แชร์ให้เพื่อนร่วมเดินทาง",
      shareTitle: "ข้อมูลการติดตั้ง eSIM",
      shareText: "รหัสเปิดใช้งาน eSIM ของฉัน: ",
      copyLpa: "คัดลอก LPA String",
      iosInstall: "ติดตั้งบน iPhone",
      iosInstallNote: "ต้องใช้ iOS 17.4 ขึ้นไป",
      buyAgain: "ซื้ออีกครั้ง",
      pushTitle: "เปิดใช้การแจ้งเตือน",
      pushDesc: "รับแจ้งเตือนอัปเดตคำสั่งซื้อและโปรโมชั่นทันที",
      pushEnable: "เปิดใช้งาน",
      pushEnabled: "เปิดใช้การแจ้งเตือนแล้ว",
      pushUnsubscribe: "ยกเลิกการสมัคร",
      pushProcessing: "กำลังดำเนินการ...",
      pushSuccessToast: "เปิดใช้การแจ้งเตือนแล้ว!",
      pushErrorPermission: "โปรดอนุญาตสิทธิ์การแจ้งเตือน",
      pushErrorFailed: "สมัครไม่สำเร็จ โปรดลองใหม่ภายหลัง",
      pushDisabledToast: "ปิดการแจ้งเตือนแล้ว",
      pushDisabledError: "ยกเลิกการสมัครไม่สำเร็จ",
      filterAll: "ทั้งหมด",
      filterPending: "รอชำระเงิน",
      filterProcessing: "ยังไม่สมบูรณ์",
      filterCompleted: "สำเร็จ",
      filterFailed: "ล้มเหลว",
      filterUnused: "ยังไม่ใช้",
      filterInUse: "กำลังใช้งาน",
      filterExpired: "หมดอายุแล้ว",
      continuePayment: "ชำระเงินต่อ",
      tgtCheckStatus: "ตรวจสอบสถานะ",
      tgtStatusTitle: "สถานะ eSIM",
      tgtOrderStatus: "สถานะคำสั่งซื้อ",
      tgtProfileStatus: "สถานะโปรไฟล์",
      tgtActivatedStart: "เริ่มใช้งาน",
      tgtActivatedEnd: "วันหมดอายุ",
      tgtIccid: "ICCID",
      tgtUsageTitle: "การใช้งานแบบเรียลไทม์",
      tgtDataTotal: "ข้อมูลทั้งหมด",
      tgtDataUsage: "ใช้แล้ว",
      tgtDataResidual: "คงเหลือ",
      tgtUsageNotSupported: "แผนนี้ไม่รองรับการตรวจสอบการใช้งานแบบเรียลไทม์",
      tgtNotFound: "ไม่พบข้อมูลคำสั่งซื้อ โปรดลองใหม่ภายหลัง",
      tgtStatusNOTACTIVE: "ยังไม่เปิดใช้งาน",
      tgtStatusACTIVATED: "ดาวน์โหลดแล้ว",
      tgtStatusINUSE: "กำลังใช้งาน",
      tgtStatusUSED: "ใช้แล้ว",
      tgtStatusEXPIRED: "หมดอายุ",
      tgtStatusABANDON: "ยกเลิกแล้ว",
      tgtStatusTERMINATION: "สิ้นสุดแล้ว",
      tgtStatusNODOWNLOAD: "ยังไม่ได้ดาวน์โหลด",
      tgtStatusDELETED: "หมดอายุแล้ว",
      tgtHighSpeedLimit: "ขีดจำกัดความเร็วสูง",
      tgtThrottled: "ลดความเร็วแล้ว",
      tgtThrottledNote: "ใช้ข้อมูลความเร็วสูงหมดแล้ว กำลังใช้งานด้วยความเร็วต่ำ",
    },
    topup: {
      title: "เติมข้อมูล",
      availablePlans: "แพ็กเกจเติมข้อมูลที่มีให้",
      noPlans: "ไม่มีแพ็กเกจเติมข้อมูล",
      purchase: "ซื้อแพ็กเกจเติมข้อมูล",
      confirm: "ยืนยันการเติมข้อมูล",
      success: "เติมข้อมูลสำเร็จ",
      failed: "เติมข้อมูลไม่สำเร็จ",
      canTopUp: "เติมข้อมูลได้",
      noTopupSuggest: "แพ็กเกจนี้ไม่รองรับการเติมข้อมูล เมื่อข้อมูลใกล้หมด ลองพิจารณาแพ็กเกจที่คล้ายกัน:",
      similarPlans: "แพ็กเกจที่คล้ายกัน",
      buyAgain: "ซื้อเลย",
      redirecting: "กำลังไปยังหน้าชำระเงิน...",
      history: "ประวัติการเติมข้อมูล",
      historyEmpty: "ยังไม่มีประวัติการเติมข้อมูล",
      topupSuccess: "เติมข้อมูลสำเร็จ! เพิ่มข้อมูลแล้ว กำลังอัปเดต...",
      statusPending: "รอชำระเงิน",
      statusPaid: "ชำระแล้ว",
      statusCompleted: "เสร็จสิ้น",
      statusFailed: "ล้มเหลว",
      validityNote: "การเติมข้อมูลเพิ่มเฉพาะข้อมูลเท่านั้น ระยะเวลาเป็นไปตามแพ็กเกจเติมข้อมูลนั้น ไม่ได้ต่ออายุแพ็กเกจเดิม",
      mainCardActive: "การ์ดหลักกำลังใช้งาน",
      mainCardExpired: "การ์ดหลักหมดอายุ",
      mainCardExpiredNote: "การ์ดหลักหมดอายุแล้ว ข้อมูลจากการเติมนี้ก็หมดอายุตามไปด้วย",
      usageLabel: "การใช้งานข้อมูลที่เติม",
    },
    auth: {
      loginTitle: "เข้าสู่ระบบ SIM uncle",
      loginDesc: "เข้าสู่ระบบเพื่อซื้อและจัดการแพ็กเกจ eSIM",
      loginBtn: "เข้าสู่ระบบด้วย Manus",
      logoutSuccess: "ออกจากระบบสำเร็จ",
      welcome: "ยินดีต้อนรับกลับ",
    },
    common: {
      loading: "กำลังโหลด...",
      error: "เกิดข้อผิดพลาด",
      retry: "ลองใหม่",
      close: "ปิด",
      confirm: "ยืนยัน",
      cancel: "ยกเลิก",
      save: "บันทึก",
      edit: "แก้ไข",
      delete: "ลบ",
      back: "กลับ",
      next: "ถัดไป",
      submit: "ส่ง",
      hkd: "HKD",
      gb: "GB",
      mb: "MB",
      days: "วัน",
      day: "วัน",
      yes: "ใช่",
      no: "ไม่",
      comingSoon: "เร็วๆ นี้",
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** Detect the best matching language from the browser's language settings */
function detectBrowserLanguage(): Language {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const l = lang.toLowerCase();
    if (l === "zh-tw" || l === "zh-hk" || l === "zh-mo") return "zh-TW";
    if (l.startsWith("zh")) return "zh-CN";
    if (l.startsWith("ja")) return "ja";
    if (l.startsWith("ko")) return "ko";
    if (l.startsWith("th")) return "th";
    if (l.startsWith("en")) return "en";
  }
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("esim-uncle-lang");
    if (saved === "zh-TW" || saved === "zh-CN" || saved === "en" || saved === "ja" || saved === "ko" || saved === "th") {
      return saved as Language;
    }
    // Auto-detect from browser language on first visit
    return detectBrowserLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("esim-uncle-lang", lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
