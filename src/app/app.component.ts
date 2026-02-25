import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'mushafy';
  showScrollTop = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    this.showScrollTop = y > 400;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
