import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

type ApiResponse<T> = {
  data?: T;
  result?: T;
};

type Surah = {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
};

type TafsirEdition = {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
  type: string;
};

type LastTafsir = {
  surahNumber: number;
  tafsirKey?: string;
  tafsirTitle?: string;
};

@Component({
  selector: 'app-tafsir',
  standalone: false,
  templateUrl: './tafsir.component.html',
  styleUrl: './tafsir.component.css'
})
export class TafsirComponent implements OnInit {
  surahs: Surah[] = [];
  translations: TafsirEdition[] = [];
  selectedKey = '';
  searchTerm = '';
  loading = true;
  error = '';
  lastRead: LastTafsir | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadLastRead();
    const target = this.lastRead?.surahNumber || 1;
    const key = this.lastRead?.tafsirKey || localStorage.getItem('tafsir_key') || '';
    this.router.navigate(['/tafsir', target], {
      queryParams: key ? { t: key } : {}
    });
  }

  fetchSurahs(): void {
    this.http.get<ApiResponse<Surah[]>>('https://api.alquran.cloud/v1/surah').subscribe({
      next: (res) => {
        this.surahs = res?.data ?? [];
      },
      error: () => {
        this.error = 'تعذر تحميل فهرس السور الآن.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  fetchTranslations(): void {
    const url = 'https://api.alquran.cloud/v1/edition?format=text&type=tafsir&language=ar';
    this.http.get<ApiResponse<TafsirEdition[]>>(url).subscribe({
      next: (res: any) => {
        const list: TafsirEdition[] = res?.data ?? [];
        this.translations = list;
        const stored = localStorage.getItem('tafsir_key') || '';
        const storedMatch = list.find((t) => t.identifier === stored);
        const pick = storedMatch || list[0];
        this.selectedKey = pick?.identifier || '';
        if (this.selectedKey) {
          localStorage.setItem('tafsir_key', this.selectedKey);
        }
      },
      error: () => {
        this.translations = [];
        this.selectedKey = '';
      }
    });
  }

  get filteredSurahs(): Surah[] {
    const term = this.searchTerm.trim();
    if (!term) return this.surahs;
    const lower = term.toLowerCase();
    const number = Number(term);
    const normalized = this.normalizeArabic(term);
    return this.surahs.filter((s) => {
      const matchNumber = Number.isFinite(number) && s.number === number;
      const matchArabic = this.normalizeArabic(s.name || '').includes(normalized);
      const matchEnglish = s.englishName?.toLowerCase().includes(lower);
      return matchNumber || matchArabic || matchEnglish;
    });
  }

  openSurah(surah: Surah): void {
    const key = this.selectedKey || localStorage.getItem('tafsir_key') || '';
    this.router.navigate(['/tafsir', surah.number], { queryParams: { t: key } });
  }

  updateKey(value: string): void {
    this.selectedKey = value;
    localStorage.setItem('tafsir_key', value);
  }

  resumeLastRead(): void {
    if (!this.lastRead?.surahNumber) return;
    const key = this.lastRead.tafsirKey || this.selectedKey || localStorage.getItem('tafsir_key') || '';
    this.router.navigate(['/tafsir', this.lastRead.surahNumber], { queryParams: { t: key } });
  }

  private loadLastRead(): void {
    try {
      const raw = localStorage.getItem('mushafy_last_tafsir_surah');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const num = Number(parsed?.surahNumber ?? 0);
      if (!Number.isFinite(num) || num <= 0) return;
      this.lastRead = {
        surahNumber: num,
        tafsirKey: parsed?.tafsirKey || '',
        tafsirTitle: parsed?.tafsirTitle || ''
      };
    } catch {
      // ignore storage errors
    }
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
}
