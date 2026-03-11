import fs from 'fs/promises';
import path from 'path';

const OUT_DIR = path.resolve('public/fonts');
const CSS_OUT = path.resolve('src/fonts.css');

const FONT_CSS_URLS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@200;400;500;600&display=swap'
];

const fetchText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
};

const fetchBuffer = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.arrayBuffer();
};

const urlToFileName = (url) => {
  const clean = url.split('?')[0];
  return clean.slice(clean.lastIndexOf('/') + 1);
};

(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const cssChunks = [];
  const downloaded = new Set();

  for (const cssUrl of FONT_CSS_URLS) {
    const css = await fetchText(cssUrl);
    const urls = Array.from(css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)).map(
      (m) => m[1]
    );
    for (const url of urls) {
      if (downloaded.has(url)) continue;
      downloaded.add(url);
      const fileName = urlToFileName(url);
      const dest = path.join(OUT_DIR, fileName);
      const data = await fetchBuffer(url);
      await fs.writeFile(dest, Buffer.from(data));
    }
    const replaced = css.replace(
      /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g,
      (match, p1) => `url(/fonts/${urlToFileName(p1)})`
    );
    cssChunks.push(replaced);
  }

  await fs.writeFile(CSS_OUT, cssChunks.join('\n'), 'utf8');
  console.log('Fonts downloaded and src/fonts.css generated.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
