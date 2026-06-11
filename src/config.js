// ==========================================
// 🔧 Configuration Management System
// ==========================================
// 用途：統一管理所有設定，區分敏感與非敏感資訊
// 設計：敏感資訊從 ScriptProperties 讀取，非敏感設定直接定義

/**
 * 🔐 一次性設定函式（請在 GAS 編輯器手動執行一次）
 *
 * 使用方式：
 * 1. 在 GAS 網頁編輯器中，將下方 'YOUR_...' 替換為真實值
 * 2. 選擇此函式 → 點擊「執行」
 * 3. 執行成功後，金鑰會安全存入 Script Properties
 * 4. ⚠️ 切勿將真實金鑰 commit 到 git
 *
 * 金鑰已設定完成的話，不需要再執行此函式。
 * 如需更新單一金鑰，直接到 GAS → 專案設定 → 指令碼屬性 修改即可。
 */
function setupScriptProperties() {
  var scriptProps = PropertiesService.getScriptProperties();

  scriptProps.setProperties({
    'GEMINI_API_KEY':       'YOUR_GEMINI_API_KEY',
    'LINE_ACCESS_TOKEN':    'YOUR_LINE_ACCESS_TOKEN',
    'ADMIN_ID':             'YOUR_ADMIN_LINE_USER_ID',
    'JSON_KEY_FILE_ID':     'YOUR_GCP_SERVICE_ACCOUNT_KEY_FILE_ID',
    'NEWEBPAY_MERCHANT_ID': '',
    'NEWEBPAY_HASH_KEY':    '',
    'NEWEBPAY_HASH_IV':     ''
  });

  Logger.log('✅ Script Properties 設定完成！');
}

/**
 * 🧪 驗證設定函式（測試 Script Properties 是否正確）
 */
function verifyScriptProperties() {
  const scriptProps = PropertiesService.getScriptProperties();
  const keys = [
    'GEMINI_API_KEY',
    'LINE_ACCESS_TOKEN',
    'ADMIN_ID',
    'JSON_KEY_FILE_ID'
  ];
  
  Logger.log('🔍 開始驗證 Script Properties...\n');
  
  keys.forEach(key => {
    const value = scriptProps.getProperty(key);
    if (value) {
      // 只顯示前 10 個字元，避免洩漏
      const preview = value.substring(0, 10) + '...';
      Logger.log(`✅ ${key}: ${preview}`);
    } else {
      Logger.log(`❌ ${key}: 未設定`);
    }
  });
  
  Logger.log('\n驗證完成！');
}

// ==========================================
// 📦 Config 物件（統一的設定接口）
// ==========================================

var Config = (function() {
  // 快取 ScriptProperties，避免重複讀取
  var _scriptProps = null;
  
  // 非敏感設定（直接定義）
  var _staticConfig = {
    // === Google Drive 資料夾 ===
    // ⚠️ 請替換為你自己的 Drive 資料夾 ID（見 .env.example）
    FOLDER_ID: 'YOUR_INPUT_PDF_FOLDER_ID',                     // 輸入 PDF 資料夾
    OUTPUT_FOLDER_ID: 'YOUR_OUTPUT_IMAGE_FOLDER_ID',           // 輸出圖片資料夾
    SLIDE_FOLDER_ID: 'YOUR_SLIDE_FOLDER_ID',                   // Slide 資料夾
    PDF_FOLDER_ID: 'YOUR_PDF_FOLDER_ID',                       // PDF 資料夾
    SCANNED_FOLDER_ID: 'YOUR_SCANNED_FOLDER_ID',               // 已處理檔案資料夾
    LOGO_IMAGE_ID: 'YOUR_LOGO_IMAGE_ID',                       // Logo 圖片 ID
    VERTICAL_SLIDE_TEMPLATE_ID: 'YOUR_VERTICAL_SLIDE_TEMPLATE_ID', // 直式 9:16 Slide 模板
    VIP_UPLOAD_FOLDER_ID: 'YOUR_VIP_UPLOAD_FOLDER_ID',         // VIP PDF 上傳暫存
    VIP_SCANNED_FOLDER_ID: 'YOUR_VIP_SCANNED_FOLDER_ID',       // VIP PDF 歸檔

    // === Google Sheets ===
    SHEET_NAME: 'Editor_Desk',                                 // 新聞資料表
    USERS_SHEET_NAME: 'Users',                                 // 用戶名單表

    // === GCP 設定 ===
    GCP_PROJECT_ID: 'YOUR_GCP_PROJECT_ID',                     // GCP 專案 ID
    LOCATION: 'us-central1',                                   // Vertex AI 區域
    
    // === VIP 設定 ===
    VIP_PRICE: 300,                                            // 月費（台幣）
    VIP_TRIAL_DAYS: 14,                                        // 試用天數

    // === V3 功能開關（角色白名單）===
    // 開放 VIP 時加入 "VIP"，全開時加入 "Free"
    V3_RAG_ENABLED_ROLES: '["Admin"]',                         // RAG 增強聊天
    V3_PDF_ANALYSIS_ROLES: '["Admin"]',                        // PDF 上傳分析
    V3_US_STOCK_FLASH_ROLES: '["Admin"]'                       // 美股快訊派送
  };
  
  /**
   * 初始化 ScriptProperties（懶加載）
   */
  function _initScriptProps() {
    if (!_scriptProps) {
      _scriptProps = PropertiesService.getScriptProperties();
    }
    return _scriptProps;
  }
  
  /**
   * 🔑 統一的取值接口
   * @param {string} key - 設定鍵名
   * @returns {string|number|null} 設定值
   */
  function get(key) {
    // 1. 先檢查靜態設定
    if (_staticConfig.hasOwnProperty(key)) {
      return _staticConfig[key];
    }
    
    // 2. 再檢查 ScriptProperties（敏感資訊）
    var props = _initScriptProps();
    var value = props.getProperty(key);
    
    if (value !== null) {
      return value;
    }
    
    // 3. 找不到則拋出警告
    console.warn(`⚠️ Config.get("${key}") 找不到設定值`);
    return null;
  }
  
  /**
   * 🔧 更新單一設定值（用於動態更新）
   * @param {string} key - 設定鍵名
   * @param {string} value - 設定值
   */
  function set(key, value) {
    // 如果是靜態設定，直接更新
    if (_staticConfig.hasOwnProperty(key)) {
      _staticConfig[key] = value;
      return;
    }
    
    // 否則更新到 ScriptProperties
    var props = _initScriptProps();
    props.setProperty(key, value);
  }
  
  /**
   * 📋 取得所有非敏感設定（用於除錯）
   */
  function getAllStatic() {
    return Object.assign({}, _staticConfig);
  }
  
  /**
   * 🧪 測試設定是否完整
   */
  function validate() {
    var requiredKeys = [
      'GEMINI_API_KEY',
      'LINE_ACCESS_TOKEN',
      'ADMIN_ID',
      'FOLDER_ID',
      'SHEET_NAME'
    ];
    
    var missing = [];
    requiredKeys.forEach(function(key) {
      if (!get(key)) {
        missing.push(key);
      }
    });
    
    if (missing.length > 0) {
      console.error('❌ 缺少必要設定: ' + missing.join(', '));
      console.error('👉 請執行 setupScriptProperties() 初始化設定');
      return false;
    }
    
    console.log('✅ 設定驗證通過');
    return true;
  }
  
  // 公開接口
  return {
    get: get,
    set: set,
    getAllStatic: getAllStatic,
    validate: validate
  };
})();

// ==========================================
// 🧪 測試函式
// ==========================================

/**
 * 測試 Config 是否正常運作
 */
function testConfig() {
  Logger.log('🧪 開始測試 Config...\n');
  
  // 測試靜態設定
  Logger.log('📁 FOLDER_ID: ' + Config.get('FOLDER_ID'));
  Logger.log('📊 SHEET_NAME: ' + Config.get('SHEET_NAME'));
  Logger.log('💎 VIP_PRICE: ' + Config.get('VIP_PRICE'));
  
  // 測試敏感設定（只顯示前 10 個字元）
  var apiKey = Config.get('GEMINI_API_KEY');
  if (apiKey) {
    Logger.log('🔑 GEMINI_API_KEY: ' + apiKey.substring(0, 10) + '...');
  } else {
    Logger.log('❌ GEMINI_API_KEY: 未設定（請執行 setupScriptProperties）');
  }
  
  var lineToken = Config.get('LINE_ACCESS_TOKEN');
  if (lineToken) {
    Logger.log('🔑 LINE_ACCESS_TOKEN: ' + lineToken.substring(0, 10) + '...');
  } else {
    Logger.log('❌ LINE_ACCESS_TOKEN: 未設定（請執行 setupScriptProperties）');
  }
  
  // 執行驗證
  Logger.log('\n🔍 執行完整驗證...');
  Config.validate();
  
  Logger.log('\n✅ 測試完成！');
}
