// ==========================================
// 💳 藍新金流服務 (NewebPay Service)
// ==========================================
// 職責：AES-256-CBC 加解密、定期定額參數組裝、回呼驗證
// 依賴：config.js（NEWEBPAY_MERCHANT_ID / HASH_KEY / HASH_IV）
//
// AES 加密使用 CryptoJS（從 CDN 載入，快取於 CacheService）

// ==========================================
// 🔐 CryptoJS 載入
// ==========================================

var _cryptoJSLoaded = false;

/**
 * 載入 CryptoJS（僅在首次呼叫時從 CDN 抓取）
 */
function _loadCryptoJS() {
  if (_cryptoJSLoaded) return;

  // 嘗試從 CacheService 讀取（6 小時有效）
  var cache = CacheService.getScriptCache();
  var cached = cache.get("cryptojs_lib");

  if (cached) {
    eval(cached);
  } else {
    var url = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";
    var content = UrlFetchApp.fetch(url).getContentText();
    eval(content);
    // CacheService 單一值上限 100KB，CryptoJS min ~50KB，可以存
    try {
      cache.put("cryptojs_lib", content, 21600); // 6 小時
    } catch (e) {
      console.warn("⚠️ CryptoJS 快取失敗（可能超過大小限制）: " + e.message);
    }
  }

  _cryptoJSLoaded = true;
}

// ==========================================
// 🔐 AES-256-CBC 加解密
// ==========================================

/**
 * AES-256-CBC 加密
 *
 * @param {string} plainText - 明文（URL query string 格式）
 * @param {string} key - 32 字元金鑰 (HashKey)
 * @param {string} iv - 16 字元初始向量 (HashIV)
 * @returns {string} Hex 編碼的密文
 */
function aesEncrypt(plainText, key, iv) {
  _loadCryptoJS();

  var keyWA = CryptoJS.enc.Utf8.parse(key);
  var ivWA = CryptoJS.enc.Utf8.parse(iv);

  var encrypted = CryptoJS.AES.encrypt(plainText, keyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

/**
 * AES-256-CBC 解密
 *
 * @param {string} hexCipherText - Hex 編碼的密文
 * @param {string} key - 32 字元金鑰
 * @param {string} iv - 16 字元初始向量
 * @returns {string} 解密後的明文
 */
function aesDecrypt(hexCipherText, key, iv) {
  _loadCryptoJS();

  var keyWA = CryptoJS.enc.Utf8.parse(key);
  var ivWA = CryptoJS.enc.Utf8.parse(iv);

  var cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(hexCipherText)
  });

  var decrypted = CryptoJS.AES.decrypt(cipherParams, keyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * 產生 TradeSha 驗證碼（SHA256）
 *
 * @param {string} tradeInfo - AES 加密後的 Hex 字串
 * @returns {string} SHA256 大寫 Hex
 */
function createTradeSha(tradeInfo) {
  _initConfig();
  var raw = "HashKey=" + NEWEBPAY_HASH_KEY + "&" + tradeInfo + "&HashIV=" + NEWEBPAY_HASH_IV;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var b = digest[i] & 0xFF;
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  return hex.toUpperCase();
}

// ==========================================
// 💰 定期定額參數組裝
// ==========================================

/**
 * 藍新定期定額 API URL
 */
var NEWEBPAY_PERIOD_URL = "https://core.newebpay.com/MPG/period";

/**
 * 建立定期定額付款參數
 *
 * @param {Object} orderData - { userId, email, orderNo }
 * @returns {Object} { MerchantID_, PostData_, PostData_SHA, apiUrl }
 */
function buildPeriodPaymentData(orderData) {
  _initConfig();

  var rawUrl = ScriptApp.getService().getUrl() || "";
  var webAppUrl = rawUrl.replace(/\/a\/[^/]+/, ""); // 移除 Workspace 網域路徑
  var timestamp = Math.floor(Date.now() / 1000);

  // 定期定額參數
  var params = [
    "RespondType=JSON",
    "TimeStamp=" + timestamp,
    "Version=1.0",
    "MerOrderNo=" + orderData.orderNo,
    "ProdDesc=" + encodeURIComponent("量識Q報 VIP 月訂閱"),
    "PeriodAmt=" + VIP_PRICE,
    "PeriodAmtMode=UPO",
    "PeriodType=M",
    "PeriodPoint=" + _getNextChargeDay(),
    "PeriodStartType=2",
    "PeriodTimes=99",
    "PayerEmail=" + (orderData.email || ""),
    "NotifyURL=" + encodeURIComponent(webAppUrl),
    "ReturnURL=" + encodeURIComponent(webAppUrl + "?action=return&userId=" + orderData.userId),
    "PaymentInfo=N",
    "OrderInfo=N"
  ].join("&");

  // AES 加密
  var postData = aesEncrypt(params, NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV);

  // SHA256 驗證碼
  var postDataSha = createTradeSha(postData);

  return {
    MerchantID_: NEWEBPAY_MERCHANT_ID,
    PostData_: postData,
    PostData_SHA: postDataSha,
    apiUrl: NEWEBPAY_PERIOD_URL
  };
}

/**
 * 產生唯一訂單編號
 *
 * @param {string} userId - LINE User ID
 * @returns {string} 訂單編號（格式：QN + 日期時間 + 短 ID）
 */
function generateOrderNo(userId) {
  var date = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMddHHmmss");
  var shortId = userId.substring(userId.length - 6);
  return "QN" + date + shortId;
}

// ==========================================
// 🔍 回呼驗證
// ==========================================

/**
 * 解密藍新回呼的 TradeInfo
 *
 * @param {string} tradeInfo - 加密的交易資訊（Hex）
 * @returns {Object} 解密後的 JSON 物件
 */
function decryptTradeInfo(tradeInfo) {
  _initConfig();
  var decrypted = aesDecrypt(tradeInfo, NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV);
  return JSON.parse(decrypted);
}

/**
 * 驗證藍新回呼合法性
 *
 * @param {string} tradeInfo - 加密的交易資訊
 * @param {string} tradeSha - SHA256 驗證碼
 * @returns {boolean} 是否合法
 */
function verifyPaymentCallback(tradeInfo, tradeSha) {
  var expectedSha = createTradeSha(tradeInfo);
  return expectedSha === tradeSha;
}

/**
 * 解析 form-urlencoded POST body
 *
 * @param {string} body - URL-encoded 字串
 * @returns {Object} 解析後的 key-value 物件
 */
function parseFormBody(body) {
  var result = {};
  var pairs = body.split("&");
  for (var i = 0; i < pairs.length; i++) {
    var kv = pairs[i].split("=");
    if (kv.length === 2) {
      result[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
  }
  return result;
}

// ==========================================
// 🔧 工具函式
// ==========================================

/**
 * 取得下次扣款日（每月幾號，最多 28 避免大小月問題）
 */
function _getNextChargeDay() {
  var day = new Date().getDate();
  return Math.min(day, 28).toString();
}

// ==========================================
// 🧪 測試函式
// ==========================================

/**
 * 測試 AES 加解密
 */
function testNewebPayCrypto() {
  _initConfig();
  console.log("🧪 測試藍新加解密...\n");

  var testData = "MerchantID=" + NEWEBPAY_MERCHANT_ID + "&TimeStamp=1234567890&Version=1.0";
  console.log("📝 原文: " + testData);

  var encrypted = aesEncrypt(testData, NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV);
  console.log("🔒 加密: " + encrypted.substring(0, 60) + "...");

  var decrypted = aesDecrypt(encrypted, NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV);
  console.log("🔓 解密: " + decrypted);

  var sha = createTradeSha(encrypted);
  console.log("🔑 SHA256: " + sha);

  var match = (testData === decrypted);
  console.log("\n" + (match ? "✅ 加解密測試通過！" : "❌ 加解密測試失敗！"));
  return match;
}

/**
 * 測試建立訂單參數
 */
function testBuildPaymentData() {
  _initConfig();
  console.log("🧪 測試建立付款參數...\n");

  var orderNo = generateOrderNo(ADMIN_ID);
  console.log("📝 訂單編號: " + orderNo);

  var data = buildPeriodPaymentData({
    userId: ADMIN_ID,
    email: "allen.chen@quanturing.ai",
    orderNo: orderNo
  });

  console.log("🏪 MerchantID: " + data.MerchantID_);
  console.log("🔒 PostData: " + data.PostData_.substring(0, 60) + "...");
  console.log("🔑 SHA: " + data.PostData_SHA);
  console.log("🌐 API URL: " + data.apiUrl);
  console.log("\n✅ 付款參數建立完成！");
}
