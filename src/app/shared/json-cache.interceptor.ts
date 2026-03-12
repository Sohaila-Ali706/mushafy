import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

@Injectable()
export class JsonCacheInterceptor implements HttpInterceptor {
  private readonly cacheName = 'mushafy-http-json-v1';

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.method !== 'GET' || req.responseType !== 'json' || !this.shouldCache(req.url)) {
      return next.handle(req);
    }
    if (!('caches' in window)) {
      return next.handle(req);
    }

    return from(this.getCached(req.url)).pipe(
      switchMap((cached) => {
        if (cached !== null) {
          return of(new HttpResponse({ body: cached, status: 200, url: req.url }));
        }
        return next.handle(req).pipe(
          tap((event) => {
            if (event instanceof HttpResponse) {
              this.putCache(req.url, event.body);
            }
          })
        );
      })
    );
  }

  private shouldCache(url: string): boolean {
    return (
      url.includes('/api/azkar') ||
      url.includes('/api/hadith') ||
      url.includes('quranenc.com') ||
      url.includes('api.alquran.cloud/v1/surah')
    );
  }

  private async getCached(url: string): Promise<any | null> {
    try {
      const cache = await caches.open(this.cacheName);
      const match = await cache.match(url);
      if (!match) return null;
      return await match.json();
    } catch {
      return null;
    }
  }

  private async putCache(url: string, body: any): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      const headers = new Headers({ 'Content-Type': 'application/json' });
      await cache.put(url, new Response(JSON.stringify(body ?? null), { headers }));
    } catch {
      // ignore cache write errors
    }
  }
}
