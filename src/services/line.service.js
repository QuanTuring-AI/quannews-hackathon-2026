// ==========================================
// 📱 LINE Messaging API 服務
// ==========================================
// 職責：發送訊息、取得用戶資料、Flex Message 建構

/**
 * 取得用戶資料
 * 
 * @param {string} userId - LINE 用戶 ID
 * @returns {Object|null} 用戶資料 { displayName, userId, pictureUrl, statusMessage }
 */
function getLineUserProfile(userId) {
  _initConfig();
  
  try {
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    const options = {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN }
    };
    const res = UrlFetchApp.fetch(url, options);
    return JSON.parse(res.getContentText());
  } catch (e) { 
    console.error(`❌ 無法取得用戶資料: ${e.message}`);
    return null; 
  }
}

/**
 * 回覆訊息（使用 replyToken，免費通道）
 * 
 * @param {string} replyToken - LINE 回覆 Token
 * @param {string|Object} message - 文字訊息或 Flex Message 物件
 */
function sendLineReply(replyToken, message) {
  _initConfig();
  
  const url = 'https://api.line.me/v2/bot/message/reply';
  
  // 如果 message 是字串，轉成物件；如果是物件(Flex)，直接用
  const messages = typeof message === 'string' 
    ? [{ type: 'text', text: message }] 
    : [message];

  const payload = {
    'replyToken': replyToken,
    'messages': messages
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN,
      },
      'method': 'post',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      console.log(`✅ LINE Reply 已發送`);
    } else {
      const errorBody = response.getContentText();
      console.error(`⚠️ LINE Reply 失敗 (${statusCode}): ${errorBody}`);
      
      // 如果是 replyToken 已使用的錯誤，不要 throw
      if (errorBody.includes('Invalid reply token')) {
        console.warn(`⚠️ Reply Token 已失效，跳過重複回覆`);
        return;
      }
      
      throw new Error(`LINE API 錯誤 ${statusCode}: ${errorBody}`);
    }
  } catch (e) {
    console.error(`❌ LINE 回覆失敗: ${e.message}`);
    throw e;
  }
}

/**
 * 主動推播文字訊息
 * 
 * @param {string} userId - LINE 用戶 ID
 * @param {string} text - 文字內容
 */
function pushLineTextMessage(userId, text) {
  _initConfig();
  
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: userId,
    messages: [{ type: 'text', text: text }]
  };
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      console.error(`❌ LINE Push 失敗 (${responseCode}): ${response.getContentText()}`);
    }
  } catch (e) {
    console.error(`❌ LINE Push 錯誤: ${e.message}`);
  }
}

/**
 * 發送 Flex Message（新聞卡片）
 * 
 * @param {string} userId - LINE 用戶 ID
 * @param {Object} data - 新聞資料
 * @param {string} userStatus - 用戶身分（Free/VIP/Admin）
 */
function sendLineFlexMessage(userId, data, userStatus) {
  _initConfig();
  
  const url = 'https://api.line.me/v2/bot/message/push';
  
  // 建立 Flex Message 內容
  const flexContent = buildNewsFlexMessage(data, userStatus);
  
  const payload = {
    to: userId,
    messages: [
      {
        type: "flex",
        altText: data.title || "量識Q報",
        contents: flexContent
      }
    ]
  };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      console.log(`✅ Flex Message 已發送給 ${userId}`);
    } else {
      console.error(`❌ Flex Message 失敗 (${responseCode}): ${response.getContentText()}`);
    }
  } catch (e) {
    console.error(`❌ Flex Message 錯誤: ${e.message}`);
  }
}

/**
 * 建立新聞 Flex Message 卡片
 * 
 * @param {Object} data - 新聞資料
 * @param {string} userStatus - 用戶身分
 * @returns {Object} Flex Message 物件
 */
function buildNewsFlexMessage(data, userStatus) {
  // 處理報告 PDF 連結
  let safeViewUrl = "https://drive.google.com";
  if (data.viewUrl) {
    try {
      const idMatch = data.viewUrl.match(/[-\w]{25,}/);
      if (idMatch) {
        safeViewUrl = `https://drive.google.com/file/d/${idMatch[0]}/preview`;
      } else {
        safeViewUrl = data.viewUrl;
      }
    } catch (e) { 
      safeViewUrl = data.viewUrl; 
    }
  }

  // 處理原始文件連結 (Admin 專用)
  let safeSourceUrl = safeViewUrl;
  if (data.sourceUrl) {
    try {
      const idMatchSrc = data.sourceUrl.match(/[-\w]{25,}/);
      if (idMatchSrc) {
        safeSourceUrl = `https://drive.google.com/file/d/${idMatchSrc[0]}/preview`;
      } else {
        safeSourceUrl = data.sourceUrl;
      }
    } catch (e) {}
  }

  // 處理圖片連結
  const DEFAULT_IMAGE = "https://ssl.gstatic.com/docs/doclist/images/icon_10_generic_list.png";
  let safeImageUrl = data.imageUrl || DEFAULT_IMAGE;

  // 轉發分享連結
  const shareText = `🔥 [量識Q報] ${data.title}\n\n👇 點擊閱覽完整研報：\n${safeViewUrl}`;
  const shareUri = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;

  // 根據用戶身分建立按鈕
  let footerContents = [];

  // 按鈕 1: 閱讀報告 (所有人)
  footerContents.push({
    "type": "button",
    "style": "primary",
    "height": "sm",
    "color": "#1a73e8",
    "action": {
      "type": "uri",
      "label": "📖 閱讀完整報告",
      "uri": safeViewUrl
    }
  });

  if (userStatus === "Admin") {
    // Admin: 報告 + 原始檔 + 轉發
    footerContents.push({
      "type": "button",
      "style": "secondary",
      "height": "sm",
      "margin": "sm",
      "action": {
        "type": "uri",
        "label": "📂 檢視原始文件",
        "uri": safeSourceUrl
      }
    });
    footerContents.push({
      "type": "button",
      "style": "secondary",
      "height": "sm",
      "margin": "sm",
      "action": {
        "type": "uri",
        "label": "🔗 轉發連結",
        "uri": shareUri
      }
    });

  } else if (userStatus === "VIP") {
    // VIP: 報告 + 轉發
    footerContents.push({
      "type": "button",
      "style": "secondary",
      "height": "sm",
      "margin": "sm",
      "action": {
        "type": "uri",
        "label": "🔗 轉發連結給朋友",
        "uri": shareUri
      }
    });

  } else {
    // Free: 報告 + 轉發 + 升級
    footerContents.push({
      "type": "button",
      "style": "secondary",
      "height": "sm",
      "margin": "sm",
      "action": {
        "type": "uri",
        "label": "🔗 轉發連結給朋友",
        "uri": shareUri
      }
    });
    footerContents.push({
      "type": "button",
      "style": "link",
      "height": "sm",
      "margin": "sm",
      "color": "#FF9900",
      "action": {
        "type": "message",
        "label": "💎 升級 VIP (每日2篇)",
        "text": "CEO你好，我想訂閱 VIP 會員！"
      }
    });
  }

  // Flex Message 卡片結構
  return {
    "type": "bubble",
    "size": "giga",
    "hero": {
      "type": "image",
      "url": safeImageUrl,
      "size": "full",
      "aspectRatio": "16:9",
      "aspectMode": "cover",
      "action": { "type": "uri", "uri": safeViewUrl }
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "QuanTuring Q報",
          "weight": "bold",
          "color": "#1DB446",
          "size": "xs"
        },
        {
          "type": "text",
          "text": data.title || "精選研報",
          "weight": "bold",
          "size": "xl",
          "margin": "md",
          "wrap": true,
          "action": { "type": "uri", "uri": safeViewUrl }
        },
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
          "contents": [
            {
              "type": "icon",
              "size": "sm",
              "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
            },
            {
              "type": "text",
              "text": `${data.score || 0} / 10`,
              "size": "sm",
              "color": "#999999",
              "margin": "md",
              "flex": 0
            }
          ]
        },
        {
          "type": "text",
          "text": data.summary || "暫無摘要",
          "color": "#666666",
          "size": "sm",
          "margin": "md",
          "wrap": true,
          "maxLines": 3
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": footerContents,
      "flex": 0
    }
  };
}

/**
 * 📤 推送 Flex Message（通用版，接受原始 flex content）
 *
 * @param {string} userId - LINE 用戶 ID
 * @param {Object} flexContent - Flex Message 的 contents 物件
 * @param {string} altText - 替代文字
 */
function pushLineFlexContent(userId, flexContent, altText) {
  _initConfig();

  var url = "https://api.line.me/v2/bot/message/push";
  var payload = {
    to: userId,
    messages: [{
      type: "flex",
      altText: altText || "通知",
      contents: flexContent
    }]
  };

  var response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var responseCode = response.getResponseCode();
  if (responseCode !== 200) {
    throw new Error("LINE API " + responseCode + ": " + response.getContentText());
  }
}

/**
 * 📥 從 LINE 下載用戶上傳的檔案
 *
 * 使用 LINE Content API 取得用戶傳送的檔案內容
 *
 * @param {string} messageId - LINE 訊息 ID
 * @returns {Blob} 檔案 Blob
 */
function downloadLineContent(messageId) {
  _initConfig();

  var url = "https://api-data.line.me/v2/bot/message/" + messageId + "/content";

  var response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "Authorization": "Bearer " + LINE_ACCESS_TOKEN
    },
    muteHttpExceptions: true
  });

  var statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    throw new Error("LINE Content API 錯誤 (" + statusCode + "): " + response.getContentText().substring(0, 200));
  }

  console.log("📥 LINE 檔案下載完成 (messageId: " + messageId + ")");
  return response.getBlob();
}

/**
 * 🧪 測試 LINE 服務
 */
function testLineService() {
  _initConfig();
  console.log("🧪 測試 LINE 服務...\n");
  
  // 測試 1: 取得用戶資料
  console.log("測試 1: 取得 Admin 用戶資料");
  const profile = getLineUserProfile(ADMIN_ID);
  if (profile) {
    console.log(`✅ 用戶名稱: ${profile.displayName}`);
  } else {
    console.error("❌ 無法取得用戶資料");
  }
  
  console.log("\n✅ LINE 服務測試完成！");
  console.log("⚠️ sendLineReply 和 pushLineTextMessage 需要在實際對話中測試");
}
