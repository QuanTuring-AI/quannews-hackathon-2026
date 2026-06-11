// ==========================================
// 💳 付款控制器 (Payment Controller)
// ==========================================
// 職責：付款頁面產生、藍新回呼處理、自動升級 VIP
// 依賴：newebpay.service.js, sheets.service.js, line.service.js

// ==========================================
// 🌐 doGet 路由處理
// ==========================================

/**
 * 處理付款相關的 GET 請求
 *
 * @param {Object} params - URL 參數 (e.parameter)
 * @returns {HtmlService.HtmlOutput} HTML 頁面
 */
function handlePaymentRoute(params) {
  var action = params.action || "";

  switch (action) {
    case "pay":
      return handlePaymentPage(params);
    case "return":
      return handlePaymentReturn(params);
    default:
      return HtmlService.createHtmlOutput("<h1>404</h1><p>頁面不存在</p>");
  }
}

// ==========================================
// 📄 付款頁面（自動提交到藍新）
// ==========================================

/**
 * 產生付款跳轉頁面
 *
 * 流程：用戶點 LINE 按鈕 → 開啟此頁 → 自動 submit 到藍新 → 用戶看到藍新付款頁
 *
 * @param {Object} params - { userId, plan }
 * @returns {HtmlService.HtmlOutput}
 */
function handlePaymentPage(params) {
  _initConfig();

  var userId = params.userId || "";

  if (!userId) {
    return HtmlService.createHtmlOutput(
      "<h2>錯誤</h2><p>缺少用戶資訊，請從 LINE 重新點擊訂閱按鈕。</p>"
    );
  }

  // 檢查用戶是否存在
  var user = findUser(userId);
  if (!user) {
    return HtmlService.createHtmlOutput(
      "<h2>錯誤</h2><p>找不到用戶資料，請先加入量識Q報 LINE 好友。</p>"
    );
  }

  // Admin 永遠可以進入付款頁（測試用）
  // VIP 用戶：允許續訂（付款後會從現有到期日延期 30 天）

  // 產生訂單
  var orderNo = generateOrderNo(userId);
  var displayName = user["Display Name"] || "用戶";

  // 記錄訂單到 Sheet（狀態：Pending）
  appendPaymentRecord({
    date: new Date(),
    userId: userId,
    displayName: displayName,
    orderNo: orderNo,
    amount: VIP_PRICE,
    status: "Pending",
    periodNo: 0,
    nextChargeDate: "",
    tradeNo: "",
    rawData: ""
  });

  // 建立藍新付款參數
  var paymentData = buildPeriodPaymentData({
    userId: userId,
    email: "",
    orderNo: orderNo
  });

  console.log("💳 付款頁面產生: " + orderNo + " (" + displayName + ")");

  // 產生自動提交的 HTML 表單
  var html = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><base target="_top"><title>量識Q報 VIP 訂閱</title>' +
    '<style>' +
    'body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }' +
    '.loading { text-align: center; }' +
    '.spinner { border: 4px solid #eee; border-top: 4px solid #1565C0; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; }' +
    '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
    '</style></head><body>' +
    '<div class="loading">' +
    '<div class="spinner"></div>' +
    '<p>正在跳轉至付款頁面...</p>' +
    '<p style="color:#999;font-size:12px;">量識Q報 VIP 月訂閱 NT$' + VIP_PRICE + '</p>' +
    '</div>' +
    '<form id="payForm" method="post" action="' + paymentData.apiUrl + '" target="_top">' +
    '<input type="hidden" name="MerchantID_" value="' + paymentData.MerchantID_ + '">' +
    '<input type="hidden" name="PostData_" value="' + paymentData.PostData_ + '">' +
    '<input type="hidden" name="PostData_SHA" value="' + paymentData.PostData_SHA + '">' +
    '</form>' +
    '<script>document.getElementById("payForm").submit();</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("量識Q報 VIP 訂閱")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// ✅ 付款完成頁面
// ==========================================

/**
 * 付款完成後的感謝頁面（ReturnURL）
 *
 * @param {Object} params - URL 參數
 * @returns {HtmlService.HtmlOutput}
 */
function handlePaymentReturn(params) {
  var html = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><title>付款完成</title>' +
    '<style>' +
    'body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }' +
    '.done { text-align: center; max-width: 400px; }' +
    '.check { font-size: 64px; }' +
    '</style></head><body>' +
    '<div class="done">' +
    '<div class="check">✅</div>' +
    '<h2>感謝訂閱量識Q報 VIP！</h2>' +
    '<p>付款處理中，完成後會透過 LINE 通知您。</p>' +
    '<p style="color:#999;font-size:14px;">您可以關閉此頁面，回到 LINE 繼續使用。</p>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("付款完成 - 量識Q報");
}

// ==========================================
// 📨 藍新回呼處理（doPost 路由）
// ==========================================

/**
 * 處理藍新付款回呼（NotifyURL）
 *
 * 藍新 POST 加密的交易結果到此函式
 *
 * @param {Object} e - GAS event object
 * @returns {ContentService.TextOutput} 200 OK
 */
function handlePaymentNotify(e) {
  _initConfig();

  try {
    var body = e.postData.contents;
    var formData = parseFormBody(body);

    console.log("💳 收到藍新回呼: MerchantID=" + (formData.MerchantID_ || formData.MerchantID || "?"));

    // 取得加密資料
    var tradeInfo = formData.Period || formData.TradeInfo || "";
    var tradeSha = formData.TradeSha || "";

    if (!tradeInfo) {
      console.error("❌ 回呼缺少 TradeInfo/Period");
      return _okResponse();
    }

    // 驗證 SHA（如果有提供）
    if (tradeSha && !verifyPaymentCallback(tradeInfo, tradeSha)) {
      console.error("❌ SHA 驗證失敗，可能是偽造的回呼");
      return _okResponse();
    }

    // 解密交易資料
    var tradeData = decryptTradeInfo(tradeInfo);
    console.log("💳 交易結果: " + JSON.stringify(tradeData));

    // 處理結果
    var result = tradeData.Result || tradeData;
    var status = tradeData.Status || "";
    var merchantOrderNo = result.MerOrderNo || result.MerchantOrderNo || "";
    var tradeNo = result.TradeNo || "";
    var amount = result.PeriodAmt || result.Amt || 0;
    var periodNo = result.AlreadyTimes || result.PeriodNo || 1;

    if (status === "SUCCESS" || status === "COMMITTED") {
      console.log("✅ 付款成功: " + merchantOrderNo + " (第 " + periodNo + " 期)");
      _handlePaymentSuccess(merchantOrderNo, tradeNo, amount, periodNo, tradeData);
    } else {
      console.error("❌ 付款失敗: " + status + " - " + (tradeData.Message || ""));
      _handlePaymentFailure(merchantOrderNo, status, tradeData);
    }

  } catch (error) {
    console.error("❌ 處理藍新回呼錯誤: " + error.message);
  }

  return _okResponse();
}

/**
 * 處理付款成功
 */
function _handlePaymentSuccess(orderNo, tradeNo, amount, periodNo, rawData) {
  // 從訂單編號反查 userId（格式：QN + 日期 + userId 後 6 碼）
  // 或從 Payments Sheet 中找到 Pending 的訂單
  var paymentRecord = findPaymentByOrderNo(orderNo);

  if (!paymentRecord) {
    console.error("❌ 找不到訂單: " + orderNo);
    return;
  }

  var userId = paymentRecord.userId;
  var displayName = paymentRecord.displayName;

  // 更新 Payments Sheet
  var nextCharge = new Date();
  nextCharge.setDate(nextCharge.getDate() + 30);
  var nextChargeStr = Utilities.formatDate(nextCharge, "GMT+8", "yyyy-MM-dd");

  updatePaymentRecord(paymentRecord.rowNumber, {
    'F': "SUCCESS",
    'G': periodNo,
    'H': nextChargeStr,
    'I': tradeNo,
    'J': JSON.stringify(rawData)
  });

  // 升級用戶為 VIP（延期 30 天）
  var user = findUser(userId);
  if (user) {
    var newExpiry = new Date();
    // 如果已是 VIP 且未過期，從現有到期日延期
    if (user["Status"] === "VIP" && user["Expiry Date"]) {
      var currentExpiry = new Date(user["Expiry Date"]);
      if (currentExpiry > new Date()) {
        newExpiry = currentExpiry;
      }
    }
    newExpiry.setDate(newExpiry.getDate() + 30);

    upsertUser({
      userId: userId,
      displayName: displayName,
      status: "VIP",
      expiryDate: newExpiry
    });

    console.log("✅ 用戶升級 VIP: " + displayName + " (到期: " + Utilities.formatDate(newExpiry, "GMT+8", "yyyy-MM-dd") + ")");
  }

  // LINE 推播確認
  try {
    var expiryStr = Utilities.formatDate(newExpiry, "GMT+8", "yyyy/MM/dd");
    pushLineTextMessage(userId,
      "🎉 VIP 訂閱成功！\n\n" +
      "💎 方案：量識Q報 VIP 月訂閱\n" +
      "💰 金額：NT$ " + amount + "\n" +
      "📅 到期日：" + expiryStr + "\n" +
      "🔄 下次扣款：" + nextChargeStr + "\n\n" +
      "感謝您的支持！電路貓已為您開啟完整功能 🐱✨"
    );
  } catch (e) {
    console.error("⚠️ LINE 推播失敗: " + e.message);
  }
}

/**
 * 處理付款失敗
 */
function _handlePaymentFailure(orderNo, status, rawData) {
  var paymentRecord = findPaymentByOrderNo(orderNo);

  if (paymentRecord) {
    updatePaymentRecord(paymentRecord.rowNumber, {
      'F': "FAIL: " + status,
      'J': JSON.stringify(rawData)
    });

    // 如果是續約失敗，通知用戶
    var userId = paymentRecord.userId;
    try {
      pushLineTextMessage(userId,
        "⚠️ VIP 訂閱扣款失敗\n\n" +
        "可能原因：信用卡額度不足或已過期\n" +
        "請更新付款資訊，避免 VIP 權益中斷。\n\n" +
        "回覆「VIP」重新訂閱"
      );
    } catch (e) {
      console.error("⚠️ 通知用戶失敗: " + e.message);
    }
  }
}

/**
 * 回傳 200 OK（藍新要求）
 */
function _okResponse() {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ==========================================
// 🧪 測試函式
// ==========================================

/**
 * 測試付款頁面產生（不實際付款）
 */
function testPaymentPage() {
  _initConfig();
  console.log("🧪 測試付款頁面...\n");

  var result = handlePaymentPage({ userId: ADMIN_ID, plan: "monthly" });
  var content = result.getContent();

  console.log("📄 頁面長度: " + content.length + " 字元");
  console.log("🔍 包含表單: " + (content.indexOf("payForm") !== -1 ? "✅" : "❌"));
  console.log("🔍 包含 MerchantID: " + (content.indexOf(NEWEBPAY_MERCHANT_ID) !== -1 ? "✅" : "❌"));

  console.log("\n✅ 付款頁面測試完成！");
}
