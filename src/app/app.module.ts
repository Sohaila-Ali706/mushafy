import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { QuranComponent } from './pages/quran/quran.component';
import { SurahTextComponent } from './pages/quran/surah-text/surah-text.component';
import { SurahAudioComponent } from './pages/quran/surah-audio/surah-audio.component';
import { TafsirComponent } from './pages/tafsir/tafsir.component';
import { TafsirSuraComponent } from './pages/tafsir/tafsir-sura/tafsir-sura.component';
import { HadithComponent } from './pages/hadith/hadith.component';
import { AdhkarComponent } from './pages/adhkar/adhkar.component';
import { TasbihComponent } from './pages/tasbih/tasbih.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    QuranComponent,
    SurahTextComponent,
    SurahAudioComponent,
    TafsirComponent,
    TafsirSuraComponent,
    HadithComponent,
    AdhkarComponent,
    TasbihComponent,
    NavbarComponent,
    FooterComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
