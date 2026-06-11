// ==========================================
// 🔧 修復 Sheet 表頭工具
// ==========================================
// 用於修復現有 Sheet 的表頭格式

/**
 * 🔧 修復 User_Interactions 表頭
 * 
 * 不刪除資料，只更新第一行的表頭
 */
function fixInteractionLogHeaders() {
  _initConfig();
  
  console.log("🔧 ==========================================");
  console.log("🔧 修復 User_Interactions 表頭");
  console.log("🔧 ==========================================\n");
  
  try {
    const sheet = getInteractionLogSheet();
    
    // 正確的表頭（10 欄）
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
    
    console.log("📝 更新表頭（第 1 行）...");
    
    // 更新第一行
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // 美化表頭
    headerRange
      .setFontWeight("bold")
      .setBackground("#ea4335")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontSize(11);
    
    console.log("✅ 表頭已更新");
    
    // 設置列寬
    console.log("\n📐 調整列寬...");
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
    
    console.log("✅ 列寬已調整");
    
    // 凍結首行
    console.log("\n❄️  凍結首行...");
    sheet.setFrozenRows(1);
    console.log("✅ 首行已凍結");
    
    // 設置文字自動換行（F 和 G 欄）
    console.log("\n📄 設置自動換行...");
    sheet.getRange("F:G").setWrap(true);
    console.log("✅ F, G 欄已設置自動換行");
    
    // 設置行高（首行）
    sheet.setRowHeight(1, 40);
    
    // 總結
    console.log("\n" + "=".repeat(60));
    console.log("🎉 表頭修復完成！");
    console.log("=".repeat(60));
    console.log("\n📊 表頭結構:");
    headers.forEach((header, i) => {
      const col = String.fromCharCode(65 + i); // A, B, C...
      console.log(`   ${col}: ${header}`);
    });
    console.log("\n");
    
    return { success: true };
    
  } catch (e) {
    console.error("❌ 修復失敗:", e.message);
    console.error("   Stack:", e.stack);
    throw e;
  }
}

/**
 * 🔧 修復所有 Sheet 的表頭
 * 
 * 包括：News, Users, User_Interactions
 */
function fixAllSheetHeaders() {
  _initConfig();
  
  console.log("🔧 修復所有 Sheet 表頭\n");
  
  const results = {
    interactions: false,
    news: false,
    users: false
  };
  
  // 1. User_Interactions
  try {
    console.log("1️⃣ 修復 User_Interactions...");
    fixInteractionLogHeaders();
    results.interactions = true;
    console.log("✅ User_Interactions 完成\n");
  } catch (e) {
    console.error("❌ User_Interactions 失敗:", e.message);
  }
  
  // 2. News Sheet（如果需要）
  try {
    console.log("2️⃣ 檢查 News Sheet...");
    const newsSheet = getNewsSheet();
    console.log("✅ News Sheet 正常\n");
    results.news = true;
  } catch (e) {
    console.error("❌ News Sheet 失敗:", e.message);
  }
  
  // 3. Users Sheet（如果需要）
  try {
    console.log("3️⃣ 檢查 Users Sheet...");
    const usersSheet = getUsersSheet();
    console.log("✅ Users Sheet 正常\n");
    results.users = true;
  } catch (e) {
    console.error("❌ Users Sheet 失敗:", e.message);
  }
  
  // 總結
  console.log("=".repeat(60));
  console.log("📊 修復總結:");
  console.log(`   User_Interactions: ${results.interactions ? "✅" : "❌"}`);
  console.log(`   News Sheet: ${results.news ? "✅" : "❌"}`);
  console.log(`   Users Sheet: ${results.users ? "✅" : "❌"}`);
  console.log("=".repeat(60));
  
  return results;
}

/**
 * 📋 顯示 User_Interactions 表頭資訊
 */
function showInteractionLogInfo() {
  _initConfig();
  
  console.log("📋 User_Interactions 表頭資訊\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
    
    console.log("當前表頭（10 欄）:");
    headers.forEach((header, i) => {
      const col = String.fromCharCode(65 + i);
      console.log(`   ${col}: ${header || "(空白)"}`);
    });
    
    console.log(`\n總行數: ${sheet.getLastRow()}`);
    console.log(`資料行數: ${sheet.getLastRow() - 1}`);
    
    // 檢查是否有額外欄位
    const lastCol = sheet.getLastColumn();
    if (lastCol > 10) {
      console.log(`\n⚠️  發現額外欄位:`);
      const extraHeaders = sheet.getRange(1, 11, 1, lastCol - 10).getValues()[0];
      extraHeaders.forEach((header, i) => {
        const col = String.fromCharCode(75 + i); // K, L, M...
        console.log(`   ${col}: ${header || "(空白)"}`);
      });
    }
    
  } catch (e) {
    console.error("❌ 讀取失敗:", e.message);
  }
}

/**
 * 🗑️ 刪除額外的欄位（K 欄以後）
 * 
 * 只保留 A-J 欄（10 欄）
 */
function removeExtraColumns() {
  _initConfig();
  
  console.log("🗑️ 刪除額外欄位\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const lastCol = sheet.getLastColumn();
    
    if (lastCol <= 10) {
      console.log("✅ 沒有額外欄位需要刪除");
      console.log(`   當前欄數: ${lastCol}`);
      return { deleted: 0 };
    }
    
    const extraCols = lastCol - 10;
    
    console.log(`⚠️  發現 ${extraCols} 個額外欄位`);
    console.log(`   當前總欄數: ${lastCol}`);
    console.log(`   標準欄數: 10 (A-J)`);
    
    // 顯示要刪除的欄位
    const extraHeaders = sheet.getRange(1, 11, 1, extraCols).getValues()[0];
    console.log(`\n將刪除的欄位:`);
    extraHeaders.forEach((header, i) => {
      const col = String.fromCharCode(75 + i);
      console.log(`   ${col}: ${header || "(空白)"}`);
    });
    
    console.log(`\n🗑️  刪除欄位 K-${String.fromCharCode(65 + lastCol - 1)}...`);
    
    // 刪除額外欄位
    sheet.deleteColumns(11, extraCols);
    
    console.log(`✅ 已刪除 ${extraCols} 個額外欄位`);
    console.log(`   現在只有 10 欄 (A-J)`);
    
    return { deleted: extraCols };
    
  } catch (e) {
    console.error("❌ 刪除失敗:", e.message);
    throw e;
  }
}
