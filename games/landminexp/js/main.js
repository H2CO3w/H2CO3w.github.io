(() => {
  // ===== DOM 引用 =====
  const mineEl        = document.getElementById('mine-count');
  const timeEl        = document.getElementById('timer');
  const resetBtn      = document.getElementById('reset-btn');
  const resetImg      = document.getElementById('reset-img');
  const resetVid      = document.getElementById('reset-video');
  const failCG        = document.getElementById('failCG');
  const winCG         = document.getElementById('winCG');
  const winDayText    = document.getElementById('win-day-text');
  const punishWin     = document.getElementById('punish');
  const cutBtn        = document.getElementById('cut-btn');
  const redOverlay    = document.getElementById('red-overlay');
  const cgLock        = document.getElementById('cg-lock');
  const gameEl        = document.getElementById('game');
  const cv            = document.getElementById('board');
  const gameOverWin   = document.getElementById('gameover');
  const quitBtn       = document.getElementById('quit-btn');

  // 计时器与惩罚状态
  let sec = 0;
  let timer = null;
  let punishActive = false;
  let cutCount = 0;
  let punishTimer = null;
  let cgTransitionTimer = null;
  let cgLocked = false;

  function clearCGTransitionTimer() {
    if (cgTransitionTimer === null) return;
    clearTimeout(cgTransitionTimer);
    cgTransitionTimer = null;
  }

  function lockForCG() {
    cgLocked = true;
    resetBtn.disabled = true;
    cgLock.classList.remove('hidden');
  }

  function unlockAfterCG() {
    cgLocked = false;
    resetBtn.disabled = false;
    cgLock.classList.add('hidden');
  }

  function scheduleCG(callback, delay) {
    clearCGTransitionTimer();
    cgTransitionTimer = setTimeout(() => {
      cgTransitionTimer = null;
      callback();
    }, delay);
  }

  // ===== 渲染与 HUD =====
  function render() {
    Renderer.draw(MineBoard.getBoard(), MineBoard.getStats());
  }

  function updateHUD() {
    const s = MineBoard.getStats();
    mineEl.textContent = String(Math.max(0, s.M - s.flags)).padStart(3, '0');
    timeEl.textContent = String(sec).padStart(3, '0');
    UI.updateGameTime(sec);
    UI.updateCalendarDay(GameData.getCurrentDay());
  }

  // ===== 计时器 =====
  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      if (Items.tickSmoke()) return;
      sec--;
      if (sec <= 0) {
        sec = 0;
        clearInterval(timer); timer = null;
        timeEl.textContent = '000';
        UI.updateGameTime(0);
        MineBoard.fail();
        handleLose(-1, -1);
        return;
      }
      timeEl.textContent = String(sec).padStart(3, '0');
      UI.updateGameTime(sec);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  // ===== 失败流程 =====
  function handleLose(r, c) {
    stopTimer();
    AudioSys.playExplode();
    GameData.addStress(35);
    GameData.addDark(15);
    UI.updateStress(GameData.getStress());
    UI.updateDark(GameData.getDark());
    AudioSys.startFailureMusic();

    resetImg.style.display = 'none';
    resetVid.style.display = 'block';
    resetVid.src = 'assets/images/boom.mp4';
    resetVid.currentTime = 0;
    resetVid.play();

    gameEl.classList.add('shake');
    setTimeout(() => gameEl.classList.remove('shake'), 350);

    if (punishTimer) clearTimeout(punishTimer);

    if (GameData.getStress() >= CONFIG.STRESS_MAX) {
      lockForCG();
      scheduleCG(() => {
        failCG.classList.remove('hidden');
        CG.startFailCG();
      }, CONFIG.CG_DELAY);
    } else {
      punishTimer = setTimeout(openPunishWindow, CONFIG.PUNISH_DELAY);
    }
    updateHUD();
    render();
  }

  // ===== 胜利流程 =====
  function showGameOver() {
    gameOverWin.style.display = 'block';
    gameOverWin.style.left = Math.max(10, (innerWidth - gameOverWin.offsetWidth) / 2) + 'px';
    gameOverWin.style.top = Math.max(10, (innerHeight - gameOverWin.offsetHeight) / 2) + 'px';
    gameOverWin.style.zIndex = 600;
  }

  function handleWin() {
    stopTimer();
    resetImg.style.display = 'block';
    resetVid.style.display = 'none';
    resetVid.pause();
    resetImg.src = 'assets/images/amazed.png';

    GameData.addStress(-GameData.getCorrectFlags());
    UI.updateStress(GameData.getStress());

    const day = GameData.nextDay();
    UI.updateCalendarDay(day);
    winDayText.textContent = '已进入 6月' + day + '日';

    // 判断是否为最后一关（第14关）
    if (GameData.getCurrentLevel() === CONFIG.LEVELS.length - 1) {
      AudioSys.stopAll();  // 最终关卡停止全部游戏音频
      winCG.classList.add('hidden');

      // 关闭所有可关闭窗口
      document.getElementById('compat').style.display = 'none';
      document.getElementById('calendar').style.display = 'none';
      document.getElementById('items').style.display = 'none';
      document.getElementById('music').style.display = 'none';

      showGameOver();
      return;
    }

    lockForCG();
    scheduleCG(() => winCG.classList.remove('hidden'), 1000);
    updateHUD();
    render();
  }

  // ===== 惩罚窗口 =====
  function openPunishWindow() {
    punishActive = true;
    cutCount = 0;
    redOverlay.style.opacity = '0';
    punishWin.style.display = 'block';
    punishWin.style.left = Math.max(10, (innerWidth - punishWin.offsetWidth) / 2) + 'px';
    punishWin.style.top = Math.max(10, (innerHeight - punishWin.offsetHeight) / 2) + 'px';
    punishWin.style.zIndex = 300;
  }

  function closePunishWindow() {
    punishActive = false;
    punishWin.style.display = 'none';
    redOverlay.style.opacity = '0';
  }

  function cutAction() {
    if (!punishActive) return;
    cutCount++;
    redOverlay.style.opacity = (cutCount / CONFIG.CUT_REQUIRED).toFixed(2);
    AudioSys.playClick();
    if (cutCount >= CONFIG.CUT_REQUIRED) {
      closePunishWindow();
      AudioSys.stopFailureMusic();
      beginLevel();
    }
  }
  cutBtn.addEventListener('click', cutAction);

  // ===== 关卡流程 =====
  function beginLevel() {
    if (punishTimer) clearTimeout(punishTimer);
    clearCGTransitionTimer();
    unlockAfterCG();
    stopTimer();
    CG.clearFailCG();
    closePunishWindow();
    failCG.classList.add('hidden');
    winCG.classList.add('hidden');
    AudioSys.stopFailureMusic();

    resetImg.src = 'assets/images/normal.gif';
    resetImg.style.display = 'block';
    resetVid.pause();
    resetVid.currentTime = 0;
    resetVid.style.display = 'none';

    const cfg = GameData.getLevelConfig();
    sec = cfg.time;
    GameData.setCorrectFlags(0);
    MineBoard.init(cfg);
    Items.reset();
    Renderer.resize(cfg.cols, cfg.rows);
    updateHUD();
    render();
  }

  function resetAfterCG() {
    GameData.setStress(CONFIG.INIT_STRESS);
    GameData.setDark(0);
    UI.updateStress(GameData.getStress());
    UI.updateDark(GameData.getDark());
    beginLevel();
  }

  function nextLevel() {
    GameData.nextLevel();
    winCG.classList.add('hidden');
    beginLevel();
  }

  // ===== 画布事件 =====
  const getCell = e => {
    const rect = cv.getBoundingClientRect();
    return {
      c: (e.clientX - rect.left) / CONFIG.TILE | 0,
      r: (e.clientY - rect.top) / CONFIG.TILE | 0
    };
  };

  cv.addEventListener('mousedown', e => {
    e.preventDefault();
    AudioSys.startMusic();
    if (punishActive) return;
    if (sec <= 0) return;

    const { r, c } = getCell(e);
    const s = MineBoard.getStats();
    if (r < 0 || c < 0 || r >= s.R || c >= s.C) return;

    if (e.button === 0) {
      if (s.state !== 'waiting' && s.state !== 'playing') return;
      const cell = MineBoard.getBoard()[r][c];
      if (cell.o && cell.n > 0) MineBoard.chord(r, c);
      else MineBoard.open(r, c);
      updateHUD();
      render();
    } else if (e.button === 2) {
      MineBoard.flag(r, c);
      updateHUD();
      render();
    }
  });

  cv.addEventListener('contextmenu', e => e.preventDefault());

  // ===== 按钮事件 =====
  resetBtn.addEventListener('click', () => {
    if (!cgLocked) beginLevel();
  });
  document.getElementById('restart-fail').addEventListener('click', resetAfterCG);
  document.getElementById('restart-win').addEventListener('click', nextLevel);

  quitBtn.addEventListener('click', () => {
    AudioSys.stopAll();
    window.close();
    // 如果浏览器阻止关闭页面，显示替代提示
    setTimeout(() => {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:24px;color:#fff;">感谢游玩！现在可以安全关闭此页面。</div>';
    }, 500);
  });

  // ===== 初始化 =====
  UI.init();
  MusicPlayer.init();
  UI.updateStress(GameData.getStress());
  UI.updateDark(GameData.getDark());

  MineBoard.setCallbacks({
    onStart: startTimer,
    onDraw: () => { updateHUD(); render(); },
    onWin: handleWin,
    onLose: handleLose,
    onProtectedMine: () => Items.consumeProtection()
  });
  MineBoard.setProtectCheck(() => Items.hasProtection());

  beginLevel();

})();
