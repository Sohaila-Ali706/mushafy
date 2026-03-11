import fs from 'fs/promises';
import path from 'path';

const RECITERS = (process.env.RECITERS || '7')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)
  .map((v) => Number(v))
  .filter((v) => Number.isFinite(v));
const SURAH_FROM = Number(process.env.SURAH_FROM || '1');
const SURAH_TO = Number(process.env.SURAH_TO || '114');
const OUT_DIR = path.resolve('public/audio');
const OVERWRITE = process.env.OVERWRITE === '1';

const pad3 = (n) => n.toString().padStart(3, '0');

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
};

const downloadFile = async (url, dest) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`${url} -> ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
};

const extractAudioUrl = (res) => {
  const audio = res?.audio_file || res?.audio_files?.[0] || res?.chapter_recitation || res?.data;
  return audio?.audio_url || audio?.url || audio?.file || '';
};

(async () => {
  if (!RECITERS.length) throw new Error('No RECITERS provided.');
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const reciter of RECITERS) {
    const reciterDir = path.join(OUT_DIR, String(reciter));
    await fs.mkdir(reciterDir, { recursive: true });

    for (let surah = SURAH_FROM; surah <= SURAH_TO; surah += 1) {
      const fileName = `${pad3(surah)}.mp3`;
      const dest = path.join(reciterDir, fileName);
      if (!OVERWRITE) {
        try {
          await fs.access(dest);
          console.log(`Skip ${reciter}/${fileName}`);
          continue;
        } catch {
          // file does not exist
        }
      }

      const url = `https://api.quran.com/api/v4/chapter_recitations/${reciter}/${surah}`;
      const res = await fetchJson(url);
      const audioUrl = extractAudioUrl(res);
      if (!audioUrl) {
        console.warn(`No audio URL for reciter ${reciter}, surah ${surah}`);
        continue;
      }
      console.log(`Downloading ${reciter}/${fileName}`);
      try {
        await downloadFile(audioUrl, dest);
      } catch (err) {
        const status = err?.status ? ` (${err.status})` : '';
        console.warn(`Skip ${reciter}/${fileName}${status}`);
        continue;
      }
    }
  }

  console.log('Audio download complete.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
