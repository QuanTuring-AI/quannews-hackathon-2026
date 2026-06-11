// ==========================================
// 💎 VIP 管理工具
// ==========================================
// 手動升級用戶為 VIP

/**
 * 🎯 快速升級用戶為 VIP
 * 
 * 使用方法：
 * 1. 修改下面的 targetUserId
 * 2. 修改 addDays（天數）
 * 3. 在 Apps Script 編輯器執行 Admin_TriggerUpgrade()
 * 
 * @example
 * // 升級某用戶為 VIP，有效期 30 天
 * Admin_TriggerUpgrade()
 */
function Admin_TriggerUpgrade() {
  _initConfig();
  
  // ==========================================
  // ⭐ 在這裡修改
  // ==========================================
  
  // 1️⃣ 用戶 ID（從 Users Sheet 或 User_Interactions Sheet 獲取）
  const targetUserId = "YOUR_TARGET_LINE_USER_ID"; // 例: U + 32 hex chars
  
  // 2️⃣ 增加天數（例如：30 = 1 個月，365 = 1 年）
  const addDays = 14; 
  
  // ==========================================
  
  console.log("💎 ==========================================");
  console.log("💎 VIP 升級工具");
  console.log("💎 ==========================================\n");
  
  console.log(`👤 目標用戶: ${targetUserId}`);
  console.log(`📅 增加天數: ${addDays} 天\n`);
  
  // 🚀 執行升級
  return upgradeUserToVip(targetUserId, addDays);
}

/**
 * 💎 升級用戶為 VIP（核心邏輯）
 * 
 * 功能：
 * - 新用戶：從今天開始計算
 * - 續約：從原到期日累加（不浪費剩餘天數）
 * - 自動更新 Sheet
 * - 發送 LINE 通知
 * 
 * @param {string} userId - 用戶 ID
 * @param {number} days - 增加天數
 * @returns {boolean} 是否成功
 */
function upgradeUserToVip(userId, days) {
  _initConfig();
  
  try {
    // 1. 查找用戶
    const user = findUser(userId);
    
    if (!user) {
      console.error(`❌ 找不到用戶: ${userId}`);
      console.log("\n💡 提示：");
      console.log("   1. 檢查 User ID 是否正確");
      console.log("   2. 確認用戶存在於 Users Sheet");
      return false;
    }
    
    const currentStatus = user["Status"];
    const oldExpiryDate = user["Expiry Date"];
    const displayName = user["Display Name"] || "用戶";
    
    console.log(`\n📋 用戶資訊:`);
    console.log(`   名稱: ${displayName}`);
    console.log(`   當前身份: ${currentStatus}`);
    console.log(`   當前到期日: ${oldExpiryDate || "無"}`);
    
    // 2. 計算新的到期日
    let baseDate = new Date(); // 預設：從今天開始
    let isRenewal = false;
    
    // 續約偵測：如果已經是 VIP 且合約還沒到期
    if (currentStatus === "VIP" && oldExpiryDate) {
      const expiry = new Date(oldExpiryDate);
      const today = new Date();
      
      if (expiry > today) {
        // 從舊到期日累加（不浪費剩餘天數）
        baseDate = new Date(expiry.getTime());
        isRenewal = true;
        console.log(`\n💡 偵測到續約需求，將從原到期日累加`);
      }
    }
    
    // 計算新日期
    const newExpiryDate = new Date(baseDate.getTime());
    newExpiryDate.setDate(newExpiryDate.getDate() + days);
    
    const dateStr = Utilities.formatDate(
      newExpiryDate, 
      Session.getScriptTimeZone(), 
      "yyyy/MM/dd"
    );
    
    console.log(`\n📅 新的到期日: ${dateStr}`);
    
    // 3. 更新 Sheet
    const userData = {
      userId: userId,
      status: "VIP",
      expiryDate: newExpiryDate
    };
    
    upsertUser(userData);
    
    // 4. 發送 LINE 通知
    const actionTitle = isRenewal ? "成功續約" : "升級成功";
    const message = 
      `🎉 恭喜！VIP 會員${actionTitle}\n\n` +
      `✅ 權限已延長：${days} 天\n` +
      `📅 新的到期日：${dateStr}\n\n` +
      `您的支持是電路貓買罐罐的動力！💎`;
    
    pushLineTextMessage(userId, message);
    
    console.log(`\n✅ [${actionTitle}] 完成！`);
    console.log(`   用戶: ${displayName}`);
    console.log(`   新到期日: ${dateStr}`);
    
    return true;
    
  } catch (e) {
    console.error(`❌ 升級失敗: ${e.message}`);
    console.error(`   Stack: ${e.stack}`);
    return false;
  }
}

/**
 * 📋 批量升級多個用戶
 * 
 * @param {Array<string>} userIds - 用戶 ID 列表
 * @param {number} days - 增加天數
 * @returns {Object} 結果統計
 */
function batchUpgradeUsers(userIds, days) {
  _initConfig();
  
  console.log("💎 批量升級 VIP\n");
  console.log(`📋 用戶數: ${userIds.length}`);
  console.log(`📅 增加天數: ${days} 天\n`);
  
  const results = {
    success: [],
    failed: []
  };
  
  userIds.forEach((userId, index) => {
    console.log(`\n[${index + 1}/${userIds.length}] 處理: ${userId}`);
    
    const success = upgradeUserToVip(userId, days);
    
    if (success) {
      results.success.push(userId);
    } else {
      results.failed.push(userId);
    }
    
    // 延遲避免 API 限制
    Utilities.sleep(1000);
  });
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 批量升級完成");
  console.log(`   ✅ 成功: ${results.success.length}`);
  console.log(`   ❌ 失敗: ${results.failed.length}`);
  console.log("=".repeat(50));
  
  return results;
}

/**
 * 🔍 查詢用戶 VIP 狀態
 * 
 * @param {string} userId - 用戶 ID
 */
function checkUserVipStatus(userId) {
  _initConfig();
  
  console.log("🔍 查詢 VIP 狀態\n");
  
  const user = findUser(userId);
  
  if (!user) {
    console.log(`❌ 找不到用戶: ${userId}`);
    return null;
  }
  
  const status = user["Status"];
  const expiryDate = user["Expiry Date"];
  const displayName = user["Display Name"] || "Unknown";
  
  console.log(`👤 用戶: ${displayName}`);
  console.log(`🆔 User ID: ${userId}`);
  console.log(`💎 身份: ${status}`);
  
  if (status === "VIP" && expiryDate) {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    const dateStr = Utilities.formatDate(
      expiry, 
      Session.getScriptTimeZone(), 
      "yyyy/MM/dd"
    );
    
    console.log(`📅 到期日: ${dateStr}`);
    console.log(`⏰ 剩餘天數: ${daysLeft} 天`);
    
    if (daysLeft < 0) {
      console.log(`⚠️  已過期 ${-daysLeft} 天`);
    } else if (daysLeft <= 7) {
      console.log(`⚠️  即將到期（7 天內）`);
    }
  } else {
    console.log(`📅 到期日: 無`);
  }
  
  return user;
}

/**
 * 📊 顯示所有 VIP 用戶
 */
function listAllVipUsers() {
  _initConfig();
  
  console.log("💎 VIP 用戶列表\n");
  
  const users = getAllUsersData();
  const vipUsers = users.filter(user => user["Status"] === "VIP");
  
  console.log(`📊 總 VIP 數: ${vipUsers.length}\n`);
  console.log("=".repeat(80));
  
  vipUsers.forEach((user, index) => {
    const displayName = user["Display Name"] || "Unknown";
    const userId = user["User ID"];
    const expiryDate = user["Expiry Date"];
    
    console.log(`\n${index + 1}. ${displayName}`);
    console.log(`   User ID: ${userId.substring(0, 20)}...`);
    
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      const dateStr = Utilities.formatDate(
        expiry, 
        Session.getScriptTimeZone(), 
        "yyyy/MM/dd"
      );
      
      console.log(`   到期日: ${dateStr}`);
      console.log(`   剩餘: ${daysLeft} 天 ${daysLeft < 7 ? "⚠️" : ""}`);
    }
  });
  
  console.log("\n" + "=".repeat(80));
  
  return vipUsers;
}

/**
 * 🧪 測試升級功能
 */
function testVipUpgrade() {
  _initConfig();
  
  console.log("🧪 測試 VIP 升級功能\n");
  
  // 使用 Admin ID 測試
  if (!ADMIN_ID) {
    console.error("❌ ADMIN_ID 未設定");
    return;
  }
  
  console.log("📋 查詢 Admin 狀態...");
  checkUserVipStatus(ADMIN_ID);
  
  console.log("\n✅ 測試完成");
  console.log("如需實際升級，請修改 Admin_TriggerUpgrade() 並執行");
}
