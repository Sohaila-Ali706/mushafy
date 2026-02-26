import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

type ApiResponse<T> = {
  data: T;
};

type Ayah = {
  numberInSurah: number;
  text: string;
  page?: number;
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

type PageBlock = {
  page: number;
  ayahs: Ayah[];
};

@Component({
  selector: 'app-surah-text',
  standalone: false,
  templateUrl: './surah-text.component.html',
  styleUrl: './surah-text.component.css'
})
export class SurahTextComponent implements OnInit, OnDestroy {
  surahNumber = 1;
  surahName = '';
  ayahs: Ayah[] = [];
  pages: PageBlock[] = [];
  currentPageIndex = 0;
  surahList: SurahMeta[] = [];
  searchTerm = '';
  drawerOpen = false;
  lastRead: LastRead | null = null;
  loading = true;
  error = '';
  private readonly progressKey = 'mushafy_surah_text_progress';
  private scrollTimer: number | undefined;
  private navSub: any;
  private paramSub: any;

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
      this.fetchSurah();
    });
    this.loadLastRead();
    this.fetchSurahList();
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

  fetchSurah(): void {
    this.loading = true;
    this.error = '';
    this.http.get<ApiResponse<SurahData>>(`https://api.alquran.cloud/v1/surah/${this.surahNumber}`).subscribe({
      next: (res) => {
        const data = res?.data;
        this.surahName = data?.name ?? '';
        this.ayahs = data?.ayahs ?? [];
        this.buildPages();
        this.saveLastRead();
      },
      error: () => {
        this.error = 'تعذر تحميل نص السورة الآن.';
      },
      complete: () => {
        this.loading = false;
        this.restoreScroll();
      }
    });
  }

  private buildPages(): void {
    const hasPage = this.ayahs.some((a) => Number.isFinite(a.page || 0) && (a.page || 0) > 0);
    if (hasPage) {
      const map = new Map<number, Ayah[]>();
      for (const ayah of this.ayahs) {
        const page = ayah.page || 0;
        if (!map.has(page)) map.set(page, []);
        map.get(page)!.push(ayah);
      }
      this.pages = Array.from(map.entries())
        .filter(([page]) => page > 0)
        .sort((a, b) => a[0] - b[0])
        .map(([page, ayahs]) => ({ page, ayahs }));
    } else {
      const chunkSize = 10;
      const pages: PageBlock[] = [];
      for (let i = 0; i < this.ayahs.length; i += chunkSize) {
        pages.push({
          page: Math.floor(i / chunkSize) + 1,
          ayahs: this.ayahs.slice(i, i + chunkSize)
        });
      }
      this.pages = pages;
    }
    this.currentPageIndex = 0;
  }

  fetchSurahList(): void {
    this.http.get<ApiResponse<SurahMeta[]>>('https://api.alquran.cloud/v1/surah').subscribe({
      next: (res) => {
        this.surahList = res?.data ?? [];
      },
      error: () => {
        this.surahList = [];
      }
    });
  }

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  goToSurah(surah: SurahMeta): void {
    this.drawerOpen = false;
    this.router.navigate(['/quran/text', surah.number]);
  }

  goToAudio(): void {
    this.drawerOpen = false;
    this.router.navigate(['/quran/audio', this.surahNumber]);
  }

  resumeLastRead(): void {
    if (!this.lastRead?.surahNumber) return;
    this.drawerOpen = false;
    this.router.navigate(['/quran/text', this.lastRead.surahNumber]);
  }

  get currentPage(): PageBlock | null {
    return this.pages[this.currentPageIndex] || null;
  }

  goNextPage(): void {
    if (this.currentPageIndex >= this.pages.length - 1) return;
    this.currentPageIndex += 1;
    this.scrollToTop();
    this.saveScroll();
  }

  goPrevPage(): void {
    if (this.currentPageIndex <= 0) return;
    this.currentPageIndex -= 1;
    this.scrollToTop();
    this.saveScroll();
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (currentAyah <= 0) return;
      const payload = {
        scrollY: window.scrollY,
        ayah: currentAyah,
        pageIndex: this.currentPageIndex,
        pageNumber: this.pages[this.currentPageIndex]?.page ?? null,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`${this.progressKey}_${this.surahNumber}`, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  private restoreScroll(): void {
    try {
      const raw = localStorage.getItem(`${this.progressKey}_${this.surahNumber}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const ayah = Number(parsed?.ayah ?? 0);
      const scrollY = Number(parsed?.scrollY ?? 0);
      const pageIndex = Number(parsed?.pageIndex ?? -1);
      if (Number.isFinite(pageIndex) && pageIndex >= 0 && pageIndex < this.pages.length) {
        this.currentPageIndex = pageIndex;
      } else if (Number.isFinite(ayah) && ayah > 0) {
        const foundIndex = this.pages.findIndex((p) => p.ayahs.some((a) => a.numberInSurah === ayah));
        if (foundIndex >= 0) this.currentPageIndex = foundIndex;
      }
      const attemptScroll = (triesLeft: number) => {
        if (Number.isFinite(ayah) && ayah > 0) {
          const target = document.getElementById(`ayah-${ayah}`);
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

  private findCurrentAyah(): number {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.ayah'));
    if (!items.length) return 0;
    const offset = 120;
    let current = 1;
    for (const item of items) {
      const top = item.getBoundingClientRect().top;
      if (top - offset <= 0) {
        const value = Number(item.dataset['ayah'] || '0');
        if (Number.isFinite(value) && value > 0) {
          current = value;
        }
      } else {
        break;
      }
    }
    return current;
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

  private saveLastRead(): void {
    try {
      const payload = {
        surahNumber: this.surahNumber,
        surahName: this.surahName,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('mushafy_last_quran_surah', JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }
}
