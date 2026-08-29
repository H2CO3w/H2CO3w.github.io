window.MusicPlayer = (() => {
  let initialized = false;

  const titleEl = document.getElementById('music-title');
  const statusEl = document.getElementById('music-status');
  const progress = document.getElementById('music-progress');
  const currentTimeEl = document.getElementById('music-current-time');
  const durationEl = document.getElementById('music-duration');
  const previousBtn = document.getElementById('music-previous');
  const playBtn = document.getElementById('music-play');
  const nextBtn = document.getElementById('music-next');
  const volume = document.getElementById('music-volume');

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const remainder = whole % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function render(state) {
    titleEl.textContent = state.activeTitle;
    statusEl.textContent = state.isPlaying ? 'PLAYING' : 'PAUSED';

    progress.max = String(state.duration || 0);
    progress.value = String(Math.min(state.currentTime, state.duration || state.currentTime));
    progress.disabled = !state.track;
    currentTimeEl.textContent = formatTime(state.currentTime);
    durationEl.textContent = formatTime(state.duration);

    playBtn.textContent = state.isPlaying ? 'Ⅱ' : '▶';
    playBtn.title = state.isPlaying ? '暂停' : '播放';
    playBtn.setAttribute('aria-label', playBtn.title);
    previousBtn.disabled = state.trackCount < 2;
    nextBtn.disabled = state.trackCount < 2;
    volume.value = String(Math.round(state.volume * 100));
  }

  function init() {
    if (initialized) return;
    initialized = true;

    previousBtn.addEventListener('click', () => AudioSys.previous());
    playBtn.addEventListener('click', () => AudioSys.toggle());
    nextBtn.addEventListener('click', () => AudioSys.next());
    progress.addEventListener('input', () => AudioSys.seek(Number(progress.value)));
    volume.addEventListener('input', () => AudioSys.setVolume(Number(volume.value) / 100));
    AudioSys.subscribe(render);
  }

  return { init };
})();
