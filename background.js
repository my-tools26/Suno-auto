// Service worker: điều phối toàn bộ (không bị đóng như popup)

// Bấm icon extension → mở Side Panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Trạng thái hiện tại
let currentStatus = { text: '', type: '', busy: false };

// Lưu dữ liệu tạo nhạc đang chờ (để ghi vào lịch sử khi hoàn tất)
let pendingCreateData = null;

// Promise resolve cho queue (chờ bài hát tạo xong)
let songCompleteResolve = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // === Download file (kiểm tra là audio trước khi tải) ===
  if (msg.action === 'download') {
    const { url, filename } = msg;
    (async () => {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        const type = head.headers.get('content-type') || '';
        if (!head.ok || !type.includes('audio')) {
          sendResponse({ success: false, error: `URL không phải audio (${head.status})` });
          return;
        }
        chrome.downloads.download({ url, filename: filename || 'suno-song.mp3', saveAs: false }, (id) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, downloadId: id });
          }
        });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  // === Lấy trạng thái hiện tại ===
  if (msg.action === 'getStatus') {
    sendResponse(currentStatus);
    return;
  }

  // === Bắt đầu tạo nhạc ===
  if (msg.action === 'startCreate') {
    if (msg.data.totalBatches && msg.data.totalBatches > 1) {
      // Nhiều lượt → điều phối từ background (sống sót qua tab ngủ / SW chết)
      startBatch(msg.data);
    } else {
      // 1 lượt → dọn state batch cũ rồi tạo bình thường
      chrome.storage.local.remove('batchState');
      chrome.alarms.clear('batchRest');
      chrome.alarms.clear('batchWatchdog');
      pendingCreateData = msg.data;
      handleStartCreate(msg.data);
    }
    sendResponse({ status: 'started' });
    return;
  }

  // === Dừng batch đang chạy ===
  if (msg.action === 'stopBatch') {
    stopBatch();
    sendResponse({ status: 'stopped' });
    return;
  }

  // === Chạy hàng đợi ===
  if (msg.action === 'runQueue') {
    handleRunQueue(msg.data.items);
    sendResponse({ status: 'started' });
    return;
  }

  // === Content script báo tiến trình ===
  if (msg.action === 'songProgress') {
    updateStatus(msg.text, 'working', true);
  }

  if (msg.action === 'songComplete') {
    updateStatus(msg.downloaded ? 'Tạo xong — đã tải MP3!' : 'Tạo xong!', 'success', false);
    saveToHistory(pendingCreateData, msg.songIds);
    if (songCompleteResolve) {
      songCompleteResolve({ success: true, songIds: msg.songIds });
      songCompleteResolve = null;
    }
    // Nếu đang chạy batch → tiến sang lượt sau (no-op nếu không phải batch)
    advanceBatch();
  }

  if (msg.action === 'songError') {
    updateStatus('Lỗi: ' + (msg.error || 'Không rõ'), 'error', false);
    if (songCompleteResolve) {
      songCompleteResolve({ error: msg.error });
      songCompleteResolve = null;
    }
    // Lượt này lỗi nhưng vẫn tiến batch sang lượt sau
    advanceBatch();
  }

  // === Batch events từ content script ===
  if (msg.action === 'batchProgress') {
    updateStatus(msg.text, 'working', true);
  }
  if (msg.action === 'batchComplete') {
    updateStatus(`Hoàn tất! Đã tạo ${msg.totalCreated || '?'} bài hát.`, 'success', false);
  }
  if (msg.action === 'batchError') {
    updateStatus('Lỗi batch: ' + (msg.error || 'Không rõ'), 'error', false);
  }
});

// ============================================================
// STATUS
// ============================================================

function updateStatus(text, type, busy) {
  currentStatus = { text, type, busy };
  chrome.runtime.sendMessage({ action: 'statusUpdate', text, type, busy }).catch(() => {});
  if (busy) {
    chrome.action.setBadgeText({ text: '...' });
    chrome.action.setBadgeBackgroundColor({ color: '#fbbf24' });
  } else if (type === 'success') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4ade80' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
  } else if (type === 'error') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#f87171' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 8000);
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ============================================================
// HISTORY — lưu bài hát đã tạo
// ============================================================

async function saveToHistory(createData, songIds) {
  if (!songIds || songIds.length === 0) return;
  try {
    const { songHistory = [] } = await chrome.storage.local.get('songHistory');
    songHistory.unshift({
      id: Date.now(),
      title: createData?.title || '',
      style: createData?.style || '',
      lyrics: (createData?.lyrics || '').substring(0, 500),
      randomLyrics: createData?.randomLyrics || false,
      instrumental: createData?.instrumental || false,
      songIds: songIds,
      createdAt: new Date().toISOString(),
      downloaded: createData?.autoDownload || false,
      rating: 0,
    });
    if (songHistory.length > 200) songHistory.length = 200;
    await chrome.storage.local.set({ songHistory });
    chrome.runtime.sendMessage({ action: 'historyUpdated' }).catch(() => {});
  } catch (e) {
    console.error('saveToHistory error:', e);
  }
}

// ============================================================
// CREATE — tìm tab Suno + inject + gửi lệnh
// ============================================================

async function handleStartCreate(data) {
  updateStatus('Đang mở Suno...', 'working', true);

  try {
    const tabId = await findOrCreateSunoTab();
    if (!tabId) {
      updateStatus('Không mở được trang Suno', 'error', false);
      return;
    }

    // Đảm bảo content script sẵn sàng (inject + ping tới khi alive)
    updateStatus('Đang kết nối trang Suno...', 'working', true);
    const ready = await ensureContentReady(tabId);
    if (!ready) {
      updateStatus('Lỗi: Không kết nối được content script. Hãy F5 trang Suno rồi thử lại.', 'error', false);
      return;
    }

    updateStatus('Đang điền form...', 'working', true);

    const action = (data.totalBatches && data.totalBatches > 1) ? 'createBatch' : 'createSong';
    try {
      await chrome.tabs.sendMessage(tabId, { action, data });
    } catch (e) {
      updateStatus('Lỗi: Content script không phản hồi. Thử F5 trang Suno.', 'error', false);
    }

  } catch (err) {
    updateStatus('Lỗi: ' + err.message, 'error', false);
  }
}

// Inject content script + ping cho tới khi nó trả lời "alive" (tối đa ~20s).
// Tránh lỗi "Receiving end does not exist" do trang chưa load xong.
async function ensureContentReady(tabId, maxMs = 20000) {
  const start = Date.now();
  await waitForTabComplete(tabId, 12000);

  while (Date.now() - start < maxMs) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    } catch (e) {
      // tab có thể đang load — thử lại vòng sau
    }
    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      if (res && res.status === 'alive') return true;
    } catch (e) {
      // chưa sẵn sàng
    }
    await wait(1200);
  }
  return false;
}

// Chờ tab có status === 'complete'
function waitForTabComplete(tabId, timeout = 12000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return resolve();
        if (tab.status === 'complete') return resolve();
        if (Date.now() - start > timeout) return resolve();
        setTimeout(check, 500);
      });
    };
    check();
  });
}

// ============================================================
// QUEUE — chạy hàng đợi tuần tự
// ============================================================

async function handleRunQueue(items) {
  if (!items || items.length === 0) return;

  updateStatus(`Hàng đợi: 0/${items.length}`, 'working', true);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    pendingCreateData = item;
    updateStatus(`Hàng đợi: ${i + 1}/${items.length} — đang tạo...`, 'working', true);

    try {
      const tabId = await findOrCreateSunoTab();
      if (!tabId) {
        updateStatus('Không mở được Suno', 'error', false);
        return;
      }

      const ready = await ensureContentReady(tabId);
      if (!ready) {
        updateStatus(`Hàng đợi ${i + 1}: không kết nối được Suno (F5 trang)`, 'error', false);
        continue;
      }

      try {
        chrome.tabs.sendMessage(tabId, { action: 'createSong', data: item });
      } catch (e) {
        updateStatus(`Hàng đợi ${i + 1}: Content script lỗi`, 'error', false);
        continue;
      }

      const result = await waitForSongComplete(300000);
      if (result.error) {
        updateStatus(`Hàng đợi ${i + 1}/${items.length}: Lỗi — ${result.error}`, 'working', true);
      }

    } catch (e) {
      console.error('Queue item error:', e);
    }

    // Nghỉ giữa các mục (trừ mục cuối)
    if (i < items.length - 1) {
      const restMs = 120000 + Math.floor(Math.random() * 120000);
      const restMin = Math.round(restMs / 60000 * 10) / 10;
      updateStatus(`Hàng đợi: ${i + 1}/${items.length} xong! Nghỉ ${restMin} phút...`, 'working', true);
      await wait(restMs);
    }
  }

  updateStatus(`Hoàn tất hàng đợi! ${items.length} mục đã tạo xong.`, 'success', false);

  // Xoá hàng đợi sau khi chạy xong
  await chrome.storage.local.set({ songQueue: [] });
  chrome.runtime.sendMessage({ action: 'queueCleared' }).catch(() => {});
}

function waitForSongComplete(timeout = 300000) {
  return new Promise(resolve => {
    songCompleteResolve = resolve;
    setTimeout(() => {
      if (songCompleteResolve === resolve) {
        songCompleteResolve = null;
        resolve({ error: 'Hết thời gian chờ' });
      }
    }, timeout);
  });
}

// ============================================================
// BATCH (nhiều lượt) — điều phối từ background, sống sót qua tab ngủ / SW chết
// nhờ chrome.alarms. Mỗi lượt: đảm bảo tab + inject lại content + tạo 1 lần.
// Nghỉ giữa các lượt bằng alarm (không dùng setTimeout vì SW có thể bị giết).
// Sự kiện đẩy tiến: songComplete/songError → advanceBatch; watchdog cứu nếu treo.
// ============================================================

async function startBatch(data) {
  const n = data.totalBatches;
  const rounds = [];
  for (let i = 0; i < n; i++) {
    rounds.push({
      style: (data.styleVariations && data.styleVariations[i]) ? data.styleVariations[i] : data.style,
      title: data.title ? `${data.title} (${i + 1})` : '',
      lyrics: data.randomLyrics ? '' : data.lyrics,
      autoDownload: data.autoDownload,
      randomLyrics: data.randomLyrics,
      instrumental: data.instrumental,
      weirdness: data.weirdness,
      styleInfluence: data.styleInfluence,
    });
  }
  await chrome.storage.local.set({ batchState: { rounds, current: 0, total: n } });
  chrome.alarms.clear('batchRest');
  chrome.alarms.clear('batchWatchdog');
  runBatchRound();
}

async function runBatchRound() {
  const { batchState } = await chrome.storage.local.get('batchState');
  if (!batchState) return;
  const { rounds, current, total } = batchState;

  if (current >= total) {
    updateStatus(`Hoàn tất! Đã tạo xong ${total} lượt.`, 'success', false);
    await chrome.storage.local.remove('batchState');
    return;
  }

  updateStatus(`Lượt ${current + 1}/${total} — đang chuẩn bị...`, 'working', true);
  pendingCreateData = rounds[current];

  const tabId = await findOrCreateSunoTab();
  if (!tabId) {
    updateStatus('Không mở được Suno', 'error', false);
    await chrome.storage.local.remove('batchState');
    return;
  }
  const ready = await ensureContentReady(tabId);

  // Watchdog: nếu lượt này không báo xong trong 8 phút → tự tiến sang lượt sau
  chrome.alarms.create('batchWatchdog', { delayInMinutes: 8 });

  if (!ready) {
    updateStatus(`Lượt ${current + 1}: chưa kết nối được Suno — sẽ thử lượt sau`, 'working', true);
    return; // watchdog sẽ đẩy tiếp
  }

  updateStatus(`Lượt ${current + 1}/${total} — đang tạo nhạc...`, 'working', true);
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'createSong', data: rounds[current] });
  } catch (e) {
    // content chưa sẵn sàng — watchdog sẽ cứu
  }
}

async function advanceBatch() {
  const { batchState } = await chrome.storage.local.get('batchState');
  if (!batchState) return; // không phải đang chạy batch → bỏ qua
  chrome.alarms.clear('batchWatchdog');

  batchState.current += 1;
  await chrome.storage.local.set({ batchState });

  if (batchState.current >= batchState.total) {
    updateStatus(`Hoàn tất! ${batchState.total} lượt đã tạo xong.`, 'success', false);
    await chrome.storage.local.remove('batchState');
    return;
  }

  // Nghỉ 2–4 phút bằng alarm (sống sót qua SW chết)
  const restMin = 2 + Math.random() * 2;
  const resumeAt = new Date(Date.now() + restMin * 60000);
  const hh = String(resumeAt.getHours()).padStart(2, '0');
  const mm = String(resumeAt.getMinutes()).padStart(2, '0');
  updateStatus(
    `Lượt ${batchState.current}/${batchState.total} xong! Nghỉ ${restMin.toFixed(1)} phút — tạo lượt tiếp lúc ${hh}:${mm}`,
    'working', true
  );
  chrome.alarms.create('batchRest', { delayInMinutes: restMin });
}

async function stopBatch() {
  chrome.alarms.clear('batchRest');
  chrome.alarms.clear('batchWatchdog');
  await chrome.storage.local.remove('batchState');
  updateStatus('Đã dừng batch.', 'success', false);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'batchRest') runBatchRound();
  else if (alarm.name === 'batchWatchdog') advanceBatch();
});

// ============================================================
// TAB MANAGEMENT
// ============================================================

function findOrCreateSunoTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: ['https://suno.com/*', 'https://*.suno.com/*'] }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const tab = tabs.find(t => t.url && t.url.includes('/create')) || tabs[0];
        // Side Panel không đóng khi đổi tab → bật tab Suno lên cho user thấy
        chrome.tabs.update(tab.id, { active: true });
        if (tab.windowId) chrome.windows.update(tab.windowId, { focused: true });
        if (!tab.url.includes('/create')) {
          chrome.tabs.update(tab.id, { url: 'https://suno.com/create' }, () => {
            setTimeout(() => resolve(tab.id), 3000);
          });
        } else {
          resolve(tab.id);
        }
      } else {
        // Mở tab hiển thị (active:true) để theo dõi quá trình tạo nhạc
        chrome.tabs.create({ url: 'https://suno.com/create', active: true }, (tab) => {
          setTimeout(() => resolve(tab.id), 4000);
        });
      }
    });
  });
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}
