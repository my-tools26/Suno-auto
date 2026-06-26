// Content script: chạy trên suno.com
// Tự động điền form, bấm Create, dò hoàn thành, tải về

(function () {
  if (window.__sunoAutoInjected) return;
  window.__sunoAutoInjected = true;

  // ============================================================
  // SELECTORS — gom 1 chỗ, dễ sửa khi Suno đổi UI
  // ============================================================
  const SEL = {
    // Tab "Write" trong phần Lyrics (Suno v5.5 dùng Write/Prompt/Instrumental)
    writeTab: 'button:has-text("Write")',
    // Textarea lyrics — Suno v5.5 có data-testid chuẩn
    lyricsInput: 'textarea[data-testid="lyrics-textarea"], textarea[placeholder*="Verse"], textarea[placeholder*="rhymes"]',
    // Textarea style — Suno dùng wrapper data-testid ổn định (đúng cả ở Instrumental)
    styleInput: '[data-testid="create-form-styles-wrapper"] textarea, textarea[placeholder*="style"]',
    // Input title — trong "More Options", placeholder "Song Title"
    titleInput: 'input[placeholder*="Song Title"], input[placeholder*="song title"]',
    // Nút "More Options" để mở Title input
    moreOptions: 'button:has-text("More Options")',
    // Nút Create song
    createBtn: 'button:has-text("Create song"), button:has-text("Create")',
    // Audio element
    audioElement: 'audio[src]',
  };

  // ============================================================
  // UTILITIES
  // ============================================================

  function log(...args) {
    console.log('[SunoAuto]', ...args);
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Delay ngẫu nhiên giống người thật (min–max ms)
  function humanDelay(minMs = 800, maxMs = 2500) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    log(`Human delay: ${delay}ms`);
    return sleep(delay);
  }

  // Gõ từng ký tự (giống người gõ bàn phím)
  function humanType(el, text) {
    return new Promise(async (resolve) => {
      const tag = el.tagName.toLowerCase();
      const proto = tag === 'textarea'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

      let current = '';
      for (let i = 0; i < text.length; i++) {
        current += text[i];
        if (nativeSetter) {
          nativeSetter.call(el, current);
        } else {
          el.value = current;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));

        // Tốc độ gõ ngẫu nhiên: 30–120ms/ký tự, thỉnh thoảng "dừng suy nghĩ"
        const isChunk = i > 0 && i % (15 + Math.floor(Math.random() * 20)) === 0;
        if (isChunk) {
          await sleep(300 + Math.random() * 700); // dừng nghỉ
        } else {
          await sleep(30 + Math.random() * 90);
        }
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      resolve();
    });
  }

  // Tìm element bằng nhiều selector fallback
  function findEl(selectorStr) {
    const selectors = selectorStr.split(',').map(s => s.trim());
    for (const sel of selectors) {
      // Handle custom :has-text() pseudo selector
      const hasTextMatch = sel.match(/(.*):has-text\("(.+)"\)/);
      if (hasTextMatch) {
        const baseSelector = hasTextMatch[1] || '*';
        const text = hasTextMatch[2];
        const candidates = document.querySelectorAll(baseSelector);
        for (const el of candidates) {
          if (el.textContent.trim().toLowerCase().includes(text.toLowerCase()) && el.offsetParent !== null) {
            return el;
          }
        }
        continue;
      }
      try {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      } catch (e) {
        // invalid selector, skip
      }
    }
    return null;
  }

  // Set value trên React controlled input/textarea
  function setReactValue(el, value) {
    const tag = el.tagName.toLowerCase();
    const proto = tag === 'textarea'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Click an element reliably — CHỈ bấm 1 lần (tránh tạo nhân đôi bài hát)
  function clickEl(el) {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    el.focus();
    el.click();
  }

  // Tìm nút "Create" đang BẬT (không disabled) — quan trọng cho các lượt lặp lại
  function findEnabledCreateBtn() {
    const btns = [...document.querySelectorAll('button')].filter(b => {
      const t = b.textContent.trim().toLowerCase();
      return b.offsetParent !== null && (t === 'create' || t === 'create song');
    });
    return btns.find(b => !b.disabled && b.getAttribute('aria-disabled') !== 'true') || null;
  }

  // Chờ nút Create bật (hết disabled) tối đa `timeout` ms
  function waitForCreateEnabled(timeout = 10000) {
    return new Promise(resolve => {
      const btn = findEnabledCreateBtn();
      if (btn) return resolve(btn);
      const start = Date.now();
      const iv = setInterval(() => {
        const b = findEnabledCreateBtn();
        if (b) { clearInterval(iv); resolve(b); }
        else if (Date.now() - start > timeout) { clearInterval(iv); resolve(null); }
      }, 400);
    });
  }

  // Sau khi bấm Create: xác nhận Suno đã BẮT ĐẦU tạo
  // (số bài /song/ tăng, hoặc nút Create chuyển disabled vì đang xử lý)
  async function confirmGenerationStarted(beforeCount, timeout = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await sleep(800);
      if (getSongIds().size > beforeCount) return true;
      if (!findEnabledCreateBtn()) return true; // không còn nút enabled → đang generate
    }
    return false;
  }

  // Set giá trị slider sáng tạo (best-effort, Suno có thể đổi DOM)
  // value: 0-100. Trả về true nếu tìm thấy & set được.
  function setSliderByLabel(labelText, value) {
    try {
      // Chiến lược 1: input[type=range] gần text nhãn
      const ranges = [...document.querySelectorAll('input[type="range"]')].filter(r => r.offsetParent !== null);
      for (const r of ranges) {
        const container = r.closest('div');
        const ctxText = (container?.parentElement?.textContent || container?.textContent || '').toLowerCase();
        if (ctxText.includes(labelText.toLowerCase())) {
          const min = parseFloat(r.min) || 0;
          const max = parseFloat(r.max) || 100;
          const target = min + (max - min) * (value / 100);
          setReactValue(r, String(target));
          log(`Slider "${labelText}" = ${value}% (range input)`);
          return true;
        }
      }
      // Chiến lược 2: phần tử role=slider (custom slider) — set aria + sự kiện bàn phím
      const ariaSliders = [...document.querySelectorAll('[role="slider"]')].filter(s => s.offsetParent !== null);
      for (const s of ariaSliders) {
        const ctxText = (s.closest('div')?.parentElement?.textContent || '').toLowerCase();
        if (ctxText.includes(labelText.toLowerCase())) {
          s.focus();
          // Đưa về min rồi tăng dần bằng phím mũi tên
          for (let i = 0; i < 100; i++) {
            s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
          }
          const steps = Math.round(value);
          for (let i = 0; i < steps; i++) {
            s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
          }
          log(`Slider "${labelText}" ≈ ${value}% (aria-slider)`);
          return true;
        }
      }
    } catch (e) {
      log('setSlider error:', e.message);
    }
    log(`Không tìm thấy slider "${labelText}"`);
    return false;
  }

  // Chờ element xuất hiện (timeout ms)
  function waitForEl(selectorStr, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = findEl(selectorStr);
      if (el) return resolve(el);

      const start = Date.now();
      const interval = setInterval(() => {
        const el = findEl(selectorStr);
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for: ' + selectorStr));
        }
      }, 500);
    });
  }

  // Lấy ID bài hát THẬT từ link /song/{uuid} trong workspace.
  // (Cách cũ quét mọi UUID → vớ phải id nội bộ React kiểu v7 → luôn 403)
  function getSongIds() {
    const ids = new Set();
    document.querySelectorAll('a[href*="/song/"]').forEach(a => {
      const m = (a.getAttribute('href') || '').match(/\/song\/([a-f0-9-]{36})/i);
      if (m) ids.add(m[1]);
    });
    return ids;
  }

  // Kiểm tra 1 UUID có phải bài hát thật (cdn trả về audio) không
  async function isValidSong(songId) {
    try {
      const r = await fetch(`https://cdn1.suno.ai/${songId}.mp3`, { method: 'HEAD' });
      const type = r.headers.get('content-type') || '';
      return r.ok && type.includes('audio');
    } catch (e) {
      return false;
    }
  }

  // Tải MP3 qua background service worker
  function downloadSong(songId, title) {
    const url = `https://cdn1.suno.ai/${songId}.mp3`;
    const safeName = (title || songId).replace(/[^a-zA-Z0-9_\-\sÀ-ɏḀ-ỿ]/g, '').trim();
    const filename = `suno/${safeName || songId}.mp3`;
    log('Downloading:', filename);
    chrome.runtime.sendMessage({
      action: 'download',
      url,
      filename
    });
  }

  // ============================================================
  // MAIN: nhận lệnh từ popup
  // ============================================================

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'createSong') {
      handleCreate(msg.data).then(
        () => sendResponse({ status: 'started' }),
        (err) => sendResponse({ status: 'error', error: err.message })
      );
      return true;
    }

    if (msg.action === 'createBatch') {
      // Batch giờ do background điều phối (gửi 1 createSong mỗi lượt + nghỉ bằng alarm).
      // Không tự lặp ở content nữa để tránh 2 vòng lặp chạy song song → loạn nhịp.
      handleCreate(msg.data).then(
        () => sendResponse({ status: 'started' }),
        (err) => sendResponse({ status: 'error', error: err.message })
      );
      return true;
    }

    if (msg.action === 'ping') {
      sendResponse({ status: 'alive' });
      return;
    }
  });

  async function handleCreate(data) {
    const { style, title, lyrics, autoDownload, instrumental } = data;
    log('Starting create:', { style, title, lyricsLen: lyrics?.length, autoDownload });

    sendProgress('Đang chuẩn bị form...');

    // Snapshot các bài hát đang có trước khi tạo
    const existingIds = getSongIds();
    log('Bài hát hiện có:', existingIds.size);

    const randomLyrics = data.randomLyrics || false;

    // Step 1: Chọn tab lyrics phù hợp
    await humanDelay(1000, 2000);
    if (instrumental) {
      // Nhạc không lời → bấm tab "Instrumental"
      try {
        const insTab = findEl('button:has-text("Instrumental")');
        if (insTab) {
          clickEl(insTab);
          log('Clicked Instrumental tab (nhạc không lời)');
          await humanDelay(800, 1500);
        }
      } catch (e) {
        log('Instrumental tab not found');
      }
    } else if (randomLyrics) {
      // Random lyrics → bấm "Prompt" tab để Suno tự viết lời
      try {
        const promptTab = findEl('button:has-text("Prompt")');
        if (promptTab) {
          clickEl(promptTab);
          log('Clicked Prompt tab (random lyrics mode)');
          await humanDelay(800, 1500);
        }
      } catch (e) {
        log('Prompt tab not found');
      }
    } else {
      // Lyrics thủ công → bấm "Write" tab
      try {
        const writeTab = findEl(SEL.writeTab);
        if (writeTab) {
          clickEl(writeTab);
          log('Clicked Write tab');
          await humanDelay(800, 1500);
        }
      } catch (e) {
        log('Write tab not found, might already be in write mode');
      }
    }

    // Step 2: Điền Lyrics hoặc Prompt mô tả (instrumental → bỏ qua, không có lời)
    if (instrumental) {
      log('Instrumental: bỏ qua điền lời');
    } else if (randomLyrics) {
      // Điền mô tả vào ô Prompt (Suno tự viết lời)
      sendProgress('Đang điền mô tả cho Suno tự viết lời...');
      await humanDelay(500, 1200);
      try {
        const promptInput = document.querySelector('textarea[placeholder*="Jazzy"], textarea[placeholder*="Describe"]');
        const fallbackTextareas = [...document.querySelectorAll('textarea')].filter(t => t.offsetParent !== null);
        const targetEl = promptInput || (fallbackTextareas.length > 0 ? fallbackTextareas[0] : null);
        if (targetEl) {
          targetEl.focus();
          await humanDelay(300, 600);
          const prompt = style ? `A ${style} song` : 'A song with creative and unique lyrics';
          setReactValue(targetEl, '');
          await humanDelay(200, 400);
          await humanType(targetEl, prompt);
          log('Filled prompt for random lyrics');
          await humanDelay(800, 1500);
        }
      } catch (e) {
        log('Could not fill prompt input');
      }
    } else if (lyrics) {
      sendProgress('Đang điền lyrics...');
      await humanDelay(500, 1500);
      try {
        const lyricsEl = await waitForEl(SEL.lyricsInput, 5000);
        lyricsEl.focus();
        await humanDelay(300, 800);
        // Xoá nội dung cũ
        setReactValue(lyricsEl, '');
        await humanDelay(200, 500);
        // Điền lyrics mới
        if (lyrics.length <= 200) {
          await humanType(lyricsEl, lyrics);
        } else {
          setReactValue(lyricsEl, lyrics);
        }
        log('Filled lyrics');
        await humanDelay(800, 2000);
      } catch (e) {
        log('Lyrics input not found, trying fallback...');
        // Fallback: textarea đầu tiên hiển thị trên trang
        const textareas = [...document.querySelectorAll('textarea')].filter(t => t.offsetParent !== null);
        if (textareas.length > 0) {
          textareas[0].focus();
          await humanDelay(300, 800);
          setReactValue(textareas[0], lyrics);
          log('Filled lyrics via fallback textarea[0]');
        }
      }
    }

    // Step 3: Xoá nội dung cũ + Điền Style (Suno v5.5: style là textarea, không phải input)
    if (style) {
      sendProgress('Đang điền style...');
      await humanDelay(600, 1800);
      try {
        // Style là textarea KHÔNG phải ô lyrics (ở instrumental, ô lyrics biến mất)
        let styleEl = findEl(SEL.styleInput);
        if (!styleEl) {
          const tas = [...document.querySelectorAll('textarea')].filter(t =>
            t.offsetParent !== null && t.getAttribute('data-testid') !== 'lyrics-textarea'
          );
          styleEl = tas[tas.length - 1] || null; // ô style (ô còn lại/cuối)
        }
        if (styleEl) {
          styleEl.focus();
          await humanDelay(300, 600);
          setReactValue(styleEl, '');
          await humanDelay(200, 400);
          await humanType(styleEl, style);
          log('Filled style');
          await humanDelay(500, 1500);
        }
      } catch (e) {
        log('Style input not found');
      }
    }

    // Step 3.5: Điều khiển slider sáng tạo (nếu bật)
    if (typeof data.weirdness === 'number' || typeof data.styleInfluence === 'number') {
      sendProgress('Đang chỉnh slider sáng tạo...');
      await humanDelay(500, 1000);
      if (typeof data.weirdness === 'number') {
        setSliderByLabel('Weirdness', data.weirdness);
        await humanDelay(300, 700);
      }
      if (typeof data.styleInfluence === 'number') {
        setSliderByLabel('Style Influence', data.styleInfluence);
        await humanDelay(300, 700);
      }
    }

    // Step 4: Điền Title (nằm trong chế độ Advanced — "More Options" cũ đã bỏ)
    if (title) {
      await humanDelay(500, 1200);
      try {
        let titleEl = findEl(SEL.titleInput);
        // Chưa thấy → bật Advanced rồi tìm lại
        if (!titleEl) {
          const advBtn = findEl('button:has-text("Advanced")');
          if (advBtn) {
            clickEl(advBtn);
            log('Đã bật Advanced để hiện ô Title');
            await humanDelay(800, 1500);
          }
          titleEl = findEl(SEL.titleInput);
        }
        // Vẫn chưa thấy → thử bấm "More"
        if (!titleEl) {
          const moreBtn = findEl('button:has-text("More")');
          if (moreBtn) {
            clickEl(moreBtn);
            await humanDelay(800, 1500);
          }
          titleEl = await waitForEl(SEL.titleInput, 4000);
        }
        titleEl.focus();
        await humanDelay(300, 600);
        setReactValue(titleEl, '');
        await humanDelay(200, 400);
        await humanType(titleEl, title);
        log('Đã điền title');
        await humanDelay(500, 1500);
      } catch (e) {
        log('Không tìm thấy ô Title (bỏ qua, tuỳ chọn)');
      }
    }

    // Step 5: Bấm Create ĐÚNG 1 LẦN (sau khi chờ nút bật).
    // KHÔNG bấm lại — bấm lại từng làm Suno đẻ trùng nhiều bài liên tục.
    sendProgress('Đang bấm Create...');
    await humanDelay(1000, 2500);

    const createBtn = await waitForCreateEnabled(12000);
    if (!createBtn) {
      sendError('Nút Create không bật (form chưa hợp lệ?). Bỏ qua lượt này.');
      return;
    }
    clickEl(createBtn);
    log('Clicked Create (1 lần duy nhất)');

    // Step 6: chờ bài mới xuất hiện / tạo xong (waitForNewSongs tự phát hiện)
    sendProgress('Đang tạo nhạc...');
    await waitForNewSongs(existingIds, title, autoDownload);
  }

  async function waitForNewSongs(existingIds, songTitle, shouldDownload) {
    const pollInterval = 4000;
    const detectTimeout = 90000;   // 1.5 phút để link bài mới xuất hiện = đã tạo
    const renderTimeout = 360000;  // tổng 6 phút chờ MP3 render xong (chỉ để tải)
    const start = Date.now();
    const newSongIds = new Set();    // bài mới đã xuất hiện (link /song/)

    // ───── PHA 1: chờ link bài mới xuất hiện = TẠO THÀNH CÔNG ─────
    // (link xuất hiện ngay khi bắt đầu generate, không cần chờ MP3)
    while (Date.now() - start < detectTimeout) {
      await sleep(pollInterval);
      const currentIds = getSongIds();
      [...currentIds].filter(id => !existingIds.has(id)).forEach(id => newSongIds.add(id));
      sendProgress(`Đang tạo nhạc... ${newSongIds.size} bài đã xuất hiện`);
      if (newSongIds.size >= 2) break; // Suno tạo 2 bài/lượt
    }

    if (newSongIds.size === 0) {
      chrome.runtime.sendMessage({
        action: 'songError',
        error: 'Không thấy bài hát mới sau khi bấm Create.'
      });
      return;
    }
    log('Đã tạo', newSongIds.size, 'bài:', [...newSongIds]);

    // Không tải → xong lượt luôn, khỏi chờ MP3 render (pacing batch nhanh)
    if (!shouldDownload) {
      chrome.runtime.sendMessage({
        action: 'songComplete', success: true, downloaded: false, songIds: [...newSongIds]
      });
      return;
    }

    // ───── PHA 2: chờ MP3 render xong (200) rồi tải ─────
    // 403 = MP3 chưa render xong (BÌNH THƯỜNG), 200 = sẵn sàng
    sendProgress('Đang chờ MP3 render xong để tải...');
    await sleep(10000); // bỏ qua vài lần 403 đầu chắc chắn (bài mới render >20s)
    const validatedIds = new Set();
    while (Date.now() - start < renderTimeout && validatedIds.size < newSongIds.size) {
      for (const id of newSongIds) {
        if (validatedIds.has(id)) continue;
        if (await isValidSong(id)) { validatedIds.add(id); log('MP3 sẵn sàng:', id); }
      }
      sendProgress(`Chờ tải... ${validatedIds.size}/${newSongIds.size} bài sẵn sàng`);
      if (validatedIds.size >= newSongIds.size) break;
      await sleep(6000);
    }

    if (validatedIds.size > 0) {
      await finalizeSongs([...validatedIds], songTitle, true);
    } else {
      // Bài đã tạo nhưng MP3 chưa render kịp → vẫn coi là thành công, chỉ chưa tải
      chrome.runtime.sendMessage({
        action: 'songComplete', success: true, downloaded: false, songIds: [...newSongIds]
      });
      log('Bài đã tạo nhưng MP3 chưa render kịp để tải tự động');
    }
  }

  // Tải bài + báo về background
  async function finalizeSongs(ids, songTitle, shouldDownload) {
    if (shouldDownload) {
      ids.forEach(id => downloadSong(id, songTitle || 'suno-song'));
      log('Đã tải', ids.length, 'bài');
    }
    chrome.runtime.sendMessage({
      action: 'songComplete',
      success: true,
      downloaded: shouldDownload,
      songIds: ids
    });
  }

  function sendProgress(text) {
    log(text);
    chrome.runtime.sendMessage({ action: 'songProgress', text });
  }

  function sendError(error) {
    log('Error:', error);
    chrome.runtime.sendMessage({ action: 'songError', error });
  }

  // ============================================================
  // BATCH: tạo nhiều lượt liên tiếp
  // ============================================================

  async function handleBatch(data) {
    const { totalBatches, style, title, lyrics, autoDownload, randomLyrics, styleVariations, instrumental } = data;
    log('Starting batch:', totalBatches, 'batches', styleVariations ? '(smart variations)' : '');
    let totalCreated = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batchNum = i + 1;
      // Smart variations: mỗi lượt 1 style hơi khác; nếu không thì dùng style gốc
      const roundStyle = (styleVariations && styleVariations[i]) ? styleVariations[i] : style;

      chrome.runtime.sendMessage({
        action: 'batchProgress',
        text: `Lượt ${batchNum}/${totalBatches} — đang tạo nhạc...`
      });

      // Tạo 1 lượt (Suno tự tạo 2 bài)
      try {
        await handleCreate({
          style: roundStyle,
          title: title ? `${title} (${batchNum})` : '',
          lyrics: randomLyrics ? '' : lyrics,
          autoDownload,
          randomLyrics,
          instrumental,
          weirdness: data.weirdness,
          styleInfluence: data.styleInfluence,
        });
        totalCreated += 2;
      } catch (e) {
        log('Batch error at round', batchNum, e);
      }

      // Nghỉ giữa các lượt (2–4 phút ngẫu nhiên) — trừ lượt cuối
      if (batchNum < totalBatches) {
        const restMs = 120000 + Math.floor(Math.random() * 120000); // 2–4 phút
        const restMin = Math.round(restMs / 60000 * 10) / 10;
        chrome.runtime.sendMessage({
          action: 'batchProgress',
          text: `Lượt ${batchNum}/${totalBatches} xong! Nghỉ ${restMin} phút trước lượt tiếp...`
        });
        await sleep(restMs);
      }
    }

    chrome.runtime.sendMessage({
      action: 'batchComplete',
      totalCreated
    });
  }

  log('Content script loaded on', window.location.href);
})();
