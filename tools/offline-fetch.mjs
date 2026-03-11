import fs from 'fs/promises';
import path from 'path';

const outDir = path.resolve('public/offline');
const pad3 = (n) => n.toString().padStart(3, '0');

const save = async (file, data) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`${url} -> ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

const TAFSIR_KEY = process.env.TAFSIR_KEY || null;
const PRAYER_CITY = process.env.PRAYER_CITY || 'Cairo';
const PRAYER_COUNTRY = process.env.PRAYER_COUNTRY || 'Egypt';
const PRAYER_METHOD = process.env.PRAYER_METHOD || '5';
const HADITH_COLLECTIONS = (process.env.HADITH_COLLECTIONS || '')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);
const HADITH_LIMIT = Number(process.env.HADITH_LIMIT || 0);

const extractAdhkarUrls = (res) => {
  const list = [];
  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== 'object') return;
    const url = node.TEXT || node.URL || node.text || node.url;
    if (url) list.push(url);
    Object.values(node).forEach(visit);
  };
  visit(res);
  return Array.from(new Set(list));
};

const extractAdhkarId = (url) => {
  const match = url.match(/\/(\d+)\.json/);
  return match ? match[1] : null;
};

const fetchHadithCollection = async (id, available) => {
  const chunk = 50;
  const total = HADITH_LIMIT > 0 ? Math.min(HADITH_LIMIT, available || HADITH_LIMIT) : available;
  const items = [];
  let start = 1;
  let end = total ? Math.min(chunk, total) : chunk;
  while (!total || start <= total) {
    const data = await fetchJson(`https://api.hadith.gading.dev/books/${id}?range=${start}-${end}`);
    const contents = data?.data?.contents ?? data?.contents ?? [];
    if (Array.isArray(contents)) {
      items.push(...contents);
    }
    if (total && end >= total) break;
    if (!contents.length) break;
    start = end + 1;
    end = total ? Math.min(start + chunk - 1, total) : start + chunk - 1;
  }
  return { data: { contents: items } };
};

(async () => {
  const verseSamples = [];
  const surahList = await fetchJson('https://api.alquran.cloud/v1/surah');
  await save(path.join(outDir, 'quran', 'surah-list.json'), surahList);

  for (let i = 1; i <= 114; i += 1) {
    const data = await fetchJson(`https://api.alquran.cloud/v1/surah/${i}`);
    await save(path.join(outDir, 'quran', `surah-${pad3(i)}.json`), data);
    const firstAyah = data?.data?.ayahs?.[0];
    if (firstAyah?.text) {
      const surahName = data?.data?.name || '';
      const source = `سورة ${surahName} - آية ${firstAyah.numberInSurah || 1}`;
      verseSamples.push({ text: firstAyah.text, source });
    }
  }

  const editions = await fetchJson(
    'https://api.alquran.cloud/v1/edition?format=text&type=tafsir&language=ar'
  );
  await save(path.join(outDir, 'tafsir', 'editions.json'), editions);

  const key = TAFSIR_KEY || editions?.data?.[0]?.identifier;
  if (key) {
    for (let i = 1; i <= 114; i += 1) {
      const tafsir = await fetchJson(`https://api.alquran.cloud/v1/surah/${i}/${key}`);
      await save(path.join(outDir, 'tafsir', key, `surah-${pad3(i)}.json`), tafsir);
    }
  }

  const hadithBooks = await fetchJson('https://api.hadith.gading.dev/books');
  await save(path.join(outDir, 'hadith', 'books.json'), hadithBooks);
  const bookList = hadithBooks?.data ?? hadithBooks ?? [];
  const targetBooks = HADITH_COLLECTIONS.length
    ? bookList.filter((b) => HADITH_COLLECTIONS.includes(b.id))
    : bookList;
  for (const book of targetBooks) {
    const payload = await fetchHadithCollection(book.id, book.available);
    await save(path.join(outDir, 'hadith', book.id, 'all.json'), payload);
  }

  const husn = await fetchJson('https://www.hisnmuslim.com/api/husn.json');
  await save(path.join(outDir, 'adhkar', 'husn.json'), husn);

  const husnAr = await fetchJson('https://www.hisnmuslim.com/api/ar/husn_ar.json');
  await save(path.join(outDir, 'adhkar', 'husn_ar.json'), husnAr);
  const adhkarUrls = extractAdhkarUrls(husnAr);
  for (const url of adhkarUrls) {
    const id = extractAdhkarId(url);
    if (!id) continue;
    const data = await fetchJson(url.startsWith('http') ? url : `https://www.hisnmuslim.com${url}`);
    await save(path.join(outDir, 'adhkar', `${id}.json`), data);
  }

  let reciters = null;
  try {
    reciters = await fetchJson('https://api.quran.com/api/v4/chapter_reciters?language=ar');
  } catch (err) {
    if (err?.status === 404) {
      reciters = await fetchJson('https://api.quran.com/api/v4/resources/recitations?language=ar');
    } else {
      throw err;
    }
  }
  await save(path.join(outDir, 'reciters.json'), reciters);

  const prayerUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(
    PRAYER_CITY
  )}&country=${encodeURIComponent(PRAYER_COUNTRY)}&method=${PRAYER_METHOD}`;
  const prayers = await fetchJson(prayerUrl);
  await save(path.join(outDir, 'prayer-times.json'), prayers);

  if (verseSamples.length) {
    await save(path.join(outDir, 'verses.json'), verseSamples);
  }

  console.log('Offline JSON ready.');
})();
