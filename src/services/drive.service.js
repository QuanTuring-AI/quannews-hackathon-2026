// ==========================================
// 📁 Google Drive 服務
// ==========================================
// 職責：PDF OCR、檔案搬移、圖片 URL 轉換

/**
 * 從 PDF 提取文字（使用 OCR）
 * 
 * @param {File} file - Google Drive 檔案物件
 * @returns {string} 提取的文字
 */
function extractPdfText(file) {
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('drive.service', 'extractPdfText');
  }
  
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 OCR 重試第 ${attempt} 次: ${file.getName()}...`);
      }
      
      // 1. 取得 Blob
      const blob = file.getBlob();
      blob.setName(file.getName()); 

      // 2. 設定資源 metadata
      const resource = {
        title: "Temp_OCR_" + new Date().getTime(),
        mimeType: "application/vnd.google-apps.document"
      };

      // 3. 呼叫 Drive API (convert: true)
      const tempFile = Drive.Files.insert(resource, blob, { convert: true });

      // 4. 開啟文件並取得文字
      const doc = DocumentApp.openById(tempFile.id);
      const text = doc.getBody().getText();

      // 5. 刪除暫存檔
      Drive.Files.remove(tempFile.id);

      console.log(`✅ OCR 完成，提取 ${text.length} 字元`);
      
      if (text.length < 50) {
        console.warn(`⚠️ OCR 結果異常短，可能是純圖片`);
      }

      return text;

    } catch (error) {
      console.warn(`⚠️ OCR 失敗 (第 ${attempt} 次): ${error.message}`);
      
      // 如果是最後一次嘗試，或遇到不可逆的錯誤
      if (attempt === maxRetries || error.message.includes("File too large")) {
        console.error(`❌ OCR 最終失敗: ${error.message}`);
        throw new Error(`OCR 失敗 (${file.getName()}): ${error.message}`);
      }

      // 指數退避：2秒 → 4秒 → 8秒
      Utilities.sleep(2000 * Math.pow(2, attempt - 1));
    }
  }
  
  throw new Error("OCR 失敗：已達最大重試次數");
}

/**
 * 搬移檔案到指定資料夾
 * 
 * @param {File} file - 要搬移的檔案
 * @param {Folder} destinationFolder - 目標資料夾
 */
function moveFileTo(file, destinationFolder) {
  // 🔍 追蹤服務調用
  if (typeof ServiceTracker !== 'undefined' && ServiceTracker.track) {
    ServiceTracker.track('drive.service', 'moveFileTo');
  }
  
  try {
    file.moveTo(destinationFolder);
    console.log(`📦 檔案已搬移: ${file.getName()} → ${destinationFolder.getName()}`);
  } catch (e) {
    console.error(`❌ 搬移檔案失敗: ${e.message}`);
    throw new Error(`檔案搬移失敗: ${e.message}`);
  }
}

/**
 * 從 Drive 連結提取圖片 URL（LH3 格式）
 * 
 * 直接構建 Google 圖片 CDN URL，無需調用 DriveApp API
 * 
 * @param {string} driveLink - Google Drive 連結
 * @returns {string} 圖片 URL（適用於 LINE）
 */
function convertDriveLinkToImageUrl(driveLink) {
  const DEFAULT_IMAGE = "https://ssl.gstatic.com/docs/doclist/images/icon_10_generic_list.png";
  
  if (!driveLink) return DEFAULT_IMAGE;
  
  try {
    // 提取 File ID
    const fileId = driveLink.match(/[-\w]{25,}/);
    if (!fileId) return DEFAULT_IMAGE;
    
    // 直接構建 LH3 URL（高品質，適用於 LINE）
    // s1600 = 最大 1600px 寬度，保持高品質
    return `https://lh3.googleusercontent.com/d/${fileId[0]}=s1600`;
    
  } catch (e) {
    console.warn(`⚠️ 無法轉換圖片 URL: ${e.message}`);
    return DEFAULT_IMAGE;
  }
}

/**
 * 取得資料夾中的所有 PDF 檔案
 * 
 * @param {string} folderId - 資料夾 ID
 * @returns {Array<File>} PDF 檔案陣列
 */
function getPdfFilesFromFolder(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const pdfFiles = [];
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === "application/pdf") {
        pdfFiles.push(file);
      }
    }
    
    return pdfFiles;
    
  } catch (e) {
    console.error(`❌ 無法讀取資料夾: ${e.message}`);
    throw new Error(`資料夾讀取失敗: ${e.message}`);
  }
}

/**
 * 取得檔案資訊
 * 
 * @param {string} fileId - 檔案 ID
 * @returns {Object} 檔案資訊
 */
function getFileInfo(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    
    return {
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      createdDate: file.getDateCreated(),
      lastModified: file.getLastUpdated()
    };
    
  } catch (e) {
    console.error(`❌ 無法取得檔案資訊: ${e.message}`);
    return null;
  }
}

/**
 * 上傳檔案到 Drive
 * 
 * @param {Blob} blob - 檔案 Blob
 * @param {string} fileName - 檔案名稱
 * @param {string} folderId - 目標資料夾 ID
 * @returns {File} 上傳的檔案物件
 */
function uploadFile(blob, fileName, folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);
    file.setName(fileName);
    
    console.log(`✅ 檔案已上傳: ${fileName}`);
    return file;
    
  } catch (e) {
    console.error(`❌ 上傳檔案失敗: ${e.message}`);
    throw new Error(`檔案上傳失敗: ${e.message}`);
  }
}

/**
 * 刪除檔案
 * 
 * @param {string} fileId - 檔案 ID
 */
function deleteFile(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    console.log(`🗑️ 檔案已刪除: ${file.getName()}`);
  } catch (e) {
    console.error(`❌ 刪除檔案失敗: ${e.message}`);
  }
}

/**
 * 🧪 測試 Drive 服務
 */
function testDriveService() {
  _initConfig();
  console.log("🧪 測試 Drive 服務...\n");
  
  // 測試 1: 讀取 PDF 資料夾
  console.log("測試 1: 讀取 PDF 資料夾");
  const pdfFiles = getPdfFilesFromFolder(FOLDER_ID);
  console.log(`✅ 找到 ${pdfFiles.length} 個 PDF 檔案`);
  
  if (pdfFiles.length > 0) {
    const firstFile = pdfFiles[0];
    console.log(`   第一個檔案: ${firstFile.getName()}`);
    
    // 測試 2: 取得檔案資訊
    console.log("\n測試 2: 取得檔案資訊");
    const fileInfo = getFileInfo(firstFile.getId());
    if (fileInfo) {
      console.log(`✅ 檔案名稱: ${fileInfo.name}`);
      console.log(`   檔案大小: ${Math.round(fileInfo.size / 1024)} KB`);
      console.log(`   建立時間: ${fileInfo.createdDate}`);
    }
  }
  
  // 測試 3: 轉換圖片 URL
  console.log("\n測試 3: 轉換 Drive 圖片 URL");
  const testUrl = "https://drive.google.com/file/d/1abc123xyz/view";
  const imageUrl = convertDriveLinkToImageUrl(testUrl);
  console.log(`✅ 轉換結果: ${imageUrl.substring(0, 50)}...`);
  
  console.log("\n✅ Drive 服務測試完成！");
  console.log("⚠️ extractPdfText (OCR) 需要實際 PDF 檔案測試");
}
