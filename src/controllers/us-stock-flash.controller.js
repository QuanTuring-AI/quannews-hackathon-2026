// ==========================================
// 🇺🇸 美股快訊捕手控制器 (US Stock Flash Controller)
// ==========================================
// 職責：每日美股快訊全流程
//   Phase 1: RSS 多源抓取 (30+ 條)
//   Phase 2: Gemini AI 收斂 Top 3 + 結構化分析
//   Phase 3: Imagen 生成 1 張主視覺
//   Phase 4: Slides 製作簡報
//   Phase 5: LINE 派送全用戶
//
// 依賴服務：rss-fetcher, vertex-ai, gemini-core, imagen, slides, sheets, line
// 排程建議：AM 7:00 runUSStockFlashPipeline(), AM 8:00 broadcastUSStockFlash()

// ==========================================
// 🔥 主流程
// ==========================================

/**
 * 🔥 美股快訊完整 Pipeline
 *
 * 一鍵執行：抓取 → AI 分析 → 生圖 → 簡報 → 寫入 Sheet
 *
 * @returns {Object} 執行結果
 */
function runUSStockFlashPipeline() {
  _initConfig();

  console.log("🇺🇸 美股快訊捕手啟動！");
  console.log("=".repeat(60));

  var now = new Date();
  var today = Utilities.formatDate(now, "GMT+8", "yyyy-MM-dd");
  var dayOfWeek = parseInt(Utilities.formatDate(now, "GMT+8", "u")); // 1=一 ~ 7=日
  console.log("📅 日期: " + today + " (星期" + dayOfWeek + ")");

  // 🛡️ 週末跳過（美股週六日休市）
  if (dayOfWeek === 6 || dayOfWeek === 7) {
    console.log("⏸️ 週末休市，跳過美股快訊");
    return { success: true, skipped: true, reason: "weekend" };
  }

  try {
    // 檢查今天是否已處理過
    var existing = findUSStockFlashByDate(today);
    if (existing && existing.status === "Sent") {
      console.log("⚠️ 今天已發送過美股快訊，跳過");
      return { success: true, skipped: true };
    }

    // Phase 1: 抓取新聞
    console.log("\n📡 [Phase 1] 抓取多源新聞...");
    var articles = fetchAllRSSFeeds(5);
    if (articles.length === 0) {
      console.error("❌ 無法抓取到任何新聞");
      try { pushLineTextMessage(Config.get('ADMIN_ID'), "⚠️ 美股快訊：RSS 抓取 0 條新聞，今日跳過"); } catch (_) {}
      return { success: false, error: "No articles fetched" };
    }
    console.log("✅ 抓取到 " + articles.length + " 條新聞");

    // Phase 2: AI 分析收斂
    console.log("\n🧠 [Phase 2] Gemini AI 分析收斂...");
    var analysisResult = analyzeUSStockNews(articles);
    console.log("✅ AI 分析完成");
    console.log("   📊 當日衝擊分數: " + analysisResult.score + "/10");
    console.log("   🎨 主標題: " + analysisResult.seo_headline);
    analysisResult.insights.forEach(function(item, i) {
      console.log("   " + (i + 1) + ". " + item.title);
    });

    // 寫入 Sheet（Phase 2 完成狀態）
    var summaryLong = formatSummaryLong(analysisResult.insights);
    var insightsShort = formatInsightsShort(analysisResult.insights);
    var jsonData = JSON.stringify({
      insights: analysisResult.insights,
      visual_scene: analysisResult.visual_scene,
      seo_headline: analysisResult.seo_headline
    });
    var sourceUrls = articles.slice(0, 10).map(function(a) { return a.link; });

    var rowNumber;
    if (existing) {
      // 更新既有列
      rowNumber = existing.rowNumber;
      updateUSStockFlashRecord(rowNumber, {
        'B': analysisResult.score,
        'C': "Analyzed",
        'D': summaryLong,
        'E': insightsShort,
        'F': analysisResult.visual_scene,
        'G': analysisResult.seo_headline,
        'H': JSON.stringify(sourceUrls),
        'M': jsonData
      });
    } else {
      // 新增一列
      rowNumber = appendUSStockFlashRecord({
        date: today,
        score: analysisResult.score,
        status: "Analyzed",
        summary: summaryLong,
        insights: insightsShort,
        visualPrompt: analysisResult.visual_scene,
        seoHeadline: analysisResult.seo_headline,
        sourceUrls: JSON.stringify(sourceUrls),
        imageLink: "",
        slideLink: "",
        outputPdf: "",
        lineStatus: "",
        rawData: jsonData
      });
    }

    console.log("📝 已寫入 US_Stock_Flash 工作表 (Row " + rowNumber + ")");

    // Phase 3: 生成圖片
    console.log("\n🎨 [Phase 3] Imagen 生成主視覺...");
    var timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd");
    var cleanHL = analysisResult.seo_headline.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
    var imageName = "USFlash_" + cleanHL.substring(0, 30) + "_" + timestamp + ".png";

    var imageResult = generateAndSaveImage(
      analysisResult.visual_scene,
      analysisResult.seo_headline,
      imageName
    );
    console.log("✅ 圖片生成完成: " + imageResult.url);

    updateUSStockFlashRecord(rowNumber, { 'I': imageResult.url });

    // Phase 4: 製作簡報
    console.log("\n📊 [Phase 4] 製作 Slides 簡報...");
    var imageFile = DriveApp.getFileById(imageResult.id);
    var slideResult = createNewsPresentation(
      analysisResult.seo_headline,
      imageFile,
      summaryLong,
      jsonData
    );
    console.log("✅ 簡報完成: " + slideResult.slideUrl);

    updateUSStockFlashRecord(rowNumber, {
      'C': "Finished",
      'J': slideResult.slideUrl,
      'K': slideResult.pdfUrl || ""
    });

    // 完成
    console.log("\n" + "=".repeat(60));
    console.log("🎉 美股快訊 Pipeline 完成！");
    console.log("   📅 日期: " + today);
    console.log("   📊 衝擊分數: " + analysisResult.score + "/10");
    console.log("   🎨 主標題: " + analysisResult.seo_headline);
    console.log("   🖼️ 圖片: " + imageResult.url);
    console.log("   📊 簡報: " + slideResult.slideUrl);
    console.log("=".repeat(60));

    return {
      success: true,
      date: today,
      score: analysisResult.score,
      headline: analysisResult.seo_headline,
      rowNumber: rowNumber
    };

  } catch (error) {
    console.error("❌ 美股快訊 Pipeline 失敗: " + error.message);
    throw error;
  }
}

// ==========================================
// 🧠 AI 分析
// ==========================================

/**
 * 🧠 使用 Gemini 分析美股新聞
 *
 * 輸入 20-30 條新聞，輸出：
 * - 收斂為最重要的 3 條
 * - 每條生成中文摘要 + 洞察
 * - 1 個整合性 visual scene + SEO headline
 * - 1 個當日衝擊分數
 *
 * @param {Array<Object>} articles - RSS 抓取的新聞列表
 * @returns {Object} { score, visual_scene, seo_headline, insights }
 */
function analyzeUSStockNews(articles) {
  return callGeminiWithRetry(
    function() {
      var result = _analyzeUSStockCore(articles);

      if (!validateNewsResult(result)) {
        throw new Error("美股快訊分析結果驗證失敗");
      }

      return result;
    },
    3,
    "美股快訊 AI 分析"
  );
}

/**
 * 🧠 核心分析函式
 */
function _analyzeUSStockCore(articles) {
  // 組合新聞摘要（給 Gemini 看的原始素材）
  var newsDigest = articles.map(function(a, i) {
    return (i + 1) + ". [" + a.source + "] " + a.title +
      (a.description ? "\n   " + a.description.substring(0, 200) : "") +
      (a.link ? "\n   URL: " + a.link : "");
  }).join("\n\n");

  var prompt = buildUSStockAnalysisPrompt(newsDigest, articles.length);
  var schema = getNewsAnalysisSchema(); // 複用現有 schema

  var payload = buildVertexPayload(prompt, {
    responseSchema: schema,
    generationConfig: {
      temperature: 0.3,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: 16384,                  // 5 則 × 加長內文需更大輸出空間（原 8192 會被 thinking 吃光導致截斷）
      thinkingConfig: { thinkingBudget: 2048 } // 框住 thinking 預算，保留推理但不讓它吃光輸出
    }
  });

  var response = callVertexAI("gemini-2.5-flash", payload);
  var parsed = parseStructuredResponse(response.text);

  return {
    score: parsed.impact_score || 5,
    visual_scene: parsed.visual_scene || "",
    seo_headline: parsed.seo_headline || "US MARKET UPDATE",
    insights: parsed.insights || []
  };
}

/**
 * 📝 美股快訊分析 Prompt
 */
function buildUSStockAnalysisPrompt(newsDigest, totalCount) {
  var today = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");

  return '你是「量識Q報」的資深美股分析師。\n' +
    '今天是 ' + today + '，以下是今日從多個財經媒體抓取的 ' + totalCount + ' 條美股相關新聞。\n\n' +
    '【原始新聞素材】\n' +
    '"""\n' + newsDigest + '\n"""\n\n' +
    '【你的任務】\n' +
    '從以上新聞中，篩選出對「台股投資人」和「全球趨勢」最具衝擊力的 5 條新聞。\n' +
    '然後為這 5 條新聞產出完整分析。\n\n' +

    '【OUTPUT REQUIREMENTS】\n' +
    '1. visual_scene: English, 100-150 words.\n' +
    '   A single INTEGRATED visual concept representing TODAY\'s overall market theme.\n' +
    '   Combine the essence of all 5 selected news into ONE cohesive scene.\n' +
    '   STYLE: "High-Tech Abstract," "Digital Organic," "Data Sculpture," or "Cinematic Future."\n' +
    '   The scene must be in PORTRAIT orientation (4:5 ratio, optimized for IG feed), expansive and suitable for text overlay. NO text/logos in the raw image.\n\n' +
    '2. seo_headline: 繁體中文, 15-25字。\n' +
    '   用一句話概括今日美股整體主題，讓人一眼秒懂。\n' +
    '   範例: "AI股全線噴發 費半創歷史新高" / "Fed暗示降息 科技股強勢反彈"\n\n' +
    '3. insights: Array of EXACTLY 5 objects (the 5 selected news).\n' +
    '   - title: Traditional Chinese (繁體中文), 4-10 chars (e.g., "輝達財報炸裂")\n' +
    '   - source: 新聞來源名稱 (e.g., "Bloomberg", "CNBC", "Reuters", "Yahoo Finance", "MarketWatch")\n' +
    '     *** 必須從原始新聞素材的 [source] 欄位擷取，如實標注 ***\n' +
    '   - short_content: Traditional Chinese, 45-60 chars (一句話精華)\n' +
    '   - long_content: Traditional Chinese, 480-560 chars (深度摘要).\n' +
    '     *** 硬性要求：每篇務必寫滿 480 字以上，內容要充實、填滿整頁版面，嚴禁草草結束。***\n' +
    '     *** 重點：先給結論（對台股/全球的影響），再補充數據佐證。***\n' +
    '     結構: [影響結論] + [關鍵數據 A] + [關鍵數據 B] + [產業/類股延伸分析] + [台股連動觀察與投資人提醒]\n\n' +

    '【CRITICAL RULES】\n' +
    '- All Chinese output MUST be Traditional Chinese (繁體中文).\n' +
    '- NO Markdown formatting in JSON strings.\n' +
    '- Return valid JSON fitting the schema.\n' +
    '- 篩選標準：優先選擇對台股有連動影響的新聞（半導體、AI、大型科技股、Fed 政策、地緣政治）。\n' +
    '- impact_score 固定輸出 7（此欄位已棄用但 schema 需要）。\n';
}

// ==========================================
// 📤 派送功能
// ==========================================

/**
 * 📤 美股快訊晨間派送
 *
 * 發送今日美股快訊給全部用戶（Free + VIP + Admin）
 *
 * @returns {Object} 發送統計
 */
function broadcastUSStockFlash() {
  _initConfig();

  console.log("🇺🇸 美股快訊派送啟動！");
  console.log("=".repeat(60));

  var now = new Date();
  var today = Utilities.formatDate(now, "GMT+8", "yyyy-MM-dd");
  var dayOfWeek = parseInt(Utilities.formatDate(now, "GMT+8", "u")); // 1=一 ~ 7=日

  // 🛡️ 週末跳過（美股週六日休市，無資料可發）
  if (dayOfWeek === 6 || dayOfWeek === 7) {
    console.log("⏸️ 週末休市，跳過美股快訊派送");
    return { sent: 0, skipped: true, reason: "weekend" };
  }

  // 1. 找到今日快訊
  var flash = findUSStockFlashByDate(today);
  if (!flash) {
    console.error("❌ 找不到今日美股快訊 (" + today + ")");
    try { pushLineTextMessage(Config.get('ADMIN_ID'), "⚠️ 美股快訊派送：找不到今日資料 (" + today + ")"); } catch (_) {}
    return { sent: 0, failed: 0 };
  }

  if (flash.status !== "Finished") {
    console.error("❌ 今日快訊尚未完成 (status: " + flash.status + ")");
    try { pushLineTextMessage(Config.get('ADMIN_ID'), "⚠️ 美股快訊派送：今日尚未完成 (status: " + flash.status + ")"); } catch (_) {}
    return { sent: 0, failed: 0 };
  }

  if (flash.lineStatus && flash.lineStatus.indexOf("Sent") !== -1) {
    console.log("⚠️ 今日快訊已派送過，跳過");
    return { sent: 0, skipped: true };
  }

  // 2. 組裝發送資料
  var parsedInsights = [];
  try {
    var rawData = JSON.parse(flash.rawData || '{}');
    parsedInsights = rawData.insights || [];
  } catch (_) {}

  var newsData = {
    title: flash.seoHeadline,
    insights: parsedInsights,
    imageUrl: convertDriveLinkToImageUrl(flash.imageLink),
    viewUrl: flash.outputPdf || flash.slideLink,
    sourceUrl: flash.slideLink
  };

  // 3. 取得全部活躍用戶（美股快訊全發，不分 Free/VIP）
  console.log("\n👥 獲取全部訂閱用戶...");
  var subscribers = getAllActiveUsers();
  console.log("✅ 找到 " + subscribers.length + " 位用戶");

  // 4. 發送
  var sentCount = 0;
  var failedCount = 0;

  subscribers.forEach(function(user) {
    var userId = user["User ID"];
    var userStatus = user["Status"] || "Free";

    try {
      sendUSStockFlexMessage(userId, newsData, userStatus);
      sentCount++;
      Utilities.sleep(1000);
    } catch (e) {
      failedCount++;
      console.error("❌ 發送失敗 (" + (user["Display Name"] || userId) + "): " + e.message);
    }
  });

  // 5. 更新 Sheet 狀態
  var dateString = Utilities.formatDate(new Date(), "GMT+8", "MM-dd HH:mm");
  updateUSStockFlashRecord(flash.rowNumber, {
    'L': "Sent | " + dateString
  });

  // 6. 總結
  console.log("\n" + "=".repeat(60));
  console.log("🎉 美股快訊派送完成！");
  console.log("   👥 用戶: " + subscribers.length + " 位");
  console.log("   ✅ 成功: " + sentCount + " 則");
  console.log("   ❌ 失敗: " + failedCount + " 則");
  console.log("=".repeat(60));

  return { users: subscribers.length, sent: sentCount, failed: failedCount };
}

/**
 * 📱 發送美股快訊 Flex Message
 *
 * 沿用研析報告的 Flex 結構，副標題改為「🇺🇸 美股快訊」
 *
 * @param {string} userId - LINE 用戶 ID
 * @param {Object} data - 快訊資料
 * @param {string} userStatus - 用戶身分
 */
function sendUSStockFlexMessage(userId, data, userStatus) {
  var flexContent = buildUSStockFlexMessage(data, userStatus);
  var altText = "🇺🇸 " + (data.title || "美股快訊");
  pushLineFlexContent(userId, flexContent, altText);
}

/**
 * 📱 建立美股快訊 Flex Message
 *
 * 與研析報告結構相同，差異：
 * - 副標題: 🇺🇸 量識Q報 — 美股快訊
 * - 標籤顏色: 藍色 (#1565C0)
 */
function buildUSStockFlexMessage(data, userStatus) {
  var safeViewUrl = "https://drive.google.com";
  if (data.viewUrl) {
    try {
      var idMatch = data.viewUrl.match(/[-\w]{25,}/);
      if (idMatch) {
        safeViewUrl = "https://drive.google.com/file/d/" + idMatch[0] + "/preview";
      } else {
        safeViewUrl = data.viewUrl;
      }
    } catch (e) {
      safeViewUrl = data.viewUrl;
    }
  }

  var DEFAULT_IMAGE = "https://ssl.gstatic.com/docs/doclist/images/icon_10_generic_list.png";
  var safeImageUrl = data.imageUrl || DEFAULT_IMAGE;

  var shareText = "🇺🇸 [量識Q報 美股快訊] " + data.title + "\n\n👇 點擊閱覽完整報告：\n" + safeViewUrl;
  var shareUri = "https://line.me/R/msg/text/?" + encodeURIComponent(shareText);

  // 📰 組裝 5 則快訊內容
  var insightCards = [];
  var insights = data.insights || [];

  insights.forEach(function(item, i) {
    if (i > 0) {
      insightCards.push({
        "type": "separator",
        "margin": "lg",
        "color": "#E0E0E0"
      });
    }
    insightCards.push({
      "type": "box",
      "layout": "vertical",
      "margin": "lg",
      "contents": [
        {
          "type": "text",
          "text": (item.title || ""),
          "weight": "bold",
          "size": "lg",
          "color": "#1a1a1a",
          "wrap": true
        },
        {
          "type": "text",
          "text": (item.source || ""),
          "size": "xxs",
          "color": "#1565C0",
          "margin": "xs"
        },
        {
          "type": "text",
          "text": item.short_content || "",
          "size": "sm",
          "color": "#555555",
          "margin": "sm",
          "wrap": true
        }
      ]
    });
  });

  // 日期
  var dateStr = Utilities.formatDate(new Date(), "GMT+8", "MM/dd");

  return {
    "type": "bubble",
    "size": "mega",
    "styles": {
      "body": { "backgroundColor": "#FFFFFF" },
      "footer": { "backgroundColor": "#F8F9FA" }
    },
    "hero": {
      "type": "image",
      "url": safeImageUrl,
      "size": "full",
      "aspectRatio": "4:5",
      "aspectMode": "cover",
      "action": { "type": "uri", "uri": safeViewUrl }
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "paddingAll": "16px",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": "🇺🇸 量識Q報",
              "weight": "bold",
              "color": "#1565C0",
              "size": "sm",
              "flex": 0
            },
            {
              "type": "text",
              "text": dateStr,
              "size": "xs",
              "color": "#8C8C8C",
              "align": "end",
              "gravity": "center"
            }
          ]
        },
        {
          "type": "text",
          "text": data.title || "美股快訊",
          "weight": "bold",
          "size": "xl",
          "margin": "md",
          "wrap": true,
          "color": "#1a1a1a"
        },
        {
          "type": "separator",
          "margin": "lg",
          "color": "#1565C0"
        }
      ].concat(insightCards)
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "md",
      "paddingAll": "12px",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "height": "sm",
          "color": "#1565C0",
          "flex": 2,
          "action": {
            "type": "uri",
            "label": "📖 完整報告",
            "uri": safeViewUrl
          }
        },
        {
          "type": "button",
          "style": "secondary",
          "height": "sm",
          "flex": 1,
          "action": {
            "type": "uri",
            "label": "🔗 轉發",
            "uri": shareUri
          }
        }
      ]
    }
  };
}

// ==========================================
// 🧪 測試函式
// ==========================================

/**
 * 🧪 測試美股快訊完整 Pipeline
 */
function testUSStockFlashPipeline() {
  console.log("🧪 測試美股快訊 Pipeline...\n");

  try {
    var result = runUSStockFlashPipeline();
    console.log("\n✅ Pipeline 完成！自動發送給 Admin 預覽...");
    testUSStockFlashBroadcast();
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("❌ 測試失敗: " + e.message);
  }
}

/**
 * 🧪 測試美股快訊 AI 分析（不生圖不做簡報）
 */
function testUSStockAnalysisOnly() {
  _initConfig();
  console.log("🧪 測試美股快訊 AI 分析...\n");

  // Phase 1: 抓取
  var articles = fetchAllRSSFeeds(3); // 少量抓取
  console.log("📡 抓取到 " + articles.length + " 條\n");

  // Phase 2: AI 分析
  var result = analyzeUSStockNews(articles);

  console.log("--- 分析結果 ---");
  console.log("📊 衝擊分數: " + result.score + "/10");
  console.log("🎨 主標題: " + result.seo_headline);
  console.log("🖼️ Visual: " + result.visual_scene.substring(0, 80) + "...");

  result.insights.forEach(function(item, i) {
    console.log("\n" + (i + 1) + ". " + item.title);
    console.log("   短: " + item.short_content);
    console.log("   長: " + item.long_content.substring(0, 100) + "...");
  });

  console.log("\n✅ AI 分析測試完成！");
}

/**
 * 🧪 測試派送（僅發給 Admin）
 */
function testUSStockFlashBroadcast() {
  _initConfig();
  console.log("🧪 測試美股快訊派送（僅 Admin）...\n");

  var today = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
  var flash = findUSStockFlashByDate(today);

  if (!flash || flash.status !== "Finished") {
    console.error("❌ 找不到今日已完成的快訊，請先執行 runUSStockFlashPipeline()");
    return;
  }

  var parsedInsights = [];
  try {
    var rawData = JSON.parse(flash.rawData || '{}');
    parsedInsights = rawData.insights || [];
  } catch (e) {
    console.error("❌ rawData 解析失敗: " + e.message);
  }

  console.log("📊 insights 數量: " + parsedInsights.length);
  console.log("📊 rawData 前 200 字: " + (flash.rawData || "").substring(0, 200));

  var newsData = {
    title: flash.seoHeadline,
    insights: parsedInsights,
    imageUrl: convertDriveLinkToImageUrl(flash.imageLink),
    viewUrl: flash.outputPdf || flash.slideLink,
    sourceUrl: flash.slideLink
  };

  console.log("📤 發送給 Admin...");
  console.log("📊 newsData: " + JSON.stringify(newsData).substring(0, 300));
  try {
    sendUSStockFlexMessage(ADMIN_ID, newsData, "Admin");
    console.log("✅ 測試發送完成（不更新 Sheet 狀態）");
  } catch (e) {
    console.error("❌ 發送失敗: " + e.message);
  }
}

/**
 * 🧪 用假資料測試 Flex 模板（不依賴 Sheet 資料）
 */
function testUSStockFlexDemo() {
  _initConfig();
  console.log("🧪 Flex 模板 Demo 測試...\n");

  var demoData = {
    title: "AI股全線噴發 費半創歷史新高",
    insights: [
      { title: "輝達財報炸裂", source: "Bloomberg", short_content: "輝達Q4營收年增265%，數據中心業務爆發性成長，超越市場最樂觀預期" },
      { title: "Fed暗示降息", source: "CNBC", short_content: "聯準會主席鮑爾暗示今年可能降息三次，市場預期六月啟動首次降息" },
      { title: "台積電創新高", source: "Reuters", short_content: "台積電ADR大漲5.8%，三奈米產能滿載，蘋果AI晶片訂單湧入" },
      { title: "特斯拉重挫", source: "MarketWatch", short_content: "特斯拉Q1交車量低於預期，歐洲市場競爭加劇，股價單日跌幅超8%" },
      { title: "油價飆漲", source: "Yahoo Finance", short_content: "中東局勢升溫推升原油價格，布蘭特原油突破90美元關口創半年新高" }
    ],
    imageUrl: "",
    viewUrl: "https://drive.google.com"
  };

  console.log("📤 發送 Demo 給 Admin...");
  try {
    sendUSStockFlexMessage(ADMIN_ID, demoData, "Admin");
    console.log("✅ Demo 發送成功！");
  } catch (e) {
    console.error("❌ Demo 發送失敗: " + e.message);
  }
}
