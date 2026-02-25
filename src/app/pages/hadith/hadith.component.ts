import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type HadithItem = {
  number?: number;
  arab?: string;
  id?: string;
};

type HadithBook = {
  id: string;
  name: string;
  available?: number;
};

@Component({
  selector: 'app-hadith',
  standalone: false,
  templateUrl: './hadith.component.html',
  styleUrl: './hadith.component.css'
})
export class HadithComponent implements OnInit {
  collections: HadithBook[] = [];

  selectedCollection = 'bukhari';
  page = 1;
  limit = 10;
  totalPages = 0;
  loading = false;
  error = '';
  hadiths: HadithItem[] = [];
  hadithNumber = '';
  singleHadith: HadithItem | null = null;
  private readonly nameMap: Record<string, string> = {
    'bukhari': 'صحيح البخاري',
    'muslim': 'صحيح مسلم',
    'tirmidzi': 'سنن الترمذي',
    'abu-daud': 'سنن أبي داود',
    'nasai': 'سنن النسائي',
    'ibnu-majah': 'سنن ابن ماجه',
    'malik': 'موطأ مالك',
    'ahmad': 'مسند أحمد',
    'darimi': 'سنن الدارمي'
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchBooks();
  }

  fetchBooks(): void {
    this.loading = true;
    this.error = '';
    this.http.get<any>('/api/hadith/books').subscribe({
      next: (res) => {
        const list = res?.data ?? res ?? [];
        this.collections = Array.isArray(list)
          ? list.map((b: any) => ({
              id: b.id,
              name: this.nameMap[b.id] || b.name || b.id,
              available: b.available
            }))
          : [];
        if (!this.collections.find((c) => c.id === this.selectedCollection)) {
          this.selectedCollection = this.collections[0]?.id || 'bukhari';
        }
        this.fetchHadiths();
        this.hadithNumber = '1';
        this.fetchSingle();
      },
      error: () => {
        this.error = 'تعذر تحميل كتب الحديث.';
        this.loading = false;
      }
    });
  }

  fetchHadiths(): void {
    this.loading = true;
    this.error = '';
    this.singleHadith = null;
    const safeLimit = Math.min(Math.max(this.limit, 5), 50);
    this.limit = safeLimit;
    const start = (this.page - 1) * safeLimit + 1;
    const end = start + safeLimit - 1;
    const url = `/api/hadith/books/${this.selectedCollection}?range=${start}-${end}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const list = res?.data?.contents ?? res?.contents ?? [];
        this.hadiths = Array.isArray(list) ? list : [];
        this.totalPages = 0;
      },
      error: () => {
        this.error = 'تعذر تحميل الأحاديث الآن.';
        this.hadiths = [];
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  changeCollection(value: string): void {
    this.selectedCollection = value;
    this.page = 1;
    this.fetchHadiths();
  }

  goToPage(delta: number): void {
    const next = this.page + delta;
    if (next < 1) return;
    this.page = next;
    this.fetchHadiths();
  }

  fetchSingle(): void {
    const num = Number(this.hadithNumber);
    if (!Number.isFinite(num) || num <= 0) {
      this.error = 'ادخلي رقم حديث صحيح.';
      return;
    }
    this.loading = true;
    this.error = '';
    const url = `/api/hadith/books/${this.selectedCollection}/${num}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const item = res?.data?.contents || res?.contents || res?.data || res || {};
        this.singleHadith = {
          number: item.number || num,
          arab: item.arab || item.text || '',
          id: item.id || ''
        };
      },
      error: () => {
        this.error = 'تعذر تحميل الحديث.';
        this.singleHadith = null;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
