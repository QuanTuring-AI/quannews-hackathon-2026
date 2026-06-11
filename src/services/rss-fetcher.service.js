// ==========================================
// 📡 RSS 多源抓取服務
// ==========================================
// 職責：從多個財經新聞源抓取 RSS，解析 XML，去重回傳
// 用於：美股快訊捕手 (US Stock Flash)

/**
 * RSS 來源設定
 *
 * 分為兩類：
 * 1. 直接 RSS Feed（穩定，格式標準）
 * 2. Google News RSS 代理（用於有 paywall 或無 RSS 的來源）
 */
var RSS_SOURCES = [
  // --- 直接 RSS ---
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    type: "rss"
  },
  {
    name: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
    type: "rss"
  },
  {
    name: "MarketWatch",
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    type: "rss"
  },
  // --- Google News RSS 代理（抓 Bloomberg / CNN / Reuters / Trump） ---
  {
    name: "Bloomberg via Google News",
    url: "https://news.google.com/rss/search?q=bloomberg+US+stock+market+when:1d&hl=en-US&gl=US&ceid=US:en",
    type: "google-news"
  },
  {
    name: "CNN Business via Google News",
    url: "https://news.google.com/rss/search?q=CNN+business+stock+market+when:1d&hl=en-US&gl=US&ceid=US:en",
    type: "google-news"
  },
  {
    name: "Reuters via Google News",
    url: "https://news.google.com/rss/search?q=reuters+US+stock+market+when:1d&hl=en-US&gl=US&ceid=US:en",
    type: "google-news"
  },
  {
    name: "Trump & Market",
    url: "https://news.google.com/rss/search?q=trump+stock+market+tariff+when:1d&hl=en-US&gl=US&ceid=US:en",
    type: "google-news"
  }
];

/**
 * 📡 從所有來源抓取新聞
 *
 * @param {number} maxPerSource - 每個來源最多抓幾條（預設 5）
 * @returns {Array<Object>} 去重後的新聞列表
 *   [{ title, description, link, pubDate, source }]
 */
function fetchAllRSSFeeds(maxPerSource) {
  if (maxPerSource === undefined) maxPerSource = 5;

  console.log("📡 開始抓取 " + RSS_SOURCES.length + " 個新聞來源...");

  var allArticles = [];

  for (var i = 0; i < RSS_SOURCES.length; i++) {
    var source = RSS_SOURCES[i];
    try {
      var articles = fetchSingleRSS(source.url, source.name, maxPerSource);
      console.log("  ✅ " + source.name + ": " + articles.length + " 條");
      allArticles = allArticles.concat(articles);
    } catch (e) {
      console.error("  ❌ " + source.name + " 抓取失敗: " + e.message);
    }

    Utilities.sleep(500); // 避免被封
  }

  // 去重（以標題相似度判斷）
  var deduplicated = deduplicateArticles(allArticles);

  console.log("📡 抓取完成: " + allArticles.length + " 條 → 去重後 " + deduplicated.length + " 條");

  return deduplicated;
}

/**
 * 📡 抓取單一 RSS Feed
 *
 * @param {string} url - RSS URL
 * @param {string} sourceName - 來源名稱
 * @param {number} maxItems - 最多抓幾條
 * @returns {Array<Object>} 新聞列表
 */
function fetchSingleRSS(url, sourceName, maxItems) {
  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; QuanturingBot/1.0)'
    }
  });

  var statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    throw new Error("HTTP " + statusCode);
  }

  var xml = response.getContentText();
  return parseRSSXml(xml, sourceName, maxItems);
}

/**
 * 🔧 解析 RSS XML
 *
 * 支援 RSS 2.0 和 Atom 格式
 *
 * @param {string} xmlText - RSS XML 文字
 * @param {string} sourceName - 來源名稱
 * @param {number} maxItems - 最多取幾條
 * @returns {Array<Object>} 解析後的新聞列表
 */
function parseRSSXml(xmlText, sourceName, maxItems) {
  var articles = [];

  try {
    var doc = XmlService.parse(xmlText);
    var root = doc.getRootElement();

    // RSS 2.0 格式
    var items = findElements(root, "item");

    // Atom 格式 fallback
    if (items.length === 0) {
      items = findElements(root, "entry");
    }

    var count = Math.min(items.length, maxItems);

    for (var i = 0; i < count; i++) {
      var item = items[i];

      var title = getElementText(item, "title") || "";
      var description = getElementText(item, "description") || getElementText(item, "summary") || "";
      var link = getElementText(item, "link") || "";
      var pubDate = getElementText(item, "pubDate") || getElementText(item, "published") || "";

      // Atom 格式的 link 可能在 attribute
      if (!link) {
        var linkEl = findElements(item, "link");
        if (linkEl.length > 0 && linkEl[0].getAttribute("href")) {
          link = linkEl[0].getAttribute("href").getValue();
        }
      }

      // 清理 HTML tags
      title = stripHtml(title).trim();
      description = stripHtml(description).trim().substring(0, 500);

      if (title) {
        articles.push({
          title: title,
          description: description,
          link: link,
          pubDate: pubDate,
          source: sourceName
        });
      }
    }
  } catch (e) {
    console.error("⚠️ XML 解析失敗 (" + sourceName + "): " + e.message);
  }

  return articles;
}

/**
 * 🔧 在 XML 元素中遞迴尋找子元素（忽略 namespace）
 */
function findElements(element, tagName) {
  var results = [];
  var children = element.getChildren();

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.getName() === tagName) {
      results.push(child);
    }
    // 遞迴搜尋（RSS channel > item 結構）
    var nested = findElements(child, tagName);
    results = results.concat(nested);
  }

  return results;
}

/**
 * 🔧 取得 XML 子元素的文字內容
 */
function getElementText(element, tagName) {
  var children = element.getChildren();
  for (var i = 0; i < children.length; i++) {
    if (children[i].getName() === tagName) {
      return children[i].getText();
    }
  }
  return "";
}

/**
 * 🔧 移除 HTML 標籤
 */
function stripHtml(text) {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/**
 * 🔧 去重（標題前 30 字元相同視為重複）
 */
function deduplicateArticles(articles) {
  var seen = {};
  var result = [];

  for (var i = 0; i < articles.length; i++) {
    var key = articles[i].title.substring(0, 30).toLowerCase().replace(/\s+/g, "");
    if (!seen[key]) {
      seen[key] = true;
      result.push(articles[i]);
    }
  }

  return result;
}

/**
 * 🧪 測試 RSS 抓取
 */
function testRSSFetcher() {
  console.log("🧪 測試 RSS 多源抓取...\n");

  var articles = fetchAllRSSFeeds(3);

  console.log("\n--- 抓取結果 ---");
  articles.forEach(function(a, i) {
    console.log((i + 1) + ". [" + a.source + "] " + a.title.substring(0, 60));
    if (a.description) {
      console.log("   " + a.description.substring(0, 80) + "...");
    }
  });

  console.log("\n✅ RSS 抓取測試完成！共 " + articles.length + " 條");
}
