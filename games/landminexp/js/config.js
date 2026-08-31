window.CONFIG = {
  ROWS: 9,
  COLS: 9,
  MINES: 10,
  TILE: 40,
  LEVEL_TIME: 240,
  STRESS_MAX: 100,
  INIT_STRESS: 40,
  INIT_DARK: 0,
  INIT_LOVE: 0,
  CUT_REQUIRED: 8,
  CG_DELAY: 4000,
  PUNISH_DELAY: 800,
  CAL_MONTH: 6,
  CAL_DAYS: 30,
  MUSIC_TRACKS: [
    // 后续新增歌曲时，在此添加标题与音频路径即可。
    { id: 'up', title: 'UP', src: 'assets/audio/up.mp3' },
    { id: 'desktop-society', title: 'DESKTOP SOCIETY', src: 'assets/audio/desktop_society.mp3' },
    { id: 'internet-overdose', title: 'INTERNET OVERDOSE', src: 'assets/audio/internet_overdose.mp3' },
    { id: 'moon-rainbow-butterfly', title: 'MOON RAINBOW BUTTERFLY', src: 'assets/audio/moon_rainbow_butterfly.mp3' },
    { id: 'stay-at-home', title: 'STAY AT HOME', src: 'assets/audio/stay_at_home.mp3' }
  ],
  LEVELS: [
    // 第1关 - 第7关
    { rows: 9, cols: 9, mines: 6,  time: 240 },   // Lv1
    { rows: 9, cols: 9, mines: 8,  time: 240 },   // Lv2
    { rows: 9, cols: 9, mines: 10, time: 240 },   // Lv3
    { rows: 9, cols: 9, mines: 12, time: 240 },   // Lv4
    { rows: 9, cols: 16, mines: 20, time: 240 },  // Lv5
    { rows: 9, cols: 16, mines: 24, time: 240 },  // Lv6
    { rows: 16, cols: 16, mines: 40, time: 240 }, // Lv7

    // 第8关 - 第14关
    { rows: 16, cols: 16, mines: 45, time: 240 }, // Lv8
    { rows: 16, cols: 16, mines: 50, time: 240 }, // Lv9
    { rows: 16, cols: 20, mines: 60, time: 240 }, // Lv10
    { rows: 16, cols: 24, mines: 72, time: 240 }, // Lv11
    { rows: 16, cols: 24, mines: 80, time: 240 }, // Lv12
    { rows: 16, cols: 30, mines: 90, time: 240 }, // Lv13

    // 经典高级难度
    { rows: 16, cols: 30, mines: 99, time: 240 }  // Lv14
  ],
  ITEMS: {
    wine:  { name: '酒精', desc: '免疫下一次踩雷（模糊）' },
    smoke: { name: '烟',   desc: '暂停时间20秒（灰雾）' },
    drug:  { name: '愈美片', desc: '压力归零+无敌20秒' }
  }
};
