// 音频管理：播放器只控制 BGM；事件音乐、开机音乐与合成音效各自独立。
window.AudioSys = (() => {
  const tracks = Array.isArray(CONFIG.MUSIC_TRACKS) ? CONFIG.MUSIC_TRACKS.slice() : [];
  const boot = new Audio('assets/audio/boot.mp3');
  const music = new Audio();
  const down = new Audio('assets/audio/down.mp3');

  boot.loop = false;
  boot.preload = 'auto';
  music.preload = 'metadata';
  down.loop = true;
  down.preload = 'auto';

  let currentIndex = 0;
  let playbackWanted = false;
  let userPreferenceSet = false;
  let volume = 0.7;
  let ac = null;
  const listeners = new Set();

  music.volume = volume;
  down.volume = 0.7;

  function currentTrack() {
    return tracks[currentIndex] || null;
  }

  function publicTrack(track) {
    if (!track) return null;
    return { id: track.id, title: track.title, src: track.src };
  }

  function getState() {
    const track = currentTrack();
    return {
      tracks: tracks.map(publicTrack),
      track: publicTrack(track),
      trackCount: tracks.length,
      currentIndex,
      currentTime: Number.isFinite(music.currentTime) ? music.currentTime : 0,
      duration: Number.isFinite(music.duration) ? music.duration : 0,
      volume,
      activeTitle: track ? track.title : 'NO TRACK',
      playbackWanted,
      isPlaying: playbackWanted && !music.paused && !music.ended
    };
  }

  function notify() {
    const state = getState();
    listeners.forEach(listener => listener(state));
  }

  function safePlay(audio) {
    const promise = audio.play();
    if (promise && promise.catch) promise.catch(notify);
  }

  function loadCurrentTrack() {
    const track = currentTrack();
    if (!track) {
      music.removeAttribute('src');
      music.load();
      notify();
      return;
    }
    music.src = track.src;
    music.loop = tracks.length === 1;
    music.load();
    notify();
  }

  function selectTrack(index) {
    if (!tracks.length) return;
    const nextIndex = ((Number(index) || 0) % tracks.length + tracks.length) % tracks.length;
    music.pause();
    currentIndex = nextIndex;
    loadCurrentTrack();
    if (playbackWanted) safePlay(music);
    notify();
  }

  function play() {
    if (!tracks.length) return;
    userPreferenceSet = true;
    playbackWanted = true;
    safePlay(music);
    notify();
  }

  function pause() {
    userPreferenceSet = true;
    playbackWanted = false;
    music.pause();
    notify();
  }

  function toggle() {
    if (getState().isPlaying) pause();
    else play();
  }

  function next() {
    if (tracks.length) selectTrack(currentIndex + 1);
  }

  function previous() {
    if (tracks.length) selectTrack(currentIndex - 1);
  }

  function seek(seconds) {
    if (!tracks.length) return;
    const duration = Number.isFinite(music.duration) ? music.duration : 0;
    const limit = duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
    music.currentTime = Math.max(0, Math.min(limit, Number(seconds) || 0));
    notify();
  }

  function setVolume(nextVolume) {
    volume = Math.max(0, Math.min(1, Number(nextVolume) || 0));
    music.volume = volume;
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
  }

  // 第一次操作棋盘时沿用原逻辑自动开始；若玩家已主动暂停则尊重其选择。
  function startMusic() {
    if (!userPreferenceSet) playbackWanted = true;
    if (playbackWanted) safePlay(music);
    notify();
  }

  // 失败音乐由游戏流程独立控制，不读取或修改播放器的播放意图。
  function startFailureMusic() {
    music.pause();
    music.currentTime = 0;
    down.currentTime = 0;
    safePlay(down);
    notify();
  }

  function stopFailureMusic() {
    down.pause();
    down.currentTime = 0;
    if (playbackWanted && tracks.length) safePlay(music);
    notify();
  }

  function stopAll() {
    music.pause();
    music.currentTime = 0;
    down.pause();
    down.currentTime = 0;
    playbackWanted = false;
    userPreferenceSet = false;
    notify();
  }

  function playBoot() {
    boot.currentTime = 0;
    const promise = boot.play();
    if (promise && promise.catch) promise.catch(() => {});
  }

  function ensureAc() {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return null;
    if (!ac) ac = new AudioContextType();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function playClick() {
    if (!ensureAc()) return;
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
    if (!ensureAc()) return;
    const dur = 0.5, size = ac.sampleRate * dur | 0;
    const buf = ac.createBuffer(1, size, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, 2);
    const s = ac.createBufferSource(); s.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.6, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    s.connect(g).connect(ac.destination);
    s.start();
  }

  music.addEventListener('ended', () => {
    if (tracks.length > 1) next();
    else if (playbackWanted) {
      music.currentTime = 0;
      safePlay(music);
    }
  });
  ['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange']
    .forEach(event => music.addEventListener(event, notify));

  loadCurrentTrack();

  return {
    playBoot,
    startMusic,
    startFailureMusic,
    stopFailureMusic,
    stopAll,
    playClick,
    playExplode,
    play,
    pause,
    toggle,
    next,
    previous,
    selectTrack,
    seek,
    setVolume,
    subscribe,
    getState,
    isMusicOn: () => playbackWanted
  };
})();
