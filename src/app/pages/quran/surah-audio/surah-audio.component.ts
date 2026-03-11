import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AUDIO_BASE, OFFLINE_BASE, OFFLINE_MODE, buildUrl, padSurah } from '../../../shared/offline';

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
    { id: 1, name: 'الشيخ 1' },
    { id: 2, name: 'الشيخ 2' },
    { id: 3, name: 'الشيخ 3' },
    { id: 4, name: 'الشيخ 4' },
    { id: 5, name: 'الشيخ 5' },
    { id: 6, name: 'الشيخ 6' },
    { id: 7, name: 'الشيخ 7' }
  ];
  audioUrl = '';
  surahList: SurahMeta[] = [];
  searchTerm = '';
  drawerOpen = false;
  lastRead: LastRead | null = null;
  loading = true;
  error = '';
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
    return found?.name || `سورة رقم ${this.surahNumber}`;
  }

  get currentReciterName(): string {
    return this.reciters.find((r) => r.id === this.reciterId)?.name || `الشيخ ${this.reciterId}`;
  }

  loadAudio(): void {
    this.loading = true;
    this.error = '';
    this.audioUrl = '';
    if (OFFLINE_MODE) {
      this.audioUrl = `${AUDIO_BASE}/${this.reciterId}/${padSurah(this.surahNumber)}.mp3`;
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
          this.error = 'لم يتم العثور على ملف الصوت لهذه السورة.';
        }
      },
      error: () => {
        this.error = 'تعذر تحميل الصوت الآن.';
      },
      complete: () => {
        this.loading = false;
      }
    });
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
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
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
