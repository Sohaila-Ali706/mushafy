import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { OFFLINE_BASE, OFFLINE_MODE, buildUrl, padSurah } from '../../../shared/offline';

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

type Reciter = {
  id: number;
  name: string;
};

@Component({
  selector: 'app-surah-audio',
  standalone: false,
  templateUrl: './surah-audio.component.html',
  styleUrl: './surah-audio.component.css'
})
export class SurahAudioComponent implements OnInit, OnDestroy {
  surahNumber = 1;
  reciterId = 7;
  reciters: Reciter[] = [];
  private readonly fallbackReciters: Reciter[] = [
    { id: 1, name: 'ط§ظ„ط´ظٹط® 1' },
    { id: 2, name: 'ط§ظ„ط´ظٹط® 2' },
    { id: 3, name: 'ط§ظ„ط´ظٹط® 3' },
    { id: 4, name: 'ط§ظ„ط´ظٹط® 4' },
    { id: 5, name: 'ط§ظ„ط´ظٹط® 5' },
    { id: 6, name: 'ط§ظ„ط´ظٹط® 6' },
    { id: 7, name: 'ط§ظ„ط´ظٹط® 7' }
  ];
  audioUrl = '';
  audioBlobUrl = '';
  surahList: SurahMeta[] = [];
  searchTerm = '';
  drawerOpen = false;
  lastRead: LastRead | null = null;
  loading = true;
  error = '';
  downloading = false;
  downloaded = false;
  readonly isNativeApp = Capacitor.isNativePlatform();
  private readonly audioCacheName = 'mushafy-audio-v1';
  readonly downloadLabel =
    '\u062a\u062d\u0645\u064a\u0644 \u0644\u0644\u0627\u0633\u062a\u0645\u0627\u0639 \u0628\u062f\u0648\u0646 \u0625\u0646\u062a\u0631\u0646\u062a';
  readonly downloadingLabel = '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0646\u0632\u064a\u0644...';
  readonly downloadedLabel = '\u062a\u0645 \u0627\u0644\u062a\u062d\u0645\u064a\u0644';
  private paramSub: any;

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const param = params.get('surahNumber');
      this.surahNumber = Number(param || 1);
      this.loadAudio();
    });
    this.fetchReciters();
    this.fetchSurahList();
    this.loadLastRead();
  }

  ngOnDestroy(): void {
    if (this.paramSub) {
      this.paramSub.unsubscribe();
    }
    this.revokeBlobUrl();
  }

  updateReciter(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    this.reciterId = parsed;
    this.loadAudio();
  }

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  goToSurah(surah: SurahMeta): void {
    this.drawerOpen = false;
    this.router.navigate(['/quran/audio', surah.number]);
  }

  goToText(): void {
    this.drawerOpen = false;
    this.router.navigate(['/quran/text', this.surahNumber]);
  }

  resumeLastRead(): void {
    if (!this.lastRead?.surahNumber) return;
    this.drawerOpen = false;
    this.router.navigate(['/quran/text', this.lastRead.surahNumber]);
  }

  fetchSurahList(): void {
    this.http.get<{ data: SurahMeta[] }>(
      buildUrl('quran/surah-list.json', 'https://api.alquran.cloud/v1/surah')
    ).subscribe({
      next: (res) => {
        this.surahList = res?.data ?? [];
      },
      error: () => {
        this.surahList = [];
      }
    });
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

  get currentSurahName(): string {
    const found = this.surahList.find((s) => s.number === this.surahNumber);
    return found?.name || `ط³ظˆط±ط© ط±ظ‚ظ… ${this.surahNumber}`;
  }

  get currentReciterName(): string {
    return this.reciters.find((r) => r.id === this.reciterId)?.name || `ط§ظ„ط´ظٹط® ${this.reciterId}`;
  }

  async loadAudio(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.audioUrl = '';
    this.downloading = false;
    this.downloaded = false;
    this.revokeBlobUrl();

    const cached = await this.loadCachedAudio();
    if (cached) {
      this.loading = false;
      return;
    }

    const url = `https://api.quran.com/api/v4/chapter_recitations/${this.reciterId}/${this.surahNumber}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const audio =
          res?.audio_file ||
          res?.audio_files?.[0] ||
          res?.chapter_recitation ||
          res?.data;
        this.audioUrl = audio?.audio_url || audio?.url || audio?.file || '';
        if (!this.audioUrl) {
          this.error =
            '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u062a \u0644\u0647\u0630\u0647 \u0627\u0644\u0633\u0648\u0631\u0629.';
        }
        this.loading = false;
      },
      error: () => {
        this.error =
          '\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0648\u062a \u0627\u0644\u0622\u0646. \u062a\u0623\u0643\u062f\u064a \u0645\u0646 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0623\u0648 \u062d\u0645\u0651\u0644\u064a\u0647 \u0623\u0648\u0644\u064b\u0627.';
        this.loading = false;
      }
    });
  }

  get audioSource(): string {
    return this.audioBlobUrl || this.audioUrl;
  }

  async downloadAudio(): Promise<void> {
    if (!this.isNativeApp || !this.audioUrl || this.downloading || this.downloaded) return;
    if (!('caches' in window)) {
      this.error =
        '\u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0645\u062d\u0644\u064a \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632.';
      return;
    }
    this.downloading = true;
    this.error = '';
    try {
      const response = await fetch(this.audioUrl);
      if (!response.ok) throw new Error('download-failed');
      const blob = await response.blob();
      const cache = await caches.open(this.audioCacheName);
      const headers = new Headers({
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg'
      });
      await cache.put(this.getCacheKey(), new Response(blob, { headers }));
      this.setBlobUrl(blob);
      this.downloaded = true;
    } catch {
      this.error = '\u062a\u0639\u0630\u0631 \u062a\u0646\u0632\u064a\u0644 \u0627\u0644\u0635\u0648\u062a \u0627\u0644\u0622\u0646.';
    } finally {
      this.downloading = false;
    }
  }

  private async loadCachedAudio(): Promise<boolean> {
    if (!this.isNativeApp || !('caches' in window)) return false;
    try {
      const cache = await caches.open(this.audioCacheName);
      const match = await cache.match(this.getCacheKey());
      if (!match) return false;
      const blob = await match.blob();
      this.setBlobUrl(blob);
      this.downloaded = true;
      return true;
    } catch {
      return false;
    }
  }

  private getCacheKey(): string {
    return `https://mushafy.local/audio/${this.reciterId}/${padSurah(this.surahNumber)}`;
  }

  private setBlobUrl(blob: Blob): void {
    this.revokeBlobUrl();
    this.audioBlobUrl = URL.createObjectURL(blob);
  }

  private revokeBlobUrl(): void {
    if (this.audioBlobUrl) {
      URL.revokeObjectURL(this.audioBlobUrl);
      this.audioBlobUrl = '';
    }
  }

  fetchReciters(): void {
    if (OFFLINE_MODE) {
      this.http.get<any>(`${OFFLINE_BASE}/reciters.json`).subscribe({
        next: (res) => {
          const list = res?.reciters || res?.data || res || [];
          const mapped: Reciter[] = list
            .map((r: any) => ({
              id: Number(r.id),
              name: this.pickArabicName(r)
            }))
            .filter((r: Reciter) => Number.isFinite(r.id) && !!r.name);
          this.applyReciters(this.dedupeReciters(mapped));
        },
        error: () => {
          this.applyReciters(this.fallbackReciters);
        }
      });
      return;
    }

    const url = 'https://api.quran.com/api/v4/chapter_reciters?language=ar';
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const list = res?.reciters || res?.data || [];
        const mapped: Reciter[] = list
          .map((r: any) => ({
            id: Number(r.id),
            name: this.pickArabicName(r)
          }))
          .filter((r: Reciter) => Number.isFinite(r.id) && !!r.name);
        this.applyReciters(this.dedupeReciters(mapped));
      },
      error: () => {
        const fallbackUrl = 'https://api.quran.com/api/v4/resources/recitations?language=ar';
        this.http.get<any>(fallbackUrl).subscribe({
          next: (res) => {
            const list = res?.recitations || res?.data || res || [];
            const mapped: Reciter[] = list
              .map((r: any) => ({
                id: Number(r.id),
                name: this.pickArabicName(r)
              }))
              .filter((r: Reciter) => Number.isFinite(r.id) && !!r.name);
            this.applyReciters(this.dedupeReciters(mapped));
          },
          error: () => {
            this.applyReciters(this.fallbackReciters);
          }
        });
      }
    });
  }

  private applyReciters(list: Reciter[]): void {
    if (!list.length) {
      this.reciters = [...this.fallbackReciters];
      return;
    }
    this.reciters = list;
    if (!this.reciters.find((r) => r.id === this.reciterId)) {
      this.reciterId = this.reciters[0].id;
      this.loadAudio();
    }
  }

  private pickArabicName(item: any): string {
    const candidates = [
      item?.arabic_name,
      item?.reciter_name,
      item?.name,
      item?.translated_name?.name
    ].filter(Boolean);
    const arabic = candidates.find((value: string) => /[\u0600-\u06FF]/.test(value));
    return (arabic || candidates[0] || '').toString().trim();
  }

  private dedupeReciters(list: Reciter[]): Reciter[] {
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();
    const result: Reciter[] = [];
    for (const reciter of list) {
      if (seenIds.has(reciter.id)) continue;
      const key = reciter.name.replace(/\s+/g, ' ').trim();
      if (seenNames.has(key)) continue;
      seenIds.add(reciter.id);
      seenNames.add(key);
      result.push(reciter);
    }
    return result;
  }

  private normalizeArabic(value: string): string {
    return value
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/\u0640/g, '')
      .replace(/[ط£ط¥ط¢ظ±]/g, 'ط§')
      .replace(/ظ‰/g, 'ظٹ')
      .replace(/ط¤/g, 'ظˆ')
      .replace(/ط¦/g, 'ظٹ')
      .replace(/ط©/g, 'ظ‡')
      .trim()
      .toLowerCase();
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
}

