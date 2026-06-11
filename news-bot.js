// ==========================================
// 🚀 Quanturing Auto-News Pipeline V2.0
// ==========================================
// 極簡版：只保留配置管理 + 關鍵轉接 + 診斷功能
// 實際業務邏輯已完全模組化至 src/controllers/ 和 src/services/

// ==========================================
// 🔧 配置管理
// ==========================================

var _configCache = {};

function _getConfig(key) {
  if (!_configCache[key]) {
    _configCache[key] = Config.get(key);
  }
  return _configCache[key];
}

// 配置變數宣告
var FOLDER_ID, OUTPUT_FOLDER_ID, SLIDE_FOLDER_ID, PDF_FOLDER_ID, LOGO_IMAGE_ID, SCANNED_FOLDER_ID;
var VIP_UPLOAD_FOLDER_ID, VIP_SCANNED_FOLDER_ID;
var SHEET_NAME, USERS_SHEET_NAME;
var GEMINI_API_KEY, JSON_KEY_FILE_ID, LINE_ACCESS_TOKEN, ADMIN_ID;
var GCP_PROJECT_ID, LOCATION;
var NEWEBPAY_MERCHANT_ID, NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV;
var VIP_PRICE, VIP_TRIAL_DAYS;

/**
 * 🔧 初始化所有設定常數
 */
function _initConfig() {
  if (FOLDER_ID) return; // 已初始化，跳過
  
  // Google Drive 資料夾
  FOLDER_ID = _getConfig('FOLDER_ID');
  OUTPUT_FOLDER_ID = _getConfig('OUTPUT_FOLDER_ID');
  SLIDE_FOLDER_ID = _getConfig('SLIDE_FOLDER_ID');
  PDF_FOLDER_ID = _getConfig('PDF_FOLDER_ID');
  LOGO_IMAGE_ID = _getConfig('LOGO_IMAGE_ID');
  SCANNED_FOLDER_ID = _getConfig('SCANNED_FOLDER_ID');
  VIP_UPLOAD_FOLDER_ID = _getConfig('VIP_UPLOAD_FOLDER_ID');
  VIP_SCANNED_FOLDER_ID = _getConfig('VIP_SCANNED_FOLDER_ID');

  // Google Sheets
  SHEET_NAME = _getConfig('SHEET_NAME');
  USERS_SHEET_NAME = _getConfig('USERS_SHEET_NAME');
  
  // 敏感資訊
  GEMINI_API_KEY = _getConfig('GEMINI_API_KEY');
  JSON_KEY_FILE_ID = _getConfig('JSON_KEY_FILE_ID');
  LINE_ACCESS_TOKEN = _getConfig('LINE_ACCESS_TOKEN');
  ADMIN_ID = _getConfig('ADMIN_ID');
  
  // GCP 設定
  GCP_PROJECT_ID = _getConfig('GCP_PROJECT_ID');
  LOCATION = _getConfig('LOCATION');
  
  // 金流設定
  NEWEBPAY_MERCHANT_ID = _getConfig('NEWEBPAY_MERCHANT_ID');
  NEWEBPAY_HASH_KEY = _getConfig('NEWEBPAY_HASH_KEY');
  NEWEBPAY_HASH_IV = _getConfig('NEWEBPAY_HASH_IV');
  
  // VIP 設定
  VIP_PRICE = _getConfig('VIP_PRICE');
  VIP_TRIAL_DAYS = _getConfig('VIP_TRIAL_DAYS');
}

// ==========================================
// 🎯 關鍵轉接層（向後兼容）
// ==========================================

/**
 * 日常生產 Pipeline（轉接層）
 * @deprecated 實際邏輯在 pipeline.controller.js
 */
function runFullPipeline() {
  return runProductionPipeline();
}

/**
 * POST 入口（路由器）
 *
 * 自動判斷來源：
 * - LINE webhook（包含 events）→ handleLineWebhook
 * - 藍新金流回呼（包含 MerchantID + TradeInfo/Period）→ handlePaymentNotify
 */
function doPost(e) {
  try {
    var body = e.postData ? e.postData.contents : "";

    // 藍新回呼：包含 MerchantID_ 或 Period
    if (body && (body.indexOf("MerchantID_") !== -1 || body.indexOf("Period") !== -1)) {
      console.log("💳 路由 → 藍新金流回呼");
      return handlePaymentNotify(e);
    }

    // 預設：LINE webhook
    return handleLineWebhook(e);
  } catch (error) {
    console.error("❌ doPost 路由錯誤: " + error.message);
    return ContentService.createTextOutput(JSON.stringify({ status: "error" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET 入口（付款頁面）
 *
 * URL 參數：
 * - ?action=pay&userId=xxx → 付款跳轉頁
 * - ?action=return → 付款完成感謝頁
 */
function doGet(e) {
  _initConfig();
  return handlePaymentRoute(e.parameter || {});
}

// ==========================================
// 🇺🇸 美股快訊排程入口
// ==========================================

/**
 * 🇺🇸 美股快訊 Pipeline（GAS Trigger 用）
 * 排程建議：每天 AM 7:00
 * 實際邏輯在 us-stock-flash.controller.js
 */
function runUSStockFlash() {
  _initConfig();
  try {
    return runUSStockFlashPipeline();
  } catch (e) {
    console.error("❌ 美股快訊 Pipeline 異常: " + e.message);
    try { pushLineTextMessage(ADMIN_ID, "❌ 美股快訊 Pipeline 失敗\n" + e.message); } catch (_) {}
    throw e;
  }
}

/**
 * 🇺🇸 美股快訊派送（GAS Trigger 用）
 * 排程建議：每天 AM 8:00
 * 實際邏輯在 us-stock-flash.controller.js
 */
function sendUSStockFlash() {
  _initConfig();
  try {
    return broadcastUSStockFlash();
  } catch (e) {
    console.error("❌ 美股快訊派送異常: " + e.message);
    try { pushLineTextMessage(ADMIN_ID, "❌ 美股快訊派送失敗\n" + e.message); } catch (_) {}
    throw e;
  }
}

// ==========================================
// 🔍 整體診斷功能
// ==========================================

/**
 * 🔍 系統診斷
 * 
 * 檢查所有模組是否正常運作
 */
function runDiagnostics() {
  _initConfig();
  
  console.log("🔍 ==========================================");
  console.log("🔍 系統診斷");
  console.log("🔍 ==========================================\n");
  
  const results = {
    config: false,
    services: {},
    controllers: {},
    overall: true
  };
  
  try {
    // 1. 檢查配置
    console.log("1️⃣ 檢查配置...");
    results.config = GEMINI_API_KEY && LINE_ACCESS_TOKEN && ADMIN_ID;
    console.log(`   配置: ${results.config ? "✅" : "❌"}\n`);
    
    // 2. 檢查服務層
    console.log("2️⃣ 檢查服務層...");
    const services = [
      { name: 'Vertex AI', func: 'callVertexAI' },
      { name: 'Gemini Core', func: 'callGeminiWithRetry' },
      { name: 'News Analyzer', func: 'analyzeNews' },
      { name: 'Circuit Cat', func: 'circuitCatChat' },
      { name: 'LINE', func: 'getLineUserProfile' },
      { name: 'Sheets', func: 'getNewsSheet' },
      { name: 'Drive', func: 'extractPdfText' },
      { name: 'Imagen', func: 'generateImage' },
      { name: 'Slides', func: 'createNewsPresentation' },
      { name: 'RSS Fetcher', func: 'fetchAllRSSFeeds' },
      { name: 'NewebPay', func: 'aesEncrypt' }
    ];

    services.forEach(service => {
      const exists = typeof eval(service.func) === 'function';
      results.services[service.name] = exists;
      console.log(`   ${service.name}: ${exists ? "✅" : "❌"}`);
      if (!exists) results.overall = false;
    });

    // 3. 檢查控制器
    console.log("\n3️⃣ 檢查控制器...");
    const controllers = [
      { name: 'Pipeline', func: 'runProductionPipeline' },
      { name: 'Broadcaster', func: 'runMorningBroadcast' },
      { name: 'Onboarding', func: 'sendWelcomePackage' },
      { name: 'Webhook', func: 'handleLineWebhook' },
      { name: 'US Stock Flash', func: 'runUSStockFlashPipeline' },
      { name: 'Payment', func: 'handlePaymentNotify' }
    ];
    
    controllers.forEach(controller => {
      const exists = typeof eval(controller.func) === 'function';
      results.controllers[controller.name] = exists;
      console.log(`   ${controller.name}: ${exists ? "✅" : "❌"}`);
      if (!exists) results.overall = false;
    });
    
    // 4. 總結
    console.log("\n" + "=".repeat(50));
    if (results.overall) {
      console.log("✅ 系統狀態：正常");
    } else {
      console.log("⚠️  系統狀態：部分模組異常");
    }
    console.log("=".repeat(50) + "\n");
    
    return results;
    
  } catch (e) {
    console.error("❌ 診斷失敗:", e.message);
    results.overall = false;
    return results;
  }
}

/**
 * 🧪 執行完整測試套件
 * 
 * 註：quickHealthCheck() 已移至 src/utils/test-suite.js
 */
function runAllTests() {
  console.log("🧪 執行完整測試套件\n");
  
  // 執行診斷
  runDiagnostics();
  
  // 執行測試套件
  runFullTestSuite();
  
  console.log("\n✅ 所有測試完成");
}
