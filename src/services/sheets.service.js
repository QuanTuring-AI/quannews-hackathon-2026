// ==========================================
// 📊 Google Sheets 服務
// ==========================================
// 職責：工作表操作、資料讀寫、檢查處理狀態

/**
 * 取得或初始化新聞工作表
 * 
 * @returns {Sheet} Google Sheets 工作表物件
 */
function getNewsSheet() {
  _initConfig();
  
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('sheets.service', 'getNewsSheet');
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    console.log(`📝 已建立新工作表: ${SHEET_NAME}`);
  }

  // 檢查是否需要初始化表頭
  if (sheet.getLastRow() === 0) {
    initNewsSheetHeaders(sheet);
  }
  
  return sheet;
}

/**
 * 初始化新聞工作表表頭
 * 
 * @param {Sheet} sheet - 工作表物件
 */
function initNewsSheetHeaders(sheet) {
  const headers = [
    "File ID",              // A
    "File Name",            // B
    "Analyzed Date",        // C
    "Status",               // D
    "Score",                // E
    "Summary (中)",         // F
    "Insights (中)",        // G
    "Visual Prompt (英)",   // H
    "SEO Headline (英)",    // I
    "Source PDF Link",      // J
    "Image Link",           // K
    "Slide Link",           // L
    "Generated PDF Link",   // M
    "Line Status",          // N
    "JSON Data"             // O (隱藏)
  ];
  
  sheet.appendRow(headers);
  
  // 美化表頭
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#1a73e8")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  console.log("✅ 新聞工作表表頭初始化完成");
}

/**
 * 取得用戶工作表
 * 
 * @returns {Sheet} 用戶工作表物件
 */
function getUsersSheet() {
  _initConfig();
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    initUsersSheetHeaders(sheet);
    console.log(`📝 已建立用戶工作表: ${USERS_SHEET_NAME}`);
  }
  
  return sheet;
}

/**
 * 初始化用戶工作表表頭
 * 
 * @param {Sheet} sheet - 工作表物件
 */
function initUsersSheetHeaders(sheet) {
  const headers = [
    "User ID",              // A
    "Display Name",         // B
    "Status",               // C (Free/VIP/Admin)
    "Expiry Date",          // D
    "Join Date",            // E
    "Welcome Sent"          // F
  ];
  
  sheet.appendRow(headers);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#34a853")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  console.log("✅ 用戶工作表表頭初始化完成");
}

/**
 * 檢查檔案是否已處理
 * 
 * @param {Sheet} sheet - 工作表物件
 * @param {string} fileId - 檔案 ID
 * @returns {boolean} 是否已處理
 */
function isFileProcessed(sheet, fileId) {
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('sheets.service', 'isFileProcessed');
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === fileId) {
      return true;
    }
  }
  
  return false;
}

/**
 * 新增新聞記錄
 * 
 * @param {Object} newsData - 新聞資料
 * @returns {number} 新增的行號
 */
function appendNewsRecord(newsData) {
  const sheet = getNewsSheet();
  
  const row = [
    newsData.fileId || "",
    newsData.fileName || "",
    newsData.analyzedDate || new Date(),
    newsData.status || "Analyzed",
    newsData.score || 0,
    newsData.summary || "",
    newsData.insights || "",
    newsData.visualScene || "",
    newsData.seoHeadline || "",
    newsData.sourcePdfLink || "",
    newsData.imageLink || "",
    newsData.slideLink || "",
    newsData.generatedPdfLink || "",
    newsData.lineStatus || "",
    newsData.jsonData || ""
  ];
  
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * 更新新聞記錄
 * 
 * @param {number} rowNumber - 行號
 * @param {Object} updates - 要更新的欄位 { columnLetter: value }
 */
function updateNewsRecord(rowNumber, updates) {
  const sheet = getNewsSheet();
  
  const columnMap = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
    'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15
  };
  
  for (const [column, value] of Object.entries(updates)) {
    const colIndex = columnMap[column.toUpperCase()];
    if (colIndex) {
      sheet.getRange(rowNumber, colIndex).setValue(value);
    }
  }
}

/**
 * 取得所有新聞資料
 * 
 * @returns {Array} 新聞資料陣列
 */
function getAllNewsData() {
  const sheet = getNewsSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = data[i][index];
    });
    record.rowNumber = i + 1;
    records.push(record);
  }
  
  return records;
}

/**
 * 取得所有用戶資料
 * 
 * @returns {Array} 用戶資料陣列
 */
function getAllUsersData() {
  const sheet = getUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    const user = {};
    headers.forEach((header, index) => {
      user[header] = data[i][index];
    });
    user.rowNumber = i + 1;
    users.push(user);
  }
  
  return users;
}

/**
 * 查找用戶
 * 
 * @param {string} userId - 用戶 ID
 * @returns {Object|null} 用戶資料
 */
function findUser(userId) {
  const users = getAllUsersData();
  return users.find(user => user["User ID"] === userId) || null;
}

/**
 * 新增或更新用戶
 * 
 * @param {Object} userData - 用戶資料
 * @returns {number} 行號
 */
function upsertUser(userData) {
  const sheet = getUsersSheet();
  const existingUser = findUser(userData.userId);
  
  if (existingUser) {
    // 更新現有用戶
    const rowNumber = existingUser.rowNumber;
    
    if (userData.displayName) sheet.getRange(rowNumber, 2).setValue(userData.displayName);
    if (userData.status) sheet.getRange(rowNumber, 3).setValue(userData.status);
    if (userData.expiryDate) sheet.getRange(rowNumber, 4).setValue(userData.expiryDate);
    if (userData.welcomeSent !== undefined) sheet.getRange(rowNumber, 6).setValue(userData.welcomeSent);
    
    return rowNumber;
  } else {
    // 新增用戶
    const row = [
      userData.userId || "",
      userData.displayName || "",
      userData.status || "Free",
      userData.expiryDate || "",
      userData.joinDate || new Date(),
      userData.welcomeSent || false
    ];
    
    sheet.appendRow(row);
    return sheet.getLastRow();
  }
}

/**
 * 取得用戶互動記錄工作表
 * 
 * @returns {Sheet} 互動記錄工作表物件
 */
function getInteractionLogSheet() {
  _initConfig();
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "User_Interactions"; // 工作表名稱
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initInteractionLogHeaders(sheet);
    console.log(`📝 已建立互動記錄工作表: ${sheetName}`);
  }
  
  return sheet;
}

/**
 * 初始化互動記錄工作表表頭
 * 
 * @param {Sheet} sheet - 工作表物件
 */
function initInteractionLogHeaders(sheet) {
  const headers = [
    "Timestamp",            // A - 時間戳
    "User ID",              // B - 用戶 ID
    "Display Name",         // C - 顯示名稱
    "User Status",          // D - 用戶身份 (Free/VIP/Admin)
    "Interaction Type",     // E - 互動類型 (message/follow/postback/unfollow)
    "Content",              // F - 用戶訊息內容
    "Bot Reply",            // G - 電路貓回覆
    "Response Time (ms)",   // H - 回應時間（毫秒）
    "News ID",              // I - 相關新聞 ID（預留）
    "Session ID"            // J - 對話 Session ID（預留）
  ];
  
  // 清除現有內容（如果有）
  sheet.clear();
  
  // 寫入表頭
  sheet.appendRow(headers);
  
  // 美化表頭
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#ea4335")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  
  // 設置列寬
  sheet.setColumnWidth(1, 180);  // A: Timestamp
  sheet.setColumnWidth(2, 200);  // B: User ID
  sheet.setColumnWidth(3, 120);  // C: Display Name
  sheet.setColumnWidth(4, 100);  // D: User Status
  sheet.setColumnWidth(5, 120);  // E: Interaction Type
  sheet.setColumnWidth(6, 300);  // F: Content
  sheet.setColumnWidth(7, 400);  // G: Bot Reply
  sheet.setColumnWidth(8, 130);  // H: Response Time
  sheet.setColumnWidth(9, 100);  // I: News ID
  sheet.setColumnWidth(10, 150); // J: Session ID
  
  // 凍結首行
  sheet.setFrozenRows(1);
  
  // 設置文字自動換行
  sheet.getRange("F:G").setWrap(true);
  
  console.log("✅ 互動記錄工作表表頭初始化完成");
}

/**
 * 記錄用戶互動
 * 
 * @param {Object} interactionData - 互動資料
 * @returns {number} 新增的行號
 */
function logInteraction(interactionData) {
  const sheet = getInteractionLogSheet();
  
  const row = [
    interactionData.timestamp || new Date(),
    interactionData.userId || "",
    interactionData.displayName || "",
    interactionData.userStatus || "Free",
    interactionData.type || "",
    interactionData.content || "",
    interactionData.botReply || "",
    interactionData.responseTime || 0,
    interactionData.newsId || "",
    interactionData.sessionId || ""
  ];
  
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * 取得用戶對話歷史
 * 
 * @param {string} userId - 用戶 ID
 * @param {number} limit - 限制筆數（預設 50）
 * @returns {Array<Object>} 對話歷史
 */
function getUserConversationHistory(userId, limit = 50) {
  const sheet = getInteractionLogSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const conversations = [];
  
  // 從最新的開始（倒序）
  for (let i = data.length - 1; i >= 1 && conversations.length < limit; i--) {
    const row = data[i];
    
    if (row[1] === userId) {
      conversations.push({
        timestamp: row[0],
        type: row[4],
        content: row[5],
        botReply: row[6],
        responseTime: row[7]
      });
    }
  }
  
  return conversations.reverse(); // 最舊的在前
}

// ==========================================
// 🇺🇸 US Stock Flash 工作表操作
// ==========================================

var US_STOCK_FLASH_SHEET_NAME = "US_Stock_Flash";

/**
 * 取得或建立 US_Stock_Flash 工作表
 *
 * @returns {Sheet} 工作表物件
 */
function getUSStockFlashSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(US_STOCK_FLASH_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(US_STOCK_FLASH_SHEET_NAME);
    console.log("📝 已建立新工作表: " + US_STOCK_FLASH_SHEET_NAME);
    initUSStockFlashHeaders(sheet);
  }

  if (sheet.getLastRow() === 0) {
    initUSStockFlashHeaders(sheet);
  }

  return sheet;
}

/**
 * 初始化 US_Stock_Flash 表頭
 */
function initUSStockFlashHeaders(sheet) {
  var headers = [
    "Date",                 // A
    "Daily Impact Score",   // B
    "Status",               // C
    "Summary (中)",         // D - 三條長摘要
    "Insights (中)",        // E - 三條短洞察
    "Visual Prompt (英)",   // F - 一個整合性場景
    "SEO Headline (英)",    // G - 一行主標題
    "Source URLs",           // H
    "Image Link",           // I
    "Slide Link",           // J
    "Output PDF",           // K
    "LINE Status",          // L
    "Raw Data"              // M (JSON)
  ];

  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#1565C0")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  console.log("✅ US_Stock_Flash 表頭初始化完成");
}

/**
 * 新增 US Stock Flash 記錄
 *
 * @param {Object} data - 快訊資料
 * @returns {number} 新增的行號
 */
function appendUSStockFlashRecord(data) {
  var sheet = getUSStockFlashSheet();

  var row = [
    data.date || "",
    data.score || 0,
    data.status || "Fetched",
    data.summary || "",
    data.insights || "",
    data.visualPrompt || "",
    data.seoHeadline || "",
    data.sourceUrls || "",
    data.imageLink || "",
    data.slideLink || "",
    data.outputPdf || "",
    data.lineStatus || "",
    data.rawData || ""
  ];

  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * 更新 US Stock Flash 記錄
 *
 * @param {number} rowNumber - 行號
 * @param {Object} updates - { columnLetter: value }
 */
function updateUSStockFlashRecord(rowNumber, updates) {
  var sheet = getUSStockFlashSheet();

  var columnMap = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
    'K': 11, 'L': 12, 'M': 13
  };

  for (var column in updates) {
    var colIndex = columnMap[column.toUpperCase()];
    if (colIndex) {
      sheet.getRange(rowNumber, colIndex).setValue(updates[column]);
    }
  }
}

/**
 * 根據日期查找 US Stock Flash 記錄
 *
 * @param {string} dateStr - 日期字串 "yyyy-MM-dd"
 * @returns {Object|null} 找到的記錄
 */
function findUSStockFlashByDate(dateStr) {
  var sheet = getUSStockFlashSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowDate = data[i][0]; // A: Date

    // 處理 Date 物件或字串
    var dateValue;
    if (rowDate instanceof Date) {
      dateValue = Utilities.formatDate(rowDate, "GMT+8", "yyyy-MM-dd");
    } else {
      dateValue = String(rowDate);
    }

    if (dateValue === dateStr) {
      return {
        rowNumber: i + 1,
        date: dateValue,
        score: data[i][1],              // B
        status: data[i][2],             // C
        summary: data[i][3],            // D
        insights: data[i][4],           // E
        visualPrompt: data[i][5],       // F
        seoHeadline: data[i][6],        // G
        sourceUrls: data[i][7],         // H
        imageLink: data[i][8],          // I
        slideLink: data[i][9],          // J
        outputPdf: data[i][10],         // K
        lineStatus: data[i][11]         // L
      };
    }
  }

  return null;
}

// ==========================================
// 📄 VIP_Analysis 工作表操作
// ==========================================

var VIP_ANALYSIS_SHEET_NAME = "VIP_Analysis";

/**
 * 取得或建立 VIP_Analysis 工作表
 *
 * @returns {Sheet} 工作表物件
 */
function getVIPAnalysisSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(VIP_ANALYSIS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(VIP_ANALYSIS_SHEET_NAME);
    console.log("📝 已建立新工作表: " + VIP_ANALYSIS_SHEET_NAME);
    initVIPAnalysisHeaders(sheet);
  }

  if (sheet.getLastRow() === 0) {
    initVIPAnalysisHeaders(sheet);
  }

  return sheet;
}

/**
 * 初始化 VIP_Analysis 表頭
 *
 * 欄位設計類似 Editor_Desk，新增請求者資訊
 */
function initVIPAnalysisHeaders(sheet) {
  var headers = [
    "Request Date",         // A - 請求時間
    "User ID",              // B - 請求者 LINE ID
    "Display Name",         // C - 請求者名稱
    "User Status",          // D - 請求者身分 (VIP/Admin)
    "File Name",            // E - 原始 PDF 檔名
    "File ID",              // F - Drive 檔案 ID
    "Status",               // G - Analyzed / Finished / Error
    "Score",                // H - AI 評分
    "Summary (中)",         // I - 三條長摘要
    "Insights (中)",        // J - 三條短洞察
    "Visual Prompt (英)",   // K - 場景描述
    "SEO Headline (英)",    // L - 標題
    "Source PDF Link",      // M - 原始 PDF 連結
    "Image Link",           // N - 生成圖片連結
    "Slide Link",           // O - 簡報連結
    "Output PDF",           // P - PDF 連結
    "JSON Data"             // Q - 完整 JSON
  ];

  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#FF6D00")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  console.log("✅ VIP_Analysis 表頭初始化完成");
}

/**
 * 新增 VIP Analysis 記錄
 *
 * @param {Object} data - 分析請求資料
 * @returns {number} 新增的行號
 */
function appendVIPAnalysisRecord(data) {
  var sheet = getVIPAnalysisSheet();

  var row = [
    data.requestDate || new Date(),
    data.userId || "",
    data.displayName || "",
    data.userStatus || "",
    data.fileName || "",
    data.fileId || "",
    data.status || "Received",
    data.score || 0,
    data.summary || "",
    data.insights || "",
    data.visualPrompt || "",
    data.seoHeadline || "",
    data.sourcePdfLink || "",
    data.imageLink || "",
    data.slideLink || "",
    data.outputPdf || "",
    data.jsonData || ""
  ];

  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * 更新 VIP Analysis 記錄
 *
 * @param {number} rowNumber - 行號
 * @param {Object} updates - { columnLetter: value }
 */
function updateVIPAnalysisRecord(rowNumber, updates) {
  var sheet = getVIPAnalysisSheet();

  var columnMap = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
    'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15,
    'P': 16, 'Q': 17
  };

  for (var column in updates) {
    var colIndex = columnMap[column.toUpperCase()];
    if (colIndex) {
      sheet.getRange(rowNumber, colIndex).setValue(updates[column]);
    }
  }
}

// ==========================================
// 🔍 RAG 搜尋功能（V3.0）
// ==========================================

/**
 * 🔍 搜尋新聞資料作為 RAG Context
 *
 * 同時搜尋兩個知識來源：
 *   1. Editor_Desk（研析報告）: F-I 欄
 *   2. US_Stock_Flash（美股快訊）: D-G 欄
 *
 * @param {string} query - 用戶的搜尋查詢
 * @param {number} topK - 回傳前 K 筆結果（預設 3）
 * @returns {Array<Object>} 相關新聞片段 [{ source, fileName, summary, insights, headline, score }]
 */
function searchNewsForRAG(query, topK) {
  if (topK === undefined) topK = 3;
  _initConfig();

  if (!query || query.trim().length === 0) return [];

  console.log("🔍 [RAG] 開始搜尋新聞知識庫...");
  console.log("🔍 [RAG] 查詢: " + query.substring(0, 50));

  var keywords = extractSearchKeywords(query);
  console.log("🔍 [RAG] 關鍵字: " + keywords.join(", "));

  if (keywords.length === 0) return [];

  var results = [];

  // === 來源 1: Editor_Desk（研析報告）===
  try {
    var newsSheet = getNewsSheet();
    var newsData = newsSheet.getDataRange().getValues();

    for (var i = 1; i < newsData.length; i++) {
      var row = newsData[i];
      var fileName = row[1] || "";     // B: File Name
      var summary = row[5] || "";      // F: Summary
      var insights = row[6] || "";     // G: Insights
      var headline = row[8] || "";     // I: SEO Headline

      if (!summary && !insights) continue;

      var match = scoreKeywordMatch(keywords, summary, insights, headline, fileName);
      if (match.score > 0) {
        results.push({
          source: "研析報告",
          rowNumber: i + 1,
          fileName: fileName,
          summary: summary.substring(0, 300),
          insights: insights.substring(0, 300),
          headline: headline,
          score: match.score,
          matchedKeywords: match.matchedKeywords
        });
      }
    }
  } catch (e) {
    console.error("⚠️ [RAG] Editor_Desk 搜尋失敗: " + e.message);
  }

  // === 來源 2: US_Stock_Flash（美股快訊）===
  try {
    var flashSheet = getUSStockFlashSheet();
    var flashData = flashSheet.getDataRange().getValues();

    for (var i = 1; i < flashData.length; i++) {
      var row = flashData[i];
      var date = row[0] || "";         // A: Date
      var summary = row[3] || "";      // D: Summary
      var insights = row[4] || "";     // E: Insights
      var headline = row[6] || "";     // G: SEO Headline

      if (!summary && !insights) continue;

      // 日期格式化為標籤
      var dateLabel = "";
      if (date instanceof Date) {
        dateLabel = Utilities.formatDate(date, "GMT+8", "MM/dd");
      } else if (date) {
        dateLabel = String(date).substring(5); // "2026-02-11" → "02-11"
      }

      var match = scoreKeywordMatch(keywords, summary, insights, headline, "");
      if (match.score > 0) {
        results.push({
          source: "美股快訊",
          rowNumber: i + 1,
          fileName: dateLabel ? "美股快訊 " + dateLabel : "美股快訊",
          summary: summary.substring(0, 300),
          insights: insights.substring(0, 300),
          headline: headline,
          score: match.score + 0.1, // 美股快訊時效性高，微加權
          matchedKeywords: match.matchedKeywords
        });
      }
    }
  } catch (e) {
    console.error("⚠️ [RAG] US_Stock_Flash 搜尋失敗: " + e.message);
  }

  // 合併排序，取 Top-K
  results.sort(function(a, b) { return b.score - a.score; });
  var topResults = results.slice(0, topK);

  console.log("🔍 [RAG] 找到 " + results.length + " 筆相關結果，取前 " + topK + " 筆");
  topResults.forEach(function(r) {
    console.log("   📰 [" + r.source + "] " + r.headline.substring(0, 40) + " (score: " + r.score + ")");
  });

  return topResults;
}

/**
 * 🔍 計算關鍵字匹配分數（通用）
 *
 * @param {Array<string>} keywords - 關鍵字列表
 * @param {string} summary - 摘要
 * @param {string} insights - 洞察
 * @param {string} headline - 標題
 * @param {string} extra - 額外搜尋文字
 * @returns {Object} { score, matchedKeywords }
 */
function scoreKeywordMatch(keywords, summary, insights, headline, extra) {
  var searchText = (summary + " " + insights + " " + headline + " " + extra).toLowerCase();
  var score = 0;
  var matchedKeywords = [];

  for (var j = 0; j < keywords.length; j++) {
    var kw = keywords[j].toLowerCase();
    if (searchText.indexOf(kw) !== -1) {
      score += 1;
      if (headline.toLowerCase().indexOf(kw) !== -1) score += 0.5;
      if (summary.toLowerCase().indexOf(kw) !== -1) score += 0.3;
      matchedKeywords.push(kw);
    }
  }

  return { score: score, matchedKeywords: matchedKeywords };
}

/**
 * 🔤 從用戶訊息提取搜尋關鍵字
 *
 * 支援中英文：
 * - 英文：按空白分割，過濾停用詞
 * - 中文：領域術語優先匹配 + 滑動窗口提取 2-3 字詞組
 *
 * @param {string} text - 用戶訊息
 * @returns {Array<string>} 關鍵字列表
 */
function extractSearchKeywords(text) {
  if (!text) return [];

  var stopWords = [
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
    "都", "一", "一個", "上", "也", "很", "到", "說", "要", "去",
    "你", "會", "著", "沒有", "看", "好", "自己", "這", "他", "她",
    "什麼", "嗎", "怎麼", "怎麼樣", "可以", "請問", "覺得", "認為",
    "那", "吧", "啊", "呢", "喵", "幫", "幫我", "分析", "告訴",
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "can", "could", "should", "may", "might", "shall",
    "i", "you", "he", "she", "it", "we", "they",
    "what", "how", "why", "when", "where", "who"
  ];

  var keywords = [];

  // 1. 提取英文詞彙
  var englishWords = text.match(/[a-zA-Z]{2,}/g) || [];
  englishWords.forEach(function(word) {
    var lower = word.toLowerCase();
    if (stopWords.indexOf(lower) === -1 && keywords.indexOf(lower) === -1) {
      keywords.push(lower);
    }
  });

  // 2. 領域術語優先匹配
  var domainTerms = [
    "半導體", "人工智慧", "機器學習", "深度學習", "量子運算",
    "股票", "債券", "殖利率", "通膨", "升息", "降息", "利率",
    "台積電", "聯發科", "鴻海", "台達電", "大立光",
    "蘋果", "微軟", "谷歌", "亞馬遜", "特斯拉", "輝達",
    "美股", "台股", "陸股", "日股", "港股", "歐股",
    "加密貨幣", "比特幣", "以太坊", "區塊鏈",
    "供應鏈", "晶片", "面板", "電動車", "綠能", "太陽能",
    "ESG", "IPO", "ETF", "GDP", "CPI", "PMI",
    "地緣政治", "貿易戰", "關稅", "制裁",
    "營收", "毛利", "淨利", "EPS", "本益比",
    "聯準會", "央行", "財報", "法說會"
  ];

  domainTerms.forEach(function(term) {
    if (text.indexOf(term) !== -1 && keywords.indexOf(term) === -1) {
      keywords.push(term);
    }
  });

  // 3. 滑動窗口提取 2-3 字中文詞
  var chineseText = text.replace(/[a-zA-Z0-9\s.,!?，。！？、；：""''（）\[\]{}]/g, "");
  if (chineseText.length >= 2) {
    for (var len = 3; len >= 2; len--) {
      for (var i = 0; i <= chineseText.length - len; i++) {
        var chunk = chineseText.substring(i, i + len);
        if (stopWords.indexOf(chunk) === -1 && keywords.indexOf(chunk) === -1) {
          var isSubword = false;
          for (var k = 0; k < keywords.length; k++) {
            if (keywords[k].indexOf(chunk) !== -1 && keywords[k] !== chunk) {
              isSubword = true;
              break;
            }
          }
          if (!isSubword) {
            keywords.push(chunk);
          }
        }
      }
    }
  }

  return keywords.slice(0, 15);
}

/**
 * 🧪 測試 RAG 搜尋
 */
function testSearchNewsForRAG() {
  _initConfig();
  console.log("🧪 測試 RAG 搜尋功能...\n");

  var testQueries = [
    "台積電最近怎麼樣？",
    "NVIDIA AI 晶片",
    "美股升息影響",
    "今天有什麼新聞？"
  ];

  testQueries.forEach(function(query, i) {
    console.log("--- 測試 " + (i + 1) + ": " + query + " ---");
    var results = searchNewsForRAG(query, 3);
    if (results.length > 0) {
      results.forEach(function(r) {
        console.log("  📰 " + r.headline);
        console.log("  📝 " + r.summary.substring(0, 80) + "...");
        console.log("  🔑 匹配: " + r.matchedKeywords.join(", ") + " (score: " + r.score + ")");
      });
    } else {
      console.log("  ⚠️ 無匹配結果");
    }
    console.log("");
  });

  console.log("✅ RAG 搜尋測試完成！");
}

// ==========================================
// 💳 Payments 工作表操作
// ==========================================

var PAYMENTS_SHEET_NAME = "Payments";

/**
 * 取得或建立 Payments 工作表
 */
function getPaymentsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PAYMENTS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PAYMENTS_SHEET_NAME);
    console.log("📝 已建立新工作表: " + PAYMENTS_SHEET_NAME);
    _initPaymentsHeaders(sheet);
  }

  if (sheet.getLastRow() === 0) {
    _initPaymentsHeaders(sheet);
  }

  return sheet;
}

/**
 * 初始化 Payments 表頭
 */
function _initPaymentsHeaders(sheet) {
  var headers = [
    "Date",             // A
    "User ID",          // B
    "Display Name",     // C
    "Order No",         // D
    "Amount",           // E
    "Status",           // F (Pending/SUCCESS/FAIL)
    "Period No",        // G (第幾期)
    "Next Charge Date", // H
    "Trade No",         // I (藍新交易序號)
    "Raw Data"          // J (JSON)
  ];

  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#2E7D32")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 新增付款紀錄
 *
 * @param {Object} data - 付款資料
 * @returns {number} 新增的行號
 */
function appendPaymentRecord(data) {
  var sheet = getPaymentsSheet();
  sheet.appendRow([
    data.date || new Date(),
    data.userId || "",
    data.displayName || "",
    data.orderNo || "",
    data.amount || 0,
    data.status || "Pending",
    data.periodNo || 0,
    data.nextChargeDate || "",
    data.tradeNo || "",
    data.rawData || ""
  ]);
  return sheet.getLastRow();
}

/**
 * 更新付款紀錄
 *
 * @param {number} rowNumber - 行號
 * @param {Object} updates - { columnLetter: value }
 */
function updatePaymentRecord(rowNumber, updates) {
  var sheet = getPaymentsSheet();
  var columnMap = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
  };

  for (var column in updates) {
    var colIndex = columnMap[column.toUpperCase()];
    if (colIndex) {
      sheet.getRange(rowNumber, colIndex).setValue(updates[column]);
    }
  }
}

/**
 * 根據訂單編號查找付款紀錄
 *
 * @param {string} orderNo - 訂單編號
 * @returns {Object|null} { rowNumber, userId, displayName, ... }
 */
function findPaymentByOrderNo(orderNo) {
  var sheet = getPaymentsSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === orderNo) { // D: Order No
      return {
        rowNumber: i + 1,
        date: data[i][0],
        userId: data[i][1],
        displayName: data[i][2],
        orderNo: data[i][3],
        amount: data[i][4],
        status: data[i][5],
        periodNo: data[i][6],
        nextChargeDate: data[i][7],
        tradeNo: data[i][8]
      };
    }
  }
  return null;
}

/**
 * 🧪 測試 Sheets 服務
 */
function testSheetsService() {
  _initConfig();
  console.log("🧪 測試 Sheets 服務...\n");
  
  // 測試 1: 取得新聞工作表
  console.log("測試 1: 取得新聞工作表");
  const newsSheet = getNewsSheet();
  console.log(`✅ 新聞工作表: ${newsSheet.getName()}, ${newsSheet.getLastRow()} 行`);
  
  // 測試 2: 取得用戶工作表
  console.log("\n測試 2: 取得用戶工作表");
  const usersSheet = getUsersSheet();
  console.log(`✅ 用戶工作表: ${usersSheet.getName()}, ${usersSheet.getLastRow()} 行`);
  
  // 測試 3: 取得互動記錄工作表
  console.log("\n測試 3: 取得互動記錄工作表");
  const interactionSheet = getInteractionLogSheet();
  console.log(`✅ 互動記錄工作表: ${interactionSheet.getName()}, ${interactionSheet.getLastRow()} 行`);
  
  // 測試 4: 查找用戶
  console.log("\n測試 4: 查找 Admin 用戶");
  const admin = findUser(ADMIN_ID);
  if (admin) {
    console.log(`✅ 找到用戶: ${admin["Display Name"]} (${admin["Status"]})`);
  } else {
    console.log("❌ 找不到用戶");
  }
  
  console.log("\n✅ Sheets 服務測試完成！");
}
