# Notion Book Search

> A sleek, high-definition book search and auto-saving widget designed to be embedded directly into Notion bookshelf pages. Built for Cloudflare Pages with Astro, React, Tailwind CSS, and Biome.

---

## Overview

Managing a personal reading library in Notion is visually rewarding, but manually searching for book covers on Aladdin, YES24, or Google, copying image links, and filling out book metadata is tedious.

**Notion Book Search** provides a lightweight, embeddable widget for Notion. With a single search in Notion, it queries both domestic (Kakao) and global (Google Books) catalogs, extracts **high-definition original book covers**, verifies whether the book is already in your library via ISBN, and saves it into your Notion database with one click.

### Key Highlights

- **Dual Book Search Engines**: Combines **Kakao (Daum) Book Search** for Korean publications with **Google Books API** for international titles.
- **High-Resolution Cover Extraction**:
  - Automatically parses and decodes the `fname` parameter in Kakao CDN thumbnails (`https://search1.kakaocdn.net/thumb/...`) to obtain the full-resolution uncompressed book cover.
  - Enhances Google Books covers by stripping curl edges and forcing HTTPS.
- **Zero-Knowledge Privacy Architecture**:
  - Credentials (Kakao, Google, and Notion keys) are encoded into the URL **Hash Fragment** (`#config=...`).
  - Because URL hashes are never transmitted to the web server, your API keys and tokens are never logged in Cloudflare server logs or HTTP referrers.
- **Notion Schema Auto-Discovery**:
  - The setup generator inspects your Notion Data Source properties in real time, auto-detecting and mapping Title, Author, Publisher, Publish Date, and ISBN.
- **Duplicate Prevention via ISBN**:
  - Before saving, the widget inspects your Notion database using the ISBN to warn if the title is already present.
- **Embeddable & Responsive**:
  - Seamlessly fits into narrow Notion columns (300px) or full-width pages.
  - Supports automatic system theme detection, manual Dark/Light toggles, and URL-fixed theme preferences.
- **Modern Web Stack**:
  - Astro (SSR mode with `@astrojs/cloudflare`)
  - React 19 + Tailwind CSS + Lucide Icons
  - Biome for fast formatting and linting
  - Bun runtime & package manager
  - Path alias: `@/*` mapped to `src/*`

---

## Tech Stack

| Category | Technology |
|---|---|
| **Runtime & Package Manager** | [Bun](https://bun.sh/) |
| **Framework** | [Astro](https://astro.build/) + [React](https://react.dev/) |
| **Edge Hosting** | [Cloudflare Pages](https://pages.cloudflare.com/) (`@astrojs/cloudflare`) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Tooling** | [Biome](https://biomejs.dev/) |
| **APIs** | Kakao Book Search API, Google Books API, Notion API |

---

## Architecture & Security

```
+------------------+         #config=<encoded>         +--------------------+
|   Notion Page    | --------------------------------> |  Embed Client App  |
|  (/embed block)  |                                   |  (Reads URL Hash)  |
+------------------+                                   +--------------------+
                                                          |        |       |
                                         +----------------+        |       +----------------+
                                         v                         v                        v
                                  [ Kakao Books ]          [ Google Books ]           [ Notion API ]
```

1. **100% Static & Pure Client-Side**: The application is fully static and runs entirely in the user's browser, communicating directly with Kakao Books, Google Books, and Notion APIs. No server runtime or backend functions are required.
2. **URL Hash Storage**: When creating an embed link, your configuration is encoded into URL-safe Base64 and placed behind `#config=...`. Browsers do not transmit URL hashes in HTTP request lines, ensuring tokens and keys are never sent to any hosting server.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed (`v1.1+` recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/thecats1105/notion-book-search.git
cd notion-book-search

# Install dependencies with Bun
bun install
```

### Development Server

```bash
bun run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Scripts

- `bun run dev`: Start the local Astro development server.
- `bun run build`: Build the static production bundle for Cloudflare Pages.
- `bun run preview`: Preview the production build locally.
- `bun run deploy`: Build and deploy to Cloudflare Pages via Wrangler.
- `bun test`: Run automated unit tests.
- `bun run check`: Run Biome lint and formatting checks.
- `bun run format`: Auto-format source code with Biome.

---

## Deployment to Cloudflare Pages

### Option 1: Git Integration (Recommended)

1. Push your repository to GitHub.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Framework preset**: None (or Astro)
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
   - **Compatibility flag**: `nodejs_compat`
4. Click **Save and Deploy**.

### Option 2: Wrangler CLI

```bash
bun run build
bunx wrangler pages deploy dist
```

---

## Usage Guide

### 1. Generating your Widget URL

1. Visit your deployed site root (`/` or `https://<your-domain>.pages.dev/`).
2. **Step 1: Notion Integration Setup**:
   - Provide your **Notion Internal Integration Secret** (`secret_...`).
   - Provide your **Notion Database ID** (or paste the full database URL).
   - Click **Test Connection & Fetch Properties**.
3. **Step 2: Database Column Mapping**:
   - Select the corresponding columns for **Title**, **Author**, **Publisher**, **Publish Date**, and **ISBN**.
4. **Step 3: Book Search API Keys**:
   - **Kakao REST API Key**: Obtain from [Kakao Developers Console](https://developers.kakao.com/console/app).
   - **Google Books API Key**: Optional, obtain from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
5. **Step 4: Preferences**:
   - Choose your default theme (Auto, Light, or Dark) and default search tab.
6. **Step 5: Copy Embed URL**:
   - Copy the generated embed URL.

### 2. Adding to Notion

1. In your Notion reading tracker page, type `/embed` and press Enter.
2. Paste the copied URL and click **Embed link**.
3. Adjust the widget dimensions to fit your page layout.
4. Type a book title or ISBN to search, preview the cover, and click **Add to Notion**!

---

## License

MIT License. See [LICENSE](LICENSE) for details.

