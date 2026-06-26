// ============================================================
// KNOWLEDGE BASE — trích từ Suno V5.5 Prompting Bible
// Dùng cho: Style mẫu, Artist→Style, Lyric templates, Smart variations
// ============================================================

// ---- 1. STYLE COOKBOOK (gom theo nhóm thể loại) ----
const STYLE_PRESETS = {
  'Pop / Ballad': [
    { name: 'Pop ballad cảm xúc', style: 'Emotional pop ballad, mid-tempo, piano and strings, warm female vocals, polished production, heartfelt' },
    { name: 'Dream pop mơ màng', style: 'Dream pop, ethereal vocals, shimmering guitars, lush synths, nostalgic longing' },
    { name: 'Sadcore điện ảnh', style: 'Pop sadcore, cinematic, slow tempo, reverb-heavy female vocals, melancholic and wistful' },
    { name: 'Disco dance pop', style: 'Disco dance pop, groovy bassline, upbeat, bright synths, female vocals, festive' },
  ],
  'Rock / Indie': [
    { name: 'Indie folk rock', style: 'Indie folk rock, mid-tempo, acoustic guitar and mandolin, warm male vocals, lo-fi production, nostalgic' },
    { name: 'Surf rock nắng', style: 'Indie surf rock, jangly guitars, beachy vibes, carefree vocals, upbeat sunny melodies' },
    { name: 'Atmospheric alt-rock', style: 'Atmospheric alt-rock, ambient, emotional piano, male vocals, soaring and cinematic' },
    { name: 'Grunge 90s', style: '90s grunge, dark male vocals, distorted guitars, raw angst, heavy drums' },
  ],
  'Electronic / EDM': [
    { name: 'Cyberpunk EDM', style: 'Futuristic cyberpunk EDM, high-energy beats, distorted synth lines, neon-lit dystopian themes' },
    { name: 'Chillwave êm', style: 'Chillwave electronic, ambient textures, slow tempo, reverb-heavy vocals, dreamy synth backdrop' },
    { name: 'Tropical house', style: 'Tropical house, upbeat, sun-kissed melodies, steel drums, breezy vocals, laid-back rhythm' },
    { name: 'Minimal techno', style: 'Minimal techno, repetitive beats, hypnotic rhythms, deep underground feel' },
  ],
  'Hip-Hop / Rap': [
    { name: 'Trap dữ dội', style: 'Rapid-fire rap, 140 BPM, deep bass beats, aggressive delivery in a minor key, high tension' },
    { name: 'Lo-fi hip-hop', style: 'Lo-fi hip-hop, jazzy chords, muted drums, mellow, study-beat vibe, relaxed' },
    { name: 'Trap metal', style: 'Aggressive trap metal, distorted 808s, screamed vocals, chaotic energy, mosh-pit breakdowns' },
  ],
  'Folk / Acoustic': [
    { name: 'Acoustic kể chuyện', style: 'Acoustic folk, storytelling lyrics, warm vocal harmonies, fingerstyle guitar, soft percussion' },
    { name: 'Country Americana', style: 'Country Americana, steady rhythm, twangy guitar, male vocals, heartfelt' },
  ],
  'Jazz / Soul': [
    { name: 'Jazz lounge cổ điển', style: 'Vintage jazz lounge, classic standards, smooth trumpet solos, upright bass, sultry female vocals' },
    { name: 'Soul-jazz retro', style: 'Soul-jazz, smoky female vocals, retro horns, intimate, warm production' },
    { name: 'Gospel nâng cao', style: 'Soulful gospel choir, powerful lead vocals, uplifting, organ accompaniment, handclaps' },
  ],
  'Cinematic / Khác': [
    { name: 'Nhạc phim hùng tráng', style: 'Epic cinematic score, sweeping orchestral movements, heroic themes, stirring emotional peaks' },
    { name: 'Dark ambient', style: 'Dark ambient, atmospheric soundscapes, slow-moving textures, unsettling eerie mood' },
    { name: 'Baroque pop', style: 'Baroque pop, intricate melodies, orchestral arrangements, harpsichord flourishes, poetic lyrics' },
    { name: 'Anime opening metal', style: 'Anime opening, heavy metal, male vocals, fast guitars, energetic and epic' },
    { name: 'Cổ phong (Chinese)', style: 'Pentatonic scale, modern classical, guzheng and piano and Chinese drum and cello, slow, sad, mellow' },
  ],
  'Việt Nam': [
    { name: 'Ballad Việt buồn', style: 'Vietnamese ballad, male vocals, acoustic guitar and piano, emotional, slow tempo, melancholic' },
    { name: 'V-Pop hiện đại', style: 'Vietnamese modern pop, female vocals, bright synths, danceable, polished, upbeat' },
    { name: 'Indie Việt mộc', style: 'Vietnamese indie folk, soft male vocals, acoustic guitar, lo-fi warmth, intimate and nostalgic' },
  ],
};

// ---- 2. ARTIST → STYLE (Suno chặn tên ca sĩ, dùng mô tả thay) ----
const ARTIST_MAP = {
  // Pop / R&B / Soul
  'taylor swift': 'Pop, alternative folk, emotional, female vocals',
  'adele': 'Soul, emotional, torch-lounge, powerful female vocals',
  'ariana grande': 'Pop, dance pop, ethereal, female vocals',
  'billie eilish': 'Pop, dark, minimal, female vocals',
  'the weeknd': 'R&B, dark, cinematic, male vocals',
  'weeknd': 'R&B, dark, cinematic, male vocals',
  'beyonce': 'R&B, anthemic, danceable, female vocals',
  'lady gaga': 'Pop, theatrical, dance, female vocals',
  'rihanna': 'R&B, dance pop, festive, female vocals',
  'bruno mars': 'Funk-pop blend, groovy rhythms, male vocals, danceable',
  'justin bieber': 'Pop, danceable, chillwave, male vocals',
  'katy perry': 'Pop, glitter, festive, female vocals',
  'dua lipa': 'Disco, dance pop, groovy, female vocals',
  'sam smith': 'Soul, emotional, lounge, male vocals',
  'lana del rey': 'Pop, sadcore, cinematic, female vocals',
  'sza': 'R&B, neo soul, emotional, female vocals',
  'frank ocean': 'R&B, soulful, introspective, male vocals',
  'amy winehouse': 'Soul-jazz, smoky female vocals, retro horns, intimate',
  'michael jackson': '80s pop, dance, iconic, male vocals',
  'prince': 'Funk, eclectic, glam, male vocals',
  'shakira': 'Latin, dance pop, festive, female vocals',
  'harry styles': 'Pop, rock, groovy, male vocals',
  // Hip-Hop
  'drake': 'Hip-hop, trap, laid-back male vocals, ambient beats',
  'kendrick lamar': 'Hip-hop, conscious, lyrical, storytelling, male vocals',
  'kanye west': 'Hip-hop, progressive, eclectic, male vocals',
  'jay-z': 'Hip-hop, aggressive, storytelling, male vocals',
  'post malone': 'Rap, ethereal, ambient, male vocals',
  'nicki minaj': 'Rap-pop, bold female vocals, playful attitude, rhythmic flow',
  'eminem': 'Rapid-fire rap, aggressive, lyrical, male vocals, intense',
  // Rock / Indie
  'the beatles': '60s British pop, classic, rock',
  'queen': 'Rock, operatic, theatrical, male vocals',
  'led zeppelin': 'Hard rock, blues rock, epic',
  'pink floyd': '70s rock, progressive, atmospheric',
  'coldplay': 'Atmospheric alt-rock, ambient, male vocals, emotional piano',
  'imagine dragons': '2010s rock, anthemic, emotion',
  'the killers': 'Rock, synthpop, anthemic, male vocals',
  'arctic monkeys': 'Indie rock, garage, cool',
  'tame impala': 'Psychedelic rock, dreamy, mellifluous',
  'radiohead': 'Alternative rock, experimental, atmospheric',
  'nirvana': '90s grunge, dark male vocals, distorted guitars, raw angst',
  'green day': 'Punk rock, fast guitars, youthful rebellion, raw energy',
  'red hot chili peppers': 'Funk rock, slap bass, male vocals, energetic',
  'bon iver': 'Indie folk, ethereal, intimate, male vocals',
  'phoebe bridgers': 'Bedroom, grungegaze, catchy, psychedelic, acoustic, female vocals',
  // Metal
  'metallica': 'Thrash metal, aggressive riffs, pounding drums, male vocals',
  'ac/dc': 'Hard rock, crunchy guitar riffs, raspy male vocals, driving rhythm',
  'iron maiden': 'Heavy metal, epic storytelling, galloping riffs, theatrical',
  'linkin park': 'Nu-metal, emotional male vocals, rap-rock fusion, heavy riffs',
  // Folk / Country
  'bob dylan': 'Folk, storytelling, acoustic guitar, male vocals',
  'ed sheeran': 'Folk-pop, acoustic guitar loops, male vocals, mellow tone',
  'dolly parton': 'Country storytelling, twangy melodies, female vocals',
  'the eagles': 'Country rock, harmony vocals, smooth guitars, laid-back',
  // Electronic
  'skrillex': 'Dubstep, electronic, intense, male vocals',
  'calvin harris': 'EDM, dance, festive, male vocals',
  'the chainsmokers': 'EDM-pop, bright synths, party energy, pulsing beats',
  'marshmello': 'EDM, dance, happy',
  'daft punk': 'French house, electronic, robotic vocals, groovy, retro-futuristic',
  'gorillaz': 'Alternative rock, electronic, unusual',
  'massive attack': 'Trip hop, dark, atmospheric',
  // Jazz / Blues
  'frank sinatra': '1940s big band, lounge singer, male vocals',
  'bob marley': 'Reggae, peaceful, soulful, male vocals',
  'bjork': 'Alternative, experimental, unusual, female vocals',
};

// ---- 3. LYRIC TEMPLATES (cấu trúc metatag chuẩn) ----
const LYRIC_TEMPLATES = {
  'Pop / Ballad': `[Intro]

[Verse 1]


[Pre-Chorus]


[Chorus]


[Verse 2]


[Pre-Chorus]


[Chorus]


[Bridge]


[Chorus]


[Outro]
`,
  'EDM Drop': `[Intro: ambient pads, building]

[Verse]


[Build-Up]


[Drop: full energy, heavy synths]


[Verse 2]


[Build-Up]


[Drop: full energy, heavy synths]


[Breakdown: stripped, atmospheric]


[Build-Up]


[Drop: full energy, heavy synths]


[Outro: fade out]
`,
  'Rap / Hip-Hop': `[Intro]

[Verse 1]


[Hook]


[Verse 2]


[Hook]


[Bridge]


[Hook]


[Outro]
`,
  'Đơn giản (Verse-Chorus)': `[Verse 1]


[Chorus]


[Verse 2]


[Chorus]


[Bridge]


[Chorus]


[Outro]
`,
  'Acoustic kể chuyện': `[Intro: acoustic guitar only]

[Verse 1: soft vocals, fingerpicked guitar]


[Chorus: warm harmonies, full band]


[Verse 2: soft vocals, fingerpicked guitar]


[Chorus: warm harmonies, full band]


[Bridge: stripped down, vulnerable vocals]


[Chorus: warm harmonies, full band]


[Outro: fade out, ambient reprise]
`,
};

// ---- 4. SMART VARIATIONS — biến thể descriptor để A/B test ----
// Mỗi lượt thêm 1 cụm descriptor khác nhau vào style gốc
const VARIATION_MODIFIERS = [
  'polished production',
  'lo-fi warmth',
  'raw and intimate',
  'cinematic and lush',
  'minimal and spacious',
  'energetic and bright',
  'dark and moody',
  'vintage analog feel',
  'reverb-heavy atmosphere',
  'crisp modern mix',
];

// Tạo N biến thể style từ 1 style gốc
function buildStyleVariations(baseStyle, count) {
  const variations = [];
  // Trộn ngẫu nhiên danh sách modifier
  const shuffled = [...VARIATION_MODIFIERS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    const mod = shuffled[i % shuffled.length];
    variations.push(`${baseStyle}, ${mod}`);
  }
  return variations;
}

// Tra cứu artist → style (không phân biệt hoa thường)
function lookupArtist(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return ARTIST_MAP[key] || null;
}

// Auto thêm metatag vào lyrics thô (chia theo dòng trống)
function autoAddMetatags(rawLyrics) {
  const blocks = rawLyrics.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 0);
  if (blocks.length === 0) return rawLyrics;

  // Nếu đã có metatag thì giữ nguyên
  if (/^\s*\[/.test(rawLyrics)) return rawLyrics;

  const out = [];
  let verseNum = 0;
  blocks.forEach((block, i) => {
    let tag;
    if (i === 0 && blocks.length > 2) {
      verseNum++;
      tag = `[Verse ${verseNum}]`;
    } else if (i === blocks.length - 1 && blocks.length > 2) {
      tag = '[Outro]';
    } else if (i % 2 === 1) {
      tag = '[Chorus]';
    } else {
      verseNum++;
      tag = `[Verse ${verseNum}]`;
    }
    out.push(tag + '\n' + block);
  });
  return out.join('\n\n');
}
