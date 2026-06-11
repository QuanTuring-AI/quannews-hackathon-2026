// ==========================================
// 🌅 晨間派報控制器 (Broadcaster Controller)
// ==========================================
// 職責：定時發送新聞給訂閱用戶

/**
 * 🌅 晨間派報主流程
 * 
 * 功能：
 * 1. 篩選當日推薦新聞（根據最高配額決定數量）
 * 2. 獲取所有訂閱用戶
 * 3. 根據用戶身份發送相應數量的新聞（Free 是 VIP 的子集）
 * 
 * @returns {Object} 發送統計
 */
function runMorningBroadcast() {
  _initConfig();
  
  console.log("🌅 晨間派報啟動！");
  console.log("=".repeat(60));
  
  try {
    // 🗓️ 檢查今天是星期幾
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=日, 1=一, 2=二, 3=三, 4=四, 5=五, 6=六
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const isFreeUserDay = (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5); // 一、三、五
    
    console.log(`📅 今天是星期${dayNames[dayOfWeek]}`);
    console.log(`   🆓 Free 用戶: ❌ 不發送研析報告（改由美股快訊服務）`);
    console.log(`   💎 VIP/Admin: ✅ 每天 2 篇`);
    
    // 1. 篩選當日推薦（根據最高配額 = VIP/Admin 的 2 篇）
    const maxQuota = 2; // VIP/Admin 配額
    console.log(`\n📰 篩選前 ${maxQuota} 篇推薦新聞...`);
    const topNews = selectTopNews(maxQuota);
    
    if (topNews.length === 0) {
      console.log("⚠️  沒有可發送的新聞");
      return { sent: 0, failed: 0, users: 0, sentNewsIds: [] };
    }
    
    console.log(`✅ 篩選完成: ${topNews.length} 篇新聞`);
    topNews.forEach((news, i) => {
      console.log(`   ${i + 1}. ${news.title} (${news.score}/10)`);
    });
    
    // 2. 獲取所有訂閱用戶
    console.log("\n👥 獲取訂閱用戶...");
    const subscribers = getAllActiveUsers();
    console.log(`✅ 找到 ${subscribers.length} 位活躍用戶`);
    
    // 3. 批量發送（傳入 isFreeUserDay 參數）
    console.log("\n📤 開始批量發送...");
    const result = sendToAllSubscribers(subscribers, topNews, isFreeUserDay);
    
    // 4. 更新 Sheet 發送狀態（只更新實際發送過的新聞）
    if (result.sentNewsIds.size > 0) {
      console.log("\n📝 更新 Sheet 發送狀態...");
      const sentNewsList = topNews.filter(news => result.sentNewsIds.has(news.rowNumber));
      updateBroadcastStatus(sentNewsList);
      console.log(`✅ 已更新 ${sentNewsList.length} 篇新聞狀態`);
    }
    
    // 5. 總結
    console.log("\n" + "=".repeat(60));
    console.log("🎉 晨間派報完成！");
    console.log(`   👥 用戶: ${result.users} 位`);
    console.log(`   ✅ 成功: ${result.sent} 則訊息`);
    console.log(`   📰 實際發送: ${result.sentNewsIds.size} 篇新聞`);
    console.log(`   ❌ 失敗: ${result.failed} 則`);
    console.log(`   ⏭️  跳過: ${result.skipped} 位 (Free 用戶)`);
    console.log("=".repeat(60));
    
    return result;
    
  } catch (error) {
    console.error("❌ 晨間派報失敗:", error.message);
    throw error;
  }
}

/**
 * 📰 篩選當日推薦新聞
 * 
 * 篩選邏輯：
 * 1. 必須有圖片和 Slides
 * 2. 評分衰減機制（每天 -0.05 分）
 * 3. 按有效評分排序
 * 
 * @param {number} topN - 取前幾名
 * @returns {Array<Object>} 推薦新聞列表
 */
function selectTopNews(topN = 3) {
  _initConfig();
  
  const sheet = getNewsSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const DECAY_FACTOR = 0.05; // 每天衰減 0.05 分
  const candidates = [];
  
  // 從第 2 列開始（跳過表頭）
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    const fileId = row[0];
    const fileName = row[1];
    const analyzedDate = row[2];
    const status = row[3];
    const score = Number(row[4]) || 0;
    const summary = row[5];        // F 欄：長文摘要
    const insights = row[6];       // G 欄：短文
    const visualScene = row[7];    // H 欄：視覺場景
    const seoHeadline = row[8];
    const sourcePdf = row[9];
    const imageLink = row[10];
    const slideLink = row[11];
    const outputPdf = row[12];
    const lineStatus = row[13];    // N 欄：Line Status (Sent | MM-dd)
    
    // ⭐ 防止重複派送：檢查 N 欄是否已標記為 Sent
    if (lineStatus && typeof lineStatus === 'string' && lineStatus.startsWith('Sent')) {
      console.log(`⏭️  跳過已派送: ${seoHeadline} (${lineStatus})`);
      continue;
    }
    
    // 必須有完整資料
    if (!imageLink || !slideLink || !outputPdf) {
      continue;
    }
    
    // 必須是 Finished 狀態
    if (status !== "Finished") {
      continue;
    }
    
    // 計算天數差異
    let newsDate;
    if (analyzedDate instanceof Date) {
      newsDate = new Date(analyzedDate);
    } else if (typeof analyzedDate === 'string') {
      newsDate = new Date(analyzedDate);
    } else {
      continue;
    }
    
    if (isNaN(newsDate.getTime())) {
      continue;
    }
    
    newsDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - newsDate) / (1000 * 60 * 60 * 24));
    
    // 計算有效評分
    const effectiveScore = score - (daysDiff * DECAY_FACTOR);
    
    // 低於 6 分的不推薦
    if (effectiveScore < 6) {
      continue;
    }
    
    candidates.push({
      fileId: fileId,
      fileName: fileName,
      title: seoHeadline,
      score: score,
      effectiveScore: effectiveScore,
      daysOld: daysDiff,
      summary: summary,      // ⭐ 加入長文摘要
      insights: insights,    // 短文
      imageUrl: convertDriveLinkToImageUrl(imageLink),
      viewUrl: outputPdf,
      sourceUrl: sourcePdf,
      rowNumber: i + 1
    });
  }
  
  // 按有效評分排序
  candidates.sort((a, b) => b.effectiveScore - a.effectiveScore);
  
  // 取前 N 名
  return candidates.slice(0, topN);
}

/**
 * 👥 獲取所有活躍用戶
 * 
 * @returns {Array<Object>} 用戶列表
 */
function getAllActiveUsers() {
  const users = getAllUsersData();
  
  // 過濾活躍用戶
  return users.filter(user => {
    const status = user["Status"] || "Free";
    const userId = user["User ID"];
    
    // Admin 一定發送
    if (userId === ADMIN_ID) {
      return true;
    }
    
    // VIP 檢查到期時間
    if (status === "VIP") {
      const expiryDate = user["Expiry Date"];
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        if (expiry < new Date()) {
          return false; // VIP 已過期
        }
      }
    }
    
    return true;
  });
}

/**
 * 📤 批量發送給訂閱用戶
 * 
 * 邏輯：
 * - VIP/Admin: 拿前 2 篇
 * - Free: 拿前 1 篇（是 VIP 的子集）
 * 
 * @param {Array<Object>} subscribers - 用戶列表
 * @param {Array<Object>} newsItems - 新聞列表
 * @param {boolean} isFreeUserDay - 是否為 Free 用戶派報日（一、三、五）
 * @returns {Object} { users, sent, failed, skipped, sentNewsIds }
 */
function sendToAllSubscribers(subscribers, newsItems, isFreeUserDay) {
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const sentNewsIds = new Set(); // ⭐ 追蹤實際發送過的新聞 rowNumber
  
  subscribers.forEach(user => {
    const userId = user["User ID"];
    const status = user["Status"] || "Free";
    
    // ⭐ Free 用戶不發送研析報告（改由美股快訊服務）
    if (status === "Free") {
      skippedCount++;
      return;
    }
    
    // 根據身份決定發送數量
    const quota = getNewsQuotaByStatus(status);
    const newsToSend = newsItems.slice(0, quota);
    
    console.log(`📤 發送給 ${user["Display Name"]} (${status}): ${newsToSend.length} 篇`);
    
    newsToSend.forEach(news => {
      try {
        sendLineFlexMessage(userId, news, status);
        sentCount++;
        sentNewsIds.add(news.rowNumber); // ⭐ 記錄這篇新聞已被發送
        Utilities.sleep(1000); // 避免 API 限制
      } catch (error) {
        failedCount++;
        console.error(`❌ 發送失敗: ${error.message}`);
      }
    });
  });
  
  return {
    users: subscribers.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    sentNewsIds: sentNewsIds // ⭐ 回傳實際發送過的新聞 ID 集合
  };
}

/**
 * 📊 根據用戶身份獲取新聞配額
 * 
 * @param {string} status - Free / VIP / Admin
 * @returns {number} 每日新聞配額
 */
function getNewsQuotaByStatus(status) {
  switch (status) {
    case "Admin":
      return 2; // Admin 每天 2 篇
    case "VIP":
      return 2; // VIP 每天 2 篇
    default:
      return 1; // Free 每次 1 篇（一、三、五）
  }
}

/**
 * 📋 更新廣播狀態
 * 
 * 在新聞行的 N 欄標記已發送（格式：Sent | MM-dd）
 * 
 * @param {Array<Object>} sentNews - 已發送的新聞列表
 */
function updateBroadcastStatus(sentNews) {
  const dateString = Utilities.formatDate(new Date(), "GMT+8", "MM-dd");
  
  sentNews.forEach(news => {
    const rowNumber = news.rowNumber;
    
    // 使用 sheets.service 更新 N 欄
    updateNewsRecord(rowNumber, {
      'N': `Sent | ${dateString}`
    });
  });
  
  console.log(`✅ 已更新 ${sentNews.length} 則新聞的發送狀態 (Sent | ${dateString})`);
}

/**
 * 🧪 測試晨間派報（預覽模式）
 * 
 * 只發送給 Admin，用於測試
 */
function testMorningBroadcast() {
  _initConfig();
  
  console.log("🧪 測試晨間派報（僅 Admin）...\n");
  
  try {
    // 篩選新聞（Admin 配額 = 2 篇）
    const maxQuota = 2;
    const topNews = selectTopNews(maxQuota);
    
    if (topNews.length === 0) {
      console.log("⚠️  沒有可發送的新聞");
      return;
    }
    
    console.log(`✅ 篩選完成: ${topNews.length} 篇新聞`);
    topNews.forEach((news, i) => {
      console.log(`   ${i + 1}. ${news.title} (${news.score}/10)`);
    });
    
    // 只發送給 Admin
    const sentNewsIds = new Set();
    topNews.forEach((news, i) => {
      console.log(`\n📤 發送第 ${i + 1} 篇給 Admin...`);
      sendLineFlexMessage(ADMIN_ID, news, "Admin");
      sentNewsIds.add(news.rowNumber);
      Utilities.sleep(1000);
    });
    
    // 更新 Sheet 發送狀態（測試模式不更新，避免影響正式環境）
    console.log("\n⚠️  測試模式：不更新 Sheet 狀態");
    console.log(`   （正式模式會標記 ${sentNewsIds.size} 篇新聞為 Sent）`);
    
    console.log("\n✅ 測試完成！");
    
  } catch (e) {
    console.error("❌ 測試失敗:", e.message);
  }
}
