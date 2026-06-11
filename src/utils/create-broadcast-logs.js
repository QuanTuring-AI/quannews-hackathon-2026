// ==========================================
// 📊 創建 Broadcast_Logs Sheet
// ==========================================

/**
 * 創建或重置 Broadcast_Logs Sheet
 * 
 * 用途：記錄晨間派報的執行歷史
 */
function createBroadcastLogsSheet() {
  _initConfig();
  
  console.log("📊 創建 Broadcast_Logs Sheet");
  console.log("=".repeat(80));
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Broadcast_Logs");
    
    // 如果 Sheet 已存在，詢問是否重置
    if (sheet) {
      console.log("ℹ️  Broadcast_Logs Sheet 已存在");
      console.log("   如需重置，請執行 resetBroadcastLogsSheet()");
      return sheet;
    }
    
    // 創建新 Sheet
    sheet = ss.insertSheet("Broadcast_Logs");
    console.log("✅ 創建 Broadcast_Logs Sheet");
    
    // 設定標題行
    const headers = [
      "Timestamp",
      "Sent",
      "Failed", 
      "Total Users",
      "News Count",
      "News IDs",
      "Day of Week",
      "Free User Day",
      "Status"
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 格式化標題
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    
    // 設定欄寬
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(2, 80);   // Sent
    sheet.setColumnWidth(3, 80);   // Failed
    sheet.setColumnWidth(4, 100);  // Total Users
    sheet.setColumnWidth(5, 100);  // News Count
    sheet.setColumnWidth(6, 200);  // News IDs
    sheet.setColumnWidth(7, 120);  // Day of Week
    sheet.setColumnWidth(8, 120);  // Free User Day
    sheet.setColumnWidth(9, 100);  // Status
    
    // 凍結標題行
    sheet.setFrozenRows(1);
    
    console.log("✅ 標題行設定完成");
    console.log("\n📋 欄位說明:");
    console.log("   A. Timestamp - 執行時間");
    console.log("   B. Sent - 發送成功數");
    console.log("   C. Failed - 發送失敗數");
    console.log("   D. Total Users - 總用戶數");
    console.log("   E. News Count - 新聞數量");
    console.log("   F. News IDs - 新聞 ID 列表");
    console.log("   G. Day of Week - 星期幾");
    console.log("   H. Free User Day - 是否為 Free 用戶派報日");
    console.log("   I. Status - 執行狀態");
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ Broadcast_Logs Sheet 創建完成！");
    console.log("=".repeat(80));
    
    return sheet;
    
  } catch (e) {
    console.error(`❌ 創建失敗: ${e.message}`);
    console.error(`   Stack: ${e.stack}`);
    return null;
  }
}

/**
 * 重置 Broadcast_Logs Sheet
 */
function resetBroadcastLogsSheet() {
  _initConfig();
  
  console.log("🔄 重置 Broadcast_Logs Sheet");
  console.log("=".repeat(80));
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Broadcast_Logs");
    
    if (sheet) {
      ss.deleteSheet(sheet);
      console.log("✅ 刪除舊的 Sheet");
    }
    
    createBroadcastLogsSheet();
    
  } catch (e) {
    console.error(`❌ 重置失敗: ${e.message}`);
  }
}

/**
 * 寫入一筆測試記錄
 */
function addTestBroadcastLog() {
  _initConfig();
  
  console.log("🧪 新增測試記錄");
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Broadcast_Logs");
    
    if (!sheet) {
      console.log("ℹ️  Sheet 不存在，先創建...");
      sheet = createBroadcastLogsSheet();
    }
    
    const testData = [
      new Date(),
      15,  // Sent
      0,   // Failed
      15,  // Total Users
      2,   // News Count
      "NEWS001, NEWS002",
      "星期一",
      "是",
      "Success"
    ];
    
    sheet.appendRow(testData);
    
    console.log("✅ 測試記錄新增完成");
    
  } catch (e) {
    console.error(`❌ 新增失敗: ${e.message}`);
  }
}
