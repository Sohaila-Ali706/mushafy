import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

type ApiResponse<T> = {
  data: T;
};

type Surah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

type LastRead = {
  surahNumber: number;
  surahName?: string;
};

@Component({
  selector: 'app-quran',
  standalone: false,
  templateUrl: './quran.component.html',
  styleUrl: './quran.component.css'
})
export class QuranComponent implements OnInit {
  surahs: Surah[] = [];
  searchTerm = '';
  loading = true;
  error = '';
  showModal = false;
  selectedSurah: Surah | null = null;
  lastRead: LastRead | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadLastRead();
    const target = this.lastRead?.surahNumber || 1;
    this.router.navigate(['/quran/text', target]);
  }

  fetchSurahs(): void {
    this.loading = true;
    this.error = '';
    this.http.get<ApiResponse<Surah[]>>('https://api.alquran.cloud/v1/surah').subscribe({
      next: (res) => {
        this.surahs = res?.data ?? [];
      },
      error: () => {
        this.error = 'تعذر تحميل فهرس السور الآن، جرّب مرة أخرى.';
      },
      complete: () => {
        this.loading = false;
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
      const matchEnglish =
        s.englishName?.toLowerCase().includes(lower) ||
        s.englishNameTranslation?.toLowerCase().includes(lower);
      return matchNumber || matchArabic || matchEnglish;
    });
  }

  openModal(surah: Surah): void {
    this.selectedSurah = surah;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedSurah = null;
  }

  goToText(): void {
    if (!this.selectedSurah) return;
    this.router.navigate(['/quran/text', this.selectedSurah.number]);
    this.closeModal();
  }

  goToAudio(): void {
    if (!this.selectedSurah) return;
    this.router.navigate(['/quran/audio', this.selectedSurah.number]);
    this.closeModal();
  }

  formatSurahTitle(name?: string): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.replace(/^سورة\s+/i, '').replace(/^سُورَةُ\s+/i, '').trim();
  }

  resumeLastRead(): void {
    if (!this.lastRead?.surahNumber) return;
    this.router.navigate(['/quran/text', this.lastRead.surahNumber]);
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
