const $ = (sel) => document.querySelector(sel);

const els = {
  presetSelect: $('#presetSelect'),
  btnDeletePreset: $('#btnDeletePreset'),
  btnExportPresets: $('#btnExportPresets'),
  btnImportPresets: $('#btnImportPresets'),
  importFile: $('#importFile'),
  cookbookSelect: $('#cookbookSelect'),
  artistInput: $('#artistInput'),
  btnArtist: $('#btnArtist'),
  btnAutoTag: $('#btnAutoTag'),
  btnInstrumental: $('#btnInstrumental'),
  styleInput: $('#styleInput'),
  titleInput: $('#titleInput'),
  lyricsInput: $('#lyricsInput'),
  charCount: $('#charCount'),
  presetName: $('#presetName'),
  btnSavePreset: $('#btnSavePreset'),
  btnAddQueue: $('#btnAddQueue'),
  useSliders: $('#useSliders'),
  sliderGroup: $('#sliderGroup'),
  weirdness: $('#weirdness'),
  weirdnessVal: $('#weirdnessVal'),
  styleInfluence: $('#styleInfluence'),
  styleInfluenceVal: $('#styleInfluenceVal'),
  smartBatch: $('#smartBatch'),
  randomLyrics: $('#randomLyrics'),
  autoDownload: $('#autoDownload'),
  batchCount: $('#batchCount'),
  batchInfo: $('#batchInfo'),
  btnMinus: $('#btnMinus'),
  btnPlus: $('#btnPlus'),
  status: $('#status'),
  statusText: $('#statusText'),
  btnCreate: $('#btnCreate'),
  queueList: $('#queueList'),
  queueEmpty: $('#queueEmpty'),
  queueBadge: $('#queueBadge'),
  btnClearQueue: $('#btnClearQueue'),
  btnRunQueue: $('#btnRunQueue'),
  historyList: $('#historyList'),
  historyEmpty: $('#historyEmpty'),
  btnClearHistory: $('#btnClearHistory'),
  creditsToday: $('#creditsToday'),
  creditsTotal: $('#creditsTotal'),
  creditsEstimate: $('#creditsEstimate'),
  creditCount: $('#creditCount'),
};

let batchCount = 1;
let queue = [];
let instrumental = false;

// ============================================================
// TAB NAVIGATION
// ============================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + btn.dataset.tab);
    if (tab) tab.classList.add('active');
    if (btn.dataset.tab === 'queue') loadQueue();
    if (btn.dataset.tab === 'history') loadHistory();
  });
});

// ============================================================
// COLLAPSE (mục thu gọn: Gợi ý phong cách, Nâng cao)
// ============================================================

document.querySelectorAll('.collapse-head').forEach(head => {
  head.addEventListener('click', () => {
    const body = document.getElementById(head.dataset.target);
    if (!body) return;
    head.classList.toggle('open');
    body.classList.toggle('open');
  });
});

// ============================================================
// KNOWLEDGE BASE UI (data.js) — Style mẫu, Artist, Template
// ============================================================

// Đổ Style cookbook vào dropdown (nhóm theo optgroup)
function populateCookbook() {
  if (typeof STYLE_PRESETS === 'undefined') return;
  for (const [group, items] of Object.entries(STYLE_PRESETS)) {
    const og = document.createElement('optgroup');
    og.label = group;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.style;
      opt.textContent = item.name;
      og.appendChild(opt);
    });
    els.cookbookSelect.appendChild(og);
  }
}

els.cookbookSelect.addEventListener('change', () => {
  const v = els.cookbookSelect.value;
  if (!v) return;
  els.styleInput.value = v;
  // Form không còn khớp preset đã chọn → xoá hiển thị preset cho khỏi nhầm
  els.presetSelect.value = '';
  saveFormState();
  setStatus('Đã điền style mẫu (chỉ ô Phong cách)', 'success');
  els.cookbookSelect.value = '';
});

// Artist → Style
els.btnArtist.addEventListener('click', () => {
  const name = els.artistInput.value.trim();
  if (!name) return setStatus('Nhập tên ca sĩ trước', 'error');
  const style = typeof lookupArtist === 'function' ? lookupArtist(name) : null;
  if (!style) {
    return setStatus(`Chưa có "${name}" trong danh sách. Thử tên tiếng Anh.`, 'error');
  }
  els.styleInput.value = style;
  saveFormState();
  setStatus(`"${name}" → ${style}`, 'success');
});

// Nút "Gắn cấu trúc" — 1 nút, tự làm đúng việc theo tình huống:
//  • Lời trống      → chèn khung trống đơn giản để điền vào
//  • Lời thô        → tự thêm [Verse]/[Chorus]
//  • Đã có thẻ [..] → báo đã có rồi, không động vào
els.btnAutoTag.addEventListener('click', () => {
  if (els.randomLyrics.checked || instrumental) {
    return setStatus('Chế độ này không cần cấu trúc lời', 'error');
  }
  const raw = els.lyricsInput.value.trim();

  // Yêu cầu dán lời TRƯỚC
  if (!raw) {
    return setStatus('Hãy dán lời bài hát vào ô trước, rồi bấm Gắn cấu trúc', 'error');
  }

  // Đã có thẻ rồi
  if (/\[/.test(raw)) {
    return setStatus('Lời đã có cấu trúc [Verse]/[Chorus] rồi ✓', 'success');
  }

  // Có lời thô → tự gắn thẻ
  if (typeof autoAddMetatags !== 'function') return;
  const tagged = autoAddMetatags(raw);
  els.lyricsInput.value = tagged;
  els.charCount.textContent = tagged.length;
  saveFormState();
  setStatus('Đã gắn [Verse]/[Chorus] vào lời của bạn ✓', 'success');
});

// ============================================================
// INSTRUMENTAL (nhạc không lời)
// ============================================================

function applyInstrumentalUI() {
  els.btnInstrumental.classList.toggle('on', instrumental);
  els.lyricsInput.disabled = instrumental || els.randomLyrics.checked;
  if (instrumental) {
    els.lyricsInput.placeholder = '🎹 Nhạc không lời — chỉ cần điền Phong cách phía trên';
    els.lyricsInput.style.opacity = '0.4';
  } else if (!els.randomLyrics.checked) {
    els.lyricsInput.placeholder = '[Verse]\nNhập lời bài hát ở đây...\n\n[Chorus]\nĐiệp khúc...';
    els.lyricsInput.style.opacity = '1';
  }
}

els.btnInstrumental.addEventListener('click', () => {
  instrumental = !instrumental;
  // Instrumental và Lời ngẫu nhiên loại trừ nhau
  if (instrumental && els.randomLyrics.checked) {
    els.randomLyrics.checked = false;
    applyRandomLyricsUI();
  }
  applyInstrumentalUI();
  saveFormState();
  setStatus(instrumental ? 'Bật chế độ nhạc không lời' : 'Tắt chế độ nhạc không lời', 'success');
});

// ============================================================
// SLIDERS
// ============================================================

function applySliderUI() {
  els.sliderGroup.classList.toggle('open', els.useSliders.checked);
}

els.useSliders.addEventListener('change', () => { applySliderUI(); saveFormState(); });
els.weirdness.addEventListener('input', () => {
  els.weirdnessVal.textContent = els.weirdness.value;
  saveFormState();
});
els.styleInfluence.addEventListener('input', () => {
  els.styleInfluenceVal.textContent = els.styleInfluence.value;
  saveFormState();
});
els.smartBatch.addEventListener('change', saveFormState);

// ============================================================
// LƯU & KHÔI PHỤC FORM
// ============================================================

const FORM_KEY = 'formState';

function saveFormState() {
  const state = {
    style: els.styleInput.value,
    title: els.titleInput.value,
    lyrics: els.lyricsInput.value,
    randomLyrics: els.randomLyrics.checked,
    instrumental,
    autoDownload: els.autoDownload.checked,
    smartBatch: els.smartBatch.checked,
    useSliders: els.useSliders.checked,
    weirdness: els.weirdness.value,
    styleInfluence: els.styleInfluence.value,
    batchCount,
  };
  chrome.storage.local.set({ [FORM_KEY]: state });
}

// Lời "chỉ có khung" = có thẻ [..] nhưng không có chữ nào → coi như trống
function isStructureOnly(text) {
  if (!text) return false;
  const withoutTags = text.replace(/\[[^\]]*\]/g, '').trim();
  return withoutTags.length === 0 && /\[/.test(text);
}

async function restoreFormState() {
  const result = await chrome.storage.local.get(FORM_KEY);
  const s = result[FORM_KEY];
  if (!s) return;
  els.styleInput.value = s.style || '';
  els.titleInput.value = s.title || '';
  let lyr = s.lyrics || '';
  if (isStructureOnly(lyr)) lyr = '';  // dọn khung trống cũ còn sót
  els.lyricsInput.value = lyr;
  els.charCount.textContent = lyr.length;
  els.randomLyrics.checked = s.randomLyrics || false;
  instrumental = s.instrumental || false;
  els.autoDownload.checked = s.autoDownload !== false;
  els.smartBatch.checked = s.smartBatch || false;
  els.useSliders.checked = s.useSliders || false;
  els.weirdness.value = s.weirdness || 50;
  els.weirdnessVal.textContent = els.weirdness.value;
  els.styleInfluence.value = s.styleInfluence || 50;
  els.styleInfluenceVal.textContent = els.styleInfluence.value;
  batchCount = s.batchCount || 1;
  updateBatchUI();
  applyRandomLyricsUI();
  applyInstrumentalUI();
  applySliderUI();
}

['input', 'change'].forEach(evt => {
  els.styleInput.addEventListener(evt, saveFormState);
  els.titleInput.addEventListener(evt, saveFormState);
  els.lyricsInput.addEventListener(evt, saveFormState);
});
els.randomLyrics.addEventListener('change', saveFormState);
els.autoDownload.addEventListener('change', saveFormState);

// ============================================================
// CHAR COUNTER
// ============================================================

els.lyricsInput.addEventListener('input', () => {
  els.charCount.textContent = els.lyricsInput.value.length;
});

// ============================================================
// BATCH CONTROLS
// ============================================================

function updateBatchUI() {
  els.batchCount.textContent = batchCount;
  const totalSongs = batchCount * 2;
  els.batchInfo.textContent = `${batchCount} lượt = ${totalSongs} bài hát · nghỉ 2–4 phút giữa mỗi lượt`;
}

els.btnMinus.addEventListener('click', () => {
  if (batchCount > 1) { batchCount--; updateBatchUI(); saveFormState(); }
});

els.btnPlus.addEventListener('click', () => {
  if (batchCount < 10) { batchCount++; updateBatchUI(); saveFormState(); }
});

// ============================================================
// RANDOM LYRICS TOGGLE
// ============================================================

function applyRandomLyricsUI() {
  if (els.randomLyrics.checked) {
    els.lyricsInput.disabled = true;
    els.lyricsInput.placeholder = 'Suno sẽ tự viết lời ngẫu nhiên mỗi lượt...';
    els.lyricsInput.style.opacity = '0.4';
  } else if (!instrumental) {
    els.lyricsInput.disabled = false;
    els.lyricsInput.placeholder = '[Verse]\nNhập lời bài hát ở đây...\n\n[Chorus]\nĐiệp khúc...';
    els.lyricsInput.style.opacity = '1';
  }
}

els.randomLyrics.addEventListener('change', () => {
  // Lời ngẫu nhiên và Instrumental loại trừ nhau
  if (els.randomLyrics.checked && instrumental) {
    instrumental = false;
    applyInstrumentalUI();
  }
  applyRandomLyricsUI();
});

// ============================================================
// PRESET MANAGEMENT
// ============================================================

async function loadPresets() {
  const { presets = {} } = await chrome.storage.local.get('presets');
  els.presetSelect.innerHTML = '<option value="">💾 Chọn preset...</option>';
  for (const name of Object.keys(presets).sort()) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    els.presetSelect.appendChild(opt);
  }
}

els.btnSavePreset.addEventListener('click', async () => {
  const name = els.presetName.value.trim();
  if (!name) return setStatus('Nhập tên preset trước', 'error');
  const { presets = {} } = await chrome.storage.local.get('presets');
  presets[name] = {
    style: els.styleInput.value,
    title: els.titleInput.value,
    lyrics: els.lyricsInput.value,
  };
  await chrome.storage.local.set({ presets });
  els.presetName.value = '';
  await loadPresets();
  els.presetSelect.value = name;
  setStatus(`Đã lưu preset "${name}"`, 'success');
});

async function applyPreset() {
  const name = els.presetSelect.value;
  if (!name) return;
  const { presets = {} } = await chrome.storage.local.get('presets');
  const p = presets[name];
  if (!p) return;
  els.styleInput.value = p.style || '';
  els.titleInput.value = p.title || '';
  els.lyricsInput.value = p.lyrics || '';
  els.charCount.textContent = (p.lyrics || '').length;
  saveFormState();
  setStatus(`Đã tải preset "${name}"`, 'success');
}

els.presetSelect.addEventListener('change', applyPreset);

els.btnDeletePreset.addEventListener('click', async () => {
  const name = els.presetSelect.value;
  if (!name) return setStatus('Chọn preset để xoá', 'error');
  const { presets = {} } = await chrome.storage.local.get('presets');
  delete presets[name];
  await chrome.storage.local.set({ presets });
  await loadPresets();
  setStatus(`Đã xoá preset "${name}"`, 'success');
});

// ============================================================
// EXPORT / IMPORT PRESETS
// ============================================================

els.btnExportPresets.addEventListener('click', async () => {
  const { presets = {} } = await chrome.storage.local.get('presets');
  const keys = Object.keys(presets);
  if (keys.length === 0) return setStatus('Chưa có preset nào để xuất', 'error');
  const json = JSON.stringify(presets, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'suno-presets.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus(`Đã xuất ${keys.length} preset`, 'success');
});

els.btnImportPresets.addEventListener('click', () => {
  els.importFile.click();
});

els.importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (typeof imported !== 'object' || Array.isArray(imported)) {
      throw new Error('Invalid format');
    }
    const { presets = {} } = await chrome.storage.local.get('presets');
    let count = 0;
    for (const [name, data] of Object.entries(imported)) {
      if (data && typeof data === 'object' && (data.style || data.lyrics || data.title)) {
        presets[name] = { style: data.style || '', title: data.title || '', lyrics: data.lyrics || '' };
        count++;
      }
    }
    await chrome.storage.local.set({ presets });
    await loadPresets();
    setStatus(`Đã nhập ${count} preset`, 'success');
  } catch (err) {
    setStatus('File không hợp lệ — cần file JSON từ chức năng Xuất', 'error');
  }
  e.target.value = '';
});

// ============================================================
// QUEUE MANAGEMENT
// ============================================================

async function loadQueue() {
  const { songQueue = [] } = await chrome.storage.local.get('songQueue');
  queue = songQueue;
  renderQueue();
  updateQueueBadge();
}

function renderQueue() {
  if (queue.length === 0) {
    els.queueList.innerHTML = '<div class="empty-state">Chưa có mục nào.<br>Vào tab Tạo nhạc → điền form → bấm "Thêm vào hàng đợi"</div>';
    return;
  }
  els.queueList.innerHTML = queue.map((item, i) => {
    const title = item.title || '(Không tiêu đề)';
    const style = item.style || '(Không style)';
    const lyricsInfo = item.randomLyrics ? 'Lời ngẫu nhiên' : `${(item.lyrics || '').length} ký tự`;
    return `
      <div class="item-card">
        <div class="item-card-header">
          <div class="item-card-title">#${i + 1} · ${escHtml(style)}</div>
          <div class="item-card-actions">
            <button class="item-card-btn danger" data-action="queue-remove" data-id="${item.id}" title="Xoá">✕</button>
          </div>
        </div>
        <div class="item-card-meta">
          ${escHtml(title)} · ${lyricsInfo} · ${item.autoDownload ? 'Auto DL' : 'Không DL'}
        </div>
      </div>`;
  }).join('');
}

function updateQueueBadge() {
  if (els.queueBadge) {
    els.queueBadge.textContent = queue.length;
    els.queueBadge.classList.toggle('hidden', queue.length === 0);
  }
}

els.btnAddQueue.addEventListener('click', async () => {
  const style = els.styleInput.value.trim();
  const title = els.titleInput.value.trim();
  const lyrics = els.lyricsInput.value.trim();
  const randomLyrics = els.randomLyrics.checked;
  const autoDownload = els.autoDownload.checked;

  if (instrumental && !style) {
    return setStatus('Nhạc không lời cần điền Phong cách', 'error');
  }
  if (!instrumental && !randomLyrics && !lyrics && !style) {
    return setStatus('Nhập ít nhất lyrics hoặc style', 'error');
  }
  if (randomLyrics && !style) {
    return setStatus('Cần nhập style khi dùng lời ngẫu nhiên', 'error');
  }

  const item = { id: Date.now(), style, title, lyrics, randomLyrics, instrumental, autoDownload };
  if (els.useSliders.checked) {
    item.weirdness = parseInt(els.weirdness.value);
    item.styleInfluence = parseInt(els.styleInfluence.value);
  }
  queue.push(item);
  await chrome.storage.local.set({ songQueue: queue });
  renderQueue();
  updateQueueBadge();
  setStatus(`Đã thêm vào hàng đợi (${queue.length} mục)`, 'success');
});

els.queueList.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'queue-remove') {
    const id = parseInt(btn.dataset.id);
    queue = queue.filter(q => q.id !== id);
    await chrome.storage.local.set({ songQueue: queue });
    renderQueue();
    updateQueueBadge();
  }
});

els.btnClearQueue.addEventListener('click', async () => {
  if (queue.length === 0) return;
  queue = [];
  await chrome.storage.local.set({ songQueue: [] });
  renderQueue();
  updateQueueBadge();
  setStatus('Đã xoá hàng đợi', 'success');
});

els.btnRunQueue.addEventListener('click', () => {
  if (queue.length === 0) return setStatus('Hàng đợi trống', 'error');
  els.btnCreate.disabled = true;
  setStatus('Đang chạy hàng đợi...', 'working');
  chrome.runtime.sendMessage({ action: 'runQueue', data: { items: [...queue] } });
});

// ============================================================
// HISTORY
// ============================================================

let allHistory = [];
let historyFilter = 0; // 0 = tất cả, 3/4/5 = số sao tối thiểu

async function loadHistory() {
  const { songHistory = [] } = await chrome.storage.local.get('songHistory');
  allHistory = songHistory;
  renderHistory();
  updateCredits(songHistory);
}

function renderHistory() {
  const history = historyFilter > 0
    ? allHistory.filter(h => (h.rating || 0) >= historyFilter)
    : allHistory;

  if (history.length === 0) {
    els.historyList.innerHTML = historyFilter > 0
      ? `<div class="empty-state">Chưa có bài nào đạt ★ ${historyFilter}+.</div>`
      : '<div class="empty-state">Chưa có bài hát nào được tạo.</div>';
    return;
  }
  els.historyList.innerHTML = history.map(item => {
    const title = item.title || '(Không tiêu đề)';
    const style = item.style || '';
    const songCount = (item.songIds || []).length;
    const time = timeAgo(item.createdAt);
    const rating = item.rating || 0;
    const stars = [1, 2, 3, 4, 5].map(n =>
      `<span class="star ${rating >= n ? 'on' : ''}" data-action="rate" data-id="${item.id}" data-star="${n}">★</span>`
    ).join('');

    return `
      <div class="item-card">
        <div class="item-card-header">
          <div class="item-card-title">${escHtml(title)}</div>
          <div class="item-card-actions">
            <button class="item-card-btn danger" data-action="history-remove" data-id="${item.id}" title="Xoá">✕</button>
          </div>
        </div>
        <div class="item-card-meta">
          ${escHtml(style)} · ${songCount} bài · ${time}${item.randomLyrics ? ' · Lời ngẫu nhiên' : ''}${item.instrumental ? ' · 🎹 Không lời' : ''}
        </div>
        <div class="rating-row">${stars}</div>
      </div>`;
  }).join('');
}

function updateCredits(history) {
  const today = new Date().toDateString();
  let todayCount = 0;
  let totalCount = 0;
  history.forEach(h => {
    const count = (h.songIds || []).length;
    totalCount += count;
    if (new Date(h.createdAt).toDateString() === today) todayCount += count;
  });
  // Suno V5.5: ~5 credits/bài (1 lượt Create = 2 bài ≈ 10 credits)
  const creditsUsed = totalCount * 5;

  if (els.creditsToday) els.creditsToday.textContent = todayCount;
  if (els.creditsTotal) els.creditsTotal.textContent = totalCount;
  if (els.creditsEstimate) els.creditsEstimate.textContent = '~' + creditsUsed;
  if (els.creditCount) els.creditCount.textContent = todayCount;
}

els.historyList.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'rate') {
    const id = parseInt(btn.dataset.id);
    const star = parseInt(btn.dataset.star);
    const { songHistory = [] } = await chrome.storage.local.get('songHistory');
    const entry = songHistory.find(h => h.id === id);
    if (entry) {
      // Bấm lại đúng sao đang có → bỏ chấm (về 0)
      entry.rating = (entry.rating === star) ? 0 : star;
      await chrome.storage.local.set({ songHistory });
      allHistory = songHistory;
      renderHistory();
    }
  }

  if (btn.dataset.action === 'history-remove') {
    const id = parseInt(btn.dataset.id);
    const { songHistory = [] } = await chrome.storage.local.get('songHistory');
    const updated = songHistory.filter(h => h.id !== id);
    await chrome.storage.local.set({ songHistory: updated });
    allHistory = updated;
    renderHistory();
    updateCredits(updated);
  }
});

// Lọc theo sao
document.querySelectorAll('.filter-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    historyFilter = parseInt(b.dataset.filter);
    renderHistory();
  });
});

els.btnClearHistory.addEventListener('click', async () => {
  await chrome.storage.local.set({ songHistory: [] });
  allHistory = [];
  renderHistory();
  updateCredits([]);
  setStatus('Đã xoá lịch sử', 'success');
});

// ============================================================
// HELPERS
// ============================================================

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function escAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

// ============================================================
// STATUS
// ============================================================

function setStatus(text, type = '') {
  els.statusText.textContent = text;
  els.status.className = 'status ' + type;

  if (type === 'success') {
    els.btnCreate.disabled = false;
    setTimeout(() => {
      if (els.status.classList.contains('success')) {
        els.status.className = 'status hidden';
      }
    }, 5000);
  }
  if (type === 'error') {
    els.btnCreate.disabled = false;
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'statusUpdate') {
    setStatus(msg.text, msg.type);
    els.btnCreate.disabled = msg.busy;
  }
  if (msg.action === 'queueCleared') {
    queue = [];
    renderQueue();
    updateQueueBadge();
  }
  if (msg.action === 'historyUpdated') {
    loadHistory();
  }
});

// ============================================================
// TẠO NHẠC — gửi cho background.js
// ============================================================

els.btnCreate.addEventListener('click', async () => {
  const style = els.styleInput.value.trim();
  const title = els.titleInput.value.trim();
  const lyrics = els.lyricsInput.value.trim();
  const autoDownload = els.autoDownload.checked;
  const randomLyrics = els.randomLyrics.checked;
  const totalBatches = batchCount;

  if (instrumental && !style) {
    return setStatus('Nhạc không lời cần điền Phong cách', 'error');
  }
  if (!instrumental && !randomLyrics && !lyrics && !style) {
    return setStatus('Nhập ít nhất lyrics hoặc style', 'error');
  }
  if (randomLyrics && !style) {
    return setStatus('Cần nhập style khi dùng lời ngẫu nhiên', 'error');
  }

  els.btnCreate.disabled = true;
  setStatus('Đang bắt đầu...', 'working');

  const data = { style, title, lyrics, autoDownload, randomLyrics, instrumental, totalBatches };

  // Sliders
  if (els.useSliders.checked) {
    data.weirdness = parseInt(els.weirdness.value);
    data.styleInfluence = parseInt(els.styleInfluence.value);
  }

  // Smart variations: mỗi lượt 1 style khác nhẹ
  if (els.smartBatch.checked && totalBatches > 1 && style && typeof buildStyleVariations === 'function') {
    data.styleVariations = buildStyleVariations(style, totalBatches);
  }

  chrome.runtime.sendMessage({ action: 'startCreate', data });
});

// ============================================================
// INIT
// ============================================================

async function init() {
  populateCookbook();
  await restoreFormState();
  await loadPresets();
  updateBatchUI();
  await loadQueue();
  await loadHistory();

  const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
  if (status && status.text) {
    setStatus(status.text, status.type);
    els.btnCreate.disabled = status.busy;
  }
}

init();
