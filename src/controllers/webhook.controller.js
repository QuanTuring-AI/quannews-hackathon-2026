// ==========================================
// 🤖 Webhook 控制器 (Webhook Controller)
// ==========================================
// 职责：LINE Bot 事件处理、用户互动、反馈收集

/**
 * 🤖 LINE Webhook 主入口
 * 
 * 處理所有來自 LINE 的事件
 * 
 * @param {Object} e - Google Apps Script event object
 * @returns {HtmlService.HtmlOutput}
 */
/**
 * 🔒 Reply Token 去重緩存（防止 LINE 重試導致重複處理）
 *
 * 使用 CacheService + TTL 自動過期，免手動清理
 */
function isReplyTokenProcessed(replyToken) {
  var cache = CacheService.getScriptCache();
  var key = "rt_" + replyToken;

  if (cache.get(key)) {
    console.log("⚠️  Reply Token 已處理過，跳過: " + replyToken.substring(0, 20) + "...");
    return true;
  }

  // 標記為已處理，1800 秒（30 分鐘）後自動過期
  cache.put(key, "1", 1800);
  return false;
}

function handleLineWebhook(e) {
  _initConfig();
  
  try {
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events;
    
    if (!events || events.length === 0) {
      console.log("⚠️  沒有事件，立即返回");
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log(`📨 收到 ${events.length} 個事件`);
    
    // 處理每個事件（使用 Reply Token 去重）
    events.forEach(event => {
      console.log(`📨 事件類型: ${event.type}`);
      
      // ⭐ Reply Token 去重：防止 LINE 重試導致重複處理
      const replyToken = event.replyToken;
      if (replyToken && isReplyTokenProcessed(replyToken)) {
        console.log(`⏭️  跳過已處理的事件`);
        return; // 跳過此事件
      }
      
      try {
        switch (event.type) {
          case 'follow':
            handleFollowEvent(event);
            break;
            
          case 'message':
            handleMessageEvent(event);
            break;
            
          case 'unfollow':
            handleUnfollowEvent(event);
            break;
            
          case 'postback':
            handlePostbackEvent(event);
            break;
            
          default:
            console.log(`⚠️  未處理的事件類型: ${event.type}`);
        }
      } catch (error) {
        console.error(`❌ 處理事件失敗 (${event.type}):`, error.message);
        // 繼續處理其他事件，不中斷
      }
    });
    
    // ⭐ 立即返回 200 OK（不等待處理完成）
    console.log("✅ Webhook 處理完成，返回 200");
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("❌ Webhook 處理失敗:", error.message);
    console.error("Stack:", error.stack);
    
    // 即使錯誤也返回 200，避免 LINE 重試
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 👋 處理用戶關注事件
 * 
 * @param {Object} event - LINE follow event
 */
function handleFollowEvent(event) {
  const userId = event.source.userId;
  const timestamp = new Date(event.timestamp);
  
  console.log(`👋 新用戶關注: ${userId}`);
  
  // 記錄互動
  logUserInteraction(userId, 'follow', null, timestamp);
  
  // 發送新戶禮包
  sendWelcomePackage(userId);
}

/**
 * 💬 處理用戶訊息事件
 * 
 * @param {Object} event - LINE message event
 */
function handleMessageEvent(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const timestamp = new Date(event.timestamp);
  
  // 🆕 V3.0: 處理檔案訊息（VIP/Admin PDF 分析）
  if (event.message.type === 'file') {
    handleFileMessage(event);
    return;
  }

  // 非文字訊息：回覆提示
  if (event.message.type !== 'text') {
    console.log(`⚠️  不支援的訊息類型: ${event.message.type}`);
    try {
      sendLineReply(replyToken, "(歪頭) 喵～我目前只看得懂文字訊息喔！\n試著打字跟我聊天吧 🐱");
    } catch (e) {
      console.error(`❌ 回覆不支援類型失敗: ${e.message}`);
    }
    return;
  }

  const userMessage = event.message.text.trim();
  console.log(`💬 收到訊息: ${userMessage}`);
  
  // ⭐ 記錄對話（獲取行號供後續更新）
  const logRowNumber = logUserInteraction(userId, 'message', userMessage, timestamp);
  
  // 處理特殊關鍵字
  if (handleKeywordReply(replyToken, userId, userMessage)) {
    return;
  }
  
  // 檢查體力值（電路貓聊天配額）
  const quotaCheck = checkChatQuota(userId);
  
  if (!quotaCheck.allowed) {
    const replyText = 
      `(舔爪子) 今天的體力值用完了喵...\n\n` +
      `剩餘體力: ${quotaCheck.remaining}/${quotaCheck.daily}\n` +
      `重置時間: 明天凌晨 0:00\n\n` +
      `💎 升級 VIP 可獲得更多配額！`;
    
    sendLineReply(replyToken, replyText);
    return;
  }
  
  // 獲取用戶狀態
  const user = findUser(userId);
  const userStatus = user ? user["Status"] : "Free";
  console.log(`👤 用戶身份: ${userStatus}`);
  
  // ⭐ V3.0: RAG 增強聊天（依 Config 開關決定是否啟用）
  var ragEnabledRoles = JSON.parse(Config.get('V3_RAG_ENABLED_ROLES') || '[]');
  var useRAG = ragEnabledRoles.indexOf(userStatus) !== -1;

  var startTime = Date.now();
  var botReply;
  var ragUsed = false;

  if (useRAG) {
    try {
      var ragResult = circuitCatChatWithRAG(userMessage, userId, userStatus);
      botReply = ragResult.reply;
      ragUsed = ragResult.ragUsed;
      console.log("🔍 RAG 模式: " + (ragUsed ? "✅ 啟用 (" + ragResult.sourcesCount + " 篇)" : "❌ 未匹配"));
    } catch (e) {
      console.error("❌ 電路貓 RAG 聊天失敗: " + e.message);
      try {
        botReply = circuitCatChat(userMessage, userStatus);
      } catch (e2) {
        console.error("❌ 一般聊天也失敗: " + e2.message);
        botReply = "(抓頭) 喵...我剛剛好像當機了一下，可以再說一次嗎？";
      }
    }
  } else {
    try {
      botReply = circuitCatChat(userMessage, userStatus);
    } catch (e) {
      console.error("❌ 電路貓聊天失敗: " + e.message);
      botReply = "(抓頭) 喵...我剛剛好像當機了一下，可以再說一次嗎？";
    }
  }

  const responseTime = Date.now() - startTime;

  if (!botReply) {
    botReply = "(抓頭) 喵...我剛剛好像當機了一下，可以再說一次嗎？";
  }

  // ⭐ 先發送回覆（優先保證用戶體驗）
  try {
    sendLineReply(replyToken, botReply);
  } catch (e) {
    console.error(`❌ 發送 LINE 回覆失敗: ${e.message}`);
  }

  // ⭐ 非阻塞更新記錄（即使失敗也不影響回覆）
  if (logRowNumber > 0) {
    try {
      const sheet = getInteractionLogSheet();
      sheet.getRange(logRowNumber, 7).setValue(botReply.substring(0, 500)); // G: Bot Reply
      sheet.getRange(logRowNumber, 8).setValue(responseTime); // H: Response Time
      // I: 記錄是否使用 RAG
      sheet.getRange(logRowNumber, 9).setValue(ragUsed ? "RAG" : "");
      console.log(`✅ 互動記錄已更新 (Row ${logRowNumber}, RAG: ${ragUsed})`);
    } catch (e) {
      console.error(`⚠️ 更新回覆記錄失敗: ${e.message}`);
    }
  }
}

/**
 * 👋 處理用戶取消關注事件
 * 
 * @param {Object} event - LINE unfollow event
 */
function handleUnfollowEvent(event) {
  const userId = event.source.userId;
  const timestamp = new Date(event.timestamp);
  
  console.log(`👋 用户取消关注: ${userId}`);
  
  // 记录互动
  logUserInteraction(userId, 'unfollow', null, timestamp);
  
  // 可以在这里更新用户状态
  // 例如标记为 "Inactive"
}

/**
 * 🔘 處理 Postback 事件
 * 
 * 用於處理按鈕點擊、反饋等互動
 * 
 * @param {Object} event - LINE postback event
 */
function handlePostbackEvent(event) {
  const userId = event.source.userId;
  const data = event.postback.data;
  const timestamp = new Date(event.timestamp);
  
  console.log(`🔘 收到 Postback: ${data}`);
  
  // 解析 Postback 数据
  const params = parsePostbackData(data);
  
  // 记录互动
  logUserInteraction(userId, 'postback', data, timestamp);
  
  // 处理不同的 Postback 动作
  switch (params.action) {
    case 'like':
      handleLikeAction(userId, params.newsId);
      break;
      
    case 'dislike':
      handleDislikeAction(userId, params.newsId);
      break;
      
    case 'share':
      handleShareAction(userId, params.newsId);
      break;
      
    default:
      console.log(`⚠️  未知的 Postback 动作: ${params.action}`);
  }
}

/**
 * 🔑 處理關鍵字回覆
 * 
 * @param {string} replyToken - LINE reply token
 * @param {string} userId - 用户 ID
 * @param {string} message - 用户消息
 * @returns {boolean} 是否已处理
 */
function handleKeywordReply(replyToken, userId, message) {
  const lowerMsg = message.toLowerCase();
  
  // VIP 相關 — 純文字回覆 + 付款連結
  if (lowerMsg === "vip" || lowerMsg === "訂閱" || lowerMsg === "會員") {
    console.log("💎 [VIP] 觸發 VIP 關鍵字回覆");

    var vipText =
      "💎 VIP 會員方案\n\n" +
      "權益：\n" +
      "  • 每日 2 篇精選報告\n" +
      "  • 電路貓對話 20 次/天\n" +
      "  • PDF 上傳 AI 分析\n" +
      "  • 美股快訊搶先看\n\n" +
      "費用：NT$ " + VIP_PRICE + " / 月（自動續約）\n\n";

    try {
      var rawUrl = ScriptApp.getService().getUrl() || "";
      var webAppUrl = rawUrl.replace(/\/a\/[^/]+/, ""); // 移除 Workspace 網域路徑
      console.log("💳 Web App URL: " + rawUrl + " → " + webAppUrl);
      if (webAppUrl) {
        vipText += "👇 點擊訂閱：\n" + webAppUrl + "?action=pay&userId=" + userId;
      } else {
        vipText += "💬 想訂閱請聯繫管理員";
      }
    } catch (e) {
      console.error("⚠️ 取得 Web App URL 失敗: " + e.message);
      vipText += "💬 想訂閱請聯繫管理員";
    }

    sendLineReply(replyToken, vipText);
    return true;
  }
  
  // 幫助
  if (lowerMsg === "help" || lowerMsg === "幫助" || lowerMsg === "說明") {
    const user = findUser(userId);
    const status = user ? user["Status"] : "Free";
    const remaining = getRemainingQuota(userId);
    
    const replyText = 
      `🤖 電路貓使用說明\n\n` +
      `身份：${status}\n` +
      `剩餘體力：${remaining.chat}\n\n` +
      `💬 功能：\n` +
      `  • 直接問我市場問題\n` +
      `  • 回覆 "VIP" 了解會員方案\n` +
      `  • 回覆 "狀態" 查看配額\n\n` +
      `📰 每日會收到推薦報告\n` +
      `💎 VIP 可獲得更多配額`;
    
    sendLineReply(replyToken, replyText);
    return true;
  }
  
  // 查詢狀態
  if (lowerMsg === "狀態" || lowerMsg === "配額" || lowerMsg === "quota") {
    const user = findUser(userId);
    const status = user ? user["Status"] : "Free";
    const remaining = getRemainingQuota(userId);
    
    const replyText = 
      `📊 您的配額狀態\n\n` +
      `身份：${status}\n` +
      `電路貓對話：${remaining.chat}/${remaining.chatDaily}\n` +
      `新聞報告：每日 ${status === "VIP" ? 2 : 1} 篇\n\n` +
      `💎 升級 VIP 可獲得：\n` +
      `  • 每日 2 篇報告\n` +
      `  • 對話 +10 次/天`;
    
    sendLineReply(replyToken, replyText);
    return true;
  }
  
  return false;
}

// ==========================================
// 📊 用户互动记录系统（V2.0 预留）
// ==========================================

/**
 * 📊 記錄用戶互動
 * 
 * 功能：
 * - 記錄所有用戶互動（訊息、點擊、反饋）
 * - 用於優化體驗和 AI 訓練
 * 
 * @param {string} userId - 用户 ID
 * @param {string} type - 互动类型
 * @param {string} content - 互动内容
 * @param {Date} timestamp - 时间戳
 */
function logUserInteraction(userId, type, content, timestamp) {
  console.log(`📊 [互動記錄] ${userId} - ${type}: ${content ? content.substring(0, 50) : 'N/A'}`);
  
  // ⚠️ 非阻塞寫入：即使失敗也不影響主流程
  try {
    const sheet = getInteractionLogSheet();
    
    // ⭐ 獲取用戶資訊：優先從 LINE API 獲取最新資料
    let userName = 'Unknown';
    let userStatus = 'Free';
    
    try {
      // 1️⃣ 先從 Sheet 查詢用戶狀態（快速）
      const user = findUser(userId);
      if (user) {
        userStatus = user["Status"] || 'Free';
      }
      
      // 2️⃣ 從 LINE API 獲取最新的 Display Name（準確）
      const profile = getLineUserProfile(userId);
      if (profile && profile.displayName) {
        userName = profile.displayName;
        console.log(`✅ [logUserInteraction] 從 LINE API 獲取: ${userName} (${userStatus})`);
      } else if (user && user["Display Name"]) {
        // 如果 LINE API 失敗，才使用 Sheet 中的舊資料
        userName = user["Display Name"];
        console.log(`✅ [logUserInteraction] 從 Sheet 獲取: ${userName} (${userStatus})`);
      } else {
        console.warn(`⚠️  [logUserInteraction] 無法獲取用戶名稱: ${userId.substring(0, 20)}...`);
      }
    } catch (e) {
      console.error(`❌ [logUserInteraction] 獲取用戶資訊失敗:`, e.message);
    }
    
    // 寫入記錄：[時間, User ID, 名稱, 身份, 互動類型, 內容, Bot回覆, 回應時間]
    sheet.appendRow([
      timestamp,
      userId,
      userName,
      userStatus,
      type,
      content ? content.substring(0, 500) : '',
      '',  // Bot Reply (稍後更新)
      ''   // Response Time (稍後更新)
    ]);
    
    const rowNumber = sheet.getLastRow();
    console.log(`✅ 互動記錄已寫入 (Row ${rowNumber})`);
    return rowNumber;
    
  } catch (e) {
    console.error(`⚠️ 互動記錄寫入失敗: ${e.message}`);
    console.error(`   但不影響主流程繼續執行`);
    return -1;  // 返回 -1 表示寫入失敗
  }
}

/**
 * 👍 處理按讚動作
 * 
 * @param {string} userId - 用户 ID
 * @param {string} newsId - 新闻 ID
 */
function handleLikeAction(userId, newsId) {
  console.log(`👍 用戶按讚: ${userId} -> ${newsId}`);
  
  // 記錄到互動日誌
  logUserInteraction(userId, 'like', `按讚新聞`, new Date(), "", newsId);
  
  // TODO: V2.0 擴展
  // 1. 更新推薦算法
  // 2. 給用戶積分獎勵
  // 3. 發送感謝訊息
}

/**
 * 👎 處理不喜歡動作
 * 
 * @param {string} userId - 用户 ID
 * @param {string} newsId - 新闻 ID
 */
function handleDislikeAction(userId, newsId) {
  console.log(`👎 用戶不喜歡: ${userId} -> ${newsId}`);
  
  // 記錄到互動日誌
  logUserInteraction(userId, 'dislike', `不喜歡新聞`, new Date(), "", newsId);
  
  // TODO: V2.0 擴展
  // 1. 調整推薦策略
  // 2. 詢問不喜歡的原因
  // 3. 提供替代推薦
}

/**
 * 🔗 處理分享動作
 * 
 * @param {string} userId - 用户 ID
 * @param {string} newsId - 新闻 ID
 */
function handleShareAction(userId, newsId) {
  console.log(`🔗 用戶分享: ${userId} -> ${newsId}`);
  
  // 記錄到互動日誌
  logUserInteraction(userId, 'share', `分享新聞`, new Date(), "", newsId);
  
  // TODO: V2.0 擴展
  // 1. 給用戶獎勵
  // 2. 追蹤傳播效果
  // 3. 建立推薦網絡
}

/**
 * 🔍 解析 Postback 資料
 * 
 * @param {string} data - Postback data 字串
 * @returns {Object} 解析後的參數
 */
function parsePostbackData(data) {
  const params = {};
  
  if (!data) return params;
  
  // 格式: action=like&newsId=123
  data.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  });
  
  return params;
}

// ==========================================
// 📄 VIP/Admin PDF 分析功能（V3.0）
// ==========================================

/**
 * 📄 處理用戶上傳的檔案訊息
 *
 * 流程：
 * 1. 驗證權限（僅 VIP/Admin）
 * 2. 驗證檔案類型（僅 PDF）
 * 3. 從 LINE 下載 → 存到 Drive
 * 4. OCR → Gemini 分析 → Imagen 生圖 → Slides 簡報
 * 5. Flex Message 報告卡片回覆用戶
 * 6. 寫入 VIP_Analysis Sheet
 *
 * @param {Object} event - LINE file message event
 */
function handleFileMessage(event) {
  _initConfig();

  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const messageId = event.message.id;
  const fileName = event.message.fileName || "uploaded_file";
  const fileSize = event.message.fileSize || 0;

  console.log(`📄 收到檔案: ${fileName} (${Math.round(fileSize / 1024)} KB)`);

  // 1. 驗證用戶權限
  const user = findUser(userId);
  const userStatus = user ? user["Status"] : "Free";
  const displayName = (user ? user["Display Name"] : null) || "Unknown";

  // 依 Config 開關決定哪些角色可使用 PDF 分析
  var pdfAllowedRoles = JSON.parse(Config.get('V3_PDF_ANALYSIS_ROLES') || '["Admin"]');

  if (pdfAllowedRoles.indexOf(userStatus) === -1) {
    if (userStatus === "Free") {
      sendLineReply(replyToken,
        "(搖尾巴) 喵～這是 VIP 專屬功能！\n\n" +
        "📄 VIP 會員可以上傳 PDF，電路貓會幫你產出完整研析報告。\n\n" +
        "💎 回覆「VIP」了解會員方案");
    } else {
      // VIP 但功能尚未開放
      sendLineReply(replyToken,
        "(舔爪子) 喵～PDF 分析功能即將開放給 VIP 會員！\n\n" +
        "📄 敬請期待，電路貓正在做最後調校...");
    }
    return;
  }

  // 2. 驗證檔案類型
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    sendLineReply(replyToken,
      "(歪頭) 喵？目前只支援 PDF 檔案喔！\n\n" +
      "請上傳 .pdf 格式的文件，電路貓會幫你分析。");
    return;
  }

  // 3. 先回覆「收到，處理中」（避免 replyToken 逾時）
  try {
    sendLineReply(replyToken,
      "📄 收到 " + fileName + " (喵！)\n\n" +
      "🧠 電路貓正在全力分析中...\n" +
      "📊 分析 → 🎨 生圖 → 📑 簡報\n\n" +
      "⏳ 預計需要 1-2 分鐘，完成後會推播報告給你！");
  } catch (e) {
    console.error("⚠️ 回覆「處理中」失敗: " + e.message);
  }

  // 4. 記錄到 VIP_Analysis Sheet
  var rowNumber = appendVIPAnalysisRecord({
    requestDate: new Date(),
    userId: userId,
    displayName: displayName,
    userStatus: userStatus,
    fileName: fileName,
    status: "Processing"
  });

  try {
    // 下載 → 存檔 → 分析 → 生圖 → 簡報 → 推播
    var driveFile = _downloadAndSavePDF(messageId, fileName, rowNumber);
    var reportData = _runPDFAnalysisPipeline(driveFile, fileName, rowNumber);
    _sendPDFReport(userId, displayName, userStatus, reportData);

    // 歸檔 PDF
    try {
      var scannedFolder = DriveApp.getFolderById(VIP_SCANNED_FOLDER_ID);
      moveFileTo(driveFile, scannedFolder);
    } catch (e) {
      console.warn("⚠️ PDF 歸檔失敗: " + e.message);
    }

  } catch (error) {
    console.error("❌ VIP PDF 分析失敗: " + error.message);
    updateVIPAnalysisRecord(rowNumber, {
      'G': "Error: " + error.message.substring(0, 100)
    });
    try {
      pushLineTextMessage(userId,
        "(垂耳) 喵...分析「" + fileName + "」失敗了。\n\n" +
        "原因: " + error.message.substring(0, 100) + "\n\n" +
        "請確認 PDF 內容是否正常，或稍後再試。");
    } catch (e) {
      console.error("⚠️ 通知用戶失敗: " + e.message);
    }
  }
}

/**
 * 📥 下載 LINE 檔案並存到 Drive
 */
function _downloadAndSavePDF(messageId, fileName, rowNumber) {
  console.log("📥 從 LINE 下載檔案...");
  var fileBlob = downloadLineContent(messageId);
  fileBlob.setName(fileName);

  console.log("💾 存檔到 Drive...");
  var driveFile = uploadFile(fileBlob, fileName, VIP_UPLOAD_FOLDER_ID);
  console.log("✅ 檔案已存: " + driveFile.getUrl());

  updateVIPAnalysisRecord(rowNumber, {
    'F': driveFile.getId(),
    'G': "Uploaded",
    'M': driveFile.getUrl()
  });

  return driveFile;
}

/**
 * 🧠 執行 PDF 分析完整 Pipeline（OCR → AI → 生圖 → 簡報）
 */
function _runPDFAnalysisPipeline(driveFile, fileName, rowNumber) {
  // OCR
  console.log("📖 OCR 提取中...");
  var textContent = extractPdfText(driveFile);
  if (!textContent || textContent.trim().length < 50) {
    throw new Error("PDF 內容太少或無法辨識");
  }

  // AI 分析
  console.log("🧠 Gemini 分析中...");
  var aiResult = analyzeNews(textContent, fileName);
  var summaryLong = formatSummaryLong(aiResult.insights);
  var insightsShort = formatInsightsShort(aiResult.insights);
  var jsonData = JSON.stringify({
    insights: aiResult.insights,
    visual_scene: aiResult.visual_scene,
    seo_headline: aiResult.seo_headline
  });

  updateVIPAnalysisRecord(rowNumber, {
    'G': "Analyzed", 'H': aiResult.score,
    'I': summaryLong, 'J': insightsShort,
    'K': aiResult.visual_scene, 'L': aiResult.seo_headline,
    'Q': jsonData
  });
  console.log("✅ AI 分析完成: " + aiResult.seo_headline + " (" + aiResult.score + "/10)");

  // 生圖
  console.log("🎨 Imagen 生圖中...");
  var timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss");
  var cleanHL = aiResult.seo_headline.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  var imageName = "VIP_" + cleanHL.substring(0, 30) + "_" + timestamp + ".png";
  var imageResult = generateAndSaveImage(aiResult.visual_scene, aiResult.seo_headline, imageName);
  updateVIPAnalysisRecord(rowNumber, { 'N': imageResult.url });
  console.log("✅ 圖片生成完成");

  // 簡報
  console.log("📊 製作簡報中...");
  var imageFile = DriveApp.getFileById(imageResult.id);
  var slideResult = createNewsPresentation(aiResult.seo_headline, imageFile, summaryLong, jsonData);
  updateVIPAnalysisRecord(rowNumber, {
    'G': "Finished", 'O': slideResult.slideUrl, 'P': slideResult.pdfUrl || ""
  });
  console.log("✅ 簡報完成: " + slideResult.slideUrl);

  return {
    title: aiResult.seo_headline,
    score: aiResult.score,
    summary: insightsShort,
    imageUrl: convertDriveLinkToImageUrl(imageResult.url),
    viewUrl: slideResult.pdfUrl || slideResult.slideUrl,
    sourceUrl: driveFile.getUrl()
  };
}

/**
 * 📤 推播 PDF 分析報告卡片
 */
function _sendPDFReport(userId, displayName, userStatus, reportData) {
  sendLineFlexMessage(userId, reportData, userStatus);
  console.log("✅ 報告卡片已推播給 " + displayName);
}

// ==========================================
// 📈 用户行为分析（V2.0 预留）
// ==========================================

/**
 * 📈 分析用戶偏好
 * 
 * 根據用戶的互動歷史，推斷其偏好
 * 
 * @param {string} userId - 用户 ID
 * @returns {Object} 用户偏好分析
 */
function analyzeUserPreferences(userId) {
  // TODO: V2.0 实现
  // 1. 从互动日志提取数据
  // 2. 分析喜欢的主题、类型
  // 3. 计算偏好得分
  // 4. 用于个性化推荐
  
  return {
    topics: [],
    avgScore: 0,
    lastActive: new Date()
  };
}

/**
 * 📊 獲取用戶互動統計
 * 
 * @param {string} userId - 用户 ID
 * @param {number} days - 统计天数
 * @returns {Object} 互动统计
 */
function getUserInteractionStats(userId, days = 30) {
  // TODO: V2.0 实现
  // 返回最近 N 天的互动统计
  
  return {
    messages: 0,
    likes: 0,
    dislikes: 0,
    shares: 0,
    activeRate: 0
  };
}

/**
 * 🧪 測試 Webhook（模擬 follow 事件）
 */
function testWebhookFollow() {
  _initConfig();
  
  console.log("🧪 測試 Webhook (follow 事件)...\n");
  
  const mockEvent = {
    type: 'follow',
    timestamp: Date.now(),
    source: {
      userId: ADMIN_ID
    }
  };
  
  try {
    handleFollowEvent(mockEvent);
    console.log("\n✅ 測試完成！");
  } catch (e) {
    console.error("❌ 測試失敗:", e.message);
  }
}

/**
 * 🧪 測試 Webhook（模擬 message 事件）
 */
function testWebhookMessage() {
  _initConfig();
  
  console.log("🧪 測試 Webhook (message 事件)...\n");
  
  const mockEvent = {
    type: 'message',
    timestamp: Date.now(),
    source: {
      userId: ADMIN_ID
    },
    replyToken: 'test_token_' + Date.now(),
    message: {
      type: 'text',
      text: 'Hi 電路貓'
    }
  };
  
  try {
    handleMessageEvent(mockEvent);
    console.log("\n✅ 測試完成！");
  } catch (e) {
    console.error("❌ 測試失敗:", e.message);
  }
}
