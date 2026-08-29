(() => {
  const screen = document.getElementById('loading-screen');
  const bar = document.getElementById('loading-bar');
  const fill = document.getElementById('loading-fill');
  const hint = document.getElementById('loading-hint');

  const IMG_SRC = 'assets/images/loadingscreen.jpg';
  const MIN_LOAD_MS = 5000;   // 总时长5秒
  const STOP_AT = 0.98;       // 在98%处停住

  const img = new Image();
  img.src = IMG_SRC;

  // 进度条对准背景凹槽
  function positionBar() {
    if (!img.width || !img.height) return;
    const iw = img.width, ih = img.height;
    const vw = innerWidth, vh = innerHeight;
    const scale = Math.min(vw / iw, vh / ih);
    const w = iw * scale, h = ih * scale;
    const x = (vw - w) / 2, y = (vh - h) / 2;

    const cx = x + w * 0.50;
    const cy = y + h * 0.78;
    const barW = w * 0.16;
    const barH = h * 0.025;

    bar.style.left = cx + 'px';
    bar.style.top = cy + 'px';
    bar.style.width = barW + 'px';
    bar.style.height = barH + 'px';
    bar.style.transform = 'translate(-50%, -50%)';
    hint.style.left = cx + 'px';
    hint.style.top = (cy + barH / 2 + 12) + 'px';
  }

  img.onload = positionBar;
  img.onerror = positionBar;

  let waiting = false;

  // 完成加载，淡出界面
  function finish() {
    clearInterval(screen.__tick);
    screen.classList.add('done');
    setTimeout(() => { screen.style.display = 'none'; }, 1000);
  }

  // 点击任意处继续
  function continueLoad() {
    if (!waiting) return;
    waiting = false;
    hint.classList.add('hidden');
    screen.classList.remove('ready');

    AudioSys.playBoot();  // 播放开机音乐

    fill.style.width = '100%';
    setTimeout(() => {
      screen.classList.add('dim');           // 最后半秒变暗过渡
      setTimeout(finish, 300);
    }, 150);
  }

  // 自动加载到 98% 停住
  const startTime = performance.now();
  screen.__tick = setInterval(() => {
    const ratio = (performance.now() - startTime) / MIN_LOAD_MS;
    if (ratio >= STOP_AT) {
      fill.style.width = Math.round(STOP_AT * 100) + '%';
      clearInterval(screen.__tick);
      waiting = true;                        // 等待点击
      hint.classList.remove('hidden');
      screen.classList.add('ready');
      return;
    }
    fill.style.width = Math.round(ratio * 100) + '%';
  }, 50);

  // 监听点击
  screen.addEventListener('pointerdown', continueLoad);
  window.addEventListener('resize', positionBar);
})();
