// ==========================================
// 🧠 Gemini 核心工具服務
// ==========================================
// 職責：JSON 解析與修復、結果驗證、重試機制
// 依賴：vertex-ai.service.js

/**
 * 帶重試機制的 Gemini 呼叫
 * 
 * @param {Function} callFunction - 要執行的函式
 * @param {number} maxRetries - 最大重試次數（預設 3）
 * @param {string} context - 上下文描述（用於日誌）
 * @returns {*} 函式執行結果
 */
function callGeminiWithRetry(callFunction, maxRetries = 3, context = '未命名操作') {
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('gemini-core.service', 'callGeminiWithRetry');
  }
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${context}: 嘗試 ${attempt}/${maxRetries}`);
      
      const result = callFunction();
      
      console.log(`✅ ${context}: 第 ${attempt} 次嘗試成功！`);
      return result;
      
    } catch (e) {
      lastError = e;
      console.error(`❌ ${context}: 第 ${attempt} 次失敗 - ${e.message}`);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 指數退避：2s, 4s, 6s
        console.log(`⏳ 等待 ${waitTime/1000} 秒後重試...`);
        Utilities.sleep(waitTime);
      }
    }
  }
  
  throw lastError || new Error(`${context}: 已達最大重試次數`);
}

/**
 * 解析 Vertex AI 的結構化 JSON 回應
 * 
 * @param {string} responseText - 原始回應文字
 * @param {boolean} attemptRepair - 是否嘗試修復損壞的 JSON（預設 true）
 * @returns {Object} 解析後的 JSON 物件
 */
function parseStructuredResponse(responseText, attemptRepair = true) {
  try {
    // 直接嘗試解析
    return JSON.parse(responseText);
  } catch (parseError) {
    if (attemptRepair) {
      console.warn(`⚠️ JSON 解析失敗，嘗試修復: ${parseError.message}`);
      return robustJSONParse(responseText);
    } else {
      throw parseError;
    }
  }
}

/**
 * 強健的 JSON 解析（修復常見問題）
 * 
 * @param {string} text - 要解析的文字
 * @returns {Object} 解析後的 JSON 物件
 */
function robustJSONParse(text) {
  let clean = text;
  
  // Step 1: 移除 markdown 標記
  clean = clean.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  
  // Step 2: 找出 JSON 邊界
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  } else {
    throw new Error('找不到有效的 JSON 結構');
  }

  // Step 3: 修復常見問題
  // 移除字串值中的換行符
  clean = clean.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1 $2"');
  
  // Step 4: 嘗試解析
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error(`❌ robustJSONParse 最終失敗`);
    console.error(`📄 Cleaned text (前 500 字): ${clean.substring(0, 500)}...`);
    throw new Error(`JSON 解析失敗: ${e.message}`);
  }
}

/**
 * 驗證結構化結果（通用）
 * 
 * @param {Object} result - 要驗證的結果
 * @param {Array<string>} requiredFields - 必要欄位列表
 * @returns {boolean} 是否通過驗證
 */
function validateResult(result, requiredFields = []) {
  if (!result) {
    console.warn("⚠️ 驗證失敗：結果為 null/undefined");
    return false;
  }
  
  // 檢查必要欄位
  for (const field of requiredFields) {
    if (!result.hasOwnProperty(field)) {
      console.warn(`⚠️ 驗證失敗：缺少必要欄位 "${field}"`);
      return false;
    }
  }
  
  return true;
}

/**
 * 驗證新聞分析結果（專用）
 * 
 * @param {Object} result - 新聞分析結果
 * @returns {boolean} 是否通過驗證
 */
function validateNewsResult(result) {
  if (!result) {
    console.warn("⚠️ 結果為 null/undefined");
    return false;
  }
  
  const checks = {
    hasScore: typeof result.score === 'number' && result.score >= 1 && result.score <= 10,
    hasVisualScene: typeof result.visual_scene === 'string' && result.visual_scene.length >= 30,
    hasSeoHeadline: typeof result.seo_headline === 'string' && result.seo_headline.length > 0,
    hasInsights: Array.isArray(result.insights) && result.insights.length >= 3 && result.insights.length <= 5
  };
  
  let insightsValid = true;
  if (checks.hasInsights) {
    result.insights.forEach((insight, index) => {
      const insightChecks = {
        hasTitle: typeof insight.title === 'string' && insight.title.length >= 2,
        hasShort: typeof insight.short_content === 'string' && insight.short_content.length >= 10,
        hasLong: typeof insight.long_content === 'string' && insight.long_content.length >= 50
      };
      
      if (!insightChecks.hasTitle || !insightChecks.hasShort || !insightChecks.hasLong) {
        console.warn(`⚠️ Insight ${index + 1} 不完整:`, insightChecks);
        insightsValid = false;
      }
    });
  }
  
  const isValid = checks.hasScore && checks.hasVisualScene && checks.hasSeoHeadline && checks.hasInsights && insightsValid;
  
  if (!isValid) {
    console.warn("⚠️ 新聞結果驗證失敗:", checks);
  }
  
  return isValid;
}

/**
 * 清洗文字（移除控制字元、統一換行）
 * 
 * @param {string} text - 原始文字
 * @param {number} maxLength - 最大長度（預設 100000）
 * @returns {string} 清洗後的文字
 */
function cleanText(text, maxLength = 100000) {
  return text
    .substring(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字元
    .replace(/\r\n/g, '\n')                           // 統一換行符
    .replace(/\r/g, '\n');
}

/**
 * 🧪 測試 JSON 解析與修復
 */
function testJSONParsing() {
  console.log("🧪 測試 JSON 解析與修復...\n");
  
  // 測試案例 1: 正常 JSON
  const validJson = '{"score": 8, "title": "測試"}';
  try {
    const result1 = parseStructuredResponse(validJson);
    console.log(`✅ 測試 1 通過: ${JSON.stringify(result1)}`);
  } catch (e) {
    console.error(`❌ 測試 1 失敗: ${e.message}`);
  }
  
  // 測試案例 2: 帶 markdown 標記的 JSON
  const markdownJson = '```json\n{"score": 9, "title": "測試2"}\n```';
  try {
    const result2 = parseStructuredResponse(markdownJson);
    console.log(`✅ 測試 2 通過: ${JSON.stringify(result2)}`);
  } catch (e) {
    console.error(`❌ 測試 2 失敗: ${e.message}`);
  }
  
  // 測試案例 3: 帶換行的 JSON
  const newlineJson = '{"score": 7, "title": "測\n試3"}';
  try {
    const result3 = parseStructuredResponse(newlineJson);
    console.log(`✅ 測試 3 通過: ${JSON.stringify(result3)}`);
  } catch (e) {
    console.error(`❌ 測試 3 失敗: ${e.message}`);
  }
  
  console.log("\n✅ JSON 解析測試完成！");
}
