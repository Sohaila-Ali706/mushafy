import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type TimingsResponse = {
  data: {
    timings: Timings;
    date?: {
      readable?: string;
      hijri?: {
        day?: string;
        month?: { ar?: string };
        year?: string;
      };
    };
  };
};

type Timings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

type TimingsCache = {
  savedAt: string;
  timings: Timings;
  locationLabel?: string;
  hijriLabel?: string;
};

type AyahResponse = {
  data?: {
    text?: string;
    numberInSurah?: number;
    surah?: { name?: string };
  };
};

type VerseCache = {
  savedAt: string;
  text: string;
  source: string;
};

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  prayers: Prayer[] = [
    { name: 'الفجر', time: '--:--', rawTime: '--:--', icon: 'nights_stay' },
    { name: 'الشروق', time: '--:--', rawTime: '--:--', icon: 'wb_twilight' },
    { name: 'الظهر', time: '--:--', rawTime: '--:--', icon: 'light_mode', highlight: true },
    { name: 'العصر', time: '--:--', rawTime: '--:--', icon: 'wb_sunny' },
    { name: 'المغرب', time: '--:--', rawTime: '--:--', icon: 'sunset' },
    { name: 'العشاء', time: '--:--', rawTime: '--:--', icon: 'dark_mode' }
  ];

  mainCards: Card[] = [
    {
      title: 'المصحف الشريف',
      desc: 'تصميم المصحف بواجهات مختلفة مع خاصية البحث والتحفيظ.',
      icon: 'menu_book',
      link: '/quran'
    },
    {
      title: 'الأذكار',
      desc: 'أذكار الصباح والمساء، أذكار الصلاة، وأذكار المسلم اليومية.',
      icon: 'auto_awesome',
      link: '/adhkar'
    },
    {
      title: 'المسبحة الإلكترونية',
      desc: 'عداد تسبيح ذكي مع إمكانية حفظ الأعداد ومشاركتها.',
      icon: 'touch_app',
      link: '/tasbih'
    },
    {
      title: 'تفسير القرآن',
      desc: 'مكتبة شاملة لأشهر كتب التفسير مع الشرح المبسط.',
      icon: 'auto_stories',
      link: '/tafsir'
    },
    {
      title: 'الأحاديث النبوية',
      desc: 'مجموعة من الأحاديث مع إمكانية التصفح والبحث.',
      icon: 'library_books',
      link: '/hadith'
    }
  ];

  verse = {
    text: 'وبالوالدين إحسانًا',
    source: 'سورة الإسراء - آية 23'
  };

  city = 'Cairo';
  country = 'Egypt';
  method = 5;
  locationLabel = 'القاهرة، مصر';
  hijriLabel = 'اليوم';
  loadingTimings = false;
  timingError = '';
  showCityForm = false;
  nextPrayerLabel = '';
  nextPrayerTime = '';
  nextPrayerRawTime = '';
  countdown = '';
  private countdownTimer: number | undefined;
  private readonly cacheKey = 'mushafy_prayer_timings_v1';
  private readonly verseCacheKey = 'mushafy_daily_verse_v1';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.restoreCachedVerse();
    this.restoreCachedTimings();
    this.useGeolocation();
    this.loadDailyVerse();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
    }
  }

  toggleLocationPanel(): void {
    this.showCityForm = !this.showCityForm;
  }

  applyCity(): void {
    if (!this.city.trim() || !this.country.trim()) {
      this.timingError = 'اكتبي اسم المدينة والدولة أولًا.';
      return;
    }
    this.showCityForm = false;
    this.fetchByCity(this.city, this.country);
  }

  useCurrentLocation(): void {
    this.showCityForm = false;
    this.useGeolocation(true);
  }

  private useGeolocation(force = false): void {
    if (!navigator.geolocation) {
      this.fetchByCity(this.city, this.country);
      return;
    }

    if (!force && this.loadingTimings) return;

    this.loadingTimings = true;
    this.timingError = '';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.fetchByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        this.fetchByCity(this.city, this.country);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  private fetchByCity(city: string, country: string): void {
    this.loadingTimings = true;
    this.timingError = '';
    this.locationLabel = `${city}، ${country}`;
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(
      city
    )}&country=${encodeURIComponent(country)}&method=${this.method}`;
    this.http.get<TimingsResponse>(url).subscribe({
      next: (res) => this.updateFromResponse(res),
      error: () => {
        this.timingError = 'تعذر تحميل مواقيت الصلاة الآن.';
      },
      complete: () => {
        this.loadingTimings = false;
      }
    });
  }

  private fetchByCoords(lat: number, lng: number): void {
    this.loadingTimings = true;
    this.timingError = '';
    this.locationLabel = 'الموقع الحالي';
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${this.method}`;
    this.http.get<TimingsResponse>(url).subscribe({
      next: (res) => this.updateFromResponse(res),
      error: () => {
        this.timingError = 'تعذر تحميل مواقيت الصلاة الآن.';
      },
      complete: () => {
        this.loadingTimings = false;
      }
    });
  }

  private updateFromResponse(res: TimingsResponse): void {
    const timings = res?.data?.timings;
    if (!timings) return;
    const hijri = res?.data?.date?.hijri;
    if (hijri?.day && hijri?.month?.ar && hijri?.year) {
      this.hijriLabel = `${hijri.day} ${hijri.month.ar} ${hijri.year}`;
    } else if (res?.data?.date?.readable) {
      this.hijriLabel = res.data.date.readable;
    }

    const fajr = this.cleanTime(timings.Fajr);
    const sunrise = this.cleanTime(timings.Sunrise);
    const dhuhr = this.cleanTime(timings.Dhuhr);
    const asr = this.cleanTime(timings.Asr);
    const maghrib = this.cleanTime(timings.Maghrib);
    const isha = this.cleanTime(timings.Isha);
    this.prayers = [
      { name: 'الفجر', time: this.formatTime(fajr), rawTime: fajr, icon: 'nights_stay' },
      { name: 'الشروق', time: this.formatTime(sunrise), rawTime: sunrise, icon: 'wb_twilight' },
      { name: 'الظهر', time: this.formatTime(dhuhr), rawTime: dhuhr, icon: 'light_mode' },
      { name: 'العصر', time: this.formatTime(asr), rawTime: asr, icon: 'wb_sunny' },
      { name: 'المغرب', time: this.formatTime(maghrib), rawTime: maghrib, icon: 'sunset' },
      { name: 'العشاء', time: this.formatTime(isha), rawTime: isha, icon: 'dark_mode' }
    ];

    this.setHighlight();
    this.updateCountdown();
    this.startCountdownTimer();
    this.saveCache(timings);
  }

  private cleanTime(value: string): string {
    if (!value) return '--:--';
    return value.split(' ')[0];
  }

  private setHighlight(): void {
    const now = new Date();
    const times = this.prayers.map((p) => this.parseTime(p.rawTime));
    let index = times.findIndex((t) => t && t > now);
    if (index === -1) index = 0;
    this.prayers = this.prayers.map((p, i) => ({ ...p, highlight: i === index }));
    const nextPrayer = this.prayers[index];
    this.nextPrayerLabel = nextPrayer?.name || '';
    this.nextPrayerTime = nextPrayer?.time || '';
    this.nextPrayerRawTime = nextPrayer?.rawTime || '';
  }

  private parseTime(value: string): Date | null {
    const clean = value.split(' ')[0];
    const [h, m] = clean.split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  private to12Hour(value: string): string {
    const [hRaw, mRaw] = value.split(':');
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
    const period = h >= 12 ? 'م' : 'ص';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  private updateCountdown(): void {
    if (!this.nextPrayerRawTime) {
      this.countdown = '';
      return;
    }
    let target = this.parseTime(this.nextPrayerRawTime);
    if (!target) {
      this.countdown = '';
      return;
    }
    const now = new Date();
    if (target <= now) {
      this.setHighlight();
      target = this.parseTime(this.nextPrayerRawTime);
      if (!target) {
        this.countdown = '';
        return;
      }
    }
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) {
      this.countdown = '00:00:00';
      return;
    }
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    this.countdown = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private startCountdownTimer(): void {
    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
    }
    this.countdownTimer = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private formatTime(value: string): string {
    return this.to12Hour(value);
  }

  private loadDailyVerse(): void {
    const today = new Date().toDateString();
    try {
      const cached = localStorage.getItem(this.verseCacheKey);
      if (cached) {
        const parsed: VerseCache = JSON.parse(cached);
        if (parsed?.savedAt === today && parsed.text) {
          this.verse = { text: parsed.text, source: parsed.source };
          return;
        }
      }
    } catch {
      // ignore cache errors
    }

    const randomAyah = Math.floor(Math.random() * 6236) + 1;
    this.http.get<AyahResponse>(`https://api.alquran.cloud/v1/ayah/${randomAyah}`).subscribe({
      next: (res) => {
        const data = res?.data;
        if (!data?.text) return;
        const surahName = data.surah?.name || '';
        const ayahNumber = data.numberInSurah ? `آية ${data.numberInSurah}` : '';
        const source = `سورة ${surahName}${ayahNumber ? ' - ' + ayahNumber : ''}`;
        this.verse = { text: data.text, source };
        const payload: VerseCache = {
          savedAt: today,
          text: data.text,
          source
        };
        try {
          localStorage.setItem(this.verseCacheKey, JSON.stringify(payload));
        } catch {
          // ignore cache errors
        }
      }
    });
  }

  async shareVerse(): Promise<void> {
    const title = 'آية اليوم';
    const text = `${this.verse.text}\n${this.verse.source}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore share errors
    }
  }

  private restoreCachedVerse(): void {
    const today = new Date().toDateString();
    try {
      const cached = localStorage.getItem(this.verseCacheKey);
      if (!cached) return;
      const parsed: VerseCache = JSON.parse(cached);
      if (parsed?.savedAt !== today) return;
      if (!parsed.text || !parsed.source) return;
      this.verse = { text: parsed.text, source: parsed.source };
    } catch {
      // ignore cache errors
    }
  }

  private saveCache(timings: Timings): void {
    const payload: TimingsCache = {
      savedAt: new Date().toDateString(),
      timings,
      locationLabel: this.locationLabel,
      hijriLabel: this.hijriLabel
    };
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(payload));
    } catch {
      // ignore caching errors
    }
  }

  private restoreCachedTimings(): void {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return;
      const parsed: TimingsCache = JSON.parse(raw);
      if (!parsed?.timings || parsed.savedAt !== new Date().toDateString()) return;
      if (parsed.locationLabel) this.locationLabel = parsed.locationLabel;
      if (parsed.hijriLabel) this.hijriLabel = parsed.hijriLabel;
      this.prayers = [
        {
          name: 'الفجر',
          time: this.formatTime(this.cleanTime(parsed.timings.Fajr)),
          rawTime: this.cleanTime(parsed.timings.Fajr),
          icon: 'nights_stay'
        },
        {
          name: 'الشروق',
          time: this.formatTime(this.cleanTime(parsed.timings.Sunrise)),
          rawTime: this.cleanTime(parsed.timings.Sunrise),
          icon: 'wb_twilight'
        },
        {
          name: 'الظهر',
          time: this.formatTime(this.cleanTime(parsed.timings.Dhuhr)),
          rawTime: this.cleanTime(parsed.timings.Dhuhr),
          icon: 'light_mode'
        },
        {
          name: 'العصر',
          time: this.formatTime(this.cleanTime(parsed.timings.Asr)),
          rawTime: this.cleanTime(parsed.timings.Asr),
          icon: 'wb_sunny'
        },
        {
          name: 'المغرب',
          time: this.formatTime(this.cleanTime(parsed.timings.Maghrib)),
          rawTime: this.cleanTime(parsed.timings.Maghrib),
          icon: 'sunset'
        },
        {
          name: 'العشاء',
          time: this.formatTime(this.cleanTime(parsed.timings.Isha)),
          rawTime: this.cleanTime(parsed.timings.Isha),
          icon: 'dark_mode'
        }
      ];
      this.setHighlight();
      this.updateCountdown();
      this.startCountdownTimer();
      this.loadingTimings = false;
    } catch {
      // ignore caching errors
    }
  }
}

type Prayer = {
  name: string;
  time: string;
  rawTime: string;
  icon: string;
  highlight?: boolean;
};

type Card = {
  title: string;
  desc: string;
  icon: string;
  wide?: boolean;
  tag?: string;
  link?: string;
};
