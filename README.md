# QuanNews · Daily-News-Pipeline + Cue Bot

> **v3.1.0 GA · 6+ months production · paying VIP subscribers.** GCP-native automation pipeline turning PDF uploads or RSS feeds into daily multi-modal briefings — delivered via LINE Messaging API and queryable via Vertex AI RAG chatbot.

**Submission for [Google for Startups AI Agents Challenge 2026](https://googleforstartups.devpost.com/) · Track 3: Refactor for Google Cloud Marketplace & Gemini Enterprise · Region: APAC**

---

## Problem

Enterprise daily briefing automation is fragmented and expensive: marketing teams manually curate news from multiple sources, brand teams hand-craft visual covers, distribution teams manage 5+ channels. A single junior staffer dedicated to daily news distillation costs NT$ 600-900K/year — prohibitive for SMBs. Existing enterprise tools (Brandwatch, Mention) charge USD $30-100K/year and lack vertical specificity.

Millions of SMBs and mid-market enterprises need a daily-content automation pipeline that turns any PDF or RSS source into a multi-modal briefing delivered to LINE / IG / Email — without expanding their team.

## Solution

Daily-News-Pipeline is a production-running, GCP-native auto-pipeline that turns PDF uploads or RSS feeds into daily multi-modal briefings, delivered to subscribers via LINE Messaging API and queryable via a Vertex AI RAG chatbot called **Cue Bot**.

## Architecture

6-layer vertical flow · 5 GCP services orchestrated + Cue Bot RAG:

| Layer | Service | Role |
|-------|---------|------|
| 1. Data Ingestion | RSS feeds / Google News API / PDF upload | Source intake |
| 2. Orchestration | Google Apps Script (V8 Runtime) | Pipeline glue |
| 3. Generative AI | Vertex AI Gemini 2.5 Flash + Imagen 4 | Content + visual creation |
| 4. Workspace | Google Slides API + Drive | Document assembly |
| 5. Distribution | LINE Messaging API | Subscriber delivery |
| 6. Q&A (Cue Bot) | Vertex AI RAG chatbot | Knowledge query |

## Innovation

**Orchestration, not invention** — combining 5 GCP services into a production-grade daily briefing pipeline with single founder bandwidth.

## Business Model

QuanNews ships as an enterprise SaaS:

- **Enterprise tier**: USD 33K per organization per year · unlimited subscribers · 1 channel included · additional channels +30%
- **Setup**: USD 5K (one-time)
- **ROI**: Customers replace USD 100-300K/year in vendor tools (Brandwatch, Mention) and dedicated content teams — delivering **3 to 9x ROI**

Production paying VIP subscribers in Taiwan since v3.1.0 GA release (6+ months).

## Branding Note

This codebase is **production-deployed** to Taiwan-based Chinese-speaking consumers via a LINE bot. The English-language brand for international submission is **QuanNews · Cue Bot**; the equivalent Chinese-language consumer brand is **量識Q報 · 電路貓 (Circuit Cat persona)**. Both names refer to the same product. Code strings retain the production Chinese brand for authenticity of the v3.1.0 GA snapshot — what judges see in the live LINE bot demo matches what's in this repository.

## Live Demo

- **LINE Bot**: Free use for QuanNews — see Devpost submission for LINE Add Friend link
- **Demo Video**: see Devpost submission

## Tech Stack

- Runtime: Google Apps Script V8
- AI Models: Vertex AI Gemini 2.5 Flash + Imagen 4
- Storage: Google Drive + Sheets (knowledge base)
- Distribution: LINE Messaging API
- **Track 3 Marketplace path**: Q4 2026 Service Registration delivery · 2027 H2 Marketplace listing (Cloud Run + Firestore + Marketplace SaaS Webhook + BigQuery refactor)

## Setup

This codebase is the production v3.1.0 GA snapshot of QuanNews Daily-News-Pipeline. To run it yourself:

### Prerequisites

- Google Cloud account with Vertex AI API enabled (Gemini 2.5 Flash + Imagen 4 access)
- Google Apps Script account
- LINE Developer account (for a LINE Messaging API channel)
- Node.js 18+ and [clasp](https://github.com/google/clasp) CLI: `npm install -g @google/clasp`

### Steps

1. Clone this repository:
   ```bash
   git clone https://github.com/QuanTuring-AI/quannews-hackathon-2026.git
   cd quannews-hackathon-2026
   ```
2. Authenticate clasp with your Google account:
   ```bash
   clasp login
   ```
3. Create the container-bound Apps Script project: create a Google Sheet (the knowledge base), add two tabs named `Editor_Desk` and `Users`, then open **Extensions → Apps Script** and copy the script ID into a new `.clasp.json` (`{"scriptId": "...", "rootDir": ""}` — see `.clasp.json` notes in [CLAUDE.md](CLAUDE.md)).
4. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and Drive folder IDs
   ```
5. Configure secrets and IDs:
   - Secrets (`GEMINI_API_KEY`, `LINE_ACCESS_TOKEN`, `ADMIN_ID`, `JSON_KEY_FILE_ID`) — add as Script Properties (Project Settings → Script Properties), or run `setupScriptProperties()` once. They are read via `PropertiesService.getScriptProperties()`.
   - Drive folder IDs and `GCP_PROJECT_ID` — fill the `YOUR_*` placeholders in `src/config.js` (`_staticConfig`).
6. Push code to your Apps Script project:
   ```bash
   clasp push
   ```
7. Set up triggers in the Apps Script editor:
   - `runProductionPipeline()` — time-based, daily morning (suggest 07:00 local)
   - `runMorningBroadcast()` — time-based, daily after pipeline (suggest 08:00)
   - `doPost` — deploy as Web App (anonymous access) and register the URL as your LINE channel webhook for Cue Bot Q&A

### Sample Data

The RSS pipeline ships pre-configured with **public feeds** (Yahoo Finance, CNBC, Google News queries) in `src/services/rss-fetcher.service.js` (`RSS_SOURCES` array) — it runs end-to-end with no enterprise customer configuration. For the PDF path, drop any public PDF report into your input Drive folder (`FOLDER_ID`).

### Non-Technical Evaluation Path

For evaluation without local setup, see [Live Demo](#live-demo) — the LINE Bot is publicly accessible to judges, and the demo video walks through the complete pipeline in 2–3 minutes.

## Team

**QuanTuring Inc. (量識科技股份有限公司)** — Pre-Series A AI startup based in Taipei, Taiwan, building production-grade enterprise AI solutions across RAG engines, autonomous agents, and content automation pipelines.

Ecosystem affiliations:
- Google Cloud Partner Advantage Member (5-path Registered, June 2026)
- Google for Startups Cloud Program
- NVIDIA Inception Program
- Microsoft for Startups · ISV Success
- AWS Activate
- Anthropic Claude Partner Network

Founder: Allen Chen · allen.chen@quanturing.ai

## License

Apache License 2.0 — see [LICENSE](LICENSE) file for full text.

Copyright (c) 2026 QuanTuring Inc. (量識科技股份有限公司).

## Contact

- Email: allen.chen@quanturing.ai
- Website: https://quanturing.ai
- Submission: Google for Startups AI Agents Challenge 2026
