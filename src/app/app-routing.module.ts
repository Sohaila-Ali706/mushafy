import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { QuranComponent } from './pages/quran/quran.component';
import { SurahTextComponent } from './pages/quran/surah-text/surah-text.component';
import { SurahAudioComponent } from './pages/quran/surah-audio/surah-audio.component';
import { TafsirComponent } from './pages/tafsir/tafsir.component';
import { TafsirSuraComponent } from './pages/tafsir/tafsir-sura/tafsir-sura.component';
import { HadithComponent } from './pages/hadith/hadith.component';
import { AdhkarComponent } from './pages/adhkar/adhkar.component';
import { TasbihComponent } from './pages/tasbih/tasbih.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'quran', component: QuranComponent },
  { path: 'quran/text/:surahNumber', component: SurahTextComponent },
  { path: 'quran/audio/:surahNumber', component: SurahAudioComponent },
  { path: 'tafsir', component: TafsirComponent },
  { path: 'tafsir/:surahNumber', component: TafsirSuraComponent },
  { path: 'hadith', component: HadithComponent },
  { path: 'adhkar', component: AdhkarComponent },
  { path: 'tasbih', component: TasbihComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
