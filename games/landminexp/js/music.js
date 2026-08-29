window.MusicPlayer = (() => {
  let initialized = false;

  const titleEl = document.getElementById('music-title');
  const statusEl = document.getElementById('music-status');
  const trackSelect = document.getElementById('music-track-select');
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

  function buildTrackOptions(tracks) {
    trackSelect.innerHTML = '';
    tracks.forEach((track, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = track.title;
      trackSelect.appendChild(option);
    });
  }

  function render(state) {
    if (trackSelect.options.length !== state.trackCount) buildTrackOptions(state.tracks);
    titleEl.textContent = state.activeTitle;
    statusEl.textContent = state.isPlaying ? 'PLAYING' : 'PAUSED';
    trackSelect.value = String(state.currentIndex);
    trackSelect.disabled = state.trackCount === 0;

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
    trackSelect.addEventListener('change', () => AudioSys.selectTrack(Number(trackSelect.value)));
    progress.addEventListener('input', () => AudioSys.seek(Number(progress.value)));
    volume.addEventListener('input', () => AudioSys.setVolume(Number(volume.value) / 100));
    AudioSys.subscribe(render);
  }

  return { init };
})();
