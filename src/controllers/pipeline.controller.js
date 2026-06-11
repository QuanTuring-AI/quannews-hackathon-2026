// ==========================================
// 🏭 生產流程控制器 (Pipeline Controller)
// ==========================================
// 職責：日常新聞生產流程（PDF → 分析 → 圖片 → Slides）

/**
 * 🔥 主生產流程（完整 Pipeline）
 * 
 * 執行完整的新聞生產流程：
 * Phase 1: Gemini 分析 PDF
 * Phase 2: Imagen 生成圖片
 * Phase 3: 製作 Slides
 * 
 * @returns {Object} 生產統計
 */
function runProductionPipeline() {
  _initConfig();
  
  console.log("🏭 AI 新聞生產流程啟動！");
  console.log("=".repeat(60));
  
  try {
    // Phase 1: 分析新聞
    console.log("\n📰 [Phase 1] 啟動新聞分析...");
    const analysisResult = runAnalysisPhase();
    
    // Phase 2: 生成圖片
    console.log("\n🎨 [Phase 2] 啟動圖片生成...");
    const imageResult = runImageGenerationPhase();
    
    // Phase 3: 製作 Slides
    console.log("\n📊 [Phase 3] 啟動 Slides 製作...");
    const slideResult = runPublishingPhase();
    
    // 總結
    console.log("\n" + "=".repeat(60));
    console.log("🎉 生產流程完成！");
    console.log(`   📰 分析: ${analysisResult.processed} 篇`);
    console.log(`   🎨 圖片: ${imageResult.generated} 張`);
    console.log(`   📊 Slides: ${slideResult.published} 個`);
    console.log("=".repeat(60));
    
    return {
      success: true,
      analysis: analysisResult,
      images: imageResult,
      slides: slideResult
    };
    
  } catch (error) {
    console.error("❌ 生产流程失败:", error.message);
    throw error;
  }
}

/**
 * 📰 Phase 1: 新聞分析階段
 * 
 * 掃描 PDF 資料夾，使用 Gemini 進行結構化分析
 * 
 * @returns {Object} { processed, skipped, failed }
 */
function runAnalysisPhase() {
  _initConfig();
  
  const sheet = getNewsSheet();
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const scannedFolder = DriveApp.getFolderById(SCANNED_FOLDER_ID);
  const files = folder.getFiles();
  
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  console.log("🔄 開始掃描 PDF 資料夾...");

  while (files.hasNext()) {
    const file = files.next();
    
    // 只處理 PDF
    if (file.getMimeType() !== "application/pdf") {
      continue;
    }

    // 檢查是否已處理
    if (isFileProcessed(sheet, file.getId())) {
      skippedCount++;
      console.log(`⏭️  已處理過: ${file.getName()}`);
      continue;
    }

    console.log(`🧠 [分析中] ${file.getName()}`);
    
    try {
      // 1. OCR 提取文字
      const fileContent = extractPdfText(file);
      
      if (!fileContent || fileContent.trim().length === 0) {
        console.warn(`⚠️  PDF 內容為空: ${file.getName()}`);
        continue;
      }
      
      // 2. Gemini 分析
      const aiResult = analyzeNews(fileContent, file.getName());
      
      // 3. 驗證結果
      if (aiResult && aiResult.insights && aiResult.insights.length === 3) {
        // 格式化資料（F 欄：長文，G 欄：短文）
        const summaryLong = formatSummaryLong(aiResult.insights);
        const insightsShort = formatInsightsShort(aiResult.insights);
        const hiddenJson = JSON.stringify({
          insights: aiResult.insights,
          visual_scene: aiResult.visual_scene,
          seo_headline: aiResult.seo_headline
        });
        
        // 4. 寫入 Sheet（使用 sheets.service）
        appendNewsRecord({
          fileId: file.getId(),
          fileName: file.getName(),
          analyzedDate: new Date(),
          status: "Analyzed",
          score: aiResult.score,
          summary: summaryLong,
          insights: insightsShort,
          visualScene: aiResult.visual_scene,
          seoHeadline: aiResult.seo_headline,
          sourcePdfLink: file.getUrl(),
          imageLink: "",
          slideLink: "",
          generatedPdfLink: "",
          lineStatus: "",
          jsonData: hiddenJson
        });
        
        processedCount++;
        console.log(`✅ [分析完成] ${file.getName()}`);
        console.log(`   📊 評分: ${aiResult.score}/10`);
        console.log(`   🎨 標題: ${aiResult.seo_headline}`);
        
        // 5. 歸檔到 Scanned 資料夾
        moveFileTo(file, scannedFolder);
        console.log("📦 [已歸檔] 移動至 Scanned 資料夾");
      } else {
        throw new Error("AI 分析結果驗證失敗");
      }
      
    } catch (error) {
      errorCount++;
      console.error(`❌ [分析失敗] ${file.getName()}: ${error.message}`);
      
      // 記錄錯誤（使用 sheets.service）
      appendNewsRecord({
        fileId: file.getId(),
        fileName: file.getName(),
        analyzedDate: new Date(),
        status: "Error",
        score: 0,
        summary: "分析失敗: " + error.message.substring(0, 200),
        insights: "",
        visualScene: "",
        seoHeadline: "",
        sourcePdfLink: file.getUrl(),
        imageLink: "",
        slideLink: "",
        generatedPdfLink: "",
        lineStatus: "",
        jsonData: ""
      });
    }
    
    Utilities.sleep(2000);
  }
  
  console.log("\n📈 分析統計:");
  console.log(`   ✅ 新處理並歸檔: ${processedCount} 個`);
  console.log(`   ⏭️  略過(已處理): ${skippedCount} 個`);
  console.log(`   ❌ 失敗(滯留): ${errorCount} 個`);
  
  return {
    processed: processedCount,
    skipped: skippedCount,
    failed: errorCount
  };
}

/**
 * 🎨 Phase 2: 圖片生成階段
 * 
 * 掃描已分析的新聞，使用 Imagen 生成配圖
 * 
 * @returns {Object} { generated, skipped, failed }
 */
function runImageGenerationPhase() {
  _initConfig();
  
  const sheet = getNewsSheet();  // ✅ 使用 sheets.service
  
  if (!sheet || sheet.getLastRow() <= 1) {
    console.log("⚠️  沒有需要處理的資料");
    return { generated: 0, skipped: 0, failed: 0 };
  }

  const data = sheet.getDataRange().getValues();
  let generatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  console.log("🎨 Imagen 藝術總監開始工作...");

  // 從第 2 列開始（跳過表頭）
  for (let i = 1; i < data.length; i++) {
    const rowNum = i + 1;
    const status = data[i][3];
    const visualScene = data[i][7];
    const seoHeadline = data[i][8];
    const imageLink = data[i][10];

    // 檢查是否需要生成圖片
    const needsImage = (
      status === "Analyzed" && 
      visualScene && 
      seoHeadline && 
      !imageLink
    );

    if (!needsImage) {
      if (status === "Analyzed") {
        skippedCount++;
      }
      continue;
    }

    console.log(`🎨 [生成中] 第 ${rowNum} 列: ${seoHeadline}`);
    
    try {
      // 使用 imagen.service 完整流程（生成 + 儲存）
      const timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss");
      const cleanHeadline = seoHeadline.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
      const imageName = `AI_News_${cleanHeadline}_${timestamp}.png`;
      
      const imageResult = generateAndSaveImage(visualScene, seoHeadline, imageName);
      
      if (imageResult && imageResult.url) {
        // 更新 Sheet（使用 sheets.service）
        updateNewsRecord(rowNum, {
          'D': "Finished",
          'K': imageResult.url
        });
        
        generatedCount++;
        console.log(`✅ 第 ${rowNum} 列完成！`);
        
      } else {
        throw new Error("Imagen 回傳空白圖片");
      }
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 圖片生成失敗 (第 ${rowNum} 列): ${error.message}`);
      
      // 更新錯誤狀態（使用 sheets.service）
      updateNewsRecord(rowNum, {
        'D': "Error: " + error.message.substring(0, 100)
      });
    }
    
    Utilities.sleep(3000);
  }
  
  console.log(`\n🎊 圖片生成完成！總共生成 ${generatedCount} 張海報`);
  
  return {
    generated: generatedCount,
    skipped: skippedCount,
    failed: errorCount
  };
}

/**
 * 📊 Phase 3: Slides 製作階段
 * 
 * 將分析結果和圖片整合成 Google Slides
 * 
 * @returns {Object} { published, skipped, failed }
 */
function runPublishingPhase() {
  _initConfig();
  
  console.log("📰 發行商啟動 (Publisher Engine v3.1)...");
  
  const sheet = getNewsSheet();  // ✅ 使用 sheets.service
  
  if (!sheet || sheet.getLastRow() <= 1) {
    console.log("⚠️  沒有需要處理的資料");
    return { published: 0, skipped: 0, failed: 0 };
  }
  
  const data = sheet.getDataRange().getValues();
  let publishedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // 從第 2 列開始（跳過表頭）
  for (let i = 1; i < data.length; i++) {
    const rowNum = i + 1;
    const status = data[i][3];      // D欄: Status
    const summary = data[i][5];     // F欄: Summary
    const seoHeadline = data[i][8]; // I欄: SEO Headline
    const imageLink = data[i][10];  // K欄: Image Link
    const slideLink = data[i][11];  // L欄: Slide Link
    const jsonString = data[i][14]; // O欄: JSON Data

    // 條件：Finished + 有圖 + 有JSON + 沒做過 Slide
    const needsSlide = (
      status === "Finished" && 
      imageLink && 
      jsonString && 
      !slideLink
    );
    
    if (!needsSlide) {
      if (status === "Finished") {
        skippedCount++;
      }
      continue;
    }
    
    console.log(`🎨 [排版中] ${seoHeadline}`);
    
    try {
      // 提取圖片 ID
      const fileId = imageLink.match(/[-\w]{25,}/)[0];
      const imageFile = DriveApp.getFileById(fileId);
      
      // 呼叫 Slides 服務
      const result = createNewsPresentation(seoHeadline, imageFile, summary, jsonString);

      // 回填連結到 Sheet（使用 sheets.service）
      const updates = {
        'L': result.slideUrl
      };
      
      if (result.pdfUrl) {
        updates['M'] = result.pdfUrl;
      }
      
      updateNewsRecord(rowNum, updates);
      
      publishedCount++;
      console.log(`✅ 排版完成: ${seoHeadline}`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 排版失敗 (第 ${rowNum} 列): ${error.message}`);
      
      // 更新錯誤狀態（使用 sheets.service）
      updateNewsRecord(rowNum, {
        'D': "Error: " + error.message.substring(0, 100)
      });
    }
  }
  
  console.log("📰 發行商任務結束");
  
  return {
    published: publishedCount,
    skipped: skippedCount,
    failed: errorCount
  };
}

// ==========================================
// 🛠️ 格式化工具函式
// ==========================================

/**
 * 格式化長文（F 欄）
 * 格式：3 段各 150-200 字
 */
function formatSummaryLong(insights) {
  if (!insights || insights.length === 0) return "";
  
  return insights.map((item, index) => 
    `${index + 1}. ${item.title}: ${item.long_content}`
  ).join("\n\n").trim();
}

/**
 * 格式化短文（G 欄）
 * 格式：3 句各 40-60 字
 */
function formatInsightsShort(insights) {
  if (!insights || insights.length === 0) return "";
  
  return insights.map((item, index) => 
    `${index + 1}. ${item.title}: ${item.short_content}`
  ).join("\n").trim();
}

/**
 * 🧪 測試生產流程
 */
function testProductionPipeline() {
  console.log("🧪 測試生產流程...\n");
  
  try {
    const result = runProductionPipeline();
    console.log("\n✅ 測試完成！");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("❌ 測試失敗:", e.message);
  }
}
