// ==========================================
// 🚨 緊急清理腳本
// ==========================================
// 快速刪除所有互動記錄（保留表頭）

/**
 * 🗑️ 清空所有互動記錄（保留表頭）
 * 
 * ⚠️ 警告：此操作會刪除 User_Interactions 表的所有資料！
 */
function emergencyCleanupAllInteractions() {
  _initConfig();
  
  console.log("🚨 ==========================================");
  console.log("🚨 緊急清理：刪除所有互動記錄");
  console.log("🚨 ==========================================\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有資料需要清理（只有表頭）");
      return { deleted: 0 };
    }
    
    const dataRows = lastRow - 1; // 扣除表頭
    
    console.log(`📊 當前狀態:`);
    console.log(`   總行數: ${lastRow}`);
    console.log(`   資料行數: ${dataRows}`);
    console.log(`\n⚠️  即將刪除所有 ${dataRows} 條記錄！\n`);
    
    // 刪除從第 2 行到最後一行的所有資料
    if (dataRows > 0) {
      sheet.deleteRows(2, dataRows);
      console.log(`✅ 已刪除 ${dataRows} 條記錄`);
    }
    
    console.log("\n🎉 清理完成！");
    console.log("   Sheet 狀態: 只保留表頭");
    console.log("==========================================\n");
    
    return { deleted: dataRows };
    
  } catch (e) {
    console.error("❌ 清理失敗:", e.message);
    console.error("   Stack:", e.stack);
    throw e;
  }
}

/**
 * 🗑️ 刪除今天的所有記錄
 * 
 * 適用於：只想刪除今天的測試記錄
 */
function cleanupTodayInteractions() {
  _initConfig();
  
  console.log("🗓️  清理今天的互動記錄...\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log("⚠️  沒有資料");
      return { deleted: 0 };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const records = data.slice(1);
    const toDelete = [];
    
    records.forEach((row, index) => {
      const rowNumber = index + 2;
      const timestamp = row[0];
      
      let recordDate;
      if (timestamp instanceof Date) {
        recordDate = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        recordDate = new Date(timestamp);
      } else {
        return;
      }
      
      recordDate.setHours(0, 0, 0, 0);
      
      // 如果是今天的記錄
      if (recordDate.getTime() === today.getTime()) {
        toDelete.push(rowNumber);
      }
    });
    
    console.log(`📊 檢測結果:`);
    console.log(`   今天的記錄: ${toDelete.length} 條`);
    
    if (toDelete.length === 0) {
      console.log("🎉 沒有今天的記錄需要刪除");
      return { deleted: 0 };
    }
    
    console.log(`\n🗑️  開始刪除...`);
    
    // 從後往前刪除（避免行號變動）
    toDelete.sort((a, b) => b - a);
    
    toDelete.forEach((rowNumber, i) => {
      try {
        sheet.deleteRow(rowNumber);
        
        if ((i + 1) % 10 === 0) {
          console.log(`   已刪除 ${i + 1}/${toDelete.length} 條...`);
        }
      } catch (e) {
        console.error(`❌ 刪除 Row ${rowNumber} 失敗`);
      }
    });
    
    console.log(`\n✅ 清理完成！已刪除 ${toDelete.length} 條今天的記錄`);
    
    return { deleted: toDelete.length };
    
  } catch (e) {
    console.error("❌ 清理失敗:", e.message);
    throw e;
  }
}

/**
 * 🗑️ 保留最近 N 條記錄，刪除其他
 * 
 * @param {number} keepCount - 保留的記錄數量
 */
function keepRecentInteractions(keepCount = 10) {
  _initConfig();
  
  console.log(`📝 保留最近 ${keepCount} 條記錄，刪除其他...\n`);
  
  try {
    const sheet = getInteractionLogSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有資料");
      return { deleted: 0, kept: 0 };
    }
    
    const dataRows = lastRow - 1;
    
    if (dataRows <= keepCount) {
      console.log(`✅ 當前只有 ${dataRows} 條記錄，無需刪除`);
      return { deleted: 0, kept: dataRows };
    }
    
    const toDeleteCount = dataRows - keepCount;
    
    console.log(`📊 當前狀態:`);
    console.log(`   總記錄: ${dataRows}`);
    console.log(`   保留: ${keepCount}`);
    console.log(`   刪除: ${toDeleteCount}`);
    
    console.log(`\n🗑️  刪除前 ${toDeleteCount} 條舊記錄...`);
    
    // 刪除第 2 行到第 (toDeleteCount + 1) 行
    sheet.deleteRows(2, toDeleteCount);
    
    console.log(`✅ 已刪除 ${toDeleteCount} 條舊記錄`);
    console.log(`   保留最近 ${keepCount} 條記錄`);
    
    return { deleted: toDeleteCount, kept: keepCount };
    
  } catch (e) {
    console.error("❌ 清理失敗:", e.message);
    throw e;
  }
}

/**
 * 📊 顯示當前狀態（不刪除）
 */
function showInteractionStats() {
  _initConfig();
  
  console.log("📊 互動記錄統計\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log("⚠️  沒有資料");
      return;
    }
    
    const records = data.slice(1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayCount = 0;
    let messageCount = 0;
    let followCount = 0;
    
    const userCounts = {};
    
    records.forEach(row => {
      const timestamp = row[0];
      const userId = row[1];
      const type = row[4];
      
      // 統計今天的
      if (timestamp instanceof Date) {
        const recordDate = new Date(timestamp);
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate.getTime() === today.getTime()) {
          todayCount++;
        }
      }
      
      // 統計類型
      if (type === 'message') messageCount++;
      if (type === 'follow') followCount++;
      
      // 統計用戶
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    });
    
    console.log(`總記錄數: ${records.length}`);
    console.log(`今天的記錄: ${todayCount}`);
    console.log(`\n按類型:`);
    console.log(`   訊息: ${messageCount}`);
    console.log(`   關注: ${followCount}`);
    
    console.log(`\n最活躍用戶（前 5 名）:`);
    const sortedUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    sortedUsers.forEach(([userId, count], i) => {
      console.log(`   ${i + 1}. ${userId.substring(0, 10)}... (${count} 條)`);
    });
    
  } catch (e) {
    console.error("❌ 統計失敗:", e.message);
  }
}
