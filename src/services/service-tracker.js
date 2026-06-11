// ==========================================
// 🔍 服務追蹤器（用於驗證新服務是否被調用）
// ==========================================
// 用途：在測試時確認程式確實走了新服務而非舊代碼

/**
 * 全域追蹤器
 */
var ServiceTracker = (function() {
  var _callLog = [];
  var _enabled = false;
  
  return {
    /**
     * 啟用追蹤
     */
    enable: function() {
      _enabled = true;
      _callLog = [];
      console.log("🔍 [ServiceTracker] 已啟用");
    },
    
    /**
     * 停用追蹤
     */
    disable: function() {
      _enabled = false;
      console.log("🔍 [ServiceTracker] 已停用");
    },
    
    /**
     * 記錄服務調用
     * 
     * @param {string} serviceName - 服務名稱
     * @param {string} functionName - 函式名稱
     */
    track: function(serviceName, functionName) {
      if (!_enabled) return;
      
      var timestamp = new Date().toISOString();
      var entry = {
        time: timestamp,
        service: serviceName,
        function: functionName
      };
      
      _callLog.push(entry);
      console.log(`🔍 [ServiceTracker] ${serviceName}.${functionName}()`);
    },
    
    /**
     * 取得調用記錄
     */
    getLog: function() {
      return _callLog;
    },
    
    /**
     * 顯示報告
     */
    report: function() {
      if (_callLog.length === 0) {
        console.log("🔍 [ServiceTracker] 無記錄（追蹤器可能未啟用）");
        return;
      }
      
      console.log("\n" + "=".repeat(60));
      console.log("🔍 服務調用追蹤報告");
      console.log("=".repeat(60));
      console.log(`總計調用: ${_callLog.length} 次\n`);
      
      // 按服務分組統計
      var serviceStats = {};
      _callLog.forEach(function(entry) {
        if (!serviceStats[entry.service]) {
          serviceStats[entry.service] = [];
        }
        serviceStats[entry.service].push(entry.function);
      });
      
      // 顯示各服務調用
      Object.keys(serviceStats).sort().forEach(function(service) {
        console.log(`📦 ${service}:`);
        var functions = serviceStats[service];
        var functionCounts = {};
        
        functions.forEach(function(fn) {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;
        });
        
        Object.keys(functionCounts).sort().forEach(function(fn) {
          console.log(`   └─ ${fn}() × ${functionCounts[fn]}`);
        });
        console.log("");
      });
      
      console.log("=".repeat(60) + "\n");
    },
    
    /**
     * 清除記錄
     */
    clear: function() {
      _callLog = [];
      console.log("🔍 [ServiceTracker] 記錄已清除");
    }
  };
})();

/**
 * 🧪 測試：驗證 Pipeline 是否使用新服務
 */
function testServiceUsage() {
  console.log("🧪 開始驗證服務調用路徑...\n");
  
  // 1. 啟用追蹤器
  ServiceTracker.enable();
  
  // 2. 執行完整 Pipeline
  console.log("🔥 執行 runProductionPipeline()...\n");
  try {
    runProductionPipeline();
  } catch (e) {
    console.error("❌ Pipeline 執行錯誤: " + e.message);
  }
  
  // 3. 顯示報告
  Utilities.sleep(2000);
  ServiceTracker.report();
  
  // 4. 分析結果
  var log = ServiceTracker.getLog();
  var newServiceCalls = 0;
  var expectedServices = [
    'news-analyzer.service',
    'gemini-core.service',
    'vertex-ai.service',
    'drive.service',
    'sheets.service',
    'imagen.service'
  ];
  
  expectedServices.forEach(function(service) {
    var calls = log.filter(function(entry) {
      return entry.service === service;
    });
    
    if (calls.length > 0) {
      newServiceCalls++;
      console.log(`✅ ${service}: ${calls.length} 次調用`);
    } else {
      console.log(`⚠️ ${service}: 未被調用`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  if (newServiceCalls >= 4) {
    console.log("✅ 驗證通過！Pipeline 確實使用了新服務層");
  } else {
    console.log("⚠️ 警告：部分新服務未被調用，可能仍在使用舊代碼");
  }
  console.log("=".repeat(60));
  
  // 5. 停用追蹤器
  ServiceTracker.disable();
}

/**
 * 🧪 快速測試：只測試單一服務
 */
function testSingleService() {
  console.log("🧪 測試單一服務調用...\n");
  
  ServiceTracker.enable();
  
  // 測試新聞分析
  try {
    var testText = "NVIDIA announces new B200 GPU with 4x performance boost.";
    console.log("測試 analyzeNews()...");
    analyzeNews(testText, "test.pdf");
  } catch (e) {
    console.error("錯誤: " + e.message);
  }
  
  ServiceTracker.report();
  ServiceTracker.disable();
}
