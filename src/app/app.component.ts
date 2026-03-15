import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'mushafy';
  showScrollTop = false;
  private backHandler?: PluginListenerHandle;
  showExitToast = false;
  private lastBackPress = 0;
  private toastTimer?: number;

  constructor(private router: Router, private location: Location) {}

  ngOnInit(): void {
    if (!Capacitor.isNativePlatform()) return;
    this.backHandler = App.addListener('backButton', ({ canGoBack }) => {
      const atRoot = this.router.url === '/' || this.router.url === '';
      if (atRoot) {
        const now = Date.now();
        if (now - this.lastBackPress < 2000) {
          App.exitApp();
          return;
        }
        this.lastBackPress = now;
        this.showExitToastMessage();
        return;
      }

      if (canGoBack) {
        this.location.back();
      } else {
        this.router.navigateByUrl('/');
      }
    });
  }

  ngOnDestroy(): void {
    this.backHandler?.remove();
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    this.showScrollTop = y > 400;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private showExitToastMessage(): void {
    this.showExitToast = true;
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.showExitToast = false;
    }, 2000);
  }
}
