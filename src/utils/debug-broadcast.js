// ==========================================
// 🔍 晨間派報 Debug 工具
// ==========================================
// 用於檢查和測試 Morning Broadcast 功能

/**
 * 🔍 檢查晨間派報狀態
 * 
 * 檢查項目：
 * 1. 函數是否存在
 * 2. 新聞是否足夠
 * 3. 訂閱用戶數量
 * 4. 最近執行記錄
 */
function checkBroadcastStatus() {
  _initConfig();
  
  console.log("🔍 晨間派報狀態檢查");
  console.log("=".repeat(80));
  
  // 1. 檢查函數是否存在
  console.log("\n1️⃣ 檢查函數");
  try {
    if (typeof runMorningBroadcast === 'function') {
      console.log("   ✅ runMorningBroadcast 函數存在");
    } else {
      console.log("   ❌ runMorningBroadcast 函數不存在");
      return;
    }
  } catch (e) {
    console.log("   ❌ 無法訪問 runMorningBroadcast: " + e.message);
    return;
  }
  
  // 2. 檢查新聞數據
  console.log("\n2️⃣ 檢查新聞數據");
  try {
    const news = selectTopNews(2);
    console.log(`   📰 可用新聞: ${news.length} 篇`);
    
    if (news.length > 0) {
      console.log("   ✅ 有足夠新聞可發送");
      news.forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.title} (評分: ${item.score}/10)`);
      });
    } else {
      console.log("   ⚠️  沒有可發送的新聞");
      console.log("   💡 請先執行 runProductionPipeline() 產生新聞");
    }
  } catch (e) {
    console.log(`   ❌ 檢查新聞失敗: ${e.message}`);
  }
  
  // 3. 檢查訂閱用戶
  console.log("\n3️⃣ 檢查訂閱用戶");
  try {
    const users = getAllActiveUsers();
    console.log(`   👥 訂閱用戶總數: ${users.length}`);
    
    const statusCount = {};
    users.forEach(user => {
      const status = user["Status"] || "Free";
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    Object.keys(statusCount).forEach(status => {
      console.log(`      ${status}: ${statusCount[status]} 位`);
    });
    
    if (users.length > 0) {
      console.log("   ✅ 有訂閱用戶");
    } else {
      console.log("   ⚠️  沒有訂閱用戶");
    }
  } catch (e) {
    console.log(`   ❌ 檢查用戶失敗: ${e.message}`);
  }
  
  // 4. 檢查今天是否為 Free 用戶派報日
  console.log("\n4️⃣ 檢查派報日期");
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
  const isFreeUserDay = (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5);
  
  console.log(`   📅 今天是星期${dayNames[dayOfWeek]}`);
  console.log(`   🆓 Free 用戶: ${isFreeUserDay ? "✅ 會收到" : "❌ 不會收到"}`);
  console.log(`   💎 VIP/Admin: ✅ 會收到`);
  
  // 5. 檢查最近的 Broadcast 日誌
  console.log("\n5️⃣ 檢查執行記錄");
  try {
    const logs = getRecentBroadcastLogs(5);
    if (logs.length > 0) {
      console.log(`   📋 最近 ${logs.length} 次執行:`);
      logs.forEach((log, i) => {
        console.log(`      ${i + 1}. ${log.timestamp} - 發送: ${log.sent}/${log.total}`);
      });
    } else {
      console.log("   ⚠️  沒有執行記錄");
    }
  } catch (e) {
    console.log(`   ℹ️  無法讀取執行記錄: ${e.message}`);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ 檢查完成");
}

/**
 * 🧪 測試晨間派報（乾跑）
 * 
 * 不實際發送，只模擬流程
 */
function testBroadcastDryRun() {
  _initConfig();
  
  console.log("🧪 晨間派報測試（乾跑模式）");
  console.log("=".repeat(80));
  
  try {
    // 1. 選新聞
    console.log("\n1️⃣ 選取新聞...");
    const news = selectTopNews(2);
    console.log(`   ✅ 選取 ${news.length} 篇新聞`);
    news.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.title}`);
    });
    
    // 2. 獲取用戶
    console.log("\n2️⃣ 獲取用戶...");
    const users = getAllActiveUsers();
    console.log(`   ✅ 找到 ${users.length} 位訂閱用戶`);
    
    // 3. 模擬發送
    console.log("\n3️⃣ 模擬發送...");
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isFreeUserDay = (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5);
    
    let wouldSendCount = 0;
    let wouldSkipCount = 0;
    
    users.forEach(user => {
      const status = user["Status"] || "Free";
      const isVIPorAdmin = (status === "VIP" || status === "Admin");
      
      if (isVIPorAdmin || isFreeUserDay) {
        wouldSendCount++;
      } else {
        wouldSkipCount++;
      }
    });
    
    console.log(`   📤 預計發送: ${wouldSendCount} 位用戶`);
    console.log(`   ⏭️  預計跳過: ${wouldSkipCount} 位用戶（非 Free 派報日）`);
    
    // 4. 總結
    console.log("\n" + "=".repeat(80));
    console.log("📊 測試結果");
    console.log(`   新聞數: ${news.length} 篇`);
    console.log(`   用戶數: ${users.length} 位`);
    console.log(`   預計發送: ${wouldSendCount} 位`);
    console.log(`   預計跳過: ${wouldSkipCount} 位`);
    
    if (news.length === 0) {
      console.log("\n⚠️  警告: 沒有可發送的新聞！");
      console.log("💡 請先執行 runProductionPipeline()");
    } else if (wouldSendCount === 0) {
      console.log("\n⚠️  警告: 沒有用戶會收到新聞！");
    } else {
      console.log("\n✅ 測試通過，可以正常發送");
    }
    
  } catch (e) {
    console.error(`❌ 測試失敗: ${e.message}`);
    console.error(`   Stack: ${e.stack}`);
  }
  
  console.log("=".repeat(80));
}

/**
 * 🚀 手動執行晨間派報（實際發送）
 */
function manualRunBroadcast() {
  _initConfig();
  
  console.log("🚀 手動執行晨間派報");
  console.log("=".repeat(80));
  console.log("⚠️  警告: 這將實際發送 LINE 訊息給所有訂閱用戶！");
  console.log("=".repeat(80));
  
  try {
    const result = runMorningBroadcast();
    
    console.log("\n" + "=".repeat(80));
    console.log("📊 執行結果");
    console.log(`   ✅ 成功發送: ${result.sent || 0}`);
    console.log(`   ❌ 發送失敗: ${result.failed || 0}`);
    console.log(`   👥 處理用戶: ${result.users || 0}`);
    console.log(`   📰 已標記新聞: ${(result.sentNewsIds || []).length}`);
    console.log("=".repeat(80));
    
    return result;
    
  } catch (e) {
    console.error(`❌ 執行失敗: ${e.message}`);
    console.error(`   Stack: ${e.stack}`);
    return null;
  }
}

/**
 * 📋 獲取最近的 Broadcast 日誌
 * 
 * @param {number} limit - 限制筆數
 * @returns {Array<Object>} 日誌列表
 */
function getRecentBroadcastLogs(limit = 10) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName("Broadcast_Logs");
    
    if (!logSheet) {
      console.log("ℹ️  Broadcast_Logs Sheet 不存在");
      return [];
    }
    
    const data = logSheet.getDataRange().getValues();
    const logs = [];
    
    // 跳過標題行，取最後 N 筆
    for (let i = Math.max(1, data.length - limit); i < data.length; i++) {
      logs.push({
        timestamp: data[i][0],
        sent: data[i][1],
        failed: data[i][2],
        total: data[i][3],
        newsCount: data[i][4]
      });
    }
    
    return logs;
    
  } catch (e) {
    console.log(`ℹ️  無法讀取 Broadcast 日誌: ${e.message}`);
    return [];
  }
}

/**
 * 📊 顯示最近一週的執行統計
 */
function showWeeklyBroadcastStats() {
  _initConfig();
  
  console.log("📊 晨間派報 - 本週統計");
  console.log("=".repeat(80));
  
  try {
    const logs = getRecentBroadcastLogs(7);
    
    if (logs.length === 0) {
      console.log("⚠️  沒有執行記錄");
      return;
    }
    
    console.log(`📅 最近 ${logs.length} 天的執行記錄:\n`);
    
    let totalSent = 0;
    let totalFailed = 0;
    
    logs.forEach((log, i) => {
      const timestamp = typeof log.timestamp === 'object' 
        ? Utilities.formatDate(log.timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")
        : log.timestamp;
      
      console.log(`${i + 1}. ${timestamp}`);
      console.log(`   ✅ 發送成功: ${log.sent}`);
      console.log(`   ❌ 發送失敗: ${log.failed}`);
      console.log(`   👥 總用戶數: ${log.total}`);
      console.log(`   📰 新聞數: ${log.newsCount}\n`);
      
      totalSent += (log.sent || 0);
      totalFailed += (log.failed || 0);
    });
    
    console.log("=".repeat(80));
    console.log("📈 總計");
    console.log(`   ✅ 總發送: ${totalSent}`);
    console.log(`   ❌ 總失敗: ${totalFailed}`);
    console.log(`   📊 成功率: ${totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0}%`);
    console.log("=".repeat(80));
    
  } catch (e) {
    console.error(`❌ 統計失敗: ${e.message}`);
  }
}

/**
 * 🔧 檢查觸發器設定
 */
function checkBroadcastTrigger() {
  console.log("🔧 檢查觸發器設定");
  console.log("=".repeat(80));
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    
    console.log(`📋 專案共有 ${triggers.length} 個觸發器\n`);
    
    const broadcastTriggers = triggers.filter(trigger => 
      trigger.getHandlerFunction() === 'runMorningBroadcast'
    );
    
    if (broadcastTriggers.length === 0) {
      console.log("❌ 找不到 runMorningBroadcast 觸發器");
      console.log("\n💡 解決方法:");
      console.log("   1. 前往 Apps Script 編輯器");
      console.log("   2. 左側點擊「觸發條件」⏰");
      console.log("   3. 點擊「新增觸發條件」");
      console.log("   4. 選擇函數: runMorningBroadcast");
      console.log("   5. 事件來源: 時間驅動");
      console.log("   6. 時間型觸發條件類型: 日計時器");
      console.log("   7. 選取時段: 上午 8 點到 9 點");
      return;
    }
    
    console.log(`✅ 找到 ${broadcastTriggers.length} 個 runMorningBroadcast 觸發器:\n`);
    
    broadcastTriggers.forEach((trigger, i) => {
      console.log(`${i + 1}. 觸發器 ID: ${trigger.getUniqueId()}`);
      console.log(`   函數: ${trigger.getHandlerFunction()}`);
      console.log(`   類型: ${trigger.getEventType()}`);
      
      // 顯示觸發時間（如果是時間驅動）
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
        const hour = trigger.getTriggerSource();
        console.log(`   執行時間: 每天固定時段`);
      }
      console.log("");
    });
    
    console.log("=".repeat(80));
    
  } catch (e) {
    console.error(`❌ 檢查失敗: ${e.message}`);
    console.error(`   Stack: ${e.stack}`);
  }
}

/**
 * 🎯 完整 Debug 流程
 * 
 * 執行所有檢查，提供完整診斷
 */
function debugBroadcastComplete() {
  console.log("🎯 晨間派報完整診斷");
  console.log("=".repeat(80));
  console.log("");
  
  // 1. 檢查觸發器
  checkBroadcastTrigger();
  console.log("\n");
  
  // 2. 檢查狀態
  checkBroadcastStatus();
  console.log("\n");
  
  // 3. 測試乾跑
  testBroadcastDryRun();
  console.log("\n");
  
  // 4. 顯示統計
  showWeeklyBroadcastStats();
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ 完整診斷完成");
  console.log("\n💡 如果一切正常但仍未觸發，請檢查:");
  console.log("   1. Apps Script 專案的「觸發條件」頁面");
  console.log("   2. 執行記錄（左側「執行作業」）");
  console.log("   3. 是否有錯誤郵件發送到 Gmail");
  console.log("=".repeat(80));
}

/**
 * 🧪 快速測試（推薦使用）
 */
function quickTestBroadcast() {
  console.log("🧪 快速測試晨間派報");
  console.log("=".repeat(80));
  
  console.log("\n1️⃣ 檢查觸發器...");
  checkBroadcastTrigger();
  
  console.log("\n2️⃣ 檢查狀態...");
  checkBroadcastStatus();
  
  console.log("\n3️⃣ 測試乾跑...");
  testBroadcastDryRun();
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ 快速測試完成");
  console.log("\n📌 如需實際發送測試，請執行: manualRunBroadcast()");
  console.log("=".repeat(80));
}
