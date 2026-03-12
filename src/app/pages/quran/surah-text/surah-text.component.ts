import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OFFLINE_BASE, padSurah } from '../../../shared/offline';

type ApiResponse<T> = {
  data: T;
};

type Ayah = {
  numberInSurah: number;
  text: string;
  page?: number;
  juz?: number;
};

type SurahData = {
  name: string;
  englishName: string;
  ayahs: Ayah[];
};

type SurahMeta = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
};

type LastRead = {
  surahNumber: number;
  surahName?: string;
};

type MushafSection = {
  number: number;
  name: string;
  ayahs: Ayah[];
  juz?: number;
};

@Component({
  selector: 'app-surah-text',
  standalone: false,
  templateUrl: './surah-text.component.html',
  styleUrl: './surah-text.component.css'
})
export class SurahTextComponent implements OnInit, OnDestroy {
  surahNumber = 1;
  mushafSections: MushafSection[] = [];
  surahList: SurahMeta[] = [];
  searchTerm = '';
  drawerOpen = false;
  lastRead: LastRead | null = null;
  loading = true;
  error = '';
  loadingMore = false;
  allLoaded = false;
  private readonly progressKey = 'mushafy_mushaf_progress';
  private readonly batchSize = 5;
  private readonly quranCacheName = 'mushafy-quran-json-v1';
  private loadedCount = 0;
  private scrollTimer: number | undefined;
  private navSub: any;
  private paramSub: any;
  private mushafLoaded = false;

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.navSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.saveScroll();
      }
    });
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const param = params.get('surahNumber');
      this.surahNumber = Number(param || 1);
      if (this.mushafLoaded) {
        this.ensureSurahLoaded(this.surahNumber).then(() => {
          setTimeout(() => this.scrollToSurah(this.surahNumber), 0);
        });
      }
    });
    this.loadLastRead();
    this.fetchMushaf();
  }

  ngOnDestroy(): void {
    if (!this.loading) {
      this.saveScroll();
    }
    if (this.scrollTimer) {
      window.clearTimeout(this.scrollTimer);
    }
    if (this.navSub) {
      this.navSub.unsubscribe();
    }
    if (this.paramSub) {
      this.paramSub.unsubscribe();
    }
  }

  async fetchMushaf(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.mushafSections = [];
    this.mushafLoaded = false;
    this.loadingMore = false;
    this.allLoaded = false;
    this.loadedCount = 0;
    try {
      const listRes = await this.fetchJson<ApiResponse<SurahMeta[]>>(
        'https://mushafy.local/quran/surah-list',
        `${OFFLINE_BASE}/quran/surah-list.json`,
        'https://api.alquran.cloud/v1/surah'
      );
      this.surahList = listRes?.data ?? [];
      const progressSurah = this.getProgressSurah();
      const initialTarget = Math.max(this.batchSize, this.surahNumber);
      await this.loadUntil(initialTarget);
      this.mushafLoaded = true;
      this.loading = false;
      setTimeout(() => this.scrollToSurah(this.surahNumber), 0);
      if (progressSurah <= this.loadedCount) {
        this.restoreScroll();
      } else {
        this.loadUntil(progressSurah).then(() => {
          this.restoreScroll();
        });
      }
    } catch {
      this.error = 'تعذر تحميل المصحف الآن.';
      this.loading = false;
    }
  }

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  async goToSurah(surah: SurahMeta): Promise<void> {
    this.drawerOpen = false;
    this.router.navigate(['/quran/text', surah.number]);
    if (this.mushafLoaded) {
      await this.ensureSurahLoaded(surah.number);
      setTimeout(() => this.scrollToSurah(surah.number), 0);
    }
  }

  goToAudio(): void {
    this.drawerOpen = false;
    this.router.navigate(['/quran/audio', this.surahNumber]);
  }

  async resumeLastRead(): Promise<void> {
    if (!this.lastRead?.surahNumber) return;
    this.drawerOpen = false;
    this.router.navigate(['/quran/text', this.lastRead.surahNumber]);
    if (this.mushafLoaded) {
      await this.ensureSurahLoaded(this.lastRead.surahNumber);
      setTimeout(() => this.scrollToSurah(this.lastRead!.surahNumber), 0);
    }
  }

  getJuzLabel(juz?: number): string {
    if (!juz || !Number.isFinite(juz)) return '';
    return `الجزء ${this.toArabicOrdinal(juz)}`;
  }

  get filteredSurahs(): SurahMeta[] {
    const term = this.searchTerm.trim();
    if (!term) return this.surahList;
    const lower = term.toLowerCase();
    const number = Number(term);
    const normalized = this.normalizeArabic(term);
    return this.surahList.filter((s) => {
      const matchNumber = Number.isFinite(number) && s.number === number;
      const matchArabic = this.normalizeArabic(s.name || '').includes(normalized);
      const matchEnglish =
        s.englishName?.toLowerCase().includes(lower) ||
        s.englishNameTranslation?.toLowerCase().includes(lower);
      return matchNumber || matchArabic || matchEnglish;
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.loading) return;
    this.maybeLoadMore();
    if (this.scrollTimer) {
      window.clearTimeout(this.scrollTimer);
    }
    this.scrollTimer = window.setTimeout(() => {
      this.saveScroll();
    }, 200);
  }

  private saveScroll(): void {
    try {
      const currentAyah = this.findCurrentAyah();
      if (!currentAyah) return;
      const payload = {
        scrollY: window.scrollY,
        ayah: currentAyah.ayah,
        surahNumber: currentAyah.surahNumber,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.progressKey, JSON.stringify(payload));
      this.saveLastRead(currentAyah.surahNumber);
    } catch {
      // ignore storage errors
    }
  }

  private restoreScroll(): void {
    try {
      const raw = localStorage.getItem(this.progressKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const ayah = Number(parsed?.ayah ?? 0);
      const surahNumber = Number(parsed?.surahNumber ?? 0);
      const scrollY = Number(parsed?.scrollY ?? 0);
      const attemptScroll = (triesLeft: number) => {
        if (Number.isFinite(ayah) && ayah > 0 && Number.isFinite(surahNumber) && surahNumber > 0) {
          const target = document.getElementById(`ayah-${surahNumber}-${ayah}`);
          if (target) {
            const offset = 110;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'auto' });
            return;
          }
        }
        if (triesLeft > 0) {
          setTimeout(() => attemptScroll(triesLeft - 1), 60);
          return;
        }
        if (Number.isFinite(scrollY) && scrollY > 0) {
          window.scrollTo({ top: scrollY, behavior: 'auto' });
        }
      };
      setTimeout(() => attemptScroll(8), 0);
    } catch {
      // ignore storage errors
    }
  }

  private findCurrentAyah(): { surahNumber: number; ayah: number } | null {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.ayah'));
    if (!items.length) return null;
    const offset = 120;
    let currentAyah = 1;
    let currentSurah = 1;
    for (const item of items) {
      const top = item.getBoundingClientRect().top;
      if (top - offset <= 0) {
        const ayahValue = Number(item.dataset['ayah'] || '0');
        const surahValue = Number(item.dataset['surah'] || '0');
        if (Number.isFinite(ayahValue) && ayahValue > 0) {
          currentAyah = ayahValue;
        }
        if (Number.isFinite(surahValue) && surahValue > 0) {
          currentSurah = surahValue;
        }
      } else {
        break;
      }
    }
    return { surahNumber: currentSurah, ayah: currentAyah };
  }

  private normalizeArabic(value: string): string {
    return value
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/\u0640/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .trim()
      .toLowerCase();
  }

  private toArabicOrdinal(value: number): string {
    const map: Record<number, string> = {
      1: 'الأول',
      2: 'الثاني',
      3: 'الثالث',
      4: 'الرابع',
      5: 'الخامس',
      6: 'السادس',
      7: 'السابع',
      8: 'الثامن',
      9: 'التاسع',
      10: 'العاشر',
      11: 'الحادي عشر',
      12: 'الثاني عشر',
      13: 'الثالث عشر',
      14: 'الرابع عشر',
      15: 'الخامس عشر',
      16: 'السادس عشر',
      17: 'السابع عشر',
      18: 'الثامن عشر',
      19: 'التاسع عشر',
      20: 'العشرون',
      21: 'الحادي والعشرون',
      22: 'الثاني والعشرون',
      23: 'الثالث والعشرون',
      24: 'الرابع والعشرون',
      25: 'الخامس والعشرون',
      26: 'السادس والعشرون',
      27: 'السابع والعشرون',
      28: 'الثامن والعشرون',
      29: 'التاسع والعشرون',
      30: 'الثلاثون'
    };
    return map[value] || value.toString();
  }

  private loadLastRead(): void {
    try {
      const raw = localStorage.getItem('mushafy_last_quran_surah');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const num = Number(parsed?.surahNumber ?? 0);
      if (!Number.isFinite(num) || num <= 0) return;
      this.lastRead = {
        surahNumber: num,
        surahName: parsed?.surahName || ''
      };
    } catch {
      // ignore storage errors
    }
  }

  private saveLastRead(surahNumber: number): void {
    try {
      const payload = {
        surahNumber,
        surahName: this.getSurahNameByNumber(surahNumber),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('mushafy_last_quran_surah', JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  private scrollToSurah(number: number): void {
    const target = document.getElementById(`surah-${number}`);
    if (!target) return;
    const offset = 100;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  private getSurahNameByNumber(number: number): string {
    return this.mushafSections.find((s) => s.number === number)?.name || '';
  }

  private async loadUntil(target: number): Promise<void> {
    const limit = Math.min(target, this.surahList.length);
    while (this.loadedCount < limit && !this.error) {
      await this.loadNextBatch();
    }
  }

  async loadNextBatch(): Promise<void> {
    if (this.loadingMore || this.allLoaded) return;
    const showLoading = !this.loading;
    if (showLoading) this.loadingMore = true;
    const start = this.loadedCount;
    const batch = this.surahList.slice(start, start + this.batchSize);
    if (!batch.length) {
      this.allLoaded = true;
      this.loadingMore = false;
      return;
    }

    try {
      const results = await Promise.all(
        batch.map(async (surah) => {
          try {
            const res = await this.fetchJson<ApiResponse<SurahData>>(
              `https://mushafy.local/quran/surah-${padSurah(surah.number)}`,
              `${OFFLINE_BASE}/quran/surah-${padSurah(surah.number)}.json`,
              `https://api.alquran.cloud/v1/surah/${surah.number}`
            );
            return { surah, data: res?.data };
          } catch {
            return { surah, data: null };
          }
        })
      );

      for (const result of results) {
        const data = result.data;
        if (!data) continue;
        this.mushafSections.push({
          number: result.surah.number,
          name: data.name || result.surah.name,
          ayahs: data.ayahs ?? [],
          juz: data.ayahs?.[0]?.juz
        });
      }

      this.loadedCount += batch.length;
      if (this.loadedCount >= this.surahList.length) {
        this.allLoaded = true;
      }
    } catch {
      if (!this.error) {
        this.error = 'طھط¹ط°ط± طھط­ظ…ظٹظ„ ط¨ط¹ط¶ ط³ظˆط± ط§ظ„ظ…طµط­ظپ.';
      }
    } finally {
      this.loadingMore = false;
    }
  }

  private maybeLoadMore(): void {
    if (this.loadingMore || this.allLoaded || this.loading) return;
    const threshold = 900;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold) {
      this.loadNextBatch();
    }
  }

  private async ensureSurahLoaded(number: number): Promise<void> {
    if (!this.surahList.length) return;
    if (number <= this.loadedCount) return;
    await this.loadUntil(number);
  }

  private getProgressSurah(): number {
    try {
      const raw = localStorage.getItem(this.progressKey);
      if (!raw) return 1;
      const parsed = JSON.parse(raw);
      const surahNumber = Number(parsed?.surahNumber ?? 0);
      return Number.isFinite(surahNumber) && surahNumber > 0 ? surahNumber : 1;
    } catch {
      return 1;
    }
  }

  private async fetchJson<T>(cacheKey: string, offlineUrl: string, onlineUrl: string): Promise<T> {
    if (!('caches' in window)) {
      try {
        return await firstValueFrom(this.http.get<T>(offlineUrl));
      } catch {
        return await firstValueFrom(this.http.get<T>(onlineUrl));
      }
    }
    const cache = await caches.open(this.quranCacheName);
    const cached = await cache.match(cacheKey);
    if (cached) {
      return (await cached.json()) as T;
    }
    const urls = [offlineUrl, onlineUrl].filter(Boolean);
    let lastError: unknown = null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          lastError = new Error(`fetch failed: ${url}`);
          continue;
        }
        const data = (await res.json()) as T;
        const headers = new Headers({ 'Content-Type': 'application/json' });
        await cache.put(cacheKey, new Response(JSON.stringify(data), { headers }));
        return data;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error('fetch failed');
  }
}
