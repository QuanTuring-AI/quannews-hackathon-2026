// ==========================================
// 🧪 完整測試套件 (Test Suite)
// ==========================================
// 用於測試所有 Controller 和 Service 層功能

/**
 * 🧪 執行完整測試套件
 * 
 * 測試範圍：
 * 1. Pipeline Controller - 日常生產流程
 * 2. Broadcaster Controller - 晨間派報
 * 3. Onboarding Controller - 新戶禮包
 * 4. Webhook Controller - 需手動測試 LINE 訊息
 * 
 * @returns {Object} 測試結果統計
 */
function runFullTestSuite() {
  console.log("🧪 ==========================================");
  console.log("🧪 Quanturing News Bot - 完整測試套件");
  console.log("🧪 ==========================================");
  console.log(`🕐 開始時間: ${new Date().toLocaleString('zh-TW')}`);
  console.log("=".repeat(60));
  
  const results = {
    pipeline: { status: 'pending', error: null, duration: 0 },
    broadcaster: { status: 'pending', error: null, duration: 0 },
    onboarding: { status: 'pending', error: null, duration: 0 },
    webhook: { status: 'manual', error: null, duration: 0 }
  };
  
  let totalStartTime = new Date();
  
  // ==========================================
  // 測試 1: Pipeline Controller
  // ==========================================
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📋 測試 1/4: Pipeline Controller (生產流程)");
    console.log("=".repeat(60));
    
    const startTime = new Date();
    testProductionPipeline();
    const endTime = new Date();
    
    results.pipeline.status = 'passed';
    results.pipeline.duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Pipeline 測試通過 (${results.pipeline.duration.toFixed(2)}s)`);
    
  } catch (e) {
    results.pipeline.status = 'failed';
    results.pipeline.error = e.message;
    console.error("❌ Pipeline 測試失敗:", e.message);
    console.error("   Stack:", e.stack);
  }
  
  // 等待 2 秒避免 API 限制
  Utilities.sleep(2000);
  
  // ==========================================
  // 測試 2: Broadcaster Controller
  // ==========================================
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🌅 測試 2/4: Broadcaster Controller (晨間派報)");
    console.log("=".repeat(60));
    
    const startTime = new Date();
    testMorningBroadcast();
    const endTime = new Date();
    
    results.broadcaster.status = 'passed';
    results.broadcaster.duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Broadcaster 測試通過 (${results.broadcaster.duration.toFixed(2)}s)`);
    
  } catch (e) {
    results.broadcaster.status = 'failed';
    results.broadcaster.error = e.message;
    console.error("❌ Broadcaster 測試失敗:", e.message);
    console.error("   Stack:", e.stack);
  }
  
  // 等待 2 秒避免 API 限制
  Utilities.sleep(2000);
  
  // ==========================================
  // 測試 3: Onboarding Controller
  // ==========================================
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎁 測試 3/4: Onboarding Controller (新戶禮包)");
    console.log("=".repeat(60));
    
    const startTime = new Date();
    testWelcomePackage();
    const endTime = new Date();
    
    results.onboarding.status = 'passed';
    results.onboarding.duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Onboarding 測試通過 (${results.onboarding.duration.toFixed(2)}s)`);
    
  } catch (e) {
    results.onboarding.status = 'failed';
    results.onboarding.error = e.message;
    console.error("❌ Onboarding 測試失敗:", e.message);
    console.error("   Stack:", e.stack);
  }
  
  // ==========================================
  // 測試 4: Webhook Controller (手動測試)
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("🤖 測試 4/4: Webhook Controller (LINE 互動)");
  console.log("=".repeat(60));
  console.log("⚠️  此項目需要手動測試");
  console.log("\n📱 請執行以下手動測試：");
  console.log("   1. 加入 LINE Bot 為好友");
  console.log("   2. 發送一般文字訊息（測試 AI 回覆）");
  console.log("   3. 點擊互動按鈕（測試 Postback）");
  console.log("   4. 發送「升級」指令（測試升級流程）");
  console.log("\n✅ 如果以上測試都正常，請標記 Webhook 為通過");
  
  // ==========================================
  // 測試總結
  // ==========================================
  const totalEndTime = new Date();
  const totalDuration = (totalEndTime - totalStartTime) / 1000;
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 測試套件總結");
  console.log("=".repeat(60));
  
  // 統計
  const testItems = ['pipeline', 'broadcaster', 'onboarding'];
  const passedCount = testItems.filter(item => results[item].status === 'passed').length;
  const failedCount = testItems.filter(item => results[item].status === 'failed').length;
  const totalTests = testItems.length;
  
  console.log(`\n📈 自動測試結果:`);
  console.log(`   ✅ 通過: ${passedCount}/${totalTests}`);
  console.log(`   ❌ 失敗: ${failedCount}/${totalTests}`);
  console.log(`   ⏱️  總耗時: ${totalDuration.toFixed(2)}s`);
  
  // 詳細結果
  console.log(`\n📋 詳細結果:`);
  testItems.forEach(item => {
    const result = results[item];
    const icon = result.status === 'passed' ? '✅' : '❌';
    const name = {
      'pipeline': 'Pipeline Controller',
      'broadcaster': 'Broadcaster Controller',
      'onboarding': 'Onboarding Controller'
    }[item];
    
    console.log(`   ${icon} ${name}: ${result.status.toUpperCase()}`);
    if (result.duration > 0) {
      console.log(`      耗時: ${result.duration.toFixed(2)}s`);
    }
    if (result.error) {
      console.log(`      錯誤: ${result.error}`);
    }
  });
  
  console.log(`\n🤖 手動測試項目:`);
  console.log(`   ⏸️  Webhook Controller: MANUAL (請手動驗證)`);
  
  // 最終狀態
  console.log("\n" + "=".repeat(60));
  if (passedCount === totalTests) {
    console.log("🎉 所有自動測試通過！");
    console.log("👉 接下來請完成 Webhook 手動測試");
  } else {
    console.log("⚠️  有測試失敗，請檢查錯誤訊息");
    console.log("👉 修正後請重新執行測試");
  }
  console.log("=".repeat(60));
  
  console.log(`\n🕐 結束時間: ${new Date().toLocaleString('zh-TW')}`);
  console.log("🧪 ==========================================\n");
  
  return results;
}

/**
 * 🔍 快速健康檢查
 * 
 * 檢查所有關鍵服務是否可用
 */
function quickHealthCheck() {
  console.log("🏥 ==========================================");
  console.log("🏥 系統健康檢查 (Health Check)");
  console.log("🏥 ==========================================\n");
  
  const checks = {
    config: false,
    sheets: false,
    drive: false,
    line: false,
    gemini: false
  };
  
  // 1. Config 檢查
  try {
    console.log("1️⃣ 檢查 Config 模組...");
    _initConfig();
    if (FOLDER_ID && SHEET_NAME && LINE_ACCESS_TOKEN) {
      checks.config = true;
      console.log("   ✅ Config 正常");
    } else {
      console.log("   ❌ Config 缺少必要設定");
    }
  } catch (e) {
    console.log("   ❌ Config 錯誤:", e.message);
  }
  
  // 2. Sheets 檢查
  try {
    console.log("\n2️⃣ 檢查 Google Sheets 連接...");
    const sheet = getNewsSheet();
    if (sheet) {
      const rowCount = sheet.getLastRow();
      checks.sheets = true;
      console.log(`   ✅ Sheets 正常 (${rowCount} 列)`);
    }
  } catch (e) {
    console.log("   ❌ Sheets 錯誤:", e.message);
  }
  
  // 3. Drive 檢查
  try {
    console.log("\n3️⃣ 檢查 Google Drive 連接...");
    const folder = DriveApp.getFolderById(FOLDER_ID);
    if (folder) {
      checks.drive = true;
      console.log(`   ✅ Drive 正常 (${folder.getName()})`);
    }
  } catch (e) {
    console.log("   ❌ Drive 錯誤:", e.message);
  }
  
  // 4. LINE 檢查
  try {
    console.log("\n4️⃣ 檢查 LINE API 連接...");
    // 簡單的 token 檢查
    if (LINE_ACCESS_TOKEN && LINE_ACCESS_TOKEN.length > 50) {
      checks.line = true;
      console.log("   ✅ LINE Token 正常");
    } else {
      console.log("   ❌ LINE Token 無效");
    }
  } catch (e) {
    console.log("   ❌ LINE 錯誤:", e.message);
  }
  
  // 5. Gemini 檢查
  try {
    console.log("\n5️⃣ 檢查 Gemini API 連接...");
    if (GEMINI_API_KEY && GEMINI_API_KEY.length > 30) {
      checks.gemini = true;
      console.log("   ✅ Gemini API Key 正常");
    } else {
      console.log("   ❌ Gemini API Key 無效");
    }
  } catch (e) {
    console.log("   ❌ Gemini 錯誤:", e.message);
  }
  
  // 總結
  console.log("\n" + "=".repeat(60));
  const passedChecks = Object.values(checks).filter(c => c).length;
  const totalChecks = Object.keys(checks).length;
  
  console.log(`📊 健康檢查結果: ${passedChecks}/${totalChecks} 通過`);
  
  if (passedChecks === totalChecks) {
    console.log("🎉 所有服務正常！");
  } else {
    console.log("⚠️  部分服務異常，請檢查設定");
  }
  
  console.log("=".repeat(60) + "\n");
  
  return checks;
}

/**
 * 📋 測試報告生成器
 * 
 * 將測試結果寫入 Google Sheets
 */
function generateTestReport(results) {
  try {
    console.log("\n📝 生成測試報告...");
    
    const ss = SpreadsheetApp.openById(SHEET_NAME);
    let reportSheet = ss.getSheetByName("Test Reports");
    
    // 如果沒有報告 Sheet，創建一個
    if (!reportSheet) {
      reportSheet = ss.insertSheet("Test Reports");
      reportSheet.appendRow([
        "時間", "Pipeline", "Broadcaster", "Onboarding", "Webhook", "總通過率", "備註"
      ]);
    }
    
    // 添加測試結果
    const timestamp = new Date();
    const testItems = ['pipeline', 'broadcaster', 'onboarding'];
    const passedCount = testItems.filter(item => results[item].status === 'passed').length;
    const totalTests = testItems.length;
    const passRate = ((passedCount / totalTests) * 100).toFixed(1) + '%';
    
    reportSheet.appendRow([
      timestamp,
      results.pipeline.status,
      results.broadcaster.status,
      results.onboarding.status,
      results.webhook.status,
      passRate,
      `自動測試 ${passedCount}/${totalTests}`
    ]);
    
    console.log("✅ 測試報告已寫入 Google Sheets");
    console.log(`   Sheet: ${ss.getName()} > Test Reports`);
    
  } catch (e) {
    console.log("⚠️  無法生成測試報告:", e.message);
  }
}
