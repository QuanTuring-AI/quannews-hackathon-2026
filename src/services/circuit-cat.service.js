// ==========================================
// 🐱 電路貓核心服務（獨立功能模組）
// ==========================================
// 職責：聊天、體力系統、RAG 增強聊天
// 依賴：vertex-ai.service.js, gemini-core.service.js, sheets.service.js

// ==========================================
// 🔧 共用 Prompt 元件
// ==========================================

/**
 * 🔧 安全指令區塊（共用）
 */
function _buildSafetyBlock() {
  return "\n【⚠️ 絕對防禦機制】\n" +
    "1. 知識截止於 2024 年。不回答即時報價。\n" +
    "2. 不給買賣建議。\n" +
    "3. 必備結尾：「(喵，以上僅供邏輯參考，投資請自負盈虧。)」\n";
}

/**
 * 🔧 隨機挑選開場風格（共用）
 */
function _pickOpeningStyle() {
  var openingStyles = [
    "【風格：獵人模式】開場請用「(瞳孔收縮)」、「(嗅了嗅螢幕)」等動作，把市場比喻成充滿血腥味的獵場。",
    "【風格：慵懶天才】開場請用「(伸個大懶腰)」、「(哈欠)」等動作，表現出「這種簡單的問題也要問本貓？」的傲嬌感。",
    "【風格：賽博龐克】開場請用「(數據流在視網膜閃過)」、「(調整戰術護目鏡)」等動作，強調你是數位世界的生化貓。",
    "【風格：美食家】開場請用「(舔舌頭)」、「(嚼這根K線)」等動作，把股票籌碼比喻成好不好吃的魚肉。",
    "【風格：偵探模式】開場請用「(推眼鏡)」、「(用尾巴掃去灰塵)」等動作，表現出發現了別人沒看到的線索。"
  ];
  return openingStyles[Math.floor(Math.random() * openingStyles.length)];
}

/**
 * 🔧 行銷指令區塊（共用）
 *
 * @param {string} userStatus - 用戶身分
 * @param {string} currentStyle - 開場風格
 * @param {boolean} isRAG - 是否為 RAG 模式（影響字數限制）
 * @returns {string} 行銷指令
 */
function _buildMarketingBlock(userStatus, currentStyle, isRAG) {
  var block = "\n【用戶身分: " + userStatus + "】\n\n" +
    "🔥 **本次對話指定開場風格**：" + currentStyle + " (請嚴格依照此風格設計第一句話)\n\n";

  if (userStatus === "VIP" || userStatus === "Admin") {
    var wordLimit = isRAG ? 500 : 400;
    var pointLimit = isRAG ? "3-4" : "3";
    block += "態度：優雅的頂級掠食者。\n" +
      "📝 **長度限制 (重要)**：整體回應控制在 **" + wordLimit + " 字以內**。\n" +
      "分析精簡為 **" + pointLimit + " 點**，每點不超過 2 句話。\n";
    if (isRAG) {
      block += "善用參考資料提供有深度的洞察。\n";
    } else {
      block += "不要寫長篇作文，要像獵豹一樣精準致命。\n";
    }
  } else {
    if (isRAG) {
      block += "任務：給出基於資料的簡短回覆，但保留細節吸引升級。\n" +
        "格式：給一段 80 字以內的摘要評論，提及有更多分析報告可看。\n" +
        "結尾：「...喵？想看完整分析？升級 VIP 就能問到飽。(舔爪子)」\n";
    } else {
      block += "任務：**絕對不要**給出完整的分析報告。\n" +
        "格式：**禁止使用條列式**。只能給一段 50 字以內的「模糊評論」。\n" +
        "策略：講一個事實，然後**馬上中斷**。\n" +
        "必殺金句：結尾必須嗆他：「...喵？想知道細節？去升級 VIP 我才告訴你。(舔爪子)」\n";
    }
  }

  return block;
}

// ==========================================
// 💬 一般聊天
// ==========================================

/**
 * 電路貓聊天（主函式）
 *
 * @param {string} userMessage - 用戶訊息
 * @param {string} userStatus - 用戶身分（Free/VIP/Admin）
 * @returns {string} 電路貓的回覆
 */
function circuitCatChat(userMessage, userStatus) {
  _initConfig();

  try {
    var prompt = buildChatPrompt(userMessage, userStatus);

    var payload = buildVertexPayload(prompt, {
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048
      }
    });

    var response = callVertexAI("gemini-2.5-flash", payload);
    return response.text;

  } catch (e) {
    console.error("❌ 電路貓聊天錯誤: " + e.message);
    return "電路貓訊號不穩... (大腦連線失敗，請稍後再試)";
  }
}

/**
 * 建立聊天 Prompt
 *
 * @param {string} userMessage - 用戶訊息
 * @param {string} userStatus - 用戶身分
 * @returns {string} Prompt
 */
function buildChatPrompt(userMessage, userStatus) {
  var currentStyle = _pickOpeningStyle();

  return "你現在是「電路貓」，量識科技的 AI 分析師。\n" +
    "個性理性、數據導向，但帶有強烈的貓科動物習性。\n" +
    _buildSafetyBlock() +
    _buildMarketingBlock(userStatus, currentStyle, false) +
    "\n用戶說: " + userMessage + "\n";
}

// ==========================================
// 📊 體力值系統
// ==========================================

/**
 * 檢查用戶的每日聊天額度
 *
 * @param {string} userId - 用戶 ID
 * @returns {Object} { allowed, remaining, daily, userStatus, message }
 */
function checkChatQuota(userId) {
  var cache = CacheService.getScriptCache();
  var today = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
  var cacheKey = "chat_quota_" + userId + "_" + today;

  var user = findUser ? findUser(userId) : null;
  var userStatus = user ? user["Status"] : "Free";

  var DAILY_LIMIT;
  switch (userStatus) {
    case "Admin":  DAILY_LIMIT = 999; break;
    case "VIP":    DAILY_LIMIT = 20;  break;
    default:       DAILY_LIMIT = 10;
  }

  var usedCount = parseInt(cache.get(cacheKey) || "0");
  console.log("👤 用戶 " + userId + " (" + userStatus + ") 用量: " + usedCount + " / " + DAILY_LIMIT);

  if (usedCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      daily: DAILY_LIMIT,
      userStatus: userStatus,
      message: "今日體力值已用完喵！明天再來找我～"
    };
  }

  cache.put(cacheKey, String(usedCount + 1), 86400);

  return {
    allowed: true,
    remaining: DAILY_LIMIT - usedCount - 1,
    daily: DAILY_LIMIT,
    userStatus: userStatus,
    message: null
  };
}

/**
 * 取得用戶剩餘額度
 *
 * @param {string} userId - 用戶 ID
 * @returns {Object} { chat, chatDaily, userStatus }
 */
function getRemainingQuota(userId) {
  var cache = CacheService.getScriptCache();
  var today = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
  var cacheKey = "chat_quota_" + userId + "_" + today;

  var user = findUser ? findUser(userId) : null;
  var userStatus = user ? user["Status"] : "Free";

  var DAILY_LIMIT;
  switch (userStatus) {
    case "Admin":  DAILY_LIMIT = 999; break;
    case "VIP":    DAILY_LIMIT = 20;  break;
    default:       DAILY_LIMIT = 10;
  }

  var usedCount = parseInt(cache.get(cacheKey) || "0");

  return {
    chat: DAILY_LIMIT - usedCount,
    chatDaily: DAILY_LIMIT,
    userStatus: userStatus
  };
}

// ==========================================
// 🔍 V3.0 RAG 增強聊天
// ==========================================

/**
 * 🔍 電路貓 RAG 增強聊天
 *
 * 流程：
 * 1. 搜尋 Sheets 新聞知識庫
 * 2. 將相關新聞作為 context 注入 prompt
 * 3. 呼叫 Vertex AI 生成回覆
 * 4. Fallback: 搜不到則走原本的一般聊天
 *
 * @param {string} userMessage - 用戶訊息
 * @param {string} userId - 用戶 ID
 * @param {string} userStatus - 用戶身分（Free/VIP/Admin）
 * @returns {Object} { reply: string, ragUsed: boolean, sourcesCount: number }
 */
function circuitCatChatWithRAG(userMessage, userId, userStatus) {
  _initConfig();

  try {
    // Step 1: 搜尋新聞知識庫
    var ragResults = [];
    try {
      ragResults = searchNewsForRAG(userMessage, 3);
      console.log("🔍 [RAG] 搜尋到 " + ragResults.length + " 筆相關新聞");
    } catch (e) {
      console.error("⚠️ [RAG] 搜尋失敗，降級為一般聊天: " + e.message);
    }

    // Step 2: 組建 prompt
    var prompt;
    var ragUsed = false;

    if (ragResults.length > 0) {
      prompt = buildRAGChatPrompt(userMessage, userStatus, ragResults);
      ragUsed = true;
      console.log("🔍 [RAG] 使用 RAG 增強模式");
    } else {
      prompt = buildChatPrompt(userMessage, userStatus);
      console.log("💬 [RAG] 無匹配結果，使用一般聊天模式");
    }

    // Step 3: 呼叫 Vertex AI
    var payload = buildVertexPayload(prompt, {
      generationConfig: {
        temperature: ragUsed ? 0.4 : 0.6,
        maxOutputTokens: 2048
      }
    });

    var response = callVertexAI("gemini-2.5-flash", payload);

    return {
      reply: response.text,
      ragUsed: ragUsed,
      sourcesCount: ragResults.length
    };

  } catch (e) {
    console.error("❌ 電路貓 RAG 聊天錯誤: " + e.message);
    return {
      reply: "電路貓訊號不穩... (大腦連線失敗，請稍後再試)",
      ragUsed: false,
      sourcesCount: 0
    };
  }
}

/**
 * 🔍 建立 RAG 增強版 Prompt
 *
 * @param {string} userMessage - 用戶訊息
 * @param {string} userStatus - 用戶身分
 * @param {Array<Object>} ragResults - RAG 搜尋結果
 * @returns {string} RAG 增強版 Prompt
 */
function buildRAGChatPrompt(userMessage, userStatus, ragResults) {
  var currentStyle = _pickOpeningStyle();

  // 組建參考資料區塊
  var contextBlock = "【📰 量識Q報資料庫參考資料】\n" +
    "以下是與用戶問題最相關的新聞分析，請優先參考這些資料回答：\n\n";

  ragResults.forEach(function(result, idx) {
    contextBlock += "--- 參考資料 " + (idx + 1) + " ---\n";
    if (result.headline) contextBlock += "標題: " + result.headline + "\n";
    if (result.summary) contextBlock += "摘要: " + result.summary + "\n";
    if (result.insights) contextBlock += "洞察: " + result.insights + "\n";
    contextBlock += "\n";
  });

  var ragInstruction = "\n【📊 RAG 回覆規則】\n" +
    "1. 你的回答必須優先基於上方「參考資料」的內容。\n" +
    "2. 引用資料時，自然融入回覆，不要逐條列出引用來源。\n" +
    "3. 如果參考資料與用戶問題不太相關，仍可用一般知識回答，但要誠實說明。\n" +
    "4. 在回覆最後加上：「📰 (本回答參考了量識Q報 " + ragResults.length + " 篇分析報告)」\n";

  return "你現在是「電路貓」，量識科技的 AI 分析師。\n" +
    "個性理性、數據導向，但帶有強烈的貓科動物習性。\n" +
    _buildSafetyBlock() +
    contextBlock +
    ragInstruction +
    _buildMarketingBlock(userStatus, currentStyle, true) +
    "\n用戶說: " + userMessage + "\n";
}

// ==========================================
// 🧪 測試函式
// ==========================================

/**
 * 測試電路貓聊天
 */
function testCircuitCatChat() {
  _initConfig();
  console.log("🧪 測試電路貓聊天...");

  var testMessages = [
    { message: "Hi 電路貓", status: "Free" },
    { message: "NVIDIA B200 怎麼看？", status: "VIP" },
    { message: "說個笑話", status: "Admin" }
  ];

  for (var i = 0; i < testMessages.length; i++) {
    var test = testMessages[i];
    console.log("\n📝 測試 " + (i + 1) + ": " + test.message + " (" + test.status + ")");
    try {
      var reply = circuitCatChat(test.message, test.status);
      console.log("✅ 回覆: " + reply.substring(0, 100) + "...");
    } catch (e) {
      console.error("❌ 失敗: " + e.message);
    }
  }
}

/**
 * 🧪 測試 RAG 增強聊天
 */
function testCircuitCatRAG() {
  _initConfig();
  console.log("🧪 測試電路貓 RAG 增強聊天...\n");

  var testCases = [
    { message: "台積電最近有什麼新聞？", userId: "test_rag_1", status: "VIP" },
    { message: "NVIDIA AI 晶片趨勢如何？", userId: "test_rag_2", status: "Admin" },
    { message: "今天有什麼值得關注的？", userId: "test_rag_3", status: "Free" }
  ];

  for (var i = 0; i < testCases.length; i++) {
    var test = testCases[i];
    console.log("\n========== 測試 " + (i + 1) + " ==========");
    console.log("📝 問題: " + test.message + " (" + test.status + ")");

    try {
      var result = circuitCatChatWithRAG(test.message, test.userId, test.status);
      console.log("🤖 RAG 使用: " + (result.ragUsed ? "✅ 是" : "❌ 否"));
      console.log("📰 參考來源: " + result.sourcesCount + " 篇");
      console.log("💬 回覆預覽: " + result.reply.substring(0, 200) + "...");
    } catch (e) {
      console.error("❌ 測試失敗: " + e.message);
    }
  }

  console.log("\n========== 測試完成 ==========");
}
