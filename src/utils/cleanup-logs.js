// ==========================================
// 🧹 清理重複互動記錄
// ==========================================
// 用於清理測試或異常產生的重複記錄

/**
 * 🧹 清理重複的互動記錄
 * 
 * 保留規則：
 * - 相同 User ID + Content + Timestamp (精確到分鐘) 的記錄
 * - 保留第一條，刪除後續重複的
 * 
 * @param {boolean} dryRun - 是否為模擬運行（不實際刪除）
 * @returns {Object} 清理統計
 */
function cleanupDuplicateInteractions(dryRun = true) {
  _initConfig();
  
  console.log("🧹 ==========================================");
  console.log("🧹 開始清理重複互動記錄");
  console.log(`   模式: ${dryRun ? "模擬運行（不刪除）" : "實際刪除"}`);
  console.log("🧹 ==========================================\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log("⚠️  沒有資料需要清理");
      return { total: 0, duplicates: 0, deleted: 0 };
    }
    
    // 跳過表頭，從第 2 行開始
    const records = data.slice(1);
    const totalRecords = records.length;
    
    console.log(`📊 總記錄數: ${totalRecords} 條\n`);
    
    // 使用 Map 追蹤已見過的記錄
    const seen = new Map();
    const duplicateRows = [];
    
    // 檢測重複
    records.forEach((row, index) => {
      const rowNumber = index + 2; // +2 因為跳過表頭且從 1 開始
      
      const timestamp = row[0]; // A: Timestamp
      const userId = row[1];     // B: User ID
      const content = row[5];    // F: Content
      
      // 創建唯一鍵（精確到分鐘）
      let minuteTimestamp = '';
      try {
        if (timestamp instanceof Date) {
          minuteTimestamp = Utilities.formatDate(
            new Date(timestamp.getTime()),
            "GMT+8",
            "yyyy-MM-dd HH:mm"
          );
        } else if (typeof timestamp === 'string') {
          const date = new Date(timestamp);
          minuteTimestamp = Utilities.formatDate(date, "GMT+8", "yyyy-MM-dd HH:mm");
        }
      } catch (e) {
        console.warn(`⚠️  無法解析時間戳 (Row ${rowNumber})`);
        return;
      }
      
      const key = `${userId}|${content}|${minuteTimestamp}`;
      
      if (seen.has(key)) {
        // 重複記錄
        const firstOccurrence = seen.get(key);
        duplicateRows.push({
          row: rowNumber,
          userId: userId,
          content: content ? content.substring(0, 30) + '...' : '(空)',
          timestamp: minuteTimestamp,
          firstOccurrence: firstOccurrence
        });
      } else {
        // 首次出現
        seen.set(key, rowNumber);
      }
    });
    
    // 報告結果
    console.log(`\n📈 檢測結果:`);
    console.log(`   ✅ 唯一記錄: ${seen.size} 條`);
    console.log(`   ❌ 重複記錄: ${duplicateRows.length} 條`);
    
    if (duplicateRows.length === 0) {
      console.log(`\n🎉 沒有發現重複記錄！`);
      return {
        total: totalRecords,
        unique: seen.size,
        duplicates: 0,
        deleted: 0
      };
    }
    
    // 顯示前 10 筆重複記錄
    console.log(`\n📋 重複記錄列表（前 10 筆）:`);
    duplicateRows.slice(0, 10).forEach((dup, i) => {
      console.log(`   ${i + 1}. Row ${dup.row}`);
      console.log(`      User: ${dup.userId}`);
      console.log(`      Content: ${dup.content}`);
      console.log(`      Time: ${dup.timestamp}`);
      console.log(`      首次出現: Row ${dup.firstOccurrence}`);
    });
    
    if (duplicateRows.length > 10) {
      console.log(`   ... 還有 ${duplicateRows.length - 10} 條重複記錄`);
    }
    
    // 執行刪除（或模擬）
    let deletedCount = 0;
    
    if (!dryRun) {
      console.log(`\n🗑️  開始刪除重複記錄...`);
      
      // 從後往前刪除（避免行號變動）
      const sortedRows = duplicateRows
        .map(d => d.row)
        .sort((a, b) => b - a); // 降序
      
      sortedRows.forEach(rowNumber => {
        try {
          sheet.deleteRow(rowNumber);
          deletedCount++;
          
          if (deletedCount % 10 === 0) {
            console.log(`   已刪除 ${deletedCount}/${duplicateRows.length} 條...`);
          }
        } catch (e) {
          console.error(`❌ 刪除 Row ${rowNumber} 失敗: ${e.message}`);
        }
      });
      
      console.log(`\n✅ 刪除完成: ${deletedCount} 條`);
    } else {
      console.log(`\n⚠️  模擬模式：未實際刪除`);
      console.log(`   如要真正刪除，請執行: cleanupDuplicateInteractions(false)`);
    }
    
    // 總結
    console.log("\n" + "=".repeat(60));
    console.log("🎊 清理完成！");
    console.log(`   總記錄: ${totalRecords}`);
    console.log(`   唯一記錄: ${seen.size}`);
    console.log(`   重複記錄: ${duplicateRows.length}`);
    console.log(`   已刪除: ${deletedCount}`);
    console.log("=".repeat(60) + "\n");
    
    return {
      total: totalRecords,
      unique: seen.size,
      duplicates: duplicateRows.length,
      deleted: deletedCount
    };
    
  } catch (e) {
    console.error("❌ 清理失敗:", e.message);
    console.error("   Stack:", e.stack);
    throw e;
  }
}

/**
 * 🧪 測試清理（模擬運行）
 */
function testCleanupInteractions() {
  console.log("🧪 測試清理重複記錄（模擬模式）\n");
  cleanupDuplicateInteractions(true);
}

/**
 * ⚠️ 實際清理（真正刪除）
 * 
 * 警告：此操作不可逆！
 */
function confirmCleanupInteractions() {
  console.log("⚠️  ==========================================");
  console.log("⚠️  警告：即將實際刪除重複記錄！");
  console.log("⚠️  此操作不可逆，請確認已備份資料");
  console.log("⚠️  ==========================================\n");
  
  // 先執行一次模擬
  const result = cleanupDuplicateInteractions(true);
  
  if (result.duplicates === 0) {
    console.log("\n🎉 沒有重複記錄需要刪除");
    return;
  }
  
  console.log("\n⚠️  如確認要刪除，請執行:");
  console.log("   cleanupDuplicateInteractions(false)");
}

/**
 * 🗓️ 清理指定日期之前的記錄
 * 
 * @param {string} beforeDate - 日期字串 (YYYY-MM-DD)
 * @param {boolean} dryRun - 是否為模擬運行
 */
function cleanupInteractionsBeforeDate(beforeDate, dryRun = true) {
  _initConfig();
  
  console.log("🗓️  清理指定日期之前的記錄");
  console.log(`   截止日期: ${beforeDate}`);
  console.log(`   模式: ${dryRun ? "模擬運行" : "實際刪除"}\n`);
  
  try {
    const sheet = getInteractionLogSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log("⚠️  沒有資料");
      return;
    }
    
    const cutoffDate = new Date(beforeDate);
    const records = data.slice(1);
    const toDelete = [];
    
    records.forEach((row, index) => {
      const rowNumber = index + 2;
      const timestamp = row[0];
      
      let recordDate;
      if (timestamp instanceof Date) {
        recordDate = timestamp;
      } else if (typeof timestamp === 'string') {
        recordDate = new Date(timestamp);
      } else {
        return;
      }
      
      if (recordDate < cutoffDate) {
        toDelete.push({
          row: rowNumber,
          date: Utilities.formatDate(recordDate, "GMT+8", "yyyy-MM-dd HH:mm:ss")
        });
      }
    });
    
    console.log(`📊 檢測結果:`);
    console.log(`   總記錄: ${records.length}`);
    console.log(`   需刪除: ${toDelete.length}\n`);
    
    if (toDelete.length === 0) {
      console.log("🎉 沒有需要刪除的記錄");
      return;
    }
    
    // 顯示前 5 筆
    console.log(`📋 待刪除記錄（前 5 筆）:`);
    toDelete.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. Row ${item.row} - ${item.date}`);
    });
    
    if (!dryRun) {
      console.log(`\n🗑️  開始刪除...`);
      
      // 從後往前刪除
      const sortedRows = toDelete
        .map(d => d.row)
        .sort((a, b) => b - a);
      
      let deleted = 0;
      sortedRows.forEach(rowNumber => {
        try {
          sheet.deleteRow(rowNumber);
          deleted++;
        } catch (e) {
          console.error(`❌ 刪除 Row ${rowNumber} 失敗`);
        }
      });
      
      console.log(`\n✅ 已刪除 ${deleted} 條記錄`);
    } else {
      console.log(`\n⚠️  模擬模式：未實際刪除`);
    }
    
  } catch (e) {
    console.error("❌ 清理失敗:", e.message);
    throw e;
  }
}
