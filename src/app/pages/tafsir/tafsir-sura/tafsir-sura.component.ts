import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

type ApiResponse<T> = {
  data?: T;
  result?: T;
};

type TafsirAyah = {
  numberInSurah: number;
  text: string;
};

type TafsirEdition = {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
  type: string;
};

type SurahMeta = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
};

type LastTafsir = {
  surahNumber: number;
  tafsirKey?: string;
  tafsirTitle?: string;
};

@Component({
  selector: 'app-tafsir-sura',
  standalone: false,
  templateUrl: './tafsir-sura.component.html',
  styleUrl: './tafsir-sura.component.css'
})
export class TafsirSuraComponent implements OnInit, OnDestroy {
  surahNumber = 1;
  tafsirKey = '';
  tafsirTitle = '';
  ayahs: TafsirAyah[] = [];
  surahList: SurahMeta[] = [];
  tafsirEditions: TafsirEdition[] = [];
  searchTerm = '';
  drawerOpen = false;
  lastRead: LastTafsir | null = null;
  loading = true;
  error = '';
  private readonly progressKey = 'mushafy_tafsir_progress';
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
      const routeKey = this.route.snapshot.queryParamMap.get('t') || '';
      const stored = localStorage.getItem('tafsir_key') || '';
      this.tafsirKey = routeKey || stored || '';
      this.fetchEditionsAndLoad();
    });
    this.loadLastRead();
    this.fetchSurahList();
  }

  fetchEditionsAndLoad(): void {
    const url = 'https://api.alquran.cloud/v1/edition?format=text&type=tafsir&language=ar';
    this.http.get<ApiResponse<TafsirEdition[]>>(url).subscribe({
      next: (res: any) => {
        const list: TafsirEdition[] = res?.data ?? [];
        this.tafsirEditions = list;
        if (!list.length) {
          this.error = 'لا توجد نسخة تفسير عربية متاحة حاليًا.';
          this.loading = false;
          return;
        }
        const match = list.find((t) => t.identifier === this.tafsirKey);
        const pick = match || list[0];
        this.tafsirKey = pick.identifier;
        this.tafsirTitle = pick.name || pick.englishName;
        localStorage.setItem('tafsir_key', this.tafsirKey);
        this.fetchTafsir();
      },
      error: () => {
        this.error = 'تعذر تحميل قائمة التفاسير.';
        this.loading = false;
      }
    });
  }

  fetchTafsir(): void {
    if (!this.tafsirKey) {
      this.error = 'لم يتم تحديد نسخة تفسير.';
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = '';
    const url = `https://api.alquran.cloud/v1/surah/${this.surahNumber}/${this.tafsirKey}`;
    this.http.get<ApiResponse<any>>(url).subscribe({
      next: (res) => {
        this.ayahs = res?.data?.ayahs ?? [];
        this.saveLastRead();
      },
      error: () => {
        this.error = 'تعذر تحميل التفسير الآن.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
        this.restoreScroll();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  updateEdition(value: string): void {
    if (!value) return;
    this.tafsirKey = value;
    const match = this.tafsirEditions.find((t) => t.identifier === value);
    this.tafsirTitle = match?.name || match?.englishName || this.tafsirTitle;
    localStorage.setItem('tafsir_key', value);
    this.fetchTafsir();
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
    const key = this.tafsirKey || localStorage.getItem('tafsir_key') || '';
    this.drawerOpen = false;
    this.router.navigate(['/tafsir', surah.number], { queryParams: { t: key } });
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

  resumeLastRead(): void {
    if (!this.lastRead?.surahNumber) return;
    const key = this.lastRead.tafsirKey || this.tafsirKey || localStorage.getItem('tafsir_key') || '';
    this.drawerOpen = false;
    this.router.navigate(['/tafsir', this.lastRead.surahNumber], { queryParams: { t: key } });
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
        savedAt: new Date().toISOString()
      };
      const key = `${this.progressKey}_${this.surahNumber}_${this.tafsirKey || 'default'}`;
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  private restoreScroll(): void {
    try {
      const key = `${this.progressKey}_${this.surahNumber}_${this.tafsirKey || 'default'}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const ayah = Number(parsed?.ayah ?? 0);
      const scrollY = Number(parsed?.scrollY ?? 0);
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
    const items = Array.from(document.querySelectorAll<HTMLElement>('.tafsir-item'));
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

  private saveLastRead(): void {
    try {
      const payload = {
        surahNumber: this.surahNumber,
        tafsirKey: this.tafsirKey,
        tafsirTitle: this.tafsirTitle,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('mushafy_last_tafsir_surah', JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }
}
