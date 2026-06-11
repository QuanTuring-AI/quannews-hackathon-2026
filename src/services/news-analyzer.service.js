// ==========================================
// 📰 新聞分析服務
// ==========================================
// 職責：專門處理 PDF 新聞的結構化分析
// 依賴：vertex-ai.service.js, gemini-core.service.js

/**
 * 分析新聞文件（主函式）
 * 
 * @param {string} text - 新聞文字內容
 * @param {string} fileName - 檔案名稱
 * @returns {Object} 分析結果 { score, visual_scene, seo_headline, insights }
 */
function analyzeNews(text, fileName) {
  _initConfig(); // 確保設定已載入
  
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('news-analyzer.service', 'analyzeNews');
  }
  
  // 使用重試機制呼叫分析
  return callGeminiWithRetry(
    function() {
      const result = _analyzeNewsCore(text, fileName);
      
      // 驗證結果
      if (!validateNewsResult(result)) {
        throw new Error("分析結果驗證失敗：內容不完整");
      }
      
      return result;
    },
    3, // 最大重試 3 次
    `分析新聞: ${fileName}`
  );
}

/**
 * 核心分析函式（不含重試邏輯）
 * 
 * @param {string} text - 新聞文字內容
 * @param {string} fileName - 檔案名稱
 * @returns {Object} 分析結果
 */
function _analyzeNewsCore(text, fileName) {
  // 清洗文字
  const cleanedText = cleanText(text, 100000);
  
  // 建立 Prompt
  const prompt = buildNewsAnalysisPrompt(cleanedText, fileName);
  
  // 建立 Schema
  const schema = getNewsAnalysisSchema();
  
  // 建立 Payload
  const payload = buildVertexPayload(prompt, {
    responseSchema: schema,
    generationConfig: {
      temperature: 0.2,    // 低溫度確保數據精準
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192
    }
  });
  
  // 呼叫 Vertex AI
  const response = callVertexAI("gemini-2.5-flash", payload);
  
  // 解析回應
  console.log(`📄 Raw response length: ${response.text.length} chars`);
  console.log(`📄 Raw response preview: ${response.text.substring(0, 200)}...`);
  
  const parsedResult = parseStructuredResponse(response.text);
  
  console.log(`✅ 深度分析完成: score=${parsedResult.impact_score}, insights=${parsedResult.insights?.length || 0}`);
  
  // 格式化回傳
  return {
    score: parsedResult.impact_score || 5,
    visual_scene: parsedResult.visual_scene || "",
    seo_headline: parsedResult.seo_headline || "AI NEWS",
    insights: parsedResult.insights || []
  };
}

/**
 * 建立新聞分析的 Prompt
 * 
 * @param {string} text - 清洗後的文字
 * @param {string} fileName - 檔案名稱
 * @returns {string} Prompt
 */
function buildNewsAnalysisPrompt(text, fileName) {
  return `
You are an elite AI Industry Analyst (Senior Level).
Task: Analyze the document deeply and extract exactly 3 key insights.

【Document】
Filename: ${fileName}
Content (truncated to 100000 chars):
"""
${text}
"""

【SCORING GUIDE】(Criteria: Urgency & Market Impact)

★ Score 10: [Historic Event / Black Swan] (EXTREMELY RARE)
   - Global shock (e.g., War, Pandemic, Fed emergency rate cut).
   - A technological singularity moment (e.g., Launch of GPT-4).
   - "Stop everything and read this."

★ Score 9: [Immediate Market Mover] (Urgent)
   - Massive earnings surprise from a Mag-7 company (>15% gap).
   - Major government policy CHANGE (not just a plan) effective immediately.
   - Commodity price explosion (e.g., Silver squeeze).
   - "This will cause volatility TOMORROW."

★ Score 8: [Deep Strategic Alpha] (High Value)
   - Excellent institutional deep-dive reports (e.g., Morgan Stanley, Goldman).
   - Reveals a hidden trend or detailed supply chain analysis.
   - High conviction thesis, but impact is medium-to-long term.
   - "Must-read for serious investors to adjust portfolio."

★ Score 6-7: [Tactical / Good Update]
   - Routine earnings within expectations.
   - Product launches (e.g., CES updates).
   - Analyst price target adjustments.
   - "Good information, useful for tracking."

★ Score 1-5: [Noise / Routine]
   - Marketing fluff, daily recaps, known news.
   - "Can skip unless you're bored."

【OUTPUT REQUIREMENTS】
1. impact_score: Integer 1-10

2. visual_scene: English, 100-150 words, A creative, premium, and futuristic visualization concept representing the article's theme.
   - STYLE GUIDE: Think "High-Tech Abstract," "Digital Organic," "Data Sculpture," or "Cinematic Future."
   - AVOID cliche cyberpunk tropes (rainy neon streets) unless absolutely necessary for the topic.
   - The scene must be expansive and suitable for integrating text. NO text/logos in the raw image.

3. seo_headline: English, UPPERCASE, max 80 chars, punchy & dramatic.

4. insights: Array of EXACTLY 3 objects.
   - title: Traditional Chinese (繁體中文), 4-10 chars (e.g., "AI代理革命")
   - short_content: Traditional Chinese, 45-60 chars (The "Hook")
   - long_content: Traditional Chinese, 320-380 chars (Deep Dive). 
   *** CRITICAL INSTRUCTION (READ CAREFULLY) ***: 
     - **PRIORITY NO.1: Extract the Report's Conclusion.** Start with the main argument or implication the report is trying to make. What is the "So What?"
     - **SUPPORT WITH DATA:** Only AFTER stating the conclusion, use specific NUMBERS, %, DATES, and COMPANY NAMES as supporting evidence. Data is secondary to the conclusion.
     - **NO AI INFERENCE:** Do not make your own predictions. If the report hints at something without stating it directly, use the phrasing "該報告暗示..." or "報告指出潛在趨勢為...".
     - **INDEPENDENCE:** Ensure the 3 insights cover different aspects of the report and avoid repeating the same data points.
     - Structure: [Report's Main Conclusion] + [Supporting Data A] + [Supporting Data B].

【CRITICAL RULES】
- All Chinese output MUST be Traditional Chinese (繁體中文).
- NO Markdown formatting in JSON strings.
- Return valid JSON fitting the schema.
`;
}

/**
 * 取得新聞分析的 Response Schema
 * 
 * @returns {Object} JSON Schema
 */
function getNewsAnalysisSchema() {
  return {
    "type": "OBJECT",
    "properties": {
      "impact_score": { "type": "INTEGER" },
      "visual_scene": { "type": "STRING" },
      "seo_headline": { "type": "STRING" },
      "insights": {
        "type": "ARRAY",
        "items": {
          "type": "OBJECT",
          "properties": {
            "title": { "type": "STRING" },
            "source": { "type": "STRING" },
            "short_content": { "type": "STRING" },
            "long_content": { "type": "STRING" }
          },
          "required": ["title", "source", "short_content", "long_content"]
        }
      }
    },
    "required": ["impact_score", "visual_scene", "seo_headline", "insights"]
  };
}

/**
 * 🧪 測試新聞分析
 */
function testNewsAnalysis() {
  _initConfig();
  console.log("🧪 測試新聞分析...");
  
  const testText = `
    NVIDIA announced the Blackwell B200 GPU at CES 2026.
    The new chip delivers 4x performance over previous generation.
    Major cloud providers have placed large orders.
    This is expected to revolutionize AI training efficiency.
  `;
  
  try {
    const result = analyzeNews(testText, "test-nvidia-b200.pdf");
    
    console.log(`✅ 分析成功！`);
    console.log(`📊 評分: ${result.score}/10`);
    console.log(`🎨 標題: ${result.seo_headline}`);
    console.log(`📄 Insights: ${result.insights.length} 點`);
    
    result.insights.forEach((insight, i) => {
      console.log(`\n   ${i+1}. ${insight.title}`);
      console.log(`      簡: ${insight.short_content}`);
      console.log(`      詳: ${insight.long_content.substring(0, 50)}...`);
    });
    
    return result;
    
  } catch (e) {
    console.error(`❌ 分析失敗: ${e.message}`);
    return null;
  }
}
