// ==========================================
// 🎁 VIP 試用配置管理
// ==========================================
// 用於管理新用戶自動贈送的 VIP 試用天數

/**
 * 🔍 查看當前 VIP 試用天數設定
 */
function viewVipTrialConfig() {
  console.log("🎁 VIP 試用設定");
  console.log("=".repeat(60));
  
  const trialDays = Config.get('VIP_TRIAL_DAYS') || 7;
  
  console.log(`\n📅 當前設定: ${trialDays} 天\n`);
  
  // 顯示範例到期日
  const exampleDate = new Date();
  exampleDate.setDate(exampleDate.getDate() + trialDays);
  const exampleStr = Utilities.formatDate(
    exampleDate, 
    Session.getScriptTimeZone(), 
    "yyyy-MM-dd"
  );
  
  console.log(`💡 範例：今天加入的新用戶`);
  console.log(`   身份: VIP (試用)`);
  console.log(`   到期日: ${exampleStr}`);
  console.log(`   試用期: ${trialDays} 天`);
  
  console.log("\n" + "=".repeat(60));
  
  return trialDays;
}

/**
 * ⚙️ 更新 VIP 試用天數
 * 
 * @param {number} newDays - 新的試用天數
 */
function updateVipTrialDays(newDays) {
  console.log("⚙️ 更新 VIP 試用設定");
  console.log("=".repeat(60));
  
  // 驗證輸入
  if (!newDays || newDays < 1) {
    console.error("❌ 錯誤：天數必須大於 0");
    return false;
  }
  
  if (newDays > 365) {
    console.error("❌ 錯誤：天數不能超過 365 天");
    return false;
  }
  
  const oldDays = Config.get('VIP_TRIAL_DAYS') || 7;
  
  console.log(`\n📊 變更內容:`);
  console.log(`   舊設定: ${oldDays} 天`);
  console.log(`   新設定: ${newDays} 天`);
  
  // 注意：需要手動修改 config.js
  console.log(`\n⚠️  重要：此功能顯示設定值，實際修改需要：`);
  console.log(`\n📝 手動修改步驟:`);
  console.log(`   1. 打開 src/config.js`);
  console.log(`   2. 找到 VIP_TRIAL_DAYS: ${oldDays}`);
  console.log(`   3. 改為 VIP_TRIAL_DAYS: ${newDays}`);
  console.log(`   4. 執行 clasp push 部署`);
  
  console.log("\n" + "=".repeat(60));
  
  return true;
}

/**
 * 📊 試用天數建議
 */
function showVipTrialSuggestions() {
  console.log("📊 VIP 試用天數建議");
  console.log("=".repeat(60));
  
  const suggestions = [
    { days: 3, desc: "短期試用", scenario: "測試期、小規模推廣" },
    { days: 7, desc: "標準試用 (推薦)", scenario: "一般宣傳、平衡體驗與轉換" },
    { days: 14, desc: "充分試用", scenario: "大型活動、深度體驗" },
    { days: 30, desc: "長期試用", scenario: "特殊合作、重要推廣" }
  ];
  
  console.log("\n常見設定：\n");
  
  suggestions.forEach((item, i) => {
    console.log(`${i + 1}. ${item.days} 天 - ${item.desc}`);
    console.log(`   適用場景: ${item.scenario}\n`);
  });
  
  console.log("=".repeat(60));
  console.log("\n💡 提示：");
  console.log("   • 太短（< 3 天）：用戶可能來不及體驗");
  console.log("   • 太長（> 30 天）：影響付費轉換率");
  console.log("   • 建議範圍：3-14 天");
  console.log("=".repeat(60));
}

/**
 * 🧪 測試新用戶體驗
 * 
 * 模擬新用戶加入後的狀態
 */
function testNewUserExperience() {
  console.log("🧪 測試新用戶體驗");
  console.log("=".repeat(60));
  
  const trialDays = Config.get('VIP_TRIAL_DAYS') || 7;
  
  // 模擬新用戶
  const joinDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + trialDays);
  
  const joinStr = Utilities.formatDate(
    joinDate, 
    Session.getScriptTimeZone(), 
    "yyyy-MM-dd HH:mm"
  );
  
  const expiryStr = Utilities.formatDate(
    expiryDate, 
    Session.getScriptTimeZone(), 
    "yyyy-MM-dd"
  );
  
  console.log("\n👤 新用戶資料:");
  console.log(`   加入時間: ${joinStr}`);
  console.log(`   初始身份: VIP (試用)`);
  console.log(`   試用天數: ${trialDays} 天`);
  console.log(`   到期日期: ${expiryStr}`);
  
  console.log("\n🎁 歡迎禮包:");
  console.log(`   • VIP 身份試用 ${trialDays} 天`);
  console.log(`   • 精選 2 篇優質報告`);
  console.log(`   • 每日 2 篇報告配額`);
  
  console.log("\n📅 試用期後:");
  console.log(`   • 自動降級為 Free 用戶`);
  console.log(`   • 改為每週一、三、五收到 1 篇報告`);
  console.log(`   • 可隨時升級為正式 VIP`);
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ 測試完成");
}

/**
 * 📋 顯示完整設定狀態
 */
function showFullVipTrialStatus() {
  console.log("📋 VIP 試用完整狀態");
  console.log("=".repeat(60));
  
  const trialDays = Config.get('VIP_TRIAL_DAYS') || 7;
  const vipPrice = Config.get('VIP_PRICE') || 0;
  
  console.log("\n⚙️ 當前設定:");
  console.log(`   VIP 試用天數: ${trialDays} 天`);
  console.log(`   VIP 價格: NT$ ${vipPrice} / 月`);
  
  console.log("\n🎁 新用戶自動獲得:");
  console.log(`   ✓ VIP 身份（${trialDays} 天）`);
  console.log(`   ✓ 歡迎禮包（2 篇精選報告）`);
  console.log(`   ✓ 每日 2 篇報告配額`);
  
  console.log("\n📊 身份差異:");
  console.log("   VIP (試用/正式):");
  console.log("     • 每天收到 2 篇報告");
  console.log("     • 最高評分優先");
  console.log("   Free:");
  console.log("     • 每週一、三、五收到 1 篇");
  console.log("     • VIP 報告的子集");
  
  console.log("\n⏰ 到期機制:");
  console.log("   • 每天午夜自動檢查");
  console.log("   • 自動降級為 Free");
  console.log("   • 發送通知提醒");
  
  console.log("\n" + "=".repeat(60));
}

/**
 * 🔄 快速設定常用天數
 */
function setVipTrialTo3Days() {
  console.log("⚙️ 快速設定：3 天試用");
  updateVipTrialDays(3);
}

function setVipTrialTo7Days() {
  console.log("⚙️ 快速設定：7 天試用（標準）");
  updateVipTrialDays(7);
}

function setVipTrialTo14Days() {
  console.log("⚙️ 快速設定：14 天試用");
  updateVipTrialDays(14);
}

function setVipTrialTo30Days() {
  console.log("⚙️ 快速設定：30 天試用");
  updateVipTrialDays(30);
}

/**
 * 📈 統計試用用戶
 */
function showVipTrialStats() {
  _initConfig();
  
  console.log("📈 VIP 試用用戶統計");
  console.log("=".repeat(60));
  
  try {
    const users = getAllUsersData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let stats = {
      totalVip: 0,
      activeVip: 0,
      expiredVip: 0,
      expiringVip: 0,  // 7 天內到期
      freeUsers: 0
    };
    
    users.forEach(user => {
      const status = user["Status"];
      
      if (status === "VIP") {
        stats.totalVip++;
        
        const expiryDate = user["Expiry Date"];
        if (expiryDate) {
          const expiry = new Date(expiryDate);
          expiry.setHours(0, 0, 0, 0);
          
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          
          if (daysLeft < 0) {
            stats.expiredVip++;
          } else {
            stats.activeVip++;
            if (daysLeft <= 7) {
              stats.expiringVip++;
            }
          }
        } else {
          stats.activeVip++;  // 永久 VIP（無到期日）
        }
      } else if (status === "Free") {
        stats.freeUsers++;
      }
    });
    
    console.log(`\n📊 用戶統計:`);
    console.log(`   總用戶數: ${users.length} 位`);
    console.log(`   VIP 用戶: ${stats.totalVip} 位`);
    console.log(`     └─ 有效 VIP: ${stats.activeVip} 位`);
    console.log(`     └─ 已過期: ${stats.expiredVip} 位`);
    console.log(`     └─ 7天內到期: ${stats.expiringVip} 位`);
    console.log(`   Free 用戶: ${stats.freeUsers} 位`);
    
    console.log("\n" + "=".repeat(60));
    
    return stats;
    
  } catch (e) {
    console.error(`❌ 統計失敗: ${e.message}`);
    return null;
  }
}
