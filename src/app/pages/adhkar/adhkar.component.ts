import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type AdhkarCategory = {
  id: number | string;
  title: string;
  url?: string;
};

type AdhkarItem = {
  text: string;
  count?: string;
  reference?: string;
};

@Component({
  selector: 'app-adhkar',
  standalone: false,
  templateUrl: './adhkar.component.html',
  styleUrl: './adhkar.component.css'
})
export class AdhkarComponent implements OnInit {
  @ViewChild('adhkarContent') adhkarContent?: ElementRef<HTMLElement>;
  categories: AdhkarCategory[] = [];
  selectedCategory: AdhkarCategory | null = null;
  items: AdhkarItem[] = [];
  loading = false;
  error = '';
  listError = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchCategories();
  }

  fetchCategories(): void {
    const url = '/api/azkar/api/husn.json';
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const main = Array.isArray(res?.MAIN) ? res.MAIN : [];
        if (main.length) {
          const languages = main.map((c: any, idx: number) => ({
            id: c?.ID ?? idx + 1,
            title: c?.LANGUAGE || c?.title || `لغة ${idx + 1}`,
            url: c?.LANGUAGE_URL || c?.url
          }));
          const arabic = languages.find((c: AdhkarCategory) => c.title.includes('العربية')) || languages[0];
          const langUrl = arabic?.url || '/api/azkar/api/ar/husn_ar.json';
          this.fetchCategoryList(langUrl);
          return;
        }
        const languages = this.normalizeCategories(res);
        const arabic = languages.find((c) => c.title.includes('العربية')) || languages[0];
        const langUrl = arabic?.url || '/api/azkar/api/ar/husn_ar.json';
        this.fetchCategoryList(langUrl);
      },
      error: () => {
        this.listError = 'تعذر تحميل أقسام الأذكار الآن.';
      }
    });
  }

  fetchCategoryList(url: string): void {
    const proxied = this.toProxyUrl(url);
    this.http.get<any>(proxied).subscribe({
      next: (res) => {
        const list = this.parseCategoryList(res);
        this.categories = list;
        if (this.categories.length) {
          this.selectCategory(this.categories[0]);
        } else {
          this.listError = 'لم يتم العثور على أقسام للأذكار.';
        }
      },
      error: () => {
        this.listError = 'تعذر تحميل أقسام الأذكار الآن.';
      }
    });
  }

  parseCategoryList(res: any): AdhkarCategory[] {
    const array =
      (Array.isArray(res?.MAIN) && res.MAIN) ||
      (Array.isArray(res?.data) && res.data) ||
      (Array.isArray(res?.items) && res.items) ||
      (Array.isArray(res) && res) ||
      [];

    const mapped = array
      .map((item: any, idx: number) => {
        const title =
          item?.TITLE ||
          item?.title ||
          item?.Name ||
          item?.name ||
          item?.category ||
          item?.CATEGORY;
        const url = item?.TEXT || item?.text || item?.URL || item?.url;
        const id = this.extractIdFromUrl(url) || item?.ID || item?.id || idx + 1;
        if (!title) return null;
        return { id, title, url };
      })
      .filter(Boolean) as AdhkarCategory[];

    if (mapped.length) return mapped;

    const deep = this.deepExtractCategories(res);
    return deep;
  }

  deepExtractCategories(res: any): AdhkarCategory[] {
    const results: AdhkarCategory[] = [];
    const visit = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node !== 'object') return;

      const title =
        node?.TITLE ||
        node?.title ||
        node?.Name ||
        node?.name ||
        node?.category ||
        node?.CATEGORY;
      const url = node?.TEXT || node?.text || node?.URL || node?.url;
      if (title && url) {
        const id = this.extractIdFromUrl(url) || node?.ID || node?.id || results.length + 1;
        results.push({ id, title, url });
      }

      Object.values(node).forEach(visit);
    };

    visit(res);

    const unique: AdhkarCategory[] = [];
    const seen = new Set<string>();
    for (const item of results) {
      const key = `${item.id}-${item.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique;
  }

  normalizeCategories(res: any): AdhkarCategory[] {
    const pickTitle = (c: any, idx: number) =>
      c?.TITLE ||
      c?.Title ||
      c?.title ||
      c?.category ||
      c?.name ||
      c?.zekr ||
      c?.text ||
      `قسم ${idx + 1}`;

    const pickId = (c: any, idx: number) => {
      const urlId = this.extractIdFromUrl(c?.TEXT || c?.text || c?.URL || c?.url);
      return (
        c?.ID ??
        c?.id ??
        c?.category_id ??
        c?.categoryId ??
        c?.index ??
        urlId ??
        idx + 1
      );
    };

    if (Array.isArray(res)) {
      return res
        .map((c: any, idx: number) => ({
          id: pickId(c, idx),
          title: pickTitle(c, idx),
          url: c?.TEXT || c?.text || c?.URL || c?.url
        }))
        .filter((c: AdhkarCategory) => c.title);
    }

    const list =
      res?.data ??
      res?.categories ??
      res?.azkar ??
      res?.result ??
      res?.content ??
      res?.items ??
      this.extractFirstArray(res) ??
      [];
    if (Array.isArray(list)) {
      return list
        .map((c: any, idx: number) => ({
          id: pickId(c, idx),
          title: pickTitle(c, idx),
          url: c?.TEXT || c?.text || c?.URL || c?.url
        }))
        .filter((c: AdhkarCategory) => c.title);
    }

    if (res && typeof res === 'object') {
      const entries = Object.entries(res);
      const mapped = entries.map(([key, value], idx) => ({
        id: pickId(value, idx),
        title: (typeof value === 'string' && value) || key || `قسم ${idx + 1}`,
        url: (value && (value as any).TEXT) || (value && (value as any).URL) || undefined
      }));
      const filtered = mapped.filter((c) => c.title);
      return filtered;
    }

    return [];
  }

  selectCategory(category: AdhkarCategory): void {
    this.selectedCategory = category;
    this.fetchCategoryItems(category.id, category.url);
    this.scrollToContent();
  }

  fetchCategoryItems(id: number | string, url?: string): void {
    this.loading = true;
    this.error = '';
    const target = url ? this.toProxyUrl(url) : `/api/azkar/api/ar/${id}.json`;
    this.http.get<any>(target).subscribe({
      next: (res) => {
        const list =
          res?.MAIN ||
          res?.data ||
          res?.content ||
          res?.azkar ||
          res?.items ||
          res?.result ||
          res ||
          [];
        this.items = this.normalizeItems(list);
      },
      error: () => {
        this.error = 'تعذر تحميل الأذكار لهذا القسم.';
        this.items = [];
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  normalizeItems(list: any): AdhkarItem[] {
    if (Array.isArray(list)) {
      return list
        .map((item: any, idx: number) => ({
          text:
            item.ARABIC_TEXT ||
            item.text ||
            item.arabic ||
            item.zekr ||
            item.content ||
            item.description ||
            '',
          count:
            item.REPEAT?.toString() ||
            item.count?.toString() ||
            item.repeat?.toString() ||
            item.times?.toString() ||
            '',
          reference:
            item.REFERENCE ||
            item.reference ||
            item.source ||
            item.fadl ||
            item.benefit ||
            item.translation ||
            ''
        }))
        .filter((item: AdhkarItem) => item.text || item.reference)
        .map((item: AdhkarItem, i: number) => ({
          ...item,
          text: item.text || `ذكر رقم ${i + 1}`
        }));
    }

    if (list && typeof list === 'object') {
      const array = this.extractFirstArray(list) || [];
      if (Array.isArray(array) && array.length) {
        return this.normalizeItems(array);
      }
      const values = Object.values(list);
      if (values.length && Array.isArray(values[0])) {
        return this.normalizeItems(values[0]);
      }
      if (values.length && typeof values[0] === 'object') {
        return this.normalizeItems(values);
      }
    }

    return [];
  }

  toProxyUrl(url: string): string {
    if (url.startsWith('/api/azkar')) return url;
    if (url.startsWith('https://www.hisnmuslim.com')) {
      return url.replace('https://www.hisnmuslim.com', '/api/azkar');
    }
    if (url.startsWith('http://www.hisnmuslim.com')) {
      return url.replace('http://www.hisnmuslim.com', '/api/azkar');
    }
    return url;
  }

  extractFirstArray(res: any): any[] | null {
    if (!res || typeof res !== 'object') return null;
    for (const value of Object.values(res)) {
      if (Array.isArray(value)) return value;
    }
    return null;
  }

  extractIdFromUrl(url?: string): number | null {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/(\d+)\.json/);
    return match ? Number(match[1]) : null;
  }

  scrollToContent(): void {
    if (window.innerWidth > 900) return;
    setTimeout(() => {
      this.adhkarContent?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}
