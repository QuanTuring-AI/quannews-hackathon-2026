# CLAUDE.md

## Project Overview

Quanturing Auto-News Pipeline (量識Q報) — an AI-driven automated news analysis and distribution system built on **Google Apps Script**. It extracts PDFs, analyzes them with Gemini/Vertex AI, generates images with Imagen 4, creates Google Slides presentations, and broadcasts news to LINE subscribers.

## Tech Stack

- **Platform**: Google Apps Script (V8 Runtime)
- **Language**: JavaScript (prefer ES5 var syntax for consistency)
- **AI**: Vertex AI (Gemini 2.5 Flash), Imagen 4
- **Messaging**: LINE Messaging API
- **Storage**: Google Drive, Google Sheets
- **Presentations**: Google Slides
- **Deployment**: Google Clasp (`clasp push`)
- **Auth**: OAuth2 library

## Project Structure

```
├── news-bot.js                  # Entry point (trigger adapters, diagnostics)
├── appsscript.json              # GAS config (timezone, scopes, advanced services)
├── deploy.sh                    # One-command clasp push + deploy helper
├── .env.example                 # Template for all secrets & folder IDs
└── src/
    ├── config.js                # Unified config (must load first)
    ├── services/                # service modules
    ├── controllers/             # controller modules
    └── utils/                   # utility modules (testing, debugging, admin)
```

> Note: create your own `.clasp.json` via `clasp create`/`clasp clone` — it is git-ignored because it holds your private script ID.

### Key Layers

- **Config** (`src/config.js`): `Config.get()`, `Config.set()`, `Config.validate()` — sensitive data via `PropertiesService`, static config for folder IDs and sheet names.
- **Services** (`src/services/`): Stateless functions — Sheets, Vertex AI, Gemini, news analysis, Circuit Cat chatbot (RAG), LINE messaging, Imagen, Slides, Drive, RSS fetching, service tracking.
- **Controllers** (`src/controllers/`): Orchestration — production pipeline, broadcaster, webhook handler, onboarding/VIP management, US stock flash news.
- **Utils** (`src/utils/`): Testing, debugging, admin tools, cleanup utilities.

## Deployment

```bash
clasp push    # Deploy to Google Apps Script
```

**File push order matters** (defined in `.clasp.json`):
1. `src/config.js` (must be first)
2. Services (in dependency order)
3. Controllers
4. Utils
5. `news-bot.js` (last)

## Testing & Diagnostics

All testing runs inside Google Apps Script (no local test runner):

```javascript
runDiagnostics()       // Full system diagnostics
runAllTests()          // Complete test suite
quickHealthCheck()     // Quick status check
quickTestBroadcast()   // Test broadcast pipeline
```

## Code Conventions

- **Private functions**: `_prefixedWithUnderscore()` (e.g., `_initConfig()`)
- **Public functions**: `camelCase()` (e.g., `runProductionPipeline()`)
- **Config/constants**: `UPPER_CASE` (e.g., `FOLDER_ID`, `VIP_PRICE`)
- **Comments**: Written in Chinese with emoji section headers
- **Error handling**: Explicit try-catch with `console.log`/`console.error`
- **Service tracking**: All services log via `ServiceTracker.track()`
- **Logging**: Emoji-prefixed log messages (e.g., `🚀`, `⚠️`, `❌`)

## Business Logic

- **Free users**: 1 article on Mon/Wed/Fri only
- **VIP/Admin**: 2 articles daily
- **VIP trial**: 14 days, auto-triggered on first message
- **Article selection**: Top articles by score with decay (−0.05/day)
- **Pipeline**: PDF → Gemini analysis → Imagen image → Slides → LINE broadcast

## GAS Triggers (Scheduled)

| Function | Schedule | Purpose |
|----------|----------|---------|
| `runProductionPipeline()` | Daily 7:00-8:00 | News production |
| `runMorningBroadcast()` | Daily 8:00-9:00 | Broadcast to users |
| `checkUserExpiry()` | Daily 00:00-01:00 | VIP expiration checks |
| `runUSStockFlashPipeline()` | Daily 7:00 | US stock news production |
| `broadcastUSStockFlash()` | Daily 8:00 | US stock broadcast |

## V3 Feature Gates

V3 features are controlled by role-based config in `src/config.js`:

```
V3_RAG_ENABLED_ROLES      → RAG 增強聊天（電路貓搜尋新聞知識庫）
V3_PDF_ANALYSIS_ROLES      → PDF 上傳分析（VIP/Admin 傳 PDF 跑完整 pipeline）
V3_US_STOCK_FLASH_ROLES    → 美股快訊派送（RSS 抓取 + AI 收斂 + 全用戶推播）
```

To expand access, add role strings (e.g., `"VIP"`, `"Free"`) to the JSON arrays.

## Important Notes

- This is a **Google Apps Script** project — there is no `package.json`, no npm, no local build/test pipeline. All code runs in the GAS environment.
- Timezone is `Asia/Taipei`.
- The webhook endpoint (`doPost`) is deployed as an anonymous web app for LINE integration.
