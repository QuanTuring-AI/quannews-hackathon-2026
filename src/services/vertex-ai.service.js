// ==========================================
// 🤖 Vertex AI 基礎服務
// ==========================================
// 職責：低階 API 呼叫、OAuth Token 管理、HTTP 錯誤處理
// 這是所有 AI 功能的基礎層

/**
 * 呼叫 Vertex AI API（通用函式）
 * 
 * @param {string} modelId - 模型 ID（例如："gemini-2.5-flash"）
 * @param {Object} payload - 請求 payload
 * @param {Object} options - 選項
 * @param {string} options.location - GCP 區域（預設從 Config 讀取）
 * @param {string} options.projectId - GCP 專案 ID（預設從 Config 讀取）
 * @returns {Object} Vertex AI 回應
 */
function callVertexAI(modelId, payload, options = {}) {
  _initConfig(); // 確保設定已載入
  
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('vertex-ai.service', 'callVertexAI');
  }
  
  const location = options.location || LOCATION;
  const projectId = options.projectId || GCP_PROJECT_ID;
  
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;
  
  try {
    const token = getVertexAuthToken();
    
    const response = UrlFetchApp.fetch(url, {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'Authorization': 'Bearer ' + token },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    });
    
    return handleVertexResponse(response);
    
  } catch (e) {
    console.error(`❌ Vertex AI 呼叫失敗: ${e.message}`);
    throw new Error(`Vertex AI 錯誤: ${e.message}`);
  }
}

/**
 * 取得 Vertex AI 的 OAuth Token
 * 
 * @returns {string} OAuth Token
 */
function getVertexAuthToken() {
  try {
    return ScriptApp.getOAuthToken();
  } catch (e) {
    console.error(`❌ 無法取得 OAuth Token: ${e.message}`);
    throw new Error('OAuth Token 取得失敗，請檢查授權設定');
  }
}

/**
 * 處理 Vertex AI 的 HTTP 回應
 * 
 * @param {Object} response - UrlFetchApp 回應物件
 * @returns {Object} 解析後的 JSON 回應
 */
function handleVertexResponse(response) {
  const responseCode = response.getResponseCode();
  const resultText = response.getContentText();
  
  // 檢查 HTTP 錯誤
  if (responseCode !== 200) {
    console.error(`❌ Vertex API HTTP ${responseCode}`);
    console.error(`📄 Response: ${resultText.substring(0, 500)}`);
    throw new Error(`Vertex API HTTP ${responseCode}: ${resultText.substring(0, 100)}`);
  }
  
  // 解析 JSON
  let json;
  try {
    json = JSON.parse(resultText);
  } catch (e) {
    console.error(`❌ JSON 解析失敗: ${e.message}`);
    console.error(`📄 Response: ${resultText.substring(0, 500)}`);
    throw new Error(`無法解析 Vertex AI 回應: ${e.message}`);
  }
  
  // 檢查回應結構
  if (!json.candidates || json.candidates.length === 0) {
    console.error("❌ Vertex AI 沒有回應候選項");
    throw new Error("Vertex AI 無有效回應");
  }
  
  const candidate = json.candidates[0];
  
  // 檢查安全過濾
  if (candidate.finishReason === "SAFETY") {
    throw new Error("內容被安全過濾器攔截");
  }
  
  // 檢查是否有內容
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    if (candidate.finishReason === "MAX_TOKENS") {
      console.error("❌ 輸出超過 maxOutputTokens（thinking + 內容已用罄預算，回傳被截斷）");
      throw new Error("Vertex AI 輸出超過 maxOutputTokens：請調高 maxOutputTokens 或降低 thinkingBudget / 縮短輸出");
    }
    console.error("❌ 回應無內容，finishReason=" + candidate.finishReason);
    throw new Error("Vertex AI 回應中沒有內容 (finishReason: " + candidate.finishReason + ")");
  }
  
  return {
    text: candidate.content.parts[0].text,
    candidate: candidate,
    rawResponse: json
  };
}

/**
 * 建立標準的 Vertex AI Payload
 * 
 * @param {string} prompt - 提示詞
 * @param {Object} options - 選項
 * @returns {Object} Vertex AI Payload
 */
function buildVertexPayload(prompt, options = {}) {
  const payload = {
    "contents": [
      { "role": "user", "parts": [{ "text": prompt }] }
    ]
  };
  
  // 安全設定（預設全開）
  if (options.safetySettings !== false) {
    payload.safetySettings = options.safetySettings || [
      { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
      { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
      { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
      { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
    ];
  }
  
  // 生成設定
  if (options.generationConfig) {
    payload.generationConfig = options.generationConfig;
  }
  
  // 結構化輸出 Schema
  if (options.responseSchema) {
    payload.generationConfig = payload.generationConfig || {};
    payload.generationConfig.responseMimeType = "application/json";
    payload.generationConfig.responseSchema = options.responseSchema;
  }
  
  return payload;
}

/**
 * 🧪 測試 Vertex AI 連線
 */
function testVertexAIConnection() {
  _initConfig();
  console.log("🧪 測試 Vertex AI 連線...");
  
  try {
    const payload = buildVertexPayload("Say 'Hello from Vertex AI!' in Traditional Chinese.", {
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 100
      }
    });
    
    const result = callVertexAI("gemini-2.5-flash", payload);
    
    console.log(`✅ 連線成功！`);
    console.log(`📝 回應: ${result.text}`);
    return true;
    
  } catch (e) {
    console.error(`❌ 連線失敗: ${e.message}`);
    return false;
  }
}
