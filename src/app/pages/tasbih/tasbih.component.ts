import { Component, OnInit } from '@angular/core';

type TasbihItem = {
  id: number;
  title: string;
  text: string;
  target: number;
  note?: string;
};

@Component({
  selector: 'app-tasbih',
  standalone: false,
  templateUrl: './tasbih.component.html',
  styleUrl: './tasbih.component.css'
})
export class TasbihComponent implements OnInit {
  dhikrList: TasbihItem[] = [
    {
      id: 1,
      title: 'سُبْحَانَ اللَّهِ',
      text: 'سُبْحَانَ اللَّهِ',
      target: 33,
      note: 'يكتب له ألف حسنة أو يحط عنه ألف خطيئة.'
    },
    {
      id: 2,
      title: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      target: 33,
      note:
        'حُطَّتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ. لَمْ يَأْتِ أَحَدٌ يَوْمَ الْقِيَامَةِ بِأَفْضَلَ مِمَّا جَاءَ بِهِ إِلَّا أَحَدٌ قَالَ مِثْلَ مَا قَالَ أَوْ زَادَ عَلَيْهِ.'
    },
    {
      id: 3,
      title: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ',
      text: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ',
      target: 33,
      note: 'تَمْلَآَنِ مَا بَيْنَ السَّمَاوَاتِ وَالْأَرْضِ.'
    },
    {
      id: 4,
      title: 'سُبْحَانَ اللهِ العَظِيمِ وَبِحَمْدِهِ',
      text: 'سُبْحَانَ اللهِ العَظِيمِ وَبِحَمْدِهِ',
      target: 33,
      note: 'غرست له نخلة في الجنة (أى عدد).'
    },
    {
      id: 5,
      title: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
      text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
      target: 33,
      note: 'ثقيلتان في الميزان حبيبتان إلى الرحمن (أى عدد).'
    },
    {
      id: 6,
      title: 'لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      text: 'لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلُّ شَيْءِ قَدِيرِ.',
      target: 33,
      note:
        'كانت له عدل عشر رقاب، وكتبت له مئة حسنة، ومحيت عنه مئة سيئة، وكانت له حرزا من الشيطان.'
    },
    {
      id: 7,
      title: 'لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ',
      text: 'لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ',
      target: 33,
      note: 'كنز من كنوز الجنة (أى عدد).'
    },
    {
      id: 8,
      title: 'الْحَمْدُ للّهِ رَبِّ الْعَالَمِينَ',
      text: 'الْحَمْدُ للّهِ رَبِّ الْعَالَمِينَ',
      target: 33,
      note: 'تملأ ميزان العبد بالحسنات.'
    },
    {
      id: 9,
      title: 'اللَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد',
      text: 'اللَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد',
      target: 33,
      note: 'من صلى على حين يصبح وحين يمسى ادركته شفاعتى يوم القيامة.'
    },
    {
      id: 10,
      title: 'أستغفر الله',
      text: 'أستغفر الله',
      target: 33,
      note: 'لفعل الرسول صلى الله عليه وسلم.'
    },
    {
      id: 11,
      title: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
      text: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
      target: 33,
      note:
        'أنهن أحب الكلام الى الله، ومكفرات للذنوب، وغرس الجنة، وجنة لقائلهن من النار، وأحب الى النبي عليه السلام مما طلعت عليه الشمس، والْبَاقِيَاتُ الْصَّالِحَات.'
    },
    {
      id: 12,
      title: 'لَا إِلَهَ إِلَّا اللَّهُ',
      text: 'لَا إِلَهَ إِلَّا اللَّهُ',
      target: 33,
      note: 'أفضل الذكر لا إله إلاّ الله.'
    },
    {
      id: 13,
      title: 'اللَّهُ أَكْبَرُ',
      text: 'اللَّهُ أَكْبَرُ',
      target: 33,
      note: 'من قال الله أكبر كتبت له عشرون حسنة وحطت عنه عشرون سيئة. الله أكبر من كل شيء.'
    },
    {
      id: 14,
      title: 'سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلا إِلَهَ إِلا اللَّهُ ، وَاللَّهُ أَكْبَرُ',
      text:
        'سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلا إِلَهَ إِلا اللَّهُ ، وَاللَّهُ أَكْبَرُ ، اللَّهُمَّ اغْفِرْ لِي ، اللَّهُمَّ ارْحَمْنِي ، اللَّهُمَّ ارْزُقْنِي.',
      target: 33,
      note: 'خير الدنيا والآخرة.'
    },
    {
      id: 15,
      title: 'الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ',
      text: 'الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ.',
      target: 33,
      note:
        'قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ "لَقَدْ رَأَيْتُ اثْنَيْ عَشَرَ مَلَكًا يَبْتَدِرُونَهَا، أَيُّهُمْ يَرْفَعُهَا".'
    },
    {
      id: 16,
      title: 'اللَّهُ أَكْبَرُ كَبِيرًا',
      text:
        'اللَّهُ أَكْبَرُ كَبِيرًا ، وَالْحَمْدُ لِلَّهِ كَثِيرًا ، وَسُبْحَانَ اللَّهِ بُكْرَةً وَأَصِيلاً.',
      target: 33,
      note:
        'قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ "عَجِبْتُ لَهَا ، فُتِحَتْ لَهَا أَبْوَابُ السَّمَاءِ".'
    },
    {
      id: 17,
      title: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
      text:
        'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ , وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ , اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ.',
      target: 33,
      note:
        'في كل مره تحط عنه عشر خطايا ويرفع له عشر درجات ويصلي الله عليه عشرا وتعرض على الرسول صلى الله عليه وسلم (أى عدد).'
    }
  ];

  currentIndex = 0;
  count = 0;
  private readonly progressKey = 'mushafy_tasbih_progress_v1';

  ngOnInit(): void {
    this.restoreProgress();
  }

  get currentDhikr(): TasbihItem {
    return this.dhikrList[this.currentIndex];
  }

  increment(): void {
    const target = this.currentDhikr?.target || 0;
    if (!target) return;
    this.count += 1;
    this.saveProgress();
    if (this.count >= target) {
      this.next();
    }
  }

  next(): void {
    if (!this.dhikrList.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.dhikrList.length;
    this.count = 0;
    this.saveProgress();
  }

  prev(): void {
    if (!this.dhikrList.length) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.dhikrList.length) % this.dhikrList.length;
    this.count = 0;
    this.saveProgress();
  }

  reset(): void {
    this.count = 0;
    this.saveProgress();
  }

  private saveProgress(): void {
    try {
      const payload = {
        index: this.currentIndex,
        count: this.count,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.progressKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  private restoreProgress(): void {
    try {
      const raw = localStorage.getItem(this.progressKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const index = Number(parsed?.index ?? 0);
      const count = Number(parsed?.count ?? 0);
      if (Number.isFinite(index) && index >= 0 && index < this.dhikrList.length) {
        this.currentIndex = index;
      }
      if (Number.isFinite(count) && count >= 0) {
        this.count = count;
      }
    } catch {
      // ignore storage errors
    }
  }
}
