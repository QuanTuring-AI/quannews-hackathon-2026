// ==========================================
// 🎨 Imagen 圖片生成服務
// ==========================================
// 職責：Imagen API 呼叫、Prompt 建構、OAuth2 認證

/**
 * 生成圖片（使用 Imagen 4）
 * 
 * @param {string} promptText - 圖片生成 Prompt
 * @returns {Blob} 圖片 Blob
 */
function generateImage(promptText) {
  _initConfig();
  
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('imagen.service', 'generateImage');
  }
  
  // 🔴 Imagen 4 模型 ID
  // 標準版: 'imagen-4.0-generate-001' (畫質最好，寫字最準)
  // 快速版: 'imagen-4.0-fast-generate-001' (速度快，適合大量生成)
  const modelId = 'imagen-4.0-generate-001';
  
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:predict`;
  
  const token = ScriptApp.getOAuthToken();

  console.log(`🎨 Imagen 4 正在繪製: ${promptText.substring(0, 50)}...`);

  const payload = {
    "instances": [
      { "prompt": promptText }
    ],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "3:4",  // 3:4 直式，最接近 IG feed 4:5（Imagen 不支援 4:5）
      "negativePrompt": "blurry, low quality, distorted text, gibberish, bad anatomy, watermark, pixelated, simple background, plain background, boring, empty, flat color"
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode !== 200) {
      throw new Error(`Imagen 4 API 錯誤 (${statusCode}): ${response.getContentText()}`);
    }
    
    const json = JSON.parse(response.getContentText());
    
    if (!json.predictions || !json.predictions[0]) {
      throw new Error("Imagen 4 回傳格式異常: " + JSON.stringify(json));
    }

    const base64Image = json.predictions[0].bytesBase64Encoded;
    const imageBytes = Utilities.base64Decode(base64Image);
    return Utilities.newBlob(imageBytes, "image/png", "imagen4_poster.png");

  } catch (error) {
    console.error(`❌ Imagen 4 繪圖失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 🎛️ 藝術總監控制台（總機）
 * 這裡決定使用哪一套 Prompt 策略
 * 
 * @param {string} visualScene - 視覺場景描述
 * @param {string} seoHeadline - SEO 標題
 * @returns {string} 完整的 Prompt
 */
function buildImageGenerationPrompt(visualScene, seoHeadline) {
  // 選項 A：建築結構風（文字清楚霸氣）
  // return buildImagePrompt_V4_5_Architecture(visualScene, seoHeadline);
  
  // 選項 B：有機融合風（藝術意境）
  // return buildImagePrompt_V5_Organic(visualScene, seoHeadline);
  
  // 選項 C：品牌融合風（雙重文字）
  // return buildImagePrompt_V5_1_Organic(visualScene, seoHeadline);
  
  // 選項 D：品牌融合風 - 風格解放版（⭐ 目前使用）
  return buildImagePrompt_V5_2_Organic(visualScene, seoHeadline);
}

/**
 * 🏗️ V4.5 建築結構版（清楚霸氣）
 * 特色：文字像巨大的紀念碑，超級清楚，背景華麗但不搶戲
 * 適合：正式報告、強調標題的封面
 */
function buildImagePrompt_V4_5_Architecture(visualScene, seoHeadline) {
  const cleanHeadline = seoHeadline.replace(/[^\w\s\-\:\.\&']/gi, '').toUpperCase().trim();
  
  let prompt = "";
  
  // 核心概念：文字即建築
  prompt += `A surreal, hyper-realistic wide shot featuring the text "${cleanHeadline}" as a colossal, physical structure integrated into the world. `;
  prompt += `The spelling is exact: "${cleanHeadline}". `;
  prompt += "The text acts as a massive monolith or glowing neon monument standing in the center of the scene. ";
  
  // 極繁主義背景
  prompt += "Background Environment: " + visualScene + ". ";
  prompt += "The environment is maximalist, incredibly detailed, and deep. ";
  prompt += "Do NOT blur the background. Use deep depth of field so the entire world is visible and sharp. ";
  prompt += "The scene is filled with dynamic elements: flying vehicles, complex machinery, data particles, or architectural layers that surround the text structure. ";
  
  // 光影分離術
  prompt += "Lighting & Integration: Use volumetric lighting (God rays) and backlight to separate the text from the busy background. ";
  prompt += "The text structure glows intensely, illuminating the surrounding details. The contrast between the glowing text and the detailed environment makes the text readable. ";
  
  // 頂級畫質
  prompt += "Art Style: 8k resolution, Unreal Engine 5 render, Cyberpunk aesthetics, concept art quality, cinematic composition, wide-angle lens. ";
  
  // 最後確認
  prompt += `Final check: The image must look like a blockbuster movie poster where a massive 3D title "${cleanHeadline}" dominates a rich, complex world.`;
  
  return prompt;
}

/**
 * 🍃 V5.0 有機融合版（藝術意境）
 * 特色：文字變成雲、光、水，融入背景，非常有藝術感
 * 適合：更有創意、不介意文字邊緣稍微柔和時
 */
function buildImagePrompt_V5_Organic(visualScene, seoHeadline) {
  const cleanHeadline = seoHeadline.replace(/[^\w\s\-\:\.\&']/gi, '').toUpperCase().trim();
  
  let prompt = "";
  
  // 背景優先
  prompt += "A breathtaking, cinematic wide shot of: " + visualScene + ". ";
  
  // 有機融合指令
  prompt += `Integrate the text "${cleanHeadline}" naturally into this environment. `;
  prompt += "The text should NOT look like a sticker. It must be made of materials found in the scene (e.g., neon lights, clouds, rock formations, glass, holographic projection, or data streams). ";
  prompt += "Let the text interact with the environment (reflecting in water, casting shadows, or glowing in fog). ";
  
  // 拼寫與可讀性
  prompt += `Spelling must be exact: "${cleanHeadline}". `;
  prompt += "While the text is integrated naturally, ensure it remains clearly legible and is the focal point of the image. ";
  
  // 風格設定
  prompt += "Art Style: 8k resolution, Unreal Engine 5 render, highly detailed, photorealistic, cinematic lighting. ";
  
  return prompt;
}

/**
 * 🍃 V5.1 品牌融合版（雙重文字進化版）
 * 特色：主標題 + 品牌副標題
 */
function buildImagePrompt_V5_1_Organic(visualScene, seoHeadline) {
  const cleanHeadline = seoHeadline.replace(/[^\w\s\-\:\.\&'%]/gi, '').toUpperCase().trim();
  const brandName = "QuanTuring";
  
  let prompt = "";
  prompt += "A breathtaking, cinematic wide shot of: " + visualScene + ". ";
  
  // 主標題
  prompt += `Integrate the main text "${cleanHeadline}" naturally into this environment as the central focal point. `;
  
  // 副標題（品牌植入）
  prompt += `Also naturally integrate a secondary, smaller text "${brandName}" into the scene (e.g., subtly glowing on a surface near the main text). `;
  
  // 材質與互動
  prompt += "Both texts should be made of materials found in the scene (neon, clouds, rock, glass) and interact with the light/water. ";
  prompt += "Spelling must be exact. Ensure legibility for both. ";
  
  // 畫質
  prompt += "Art Style: 8k resolution, Unreal Engine 5 render, photorealistic. ";
  
  return prompt;
}

/**
 * 🍃 V5.2 品牌融合版（風格解放版）⭐ 推薦
 * 特色：移除過度具體的材質限制，讓 visualScene 決定風格
 * 修正：強制品牌名稱單次出現，禁止渲染指令詞
 */
function buildImagePrompt_V5_2_Organic(visualScene, seoHeadline) {
  const cleanHeadline = seoHeadline.replace(/[^\w\s\-\:\.\&'%?]/gi, '').toUpperCase().trim();
  const brandName = "QuanTuring";
  
  let prompt = "";
  
  // 1. 場景描述（廣角電影感）
  prompt += "A breathtaking, expansive cinematic wide shot featuring: " + visualScene + ". ";
  
  // 2. 主標題（視覺焦點）
  prompt += `The main text header "${cleanHeadline}" is integrated naturally into this environment as the central, dominant focal point. `;
  
  // 3. 副標題（強制單次出現）
  prompt += `A secondary, smaller text element specifically displaying the unique name "${brandName}" appears EXACTLY ONCE in the scene. It is ideally placed near the bottom corner or subtly on a surface. `;
  
  // 4. 材質融合
  prompt += "Both texts should be formed from materials representative of the scene itself (e.g., glowing data streams, sculpted landscape elements, integrated light) and interact realistically with the environment's lighting. ";
  
  // 5. 絕對禁制令（CRITICAL RULES）
  prompt += "CRITICAL TEXT RULES: ";
  prompt += "1. Render the text strings EXACTLY as provided inside the double quotes. ";
  prompt += "2. Do NOT add any asterisks (*), markdown symbols, or quotation marks. ";
  prompt += `3. Do NOT duplicate, split, or repeat the brand name "${brandName}" anywhere else in the image. It must appear only one time. `;
  prompt += "4. Do NOT summarize or alter the main headline words. ";
  prompt += '5. Do NOT render instructional words like "brand", "text", "headline", or "secondary" as visible text in the image. Only render the content inside the quotes.';
  
  // 6. 畫質設定
  prompt += "Art Style: 8k resolution, highly detailed, photorealistic, Unreal Engine 5 render quality, cinematic lighting. ";
  
  return prompt;
}

/**
 * 取得 Imagen OAuth2 認證服務
 * 
 * @returns {OAuth2Service} OAuth2 服務物件
 */
function getImagenAuthService() {
  _initConfig();
  
  const jsonKeyFileId = JSON_KEY_FILE_ID; 

  if (!jsonKeyFileId) {
    throw new Error("❌ 找不到 JSON_KEY_FILE_ID");
  }

  // 從 Drive 讀取 Service Account JSON
  const file = DriveApp.getFileById(jsonKeyFileId);
  const jsonContent = file.getBlob().getDataAsString();
  const jsonKey = JSON.parse(jsonContent);

  // 設定 OAuth2 服務
  return OAuth2.createService('GCP_Imagen')
      .setTokenUrl(jsonKey.token_uri)
      .setPrivateKey(jsonKey.private_key)
      .setIssuer(jsonKey.client_email)
      .setPropertyStore(PropertiesService.getScriptProperties())
      .setCache(CacheService.getScriptCache())
      .setScope('https://www.googleapis.com/auth/cloud-platform');
}

/**
 * 重置 Imagen 認證
 * （如果遇到權限問題，可以執行此函式）
 */
function resetImagenAuth() {
  getImagenAuthService().reset();
  console.log("✅ Imagen 憑證已清除，下次執行將重新認證");
}

/**
 * 儲存圖片到 Drive
 * 
 * @param {Blob} imageBlob - 圖片 Blob
 * @param {string} fileName - 檔案名稱
 * @param {string} folderId - 目標資料夾 ID（選填）
 * @returns {File} Drive 檔案物件
 */
function saveImageToDrive(imageBlob, fileName, folderId) {
  _initConfig();
  
  try {
    const targetFolderId = folderId || OUTPUT_FOLDER_ID;
    const folder = DriveApp.getFolderById(targetFolderId);
    const file = folder.createFile(imageBlob);
    file.setName(fileName);
    
    console.log(`💾 圖片已儲存: ${fileName}`);
    console.log(`🔗 連結: ${file.getUrl()}`);
    
    return file;
    
  } catch (e) {
    console.error(`❌ 儲存圖片失敗: ${e.message}`);
    throw new Error(`圖片儲存失敗: ${e.message}`);
  }
}

/**
 * 完整的圖片生成流程（生成 + 儲存）
 * 
 * @param {string} visualScene - 視覺場景
 * @param {string} seoHeadline - SEO 標題
 * @param {string} fileName - 檔案名稱
 * @returns {Object} { file, url }
 */
function generateAndSaveImage(visualScene, seoHeadline, fileName) {
  // 建立 Prompt
  const prompt = buildImageGenerationPrompt(visualScene, seoHeadline);
  
  // 生成圖片
  const imageBlob = generateImage(prompt);
  
  // 儲存到 Drive
  const file = saveImageToDrive(imageBlob, fileName);
  
  return {
    file: file,
    url: file.getUrl(),
    id: file.getId()
  };
}

/**
 * 🧪 測試 Imagen 服務
 */
function testImagenService() {
  _initConfig();
  console.log("🧪 測試 Imagen 服務...\n");
  
  // 測試 1: 檢查 OAuth 認證
  console.log("測試 1: 檢查 Imagen 認證 (ScriptApp OAuth)");
  try {
    const token = ScriptApp.getOAuthToken();
    if (token) {
      console.log("✅ Imagen 認證成功 (token length: " + token.length + ")");
    } else {
      console.error("❌ Imagen 認證失敗: token 為空");
      return;
    }
  } catch (e) {
    console.error(`❌ 認證錯誤: ${e.message}`);
    return;
  }
  
  // 測試 2: 建立 Prompt
  console.log("\n測試 2: 建立圖片 Prompt");
  const testScene = "A futuristic data center with glowing circuits and holographic displays";
  const testHeadline = "AI REVOLUTION ACCELERATES";
  const prompt = buildImageGenerationPrompt(testScene, testHeadline);
  console.log(`✅ Prompt 長度: ${prompt.length} 字元`);
  console.log(`   前 100 字: ${prompt.substring(0, 100)}...`);
  
  console.log("\n✅ Imagen 服務測試完成！");
  console.log("⚠️ generateImage() 需要實際呼叫 API（會產生費用）");
  console.log("💡 若要完整測試，請執行: generateAndSaveImage(testScene, testHeadline, 'test.png')");
}
