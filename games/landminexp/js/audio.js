// 音频管理：BGM切换 + 开机音乐 + WebAudio合成音效
window.AudioSys = (() => {
  const boot = new Audio('assets/audio/boot.mp3');   // 开机音乐
  boot.loop = false;                                 // 单次播放

  const up = new Audio('assets/audio/up.mp3');
  up.loop = true;
  const down = new Audio('assets/audio/down.mp3');
  down.loop = true;
  let musicOn = false;
  let ac = null;

  function ensureAc() {
    if (!ac) ac = new (AudioContext || webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  }

  function playBoot() {
    boot.currentTime = 0;
    const p = boot.play();
    if (p && p.catch) p.catch(() => {});
  }

  function startMusic() {
    if (!musicOn) {
      musicOn = true;
      up.currentTime = 0;
      up.play();
    }
  }

  function switchDown() {
    up.pause(); up.currentTime = 0;
    down.currentTime = 0;
    down.play();
  }

  function switchUp() {
    down.pause(); down.currentTime = 0;
    if (musicOn) { up.currentTime = 0; up.play(); }
  }

  function stopAll() {
    up.pause();
    up.currentTime = 0;
    down.pause();
    down.currentTime = 0;
    musicOn = false;
  }

  function playClick() {
    ensureAc();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(900, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.08);
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.1);
  }

  function playExplode() {
    ensureAc();
    const dur = 0.5, size = ac.sampleRate * dur | 0;
    const buf = ac.createBuffer(1, size, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/size, 2);
    const s = ac.createBufferSource(); s.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.6, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    s.connect(g).connect(ac.destination);
    s.start();
  }

  return {
    playBoot, startMusic, switchDown, switchUp, stopAll, playClick, playExplode,
    isMusicOn: () => musicOn
  };
})();
