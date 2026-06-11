// ==========================================
// 🧹 news-bot.js 自動清理工具
// ==========================================
// 用途：標記舊函數、移除重複定義、生成清理報告

/**
 * 🔍 掃描 news-bot.js 中的函數定義
 * 
 * @returns {Array} 函數列表
 */
function scanNewsBotFunctions() {
  console.log("🔍 掃描 news-bot.js 中的函數定義...\n");
  
  try {
    // 讀取 news-bot.js 內容
    const scriptId = ScriptApp.getScriptId();
    const files = DriveApp.getFileById(scriptId).getParents();
    
    console.log("⚠️  此功能需要手動執行清理計劃");
    console.log("請參考: CODE_CLEANUP_PLAN.md\n");
    
    return [];
    
  } catch (e) {
    console.error("❌ 掃描失敗:", e.message);
    return [];
  }
}

/**
 * 📊 生成清理報告
 * 
 * 列出所有需要標記為 _OLD_ 的函數
 */
function generateCleanupReport() {
  console.log("📊 ==========================================");
  console.log("📊 news-bot.js 清理報告");
  console.log("📊 ==========================================\n");
  
  // 需要標記為 OLD 的函數清單
  const functionsToRename = {
    // 已被 pipeline.controller.js 取代
    'moveFile': 'drive.service.js',
    'callGeminiStructuredAnalysis': 'news-analyzer.service.js',
    'formatSummaryLong': 'pipeline.controller.js',
    'formatInsightsShort': 'pipeline.controller.js',
    'validateAIResult': 'gemini-core.service.js',
    
    // 已被 imagen.service.js 取代
    'buildImagePrompt': 'imagen.service.js',
    'buildImagePrompt_V4_5_Architecture': 'imagen.service.js (廢棄)',
    'buildImagePrompt_V5_Organic': 'imagen.service.js (廢棄)',
    'buildImagePrompt_V5_1_Organic': 'imagen.service.js (廢棄)',
    'callImagen4': 'imagen.service.js',
    
    // 已被 slides.service.js 取代
    'createFullPresentation': 'slides.service.js',
    'drawUniformInsightCard': 'slides.service.js',
    
    // 已被 sheets.service.js 取代 (重複定義)
    'extractTextFromPdfWithOCR': 'sheets.service.js (重複 Line 684 和 1114)',
    'isProcessed': 'sheets.service.js (重複 Line 732 和 1176)',
    'getOrInitSheet': 'sheets.service.js (重複 Line 1208)',
    
    // 已被 line.service.js 取代
    'getUserProfile': 'getLineUserProfile()',
    'replyMessage': 'sendLineReply()',
    'pushTextMessage': 'pushLineTextMessage()',
    'getDriveImageUrl': 'convertDriveLinkToImageUrl()',
    'sendFlexMessage': 'buildNewsFlexMessage()',
    
    // 已被 circuit-cat.service.js 取代
    'callCircuitCatChat': 'circuitCatChat()',
    
    // 已被 webhook.controller.js 取代
    'checkDailyQuota': 'checkChatQuota()',
    'handleKeywordReply': 'webhook.controller.js',
    
    // 已被 onboarding.controller.js 取代
    'findUsersWithoutWelcomePackage': 'onboarding.controller.js',
    'batchResendWelcomePackage': 'onboarding.controller.js',
    'isValidUrl': 'onboarding.controller.js',
    
    // 已被 broadcaster.controller.js 取代
    'checkIfUserBlocked': 'sheets.service.js',
    'batchCheckBlockedUsers': 'broadcaster.controller.js'
  };
  
  console.log("需要標記為 _OLD_ 的函數:");
  console.log("=" .repeat(80));
  
  let count = 1;
  for (const [funcName, replacement] of Object.entries(functionsToRename)) {
    console.log(`${count}. ${funcName}()`);
    console.log(`   → 已被取代: ${replacement}`);
    console.log(`   → 新名稱: ${funcName}_OLD()\n`);
    count++;
  }
  
  console.log("=" .repeat(80));
  console.log(`\n總計: ${Object.keys(functionsToRename).length} 個函數需要重命名\n`);
  
  // 重複定義清單
  console.log("\n⚠️  重複定義需要移除:");
  console.log("=" .repeat(80));
  console.log("1. extractTextFromPdfWithOCR");
  console.log("   - Line 684: 完整實現 → 改名為 extractTextFromPdfWithOCR_OLD()");
  console.log("   - Line 1114: 轉接層 → 保留\n");
  
  console.log("2. isProcessed");
  console.log("   - Line 732: 舊實現 → 改名為 isProcessed_OLD()");
  console.log("   - Line 1176: 重複 → 刪除或合併\n");
  
  console.log("3. getOrInitSheet");
  console.log("   - Line 645: 新轉接 → 保留");
  console.log("   - Line 650: 已標記 _OLD_DEPRECATED → 保留");
  console.log("   - Line 1208: 重複 → 刪除\n");
  
  console.log("=" .repeat(80) + "\n");
  
  // 清理步驟
  console.log("\n🛠️  清理步驟:");
  console.log("=" .repeat(80));
  console.log("1. 手動重命名函數（加 _OLD_ 後綴）");
  console.log("2. 移除重複定義");
  console.log("3. 添加 @deprecated 註釋");
  console.log("4. 測試所有觸發器");
  console.log("5. 部署並驗證\n");
  
  console.log("詳細計劃: CODE_CLEANUP_PLAN.md");
  console.log("分析報告: CODE_ANALYSIS_REPORT.md\n");
  
  return functionsToRename;
}

/**
 * 📋 檢查哪些函數還在被使用
 * 
 * 用於確認是否可以安全刪除
 */
function checkFunctionUsage() {
  console.log("📋 檢查函數使用情況...\n");
  
  console.log("⚠️  此功能需要手動檢查");
  console.log("建議步驟:");
  console.log("1. 使用 IDE 的 'Find References' 功能");
  console.log("2. 確認函數只在 news-bot.js 內部調用");
  console.log("3. 檢查是否有觸發器直接調用");
  console.log("4. 確認新代碼不依賴舊函數\n");
  
  console.log("🎯 重點檢查:");
  console.log("- 觸發器配置（clasp triggers）");
  console.log("- 時間驅動的觸發器");
  console.log("- Webhook 入口（doPost）");
  console.log("- 手動執行的管理函數\n");
}

/**
 * ✅ 驗證清理結果
 * 
 * 檢查清理後是否正常運作
 */
function validateCleanupResults() {
  console.log("✅ 驗證清理結果...\n");
  
  try {
    // 1. 檢查新轉接層是否正常
    console.log("1️⃣ 檢查轉接層...");
    
    const checks = [
      { name: 'runFullPipeline', exists: typeof runFullPipeline === 'function' },
      { name: 'doPost', exists: typeof doPost === 'function' },
      { name: 'runMorningBriefing', exists: typeof runMorningBriefing === 'function' },
      { name: 'sendWelcomePackage', exists: typeof sendWelcomePackage === 'function' }
    ];
    
    checks.forEach(check => {
      if (check.exists) {
        console.log(`   ✅ ${check.name}() 存在`);
      } else {
        console.log(`   ❌ ${check.name}() 不存在`);
      }
    });
    
    console.log("\n2️⃣ 檢查控制器...");
    console.log(`   runProductionPipeline: ${typeof runProductionPipeline === 'function' ? '✅' : '❌'}`);
    console.log(`   runMorningBroadcast: ${typeof runMorningBroadcast === 'function' ? '✅' : '❌'}`);
    console.log(`   handleLineWebhook: ${typeof handleLineWebhook === 'function' ? '✅' : '❌'}`);
    
    console.log("\n3️⃣ 檢查服務層...");
    console.log(`   analyzeNews: ${typeof analyzeNews === 'function' ? '✅' : '❌'}`);
    console.log(`   generateImage: ${typeof generateImage === 'function' ? '✅' : '❌'}`);
    console.log(`   getLineUserProfile: ${typeof getLineUserProfile === 'function' ? '✅' : '❌'}`);
    
    console.log("\n✅ 基本驗證完成！");
    console.log("請執行完整測試套件: runFullTestSuite()");
    
  } catch (e) {
    console.error("❌ 驗證失敗:", e.message);
  }
}

/**
 * 🧪 測試清理工具
 */
function testCleanupTool() {
  console.log("🧪 測試清理工具\n");
  
  generateCleanupReport();
  checkFunctionUsage();
  validateCleanupResults();
}
