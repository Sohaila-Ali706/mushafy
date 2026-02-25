import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  isDark = false;
  isMenuOpen = false;

  ngOnInit(): void {
    const stored = localStorage.getItem('theme');
    if (stored) {
      this.isDark = stored === 'dark';
    } else {
      this.isDark = true;
    }
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark', this.isDark);
  }
}
