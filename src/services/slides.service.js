// ==========================================
// 📊 Google Slides 製作服務
// ==========================================
// 職責：製作直式 9:16 新聞簡報（適配 LINE + IG）

/**
 * 製作完整的新聞簡報（直式 9:16）
 *
 * 使用預建模板複製，確保正確的直式尺寸
 *
 * @param {string} headline - 中文標題
 * @param {File} imageFile - 背景圖片檔案
 * @param {string} summary - 摘要（備用）
 * @param {string} jsonString - JSON 資料（insights）
 * @returns {Object} { slideUrl, pdfUrl }
 */
function createNewsPresentation(headline, imageFile, summary, jsonString) {
  _initConfig();

  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('slides.service', 'createNewsPresentation');
  }

  // 🧠 解析 JSON
  var dataObj = {};
  try {
    dataObj = JSON.parse(jsonString);
  } catch (e) {
    console.error("❌ JSON 解析失敗: " + e.message);
    dataObj = { insights: [] };
  }

  var insights = (dataObj.insights || []).slice(0, 5);
  var imageBlob = imageFile.getBlob();

  // 🎨 字體設定
  var fontChinese = "Noto Sans TC";
  var fontEnglish = "Montserrat";

  // 📐 建立簡報（模板複製 or 新建）
  var presentation;
  var fileId;
  var TEMPLATE_ID = Config.get('VERTICAL_SLIDE_TEMPLATE_ID');

  if (TEMPLATE_ID) {
    // 複製直式模板
    var copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy("Q報 " + headline);
    fileId = copy.getId();
    presentation = SlidesApp.openById(fileId);
    console.log("📐 使用直式模板 (9:16)");
  } else {
    // 後備：一般建立
    presentation = SlidesApp.create("Q報 " + headline);
    fileId = presentation.getId();
    console.log("⚠️ 未設定 VERTICAL_SLIDE_TEMPLATE_ID，使用預設 16:9");
  }

  var pageWidth = presentation.getPageWidth();
  var pageHeight = presentation.getPageHeight();
  console.log("📐 頁面尺寸: " + pageWidth + " x " + pageHeight);

  // 收集需要強制對齊的文字框 ID
  var textIdsToJustify = [];

  // 📁 自動歸檔
  try {
    var file = DriveApp.getFileById(fileId);
    if (typeof SLIDE_FOLDER_ID !== 'undefined' && SLIDE_FOLDER_ID) {
      var folder = DriveApp.getFolderById(SLIDE_FOLDER_ID);
      file.moveTo(folder);
    }
  } catch (e) {
    console.warn("⚠️ Slide 歸檔略過: " + e.message);
  }

  // 日期
  var dateStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy.MM.dd");

  try {
    // ==========================================
    // 📄 Slide 1: 封面 — 滿版圖 + 標題疊加
    // ==========================================
    var slide1 = presentation.getSlides()[0];
    slide1.getPageElements().forEach(function(e) { e.remove(); });

    // 滿版背景圖
    var coverImage = slide1.insertImage(imageBlob);
    coverImage.setLeft(0).setTop(0).setWidth(pageWidth).setHeight(pageHeight);

    // 底部漸層遮罩（讓文字可讀）
    var gradient = slide1.insertShape(SlidesApp.ShapeType.RECTANGLE);
    gradient.setLeft(0).setTop(pageHeight * 0.55).setWidth(pageWidth).setHeight(pageHeight * 0.45);
    gradient.getFill().setSolidFill('#000000', 0.65);
    gradient.getBorder().setTransparent();

    // 品牌標 + 日期
    var brandBox = slide1.insertTextBox("量識Q報  |  美股快訊  |  " + dateStr);
    brandBox.setLeft(30).setTop(pageHeight * 0.60).setWidth(pageWidth - 60).setHeight(30);
    brandBox.getText().getTextStyle()
      .setFontFamily(fontChinese)
      .setFontSize(11)
      .setForegroundColor("#AAAAAA");

    // 大標題
    var titleBox = slide1.insertTextBox(headline);
    titleBox.setLeft(30).setTop(pageHeight * 0.66).setWidth(pageWidth - 60).setHeight(pageHeight * 0.20);
    titleBox.getText().getTextStyle()
      .setFontFamily(fontChinese)
      .setFontSize(28)
      .setBold(true)
      .setForegroundColor("#FFFFFF");
    titleBox.getText().getParagraphStyle().setLineSpacing(140);

    // 快訊預覽（前 3 則標題）
    var previewText = insights.slice(0, 3).map(function(item, i) {
      return "▸ " + (item.title || "");
    }).join("   ");
    var previewBox = slide1.insertTextBox(previewText);
    previewBox.setLeft(30).setTop(pageHeight * 0.88).setWidth(pageWidth - 60).setHeight(40);
    previewBox.getText().getTextStyle()
      .setFontFamily(fontChinese)
      .setFontSize(10)
      .setForegroundColor("#CCCCCC");

    // ==========================================
    // 📄 Slide 2: 總覽 — 5 則快訊一覽
    // ==========================================
    var slide2 = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);

    // 深色背景
    var bg2 = slide2.insertShape(SlidesApp.ShapeType.RECTANGLE);
    bg2.setLeft(0).setTop(0).setWidth(pageWidth).setHeight(pageHeight);
    bg2.getFill().setSolidFill('#0D1117');
    bg2.getBorder().setTransparent();

    // 頁面標題
    var overviewTitle = slide2.insertTextBox("TODAY'S HIGHLIGHTS");
    overviewTitle.setLeft(30).setTop(25).setWidth(pageWidth - 60).setHeight(35);
    overviewTitle.getText().getTextStyle()
      .setFontFamily(fontEnglish)
      .setFontSize(18)
      .setBold(true)
      .setForegroundColor("#4A9EFF");

    // 📐 5 張卡片排列
    var cardStartY = 75;
    var cardGap = 10;
    var cardCount = insights.length || 1;
    var totalAvailableHeight = pageHeight - cardStartY - 30;
    var cardHeight = (totalAvailableHeight - (cardGap * (cardCount - 1))) / cardCount;
    var cardMarginX = 25;
    var cardWidth = pageWidth - (cardMarginX * 2);
    var accentColors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A78BFA', '#60A5FA'];

    insights.forEach(function(item, index) {
      var currentTop = cardStartY + (index * (cardHeight + cardGap));

      // 卡片背景
      var card = slide2.insertShape(SlidesApp.ShapeType.RECTANGLE);
      card.setLeft(cardMarginX).setTop(currentTop).setWidth(cardWidth).setHeight(cardHeight);
      card.getFill().setSolidFill('#161B22');
      card.getBorder().setTransparent();

      // 左側色條
      var accent = slide2.insertShape(SlidesApp.ShapeType.RECTANGLE);
      accent.setLeft(cardMarginX).setTop(currentTop).setWidth(4).setHeight(cardHeight);
      accent.getFill().setSolidFill(accentColors[index % 5]);
      accent.getBorder().setTransparent();

      // 標題
      var titleH = Math.min(cardHeight * 0.45, 28);
      var tBox = slide2.insertTextBox((item.title || ""));
      tBox.setLeft(cardMarginX + 14).setTop(currentTop + 6).setWidth(cardWidth - 24).setHeight(titleH);
      tBox.getText().getTextStyle()
        .setFontFamily(fontChinese)
        .setFontSize(14)
        .setBold(true)
        .setForegroundColor("#FFFFFF");

      // 來源 + 摘要
      var descText = (item.source ? "📰 " + item.source + "  " : "") + (item.short_content || "");
      var dBox = slide2.insertTextBox(descText);
      dBox.setLeft(cardMarginX + 14).setTop(currentTop + 6 + titleH).setWidth(cardWidth - 24).setHeight(cardHeight - titleH - 12);
      dBox.getText().getTextStyle()
        .setFontFamily(fontChinese)
        .setFontSize(9)
        .setForegroundColor("#8B949E");
    });

    // ==========================================
    // 📄 Slide 3-7: 個別深度頁（每則一頁）
    // ==========================================
    insights.forEach(function(item, index) {
      var detailSlide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);

      // 背景圖（淡化）
      var bgImg = detailSlide.insertImage(imageBlob);
      bgImg.setLeft(0).setTop(0).setWidth(pageWidth).setHeight(pageHeight);
      bgImg.sendToBack();

      // 白色遮罩
      var overlay = detailSlide.insertShape(SlidesApp.ShapeType.RECTANGLE);
      overlay.setLeft(0).setTop(0).setWidth(pageWidth).setHeight(pageHeight);
      overlay.getFill().setSolidFill('#FFFFFF', 0.92);
      overlay.getBorder().setTransparent();

      // 頁碼色塊
      var numBlock = detailSlide.insertShape(SlidesApp.ShapeType.RECTANGLE);
      numBlock.setLeft(25).setTop(25).setWidth(50).setHeight(50);
      numBlock.getFill().setSolidFill(accentColors[index % 5]);
      numBlock.getBorder().setTransparent();

      var numBox = detailSlide.insertTextBox("0" + (index + 1));
      numBox.setLeft(25).setTop(25).setWidth(50).setHeight(50);
      numBox.getText().getTextStyle()
        .setFontFamily(fontEnglish)
        .setFontSize(24)
        .setBold(true)
        .setForegroundColor("#FFFFFF");
      numBox.getText().getParagraphStyle()
        .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      // 來源標籤
      if (item.source) {
        var srcBox = detailSlide.insertTextBox("📰 " + item.source);
        srcBox.setLeft(85).setTop(30).setWidth(pageWidth - 120).setHeight(20);
        srcBox.getText().getTextStyle()
          .setFontFamily(fontChinese)
          .setFontSize(10)
          .setForegroundColor("#888888");
      }

      // 標題
      var dTitle = detailSlide.insertTextBox(item.title || "");
      dTitle.setLeft(85).setTop(55).setWidth(pageWidth - 120).setHeight(40);
      dTitle.getText().getTextStyle()
        .setFontFamily(fontChinese)
        .setFontSize(22)
        .setBold(true)
        .setForegroundColor(accentColors[index % 5]);

      // 分隔線
      var divider = detailSlide.insertShape(SlidesApp.ShapeType.RECTANGLE);
      divider.setLeft(85).setTop(100).setWidth(pageWidth - 170).setHeight(3);
      divider.getFill().setSolidFill(accentColors[index % 5]);
      divider.getBorder().setTransparent();

      // 內文
      var contentBox = detailSlide.insertTextBox(item.long_content || "");
      contentBox.setLeft(40).setTop(120).setWidth(pageWidth - 80).setHeight(pageHeight - 160);

      contentBox.getText().getTextStyle()
        .setFontFamily(fontChinese)
        .setFontSize(14)
        .setForegroundColor("#333333");

      var pStyle = contentBox.getText().getParagraphStyle();
      pStyle.setLineSpacing(160);
      pStyle.setSpaceBelow(8);

      textIdsToJustify.push(contentBox.getObjectId());
      contentBox.bringToFront();
    });

    // 💾 儲存
    presentation.saveAndClose();

    // ☢️ API 強制左右對齊
    if (textIdsToJustify.length > 0) {
      try {
        var requests = textIdsToJustify.map(function(id) {
          return {
            "updateParagraphStyle": {
              "objectId": id,
              "style": { "alignment": "JUSTIFIED" },
              "fields": "alignment"
            }
          };
        });
        Slides.Presentations.batchUpdate({'requests': requests}, fileId);
        console.log("✅ 強制左右對齊成功 (" + textIdsToJustify.length + " 個文字框)");
      } catch (apiError) {
        console.warn("⚠️ API 對齊失敗 (可忽略): " + apiError.message);
      }
    }

  } catch (mainError) {
    console.error("❌ Slide 製作嚴重錯誤: " + mainError.message);
    try { presentation.saveAndClose(); } catch(e) {}
    return { slideUrl: "", pdfUrl: "" };
  }

  // 🔄 自動轉檔 PDF
  var pdfUrl = "";
  try {
    pdfUrl = convertPresentationToPdf(fileId, headline);
  } catch (pdfError) {
    console.warn("⚠️ PDF 轉換失敗: " + pdfError.message);
  }

  var slideUrl = "https://docs.google.com/presentation/d/" + fileId + "/edit";

  return {
    slideUrl: slideUrl,
    pdfUrl: pdfUrl
  };
}

/**
 * 將簡報轉換為 PDF
 *
 * @param {string} presentationId - 簡報 ID
 * @param {string} headline - 標題（用於檔名）
 * @returns {string} PDF URL
 */
function convertPresentationToPdf(presentationId, headline) {
  _initConfig();

  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('slides.service', 'convertPresentationToPdf');
  }

  Utilities.sleep(1000);

  var pdfBlob = DriveApp.getFileById(presentationId).getBlob().getAs('application/pdf');
  var safeName = headline.replace(/[^\w\s\u4e00-\u9fff]/gi, '').substring(0, 50);
  pdfBlob.setName("Q報_" + safeName + ".pdf");

  if (typeof PDF_FOLDER_ID !== 'undefined' && PDF_FOLDER_ID) {
    var pdfFolder = DriveApp.getFolderById(PDF_FOLDER_ID);
    var pdfFile = pdfFolder.createFile(pdfBlob);

    try {
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn("⚠️ PDF 分享權限設定失敗: " + e.message);
    }

    var pdfUrl = "https://drive.google.com/file/d/" + pdfFile.getId() + "/view";
    console.log("✅ PDF 已生成: " + pdfUrl);

    return pdfUrl;
  }

  return "";
}
