// ==========================================
// 🎁 新戶歡迎控制器 (Onboarding Controller)
// ==========================================
// 職責：新用戶歡迎、禮包發送、生命週期管理

/**
 * 🎁 發送新戶禮包
 * 
 * 功能：
 * 1. 初始化用戶資料
 * 2. 篩選歡迎禮包（2 篇精選）
 * 3. 發送歡迎訊息
 * 4. 標記禮包已發送
 * 
 * @param {string} userId - LINE 用戶 ID
 * @returns {boolean} 是否成功
 */
function sendWelcomePackage(userId) {
  _initConfig();
  
  console.log("\n🎁 ====== 新戶禮包啟動 ======");
  console.log(`👤 目標用戶: ${userId}`);
  
  try {
    // 1. 獲取用戶資料
    const profile = getLineUserProfile(userId);
    const displayName = profile ? profile.displayName : "新朋友";
    
    console.log(`👋 歡迎: ${displayName}`);
    
    // 2. 初始化用戶記錄
    handleNewUser(userId, displayName);
    
    // 3. 發送歡迎訊息（包含 VIP 試用資訊）
    sendWelcomeMessage(userId, displayName);

    // 4. 發送當日美股快訊（如有）
    var sentCount = 0;
    var today = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
    var flash = findUSStockFlashByDate(today);
    if (flash && flash.status === "Finished") {
      console.log("\n🇺🇸 發送當日美股快訊...");
      var parsedInsights = [];
      try { parsedInsights = JSON.parse(flash.rawData || '{}').insights || []; } catch (_) {}
      sendUSStockFlexMessage(userId, {
        title: flash.seoHeadline,
        insights: parsedInsights,
        imageUrl: convertDriveLinkToImageUrl(flash.imageLink),
        viewUrl: flash.outputPdf || flash.slideLink,
        sourceUrl: flash.slideLink
      }, "VIP");
      sentCount++;
      Utilities.sleep(1000);
    } else {
      console.log("⚠️ 今日尚無美股快訊，跳過");
    }

    // 5. 發送 1 篇研析報告
    console.log("\n📰 篩選研析報告...");
    var welcomeNews = selectWelcomeNews(1);
    welcomeNews.forEach(function(news) {
      console.log(`   📋 ${news.title}`);
      sendLineFlexMessage(userId, news, "VIP");
      sentCount++;
      Utilities.sleep(1000);
    });

    if (sentCount === 0) {
      console.log("⚠️ 暫無可發送的內容");
    }
    
    // 6. 標記禮包已發送
    markWelcomePackageSent(userId);
    
    console.log("\n✅ 禮包發送完成！");
    console.log("====== 新戶禮包結束 ======\n");
    
    return true;
    
  } catch (error) {
    console.error(`❌ 禮包發送失敗: ${error.message}`);
    return false;
  }
}

/**
 * 📰 篩選歡迎禮包新聞
 * 
 * 篩選邏輯：
 * 1. 必须已发送过（Sent 状态）
 * 2. 必须有完整资料（图片、PDF）
 * 3. 评分衰减机制
 * 4. 取前 N 名
 * 
 * @param {number} count - 礼包数量（默认 2）
 * @returns {Array<Object>} 新闻列表
 */
function selectWelcomeNews(count = 2) {
  _initConfig();
  
  const sheet = getNewsSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const DECAY_FACTOR = 0.05;
  const candidates = [];
  
  let stats = {
    total: 0,
    notSent: 0,
    noDate: 0,
    noImage: 0,
    noPdf: 0,
    tooOld: 0,
    qualified: 0
  };
  
  // 从第 2 列开始
  for (let i = 1; i < data.length; i++) {
    stats.total++;
    const row = data[i];
    
    const fileName = row[1] || "Unknown";
    const lineStatus = String(row[13] || "").trim();
    
    // 必須已發送過
    if (!lineStatus.startsWith("Sent")) {
      stats.notSent++;
      continue;
    }
    
    // 解析日期
    let analyzedDate;
    const rawDate = row[2];
    
    if (rawDate instanceof Date) {
      analyzedDate = new Date(rawDate);
    } else if (typeof rawDate === 'string' && rawDate.trim() !== '') {
      analyzedDate = new Date(rawDate);
    } else {
      stats.noDate++;
      continue;
    }
    
    if (isNaN(analyzedDate.getTime())) {
      stats.noDate++;
      continue;
    }
    
    analyzedDate.setHours(0, 0, 0, 0);
    
    const score = Number(row[4]) || 0;
    const imageLink = row[10];
    const outputPdf = row[12];
    
    // 檢查完整性
    if (!isValidUrl(imageLink)) {
      stats.noImage++;
      continue;
    }
    
    if (!isValidUrl(outputPdf)) {
      stats.noPdf++;
      continue;
    }
    
    // 计算有效评分
    const daysDiff = Math.floor((today - analyzedDate) / (1000 * 60 * 60 * 24));
    const effectiveScore = score - (daysDiff * DECAY_FACTOR);
    
    if (effectiveScore < 6) {
      stats.tooOld++;
      continue;
    }
    
    stats.qualified++;
    candidates.push({
      fileName: fileName,
      title: row[8],
      score: score,
      effectiveScore: effectiveScore,
      daysOld: daysDiff,
      imageUrl: convertDriveLinkToImageUrl(imageLink),
      viewUrl: outputPdf,
      sourceUrl: row[9],
      summary: row[5],
      rowNumber: i + 1
    });
  }
  
  console.log(`\n📊 禮包候選統計:`);
  console.log(`   合格: ${stats.qualified} | 未發送: ${stats.notSent} | 太舊: ${stats.tooOld}`);
  
  // 按有效评分排序
  candidates.sort((a, b) => b.effectiveScore - a.effectiveScore);
  
  return candidates.slice(0, count);
}

/**
 * 👤 處理新用戶
 * 
 * @param {string} userId - 用户 ID
 * @param {string} displayName - 显示名称
 */
function handleNewUser(userId, displayName) {
  const existingUser = findUser(userId);
  
  if (existingUser) {
    console.log(`👋 用户已存在: ${displayName}`);
    return;
  }
  
  // 🎁 計算 VIP 試用到期日
  const trialDays = Config.get('VIP_TRIAL_DAYS') || 7;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + trialDays);
  
  const expiryStr = Utilities.formatDate(
    expiryDate, 
    Session.getScriptTimeZone(), 
    "yyyy/MM/dd"
  );
  
  // 新增用户（自動贈送 VIP 試用）
  const userData = {
    userId: userId,
    displayName: displayName,
    status: "VIP",              // 🎁 自動 VIP
    expiryDate: expiryDate,     // 🎁 設定到期日
    joinDate: new Date(),
    welcomeSent: false
  };
  
  upsertUser(userData);
  console.log(`🎁 新用户已初始化: ${displayName}`);
  console.log(`   身份: VIP (試用 ${trialDays} 天)`);
  console.log(`   到期日: ${expiryStr}`);
}

/**
 * 🔄 處理回歸用戶
 * 
 * @param {string} userId - 用户 ID
 */
function handleReturningUser(userId) {
  const user = findUser(userId);
  
  if (!user) {
    console.log("⚠️  找不到用户紀錄");
    return;
  }
  
  const displayName = user["Display Name"];
  console.log(`👋 歡迎回來: ${displayName}`);
  
  // 可以在这里加入回归用户的特殊逻辑
  // 例如：發送特別優惠、檢查 VIP 到期等
}

/**
 * 💬 發送歡迎訊息
 * 
 * @param {string} userId - 用户 ID
 * @param {string} displayName - 显示名称
 */
function sendWelcomeMessage(userId, displayName) {
  // 🎁 獲取 VIP 試用天數
  const trialDays = Config.get('VIP_TRIAL_DAYS') || 7;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + trialDays);
  const expiryStr = Utilities.formatDate(
    expiryDate, 
    Session.getScriptTimeZone(), 
    "MM月dd日"
  );
  
  const welcomeText =
    `Hi ${displayName}，歡迎加入【量識Q報】！🎉\n\n` +
    `我是電路貓🐱，您的 AI 投資情報助手。\n\n` +
    `📰 每天為您提供：\n` +
    `   🇺🇸 美股快訊 — 每日 5 則重點整理\n` +
    `   📊 AI 視覺化摘要 + 深度見解\n\n` +
    `🎁 新戶禮物：\n` +
    `   ✨ VIP 身份試用 ${trialDays} 天（到期：${expiryStr}）\n` +
    `   🇺🇸 每日美股快訊（所有用戶享有）\n` +
    `   📋 VIP 期間每日 2 篇深度研析報告\n\n` +
    `💬 隨時跟我聊天，問我市場問題！\n\n` +
    `讓我們開始吧！(尾巴搖動)`;
  
  pushLineTextMessage(userId, welcomeText);
  console.log(`💬 歡迎訊息已發送（VIP ${trialDays} 天試用）`);
}

/**
 * ✅ 標記禮包已發送
 * 
 * @param {string} userId - 用户 ID
 */
function markWelcomePackageSent(userId) {
  const userData = {
    userId: userId,
    welcomeSent: true
  };
  
  upsertUser(userData);
  console.log(`✅ 已標記禮包狀態`);
}

/**
 * ⏰ 檢查 VIP 到期
 * 
 * 掃描所有 VIP 用戶，檢查是否到期
 * 
 * @returns {Array<string>} 已到期的用户 ID 列表
 */
function checkUserExpiry() {
  _initConfig();
  
  console.log("⏰ 檢查 VIP 到期狀態...");
  
  const users = getAllUsersData();
  const expiredUsers = [];
  
  users.forEach(user => {
    const userId = user["User ID"];
    const status = user["Status"];
    const expiryDate = user["Expiry Date"];
    
    if (status === "VIP" && expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      
      if (expiry < today) {
        console.log(`⚠️  VIP 已到期: ${user["Display Name"]}`);
        
        // 降级为 Free
        const userData = {
          userId: userId,
          status: "Free",
          expiryDate: ""
        };
        upsertUser(userData);
        
        // 發送通知
        const noticeText =
          `親愛的 ${user["Display Name"]}，\n\n` +
          `您的 VIP 會員已到期。\n\n` +
          `🇺🇸 您仍可收到每日美股快訊！\n\n` +
          `💎 升級 VIP 可解鎖每日深度研析報告！`;
        
        pushLineTextMessage(userId, noticeText);
        
        expiredUsers.push(userId);
      }
    }
  });
  
  console.log(`✅ 檢查完成：${expiredUsers.length} 位用戶已到期`);
  
  return expiredUsers;
}

/**
 * 🔍 检查 URL 是否有效
 * 
 * @param {string} url - URL 字串
 * @returns {boolean}
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * 🧪 測試新戶禮包
 */
function testWelcomePackage() {
  _initConfig();
  
  console.log("🧪 ====== 新戶禮包測試 ======\n");
  
  try {
    // 使用 Admin ID 測試
    sendWelcomePackage(ADMIN_ID);
    
    console.log("\n✅ 測試完成！");
    
  } catch (e) {
    console.error("❌ 測試失敗:", e.message);
  }
}
