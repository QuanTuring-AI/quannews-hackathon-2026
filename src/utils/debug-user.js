// ==========================================
// 🔍 用戶查詢調試工具
// ==========================================
// 用於調試用戶 ID 匹配問題

/**
 * 🔍 查找用戶（詳細版）
 * 
 * @param {string} userId - 用戶 ID
 */
function debugFindUser(userId) {
  _initConfig();
  
  console.log("🔍 ==========================================");
  console.log("🔍 用戶查詢調試");
  console.log("🔍 ==========================================\n");
  
  console.log(`📝 查詢的 User ID: "${userId}"`);
  console.log(`   長度: ${userId ? userId.length : 0} 字符`);
  console.log(`   類型: ${typeof userId}`);
  
  try {
    const users = getAllUsersData();
    console.log(`\n📊 Users Sheet 狀態:`);
    console.log(`   總用戶數: ${users.length}`);
    
    if (users.length === 0) {
      console.log("⚠️  Users Sheet 是空的！");
      return null;
    }
    
    // 顯示前 3 個用戶的 User ID
    console.log(`\n📋 前 3 個用戶的 User ID:`);
    users.slice(0, 3).forEach((user, i) => {
      const storedUserId = user["User ID"];
      console.log(`   ${i + 1}. "${storedUserId}"`);
      console.log(`      長度: ${storedUserId ? storedUserId.length : 0}`);
      console.log(`      匹配: ${storedUserId === userId ? "✅" : "❌"}`);
    });
    
    // 嘗試查找
    const foundUser = users.find(user => user["User ID"] === userId);
    
    console.log(`\n🔍 查詢結果:`);
    if (foundUser) {
      console.log("✅ 找到用戶！");
      console.log(`   User ID: ${foundUser["User ID"]}`);
      console.log(`   Display Name: ${foundUser["Display Name"]}`);
      console.log(`   Status: ${foundUser["Status"]}`);
      console.log(`   Row Number: ${foundUser.rowNumber}`);
    } else {
      console.log("❌ 找不到用戶");
      console.log("\n可能原因:");
      console.log("   1. User ID 不在 Users Sheet 中");
      console.log("   2. User ID 有空格或隱藏字符");
      console.log("   3. 大小寫不匹配");
      
      // 嘗試模糊匹配
      if (userId && userId.length >= 20) {
        console.log(`\n🔍 嘗試模糊匹配...`);
        const fuzzyMatch = users.find(user => {
          const storedId = user["User ID"];
          return storedId && storedId.includes(userId.substring(0, 20));
        });
      
        if (fuzzyMatch) {
          console.log("⚠️  找到相似的 User ID:");
          console.log(`   Sheet: "${fuzzyMatch["User ID"]}"`);
          console.log(`   查詢: "${userId}"`);
          console.log(`   Display Name: ${fuzzyMatch["Display Name"]}`);
        }
      }
    }
    
    console.log("\n==========================================\n");
    return foundUser;
    
  } catch (e) {
    console.error("❌ 調試失敗:", e.message);
    console.error("   Stack:", e.stack);
    throw e;
  }
}

/**
 * 🔍 檢查最近的互動記錄
 */
function debugRecentInteractions() {
  _initConfig();
  
  console.log("🔍 最近的互動記錄\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有互動記錄");
      return;
    }
    
    // 讀取最近 3 條記錄
    const count = Math.min(3, lastRow - 1);
    const data = sheet.getRange(lastRow - count + 1, 1, count, 10).getValues();
    
    console.log(`📊 最近 ${count} 條記錄:\n`);
    
    data.forEach((row, i) => {
      console.log(`${i + 1}. Row ${lastRow - count + i + 1}:`);
      console.log(`   Timestamp: ${row[0]}`);
      console.log(`   User ID: "${row[1]}"`);
      console.log(`   Display Name: "${row[2] || '(空白)'}"`);
      console.log(`   Status: "${row[3]}"`);
      console.log(`   Type: ${row[4]}`);
      console.log(`   Content: ${row[5] ? row[5].substring(0, 30) + '...' : '(空白)'}`);
      console.log(``);
    });
    
  } catch (e) {
    console.error("❌ 調試失敗:", e.message);
  }
}

/**
 * 🔍 測試用戶查詢（使用管理員 ID）
 */
function debugAdminUser() {
  _initConfig();
  
  console.log("🔍 測試管理員用戶查詢\n");
  
  // 從配置中獲取 ADMIN_ID
  const adminId = Config.get('ADMIN_ID');
  
  if (!adminId) {
    console.error("❌ ADMIN_ID 未設定！");
    console.log("請執行 setupScriptProperties() 初始化配置");
    return null;
  }
  
  console.log(`📝 Admin ID: ${adminId}\n`);
  
  return debugFindUser(adminId);
}

/**
 * 🔍 直接查詢指定的 User ID
 * 
 * 用法：debugSpecificUser("YOUR_USER_ID")
 */
function debugSpecificUser(userId) {
  _initConfig();
  
  if (!userId) {
    console.error("❌ 請提供 User ID");
    console.log("用法: debugSpecificUser(\"YOUR_USER_ID\")");
    return null;
  }
  
  return debugFindUser(userId);
}

/**
 * 🔍 查詢最近互動的用戶
 */
function debugLastInteractionUser() {
  _initConfig();
  
  console.log("🔍 查詢最近互動的用戶\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有互動記錄");
      return null;
    }
    
    // 讀取最後一條記錄
    const data = sheet.getRange(lastRow, 1, 1, 10).getValues()[0];
    
    const userId = data[1];  // B: User ID
    
    console.log(`📊 最後一條記錄 (Row ${lastRow}):`);
    console.log(`   Timestamp: ${data[0]}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Display Name: "${data[2] || '(空白)'}"`);
    console.log(`   Status: ${data[3]}`);
    console.log(``);
    
    console.log("🔍 查詢此用戶的完整資訊...\n");
    
    return debugFindUser(userId);
    
  } catch (e) {
    console.error("❌ 查詢失敗:", e.message);
    return null;
  }
}

/**
 * 🔧 修復 Display Name（手動更新最近的記錄）
 */
function fixRecentInteractionsDisplayName() {
  _initConfig();
  
  console.log("🔧 修復最近記錄的 Display Name\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有記錄需要修復");
      return;
    }
    
    // 讀取所有記錄（從第 2 行開始）
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    
    let fixedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    
    console.log(`📊 檢查 ${data.length} 條記錄...\n`);
    
    data.forEach((row, i) => {
      const rowNumber = i + 2;
      const userId = row[1];  // B: User ID
      const displayName = row[2];  // C: Display Name
      const currentStatus = row[3];  // D: Status
      
      console.log(`🔍 Row ${rowNumber}: Display Name = "${displayName}"`);
      
      // 如果 Display Name 是空的、Unknown、或只有空格
      const needsFix = !displayName || 
                       displayName === 'Unknown' || 
                       displayName.toString().trim() === '';
      
      if (needsFix) {
        console.log(`   ⚠️  需要修復 (User ID: ${userId.substring(0, 20)}...)`);
        
        // 嘗試查找用戶
        const user = findUser(userId);
        
        if (user && user["Display Name"]) {
          const newName = user["Display Name"];
          const newStatus = user["Status"] || 'Free';
          
          // 更新 Display Name 和 Status
          sheet.getRange(rowNumber, 3).setValue(newName);   // C: Display Name
          sheet.getRange(rowNumber, 4).setValue(newStatus); // D: Status
          
          console.log(`   ✅ 已修復: "${displayName}" → "${newName}"`);
          console.log(`   Status: "${currentStatus}" → "${newStatus}"`);
          
          fixedCount++;
        } else {
          console.log(`   ❌ 找不到用戶資訊`);
          notFoundCount++;
        }
      } else {
        console.log(`   ✓ 已有名稱，跳過`);
        skippedCount++;
      }
    });
    
    console.log(`\n🎉 修復完成！`);
    console.log(`   ✅ 已修復: ${fixedCount} 條記錄`);
    console.log(`   ⏭️  已跳過: ${skippedCount} 條（已有名稱）`);
    console.log(`   ❌ 找不到: ${notFoundCount} 條`);
    
    return { 
      fixed: fixedCount, 
      skipped: skippedCount,
      notFound: notFoundCount,
      total: data.length 
    };
    
  } catch (e) {
    console.error("❌ 修復失敗:", e.message);
    console.error("Stack:", e.stack);
    throw e;
  }
}

/**
 * 🔍 顯示互動記錄的詳細內容（用於調試）
 */
function showInteractionDetails() {
  _initConfig();
  
  console.log("🔍 互動記錄詳細內容\n");
  
  try {
    const sheet = getInteractionLogSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有互動記錄");
      return;
    }
    
    // 讀取所有記錄
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    
    console.log(`📊 總共 ${data.length} 條記錄\n`);
    console.log("=" .repeat(80));
    
    data.forEach((row, i) => {
      const rowNumber = i + 2;
      console.log(`\nRow ${rowNumber}:`);
      console.log(`  [A] Timestamp: ${row[0]}`);
      console.log(`  [B] User ID: ${row[1]}`);
      console.log(`  [C] Display Name: "${row[2]}" (類型: ${typeof row[2]}, 長度: ${row[2] ? row[2].toString().length : 0})`);
      console.log(`  [D] User Status: "${row[3]}"`);
      console.log(`  [E] Interaction Type: "${row[4]}"`);
      console.log(`  [F] Content: ${row[5] ? row[5].toString().substring(0, 30) + '...' : '(空)'}`);
      console.log(`  [G] Bot Reply: ${row[6] ? row[6].toString().substring(0, 30) + '...' : '(空)'}`);
      console.log(`  [H] Response Time: ${row[7]}`);
      console.log(`  [I] News ID: ${row[8]}`);
      console.log(`  [J] Session ID: ${row[9]}`);
      
      // 檢查 Display Name 是否需要修復
      const displayName = row[2];
      const needsFix = !displayName || 
                       displayName === 'Unknown' || 
                       displayName.toString().trim() === '';
      
      if (needsFix) {
        console.log(`  ⚠️  Display Name 需要修復！`);
      }
    });
    
    console.log("\n" + "=".repeat(80));
    
  } catch (e) {
    console.error("❌ 顯示失敗:", e.message);
  }
}

/**
 * 🔧 測試 findUser() - 使用最近互動的 User ID
 */
function testFindUserWithLastInteraction() {
  _initConfig();
  
  console.log("🔧 測試 findUser() 功能\n");
  
  try {
    // 1. 從互動記錄獲取最近的 User ID
    const interactionSheet = getInteractionLogSheet();
    const lastRow = interactionSheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有互動記錄");
      return;
    }
    
    const data = interactionSheet.getRange(lastRow, 1, 1, 10).getValues()[0];
    const testUserId = data[1];  // B: User ID
    
    console.log(`📝 測試 User ID: ${testUserId}`);
    console.log(`   長度: ${testUserId.length} 字符\n`);
    
    // 2. 測試 findUser()
    console.log("🔍 調用 findUser()...");
    const user = findUser(testUserId);
    
    if (user) {
      console.log("✅ 找到用戶！");
      console.log(`   User ID: ${user["User ID"]}`);
      console.log(`   Display Name: ${user["Display Name"]}`);
      console.log(`   Status: ${user["Status"]}`);
      console.log(`   Row Number: ${user.rowNumber}`);
    } else {
      console.log("❌ findUser() 返回 null\n");
      
      // 3. 手動搜尋 Users Sheet
      console.log("🔍 手動搜尋 Users Sheet...");
      const usersSheet = getUsersSheet();
      const usersData = usersSheet.getDataRange().getValues();
      
      console.log(`   總行數: ${usersData.length}`);
      console.log(`   表頭: ${usersData[0].join(", ")}\n`);
      
      // 查找匹配的行
      let found = false;
      for (let i = 1; i < usersData.length; i++) {
        const sheetUserId = usersData[i][0];  // A: User ID
        
        if (sheetUserId === testUserId) {
          console.log(`✅ 在 Users Sheet 找到！(Row ${i + 1})`);
          console.log(`   User ID: ${sheetUserId}`);
          console.log(`   Display Name: ${usersData[i][1]}`);
          console.log(`   Status: ${usersData[i][2]}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log("❌ Users Sheet 中不存在此 User ID");
        console.log("\n🔍 前 3 個 Users Sheet 的 User ID:");
        for (let i = 1; i <= Math.min(3, usersData.length - 1); i++) {
          const sheetUserId = usersData[i][0];
          console.log(`   ${i}. "${sheetUserId}"`);
          console.log(`      長度: ${sheetUserId.length}`);
          console.log(`      匹配: ${sheetUserId === testUserId ? "✅" : "❌"}`);
        }
      }
    }
    
  } catch (e) {
    console.error("❌ 測試失敗:", e.message);
    console.error("Stack:", e.stack);
  }
}

/**
 * 🔍 顯示 Users Sheet 的實際內容（前 5 行）
 */
function showUsersSheetRawData() {
  _initConfig();
  
  console.log("🔍 Users Sheet 實際內容\n");
  
  try {
    const sheet = getUsersSheet();
    const lastRow = sheet.getLastRow();
    const data = sheet.getRange(1, 1, Math.min(6, lastRow), 6).getValues();
    
    console.log("表頭 (Row 1):");
    console.log(`  A: ${data[0][0]}`);
    console.log(`  B: ${data[0][1]}`);
    console.log(`  C: ${data[0][2]}`);
    console.log(`  D: ${data[0][3]}`);
    console.log(`  E: ${data[0][4]}`);
    console.log(`  F: ${data[0][5]}\n`);
    
    console.log("=" .repeat(80));
    
    for (let i = 1; i < data.length; i++) {
      console.log(`\nRow ${i + 1}:`);
      console.log(`  [A] User ID: ${data[i][0]}`);
      console.log(`  [B] Display Name: "${data[i][1]}" (類型: ${typeof data[i][1]})`);
      console.log(`  [C] Status: "${data[i][2]}"`);
      console.log(`  [D] Expiry Date: ${data[i][3]}`);
      console.log(`  [E] Join Date: ${data[i][4]}`);
      console.log(`  [F] Welcome Sent: ${data[i][5]}`);
      
      // 檢查 Display Name 是否為空
      if (!data[i][1] || data[i][1] === '') {
        console.log(`  ⚠️  Display Name 是空的！`);
      }
    }
    
    console.log("\n" + "=".repeat(80));
    
  } catch (e) {
    console.error("❌ 顯示失敗:", e.message);
  }
}

/**
 * 🔧 修復空白的 Display Name（從 LINE 獲取）
 */
function fixEmptyDisplayNames() {
  _initConfig();
  
  console.log("🔧 修復空白的 Display Name\n");
  
  try {
    const sheet = getUsersSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      console.log("⚠️  沒有用戶記錄");
      return;
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    
    let fixedCount = 0;
    
    data.forEach((row, i) => {
      const rowNumber = i + 2;
      const userId = row[0];       // A: User ID
      const displayName = row[1];  // B: Display Name
      const status = row[2];       // C: Status
      
      console.log(`\n🔍 Row ${rowNumber}:`);
      console.log(`   User ID: ${userId.substring(0, 20)}...`);
      console.log(`   Display Name: "${displayName}"`);
      console.log(`   Status: ${status}`);
      
      // 如果 Display Name 是空的
      if (!displayName || displayName === '') {
        console.log(`   ⚠️  Display Name 是空的，嘗試從 LINE 獲取...`);
        
        try {
          // 從 LINE API 獲取用戶資訊
          const profile = getLineUserProfile(userId);
          
          if (profile && profile.displayName) {
            sheet.getRange(rowNumber, 2).setValue(profile.displayName);
            console.log(`   ✅ 已更新: "${profile.displayName}"`);
            fixedCount++;
          } else {
            console.log(`   ❌ 無法從 LINE 獲取用戶資訊`);
          }
        } catch (e) {
          console.error(`   ❌ 獲取失敗: ${e.message}`);
        }
      } else {
        console.log(`   ✓ 已有名稱，跳過`);
      }
    });
    
    console.log(`\n🎉 修復完成！`);
    console.log(`   已修復: ${fixedCount} 條記錄`);
    
    return fixedCount;
    
  } catch (e) {
    console.error("❌ 修復失敗:", e.message);
    throw e;
  }
}

/**
 * 📊 顯示 Users Sheet 統計
 */
function showUsersStats() {
  _initConfig();
  
  console.log("📊 Users Sheet 統計\n");
  
  try {
    const users = getAllUsersData();
    
    console.log(`總用戶數: ${users.length}`);
    
    const stats = {
      Admin: 0,
      VIP: 0,
      Free: 0
    };
    
    users.forEach(user => {
      const status = user["Status"] || 'Free';
      stats[status] = (stats[status] || 0) + 1;
    });
    
    console.log(`\n按身份分佈:`);
    console.log(`   Admin: ${stats.Admin}`);
    console.log(`   VIP: ${stats.VIP}`);
    console.log(`   Free: ${stats.Free}`);
    
    console.log(`\n前 5 位用戶:`);
    users.slice(0, 5).forEach((user, i) => {
      console.log(`   ${i + 1}. ${user["Display Name"]} (${user["Status"]})`);
      console.log(`      User ID: ${user["User ID"].substring(0, 20)}...`);
    });
    
  } catch (e) {
    console.error("❌ 統計失敗:", e.message);
  }
}
