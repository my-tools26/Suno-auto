# Suno Auto Creator

A Chrome extension to automate music creation on [Suno.com](https://suno.com) — generate songs with custom lyrics, styles, and batch creation with AI assistance.

**Version:** 1.9.2 | **Manifest:** V3 | **Status:** Active Development

---

## ✨ Features

### 🎵 Core Music Generation
- **Auto-fill & Create**: Paste lyrics + choose style → extension fills Suno's form and clicks Create
- **Multiple Modes**:
  - **Write Mode**: Use your own lyrics
  - **Prompt Mode**: Let Suno write random lyrics from a style description
  - **Instrumental Mode**: Generate music without lyrics
- **Smart Form Detection**: Automatically waits for the Create button to be enabled before clicking
- **Human-like Typing**: Character-by-character input with random delays to appear natural

### 🔄 Batch Creation
- **Multi-round Generation**: Create 2–10 songs in a single batch
- **Smart Rest Periods**: 2–4 minute random delays between rounds (survives tab switching & browser restart via Chrome Alarms)
- **State Persistence**: Background service worker orchestrates batch, not content script — prevents loss if tab hibernates
- **Per-round Style Variations**: Optional smart batch where each round gets a slightly tweaked style (e.g., "lo-fi" → "lo-fi with synth", "lo-fi raw", etc.)

### 💾 Presets & Queue
- **Save Presets**: Store style + title + lyrics combinations, export/import as JSON
- **Queue System**: Add multiple configurations to a queue and run sequentially
- **Preset Management**: Delete, export (all presets as one JSON), import from file

### 📊 History & Analytics
- **Song History**: Track all created songs with metadata (style, title, lyrics excerpt, creation time)
- **Star Ratings**: Manually rate songs 1–5 stars to mark favorites
- **Smart Filters**: View all songs or filter by rating (3+, 4+, 5⭐)
- **Credit Estimation**: Display today's creation count, total created, and estimated credit usage

### 🎨 Style Assistance
- **Professional Style Cookbook**: 25+ pre-built styles (Lo-fi, EDM, Hip-Hop, Classical, K-pop, etc.) grouped by genre
- **Artist Converter**: Type an artist name (e.g., "Adele", "The Weeknd") → extension suggests a matching style descriptor
- **Auto-tagging**: Automatically structure raw lyrics with `[Verse 1]`, `[Chorus]`, `[Verse 2]`, `[Bridge]`, `[Outro]` tags
- **Lyric Structuring**: One-click button to organize untagged lyrics into Suno's expected format

### 🎚️ Advanced Controls
- **Weirdness & Style Influence Sliders**: Fine-tune Suno's creativity and style adherence (0–100 range)
- **Smart Variations**: Enable smart batch to auto-generate style variations for each round
- **Random Delay Simulation**: Human-like delays between all actions to reduce detection/blocking

### 📥 Auto-Download
- **Automatic MP3 Download**: When enabled, extension downloads generated songs immediately after MP3 rendering completes
- **CDN Validation**: Verifies song availability via HEAD request before downloading (checks for 200 OK + audio/mp3 content-type)
- **Smart Wait Logic**: Waits up to 6 minutes for MP3 to render, doesn't block batch creation (songs still marked as created even if rendering slow)

### 🛡️ Side Panel UI
- **Persistent Side Panel**: Stays open across tab switches — batch continues even if you work elsewhere
- **Dark Blue Theme**: Navy (#0a0f1a) + light blue (#60a5fa) mono color scheme for easy reading
- **Collapsible Sections**: 
  - "Style Suggestions" (cookbook + artist lookup)
  - "Advanced" (smart batch + sliders)
- **Tab Navigation**: Tạo nhạc (Create) | Hàng đợi (Queue) | Lịch sử (History)
- **Real-time Status**: Shows current action + estimated time until next round

---

## 🚀 How to Use

### Installation
1. Clone this repo or download as ZIP
2. Extract to a folder (e.g., `~/Downloads/suno-auto`)
3. Open `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked**
6. Select the `suno-auto` folder
7. Open [suno.com/create](https://suno.com/create) and log in to your Suno account (Premium recommended for best results)
8. Click the extension icon (♪) to open the Side Panel

### Basic Workflow
1. **Fill the Form**:
   - Enter a **style** (e.g., "lo-fi hip-hop, jazzy chords")
   - Paste **lyrics** (or enable "Random Lyrics" for Suno to write)
   - Optionally add a **title**
2. **Create**:
   - Set "Number of rounds" (1–10)
   - Click **"Tạo nhạc ngay"** (Create Now)
   - Extension will:
     - Click Suno's Create button
     - Wait for 2 songs to generate
     - Download MP3 if enabled
     - Rest 2–4 minutes before next round (if batch)
3. **Review**:
   - Check the **History** tab
   - Star-rate songs you like
   - Re-use great styles as presets

### Advanced: Save & Reuse Presets
- **In "Create" tab**, fill style + title + lyrics
- Click **"💾 Lưu"** (Save)
- Give it a name (e.g., "Chill Lo-fi Vibes")
- Later, select it from the dropdown to auto-fill the form
- **Export**: Click the 📤 icon to save all presets as `presets.json`
- **Import**: Click the 📥 icon and select a `presets.json` file

### Advanced: Queue & Batch
- **Add to Queue**: Fill the form + click **"➕ Hàng đợi"** instead of Create
- **Run Queue**: Go to **Hàng đợi (Queue)** tab → click **"▶ Chạy"** (Run)
- **Batch Creation**: In Create tab, set "Số lượt tạo" (number of rounds) to 2–10 → click Create → wait for rest periods between rounds

### Tips for Best Results
- **Lyrics**: Include line breaks between verses/choruses — extension auto-tags them
- **Style**: Be specific. Instead of "pop", try "pop ballad with strings, emotional, piano-driven"
- **Artist Mode**: Type "Taylor Swift" → extension converts to matching style (saves time thinking)
- **Batch Timing**: Set batch for before bed — 5 rounds = ~30 minutes of total creation time
- **Queue for Testing**: Use queue to test multiple styles without babysitting each round

---

## 🏗️ Architecture

### Files
- **manifest.json** (v1.9.2): MV3 config, permissions, Side Panel setup
- **background.js**: Service worker orchestrating batch, tab management, downloads, history storage
- **content.js**: DOM automation on suno.com — fills forms, detects song completion, validates MP3 availability
- **popup.js**: Side Panel UI logic, form state, preset/queue/history management
- **popup.css** + **sidepanel.css**: Dark blue theme, collapsible sections, responsive layout
- **data.js**: Style cookbook (25+ genres), artist-to-style map, lyric templates, batch variations

### Key Design Decisions
1. **Content Script for DOM**: Uses native setter trick (`HTMLTextAreaElement.prototype.value`) to bypass React's state, required for Suno v5.5+
2. **Background for Batch**: Batch orchestration in background service worker (not content script) — survives tab hibernation via `chrome.alarms`
3. **Single Click Create**: Exactly 1 click per round — no retry loops (prevents accidental duplicate songs)
4. **CDN Validation**: HEAD requests to `cdn1.suno.ai/{songId}.mp3` check for 200 OK before marking MP3 ready (403 = still rendering)
5. **Storage**: Uses `chrome.storage.local` for forms, presets, queue, history, and batch state

### Suno DOM References (Tested June 2026)
- **Style textarea**: `[data-testid="create-form-styles-wrapper"] textarea`
- **Lyrics textarea**: `textarea[data-testid="lyrics-textarea"]`
- **Tabs**: "Write" / "Prompt" / "Instrumental" buttons
- **Create button**: Text "Create" or "Create song", enabled only when form is valid
- **Song links**: `a[href*="/song/"]` — UUID appears in href only after generation starts
- **CDN**: `https://cdn1.suno.ai/{songId}.mp3` (returns 403 until MP3 renders, then 200)

---

## ⚠️ Limitations & Notes

- **Requires Premium Account**: Suno credits needed; free tier may have quota limits
- **Login Required**: Manually log in to suno.com *before* using extension (not automated for security)
- **Browser Only**: Chrome/Chromium-based browsers only (manifest V3)
- **Rate Limiting**: Suno may throttle if generating too many songs too fast — batch respects 2–4 min delays
- **MP3 Rendering Variability**: Some songs take 2–5 minutes to render; extension waits up to 6 minutes before skipping download

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension icon doesn't appear | Reload extension (chrome://extensions → refresh button) |
| Side Panel stays empty | F5 suno.com tab to refresh, then reopen panel |
| "Receiving end does not exist" error | Wait 5s, tab is still loading; extension auto-retries |
| Batch stops after round 1 | Ensure you F5'd Suno tab after installing v1.9+ (old vloop was in tab, new one in background) |
| Only 1 song created instead of 2 | Extension clicked Create but Suno was slow — wait 30s, check history tab |
| MP3 won't download | Suno rendering slow (>6 min) — manual download from suno.com/library works as fallback |
| Can't find "Gắn cấu trúc" button | Must paste raw lyrics first (without `[Verse]` tags); button auto-structures them |

---

## 📝 Changelog

### v1.9.2 (Latest)
- **Fixed**: Removed retry loop in Create button click (was causing duplicate songs when Suno was slow to register generation)
- **Changed**: Only 1 click per round now, no retries

### v1.9.1
- **Improved**: Batch now shows estimated time of next round (HH:MM format) in status
- **Fixed**: Disabled old content-script batch loop to prevent parallel execution with new background orchestrator

### v1.9.0
- **Major**: Moved batch orchestration from content script → background.js + chrome.alarms
- **Benefit**: Batch now survives tab hibernation & browser restart (Chrome Alarms persistent across SW lifecycle)
- **Added**: Watchdog alarm (8 min timeout per round) to auto-advance if round hangs

### v1.8.1
- **Fixed**: Separated song creation detection from MP3 availability check
- **Benefit**: "Song created" reported immediately when link appears (seconds), MP3 download waits up to 6 min (doesn't block batch pacing)

### v1.8
- **Added**: Wait for Create button to be enabled before clicking
- **Improved**: Handles form validation states better

### v1.7
- **Added**: Instrumental mode (no lyrics)
- **Added**: 🎹 Instrumental button next to "Gắn cấu trúc"

### v1.6
- **Removed**: Auto-grading feature (Web Audio API scoring)
- **Redesigned**: UI with collapsible "Style Suggestions" & "Advanced" sections

### v1.0–v1.5
- Initial release through preset system, queue, history, style cookbook, artist converter, auto-tagging

---

## 🤝 Contributing

This is a personal automation project. If you find bugs or have suggestions:
1. Check the troubleshooting section above
2. Verify you're on the latest version
3. Test with a fresh Suno tab (F5) before reporting

---

## 📄 License

MIT License — feel free to fork, modify, and share for personal use.

---

## 🙏 Credits

Built to automate [Suno.com](https://suno.com) music generation. Suno is a product of Suno Inc.

**Author**: my-tools26  
**Last Updated**: June 2026

---

**Happy music creation! 🎵**
