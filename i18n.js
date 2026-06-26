// Localization — tiếng Việt + English
const i18n = {
  vi: {
    // Header
    appName: 'Suno Auto',
    tagline: 'Tạo nhạc AI chỉ 1 click',
    songsCreatedToday: 'bài',

    // Tabs
    tabCreate: '🎵 Tạo nhạc',
    tabQueue: '📋 Hàng đợi',
    tabHistory: '📜 Lịch sử',

    // Create tab
    presetSelect: '💾 Preset đã lưu...',
    styleSuggestions: '🎨 Gợi ý phong cách',
    styleTemplate: '— Chọn style mẫu chuyên nghiệp —',
    artistLabel: 'Giống ca sĩ: Adele, The Weeknd...',
    btnArtist: '➜ Style',
    styleLabel: '🎸 Phong cách',
    styleInput: 'lo-fi, acoustic ballad, EDM, pop rock...',
    titleLabel: '✏️ Tiêu đề',
    titleOptional: '(tuỳ chọn)',
    titleInput: 'Tên bài hát...',
    lyricsLabel: '🎼 Lời bài hát',
    lyricsPlaceholder: '[Verse]\nNhập lời bài hát ở đây...\n\n[Chorus]\nĐiệp khúc...',
    charCount: 'ký tự',
    btnInstrumental: '🎹 Instrumental',
    btnAutoTag: '✨ Gắn cấu trúc',
    btnSavePreset: '💾 Lưu',
    btnAddQueue: '➕ Hàng đợi',
    presetNameInput: 'Lưu thành preset...',
    batchLabel: '🔄 Số lượt tạo',
    randomLyrics: 'Lời ngẫu nhiên (Suno tự viết)',
    autoDownload: 'Tự động tải MP3 khi xong',
    advanced: '⚙️ Nâng cao',
    smartBatch: 'Smart variations (mỗi lượt đổi nhẹ style)',
    useSliders: 'Điều khiển slider sáng tạo',
    weirdness: 'Weirdness',
    styleInfluence: 'Style Influence',
    sliderHint: 'Trái = an toàn/thoáng · Phải = chaos/bám sát style',
    btnCreate: '🎵 Tạo nhạc ngay',

    // Queue tab
    queueHeader: 'Chạy tuần tự, nghỉ 2-4 phút giữa mỗi mục',
    queueEmpty: 'Chưa có mục nào.\nVào tab Tạo nhạc → điền form → bấm "Thêm vào hàng đợi"',
    btnClearQueue: '🗑 Xoá',
    btnRunQueue: '▶ Chạy',

    // History tab
    historyHeader: 'Thống kê',
    creditsToday: 'Hôm nay',
    creditsTotal: 'Tổng cộng',
    creditsEstimate: 'Credits',
    historyFilter: 'Lọc:',
    filterAll: 'Tất cả',
    filterRating3: '★ 3+',
    filterRating4: '★ 4+',
    filterRating5: '★ 5',
    historyEmpty: 'Chưa có bài hát nào được tạo.',
    btnClearHistory: '🗑 Xoá lịch sử',

    // Status messages
    statusDone: 'Tạo xong!',
    statusDoneDownloaded: 'Tạo xong — đã tải MP3!',
    statusError: 'Lỗi',
    statusWorking: '...',
    msgPastelyrics: 'Hãy dán lời bài hát vào ô trước, rồi bấm Gắn cấu trúc',
    msgInstrumentalNeedStyle: 'Nhạc không lời cần điền Phong cách',
    msgNeedLyricsOrStyle: 'Nhập ít nhất lyrics hoặc style',
    msgNeedStyleForRandom: 'Cần nhập style khi dùng lời ngẫu nhiên',
    msgPresetSaved: 'preset đã lưu',
    msgPresetLoaded: 'Đã tải preset',
    msgAddedQueue: 'Đã thêm vào hàng đợi',
    msgGenerating: 'Đang tạo nhạc...',
    msgRestBefore: 'Nghỉ',
    msgResumeAt: '— tạo lượt tiếp lúc',
  },

  en: {
    // Header
    appName: 'Suno Auto',
    tagline: 'Create music with 1 click',
    songsCreatedToday: 'songs',

    // Tabs
    tabCreate: '🎵 Create',
    tabQueue: '📋 Queue',
    tabHistory: '📜 History',

    // Create tab
    presetSelect: '💾 Saved presets...',
    styleSuggestions: '🎨 Style suggestions',
    styleTemplate: '— Choose professional style —',
    artistLabel: 'Like artist: Adele, The Weeknd...',
    btnArtist: '➜ Style',
    styleLabel: '🎸 Style',
    styleInput: 'lo-fi, acoustic ballad, EDM, pop rock...',
    titleLabel: '✏️ Title',
    titleOptional: '(optional)',
    titleInput: 'Song title...',
    lyricsLabel: '🎼 Lyrics',
    lyricsPlaceholder: '[Verse]\nEnter lyrics here...\n\n[Chorus]\nChorus lyrics...',
    charCount: 'characters',
    btnInstrumental: '🎹 Instrumental',
    btnAutoTag: '✨ Tag structure',
    btnSavePreset: '💾 Save',
    btnAddQueue: '➕ Queue',
    presetNameInput: 'Save as preset...',
    batchLabel: '🔄 Number of rounds',
    randomLyrics: 'Random lyrics (Suno writes)',
    autoDownload: 'Auto-download MP3 when done',
    advanced: '⚙️ Advanced',
    smartBatch: 'Smart variations (tweak style per round)',
    useSliders: 'Control creative sliders',
    weirdness: 'Weirdness',
    styleInfluence: 'Style Influence',
    sliderHint: 'Left = safe/open · Right = chaos/strict',
    btnCreate: '🎵 Create Now',

    // Queue tab
    queueHeader: 'Run sequentially, rest 2-4 min between items',
    queueEmpty: 'No items.\nGo to Create tab → fill form → click "Add to Queue"',
    btnClearQueue: '🗑 Clear',
    btnRunQueue: '▶ Run',

    // History tab
    historyHeader: 'Statistics',
    creditsToday: 'Today',
    creditsTotal: 'Total',
    creditsEstimate: 'Credits',
    historyFilter: 'Filter:',
    filterAll: 'All',
    filterRating3: '★ 3+',
    filterRating4: '★ 4+',
    filterRating5: '★ 5',
    historyEmpty: 'No songs created yet.',
    btnClearHistory: '🗑 Clear history',

    // Status messages
    statusDone: 'Done!',
    statusDoneDownloaded: 'Done — MP3 downloaded!',
    statusError: 'Error',
    statusWorking: '...',
    msgPastelyrics: 'Paste lyrics first, then click Tag structure',
    msgInstrumentalNeedStyle: 'Instrumental mode requires Style',
    msgNeedLyricsOrStyle: 'Enter lyrics or style',
    msgNeedStyleForRandom: 'Random lyrics mode requires Style',
    msgPresetSaved: 'preset saved',
    msgPresetLoaded: 'Preset loaded',
    msgAddedQueue: 'Added to queue',
    msgGenerating: 'Generating music...',
    msgRestBefore: 'Rest',
    msgResumeAt: '— next round at',
  }
};

// Auto-detect language (English or Vietnamese)
function getLanguage() {
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'en' ? 'en' : 'vi';
}

// Get translated string
function t(key) {
  const lang = getLanguage();
  return i18n[lang][key] || i18n.vi[key] || key;
}

// Auto-translate all elements with data-i18n attribute
function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'text') {
      el.placeholder = t(key);
    } else if (el.tagName === 'TEXTAREA') {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  document.documentElement.lang = getLanguage();
}
