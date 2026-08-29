window.UI = (() => {
  let dayCells = [];

  function makeDraggable(win) {
    const bar = win.querySelector('.window-titlebar');
    if (!bar) return;
    let sx = 0, sy = 0, drag = false;
    bar.addEventListener('mousedown', e => {
      if (e.target.classList.contains('win-close')) return;
      drag = true;
      sx = e.clientX - win.offsetLeft;
      sy = e.clientY - win.offsetTop;
      win.style.zIndex = 100;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      win.style.left = (e.clientX - sx) + 'px';
      win.style.top = (e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', () => drag = false);
  }

  function ensurePosition(id) {
    const win = document.getElementById(id);
    if (!win) return;
    if (win.style.left && win.style.left !== '') return;

    const game = document.getElementById('game');
    const gx = parseFloat(game.style.left) || 60;
    const gy = parseFloat(game.style.top) || 80;
    const gw = game.offsetWidth || 360;
    const gh = game.offsetHeight || 400;

    const pos = {
      compat:   { x: gx + gw + 20, y: gy },
      calendar: { x: gx, y: gy + gh + 20 },
      items:    { x: gx + gw + 20, y: gy + gh + 20 },
      music:    { x: Math.max(90, gx - 340), y: gy }
    };
    if (pos[id]) {
      win.style.left = pos[id].x + 'px';
      win.style.top = pos[id].y + 'px';
    }
  }

  function init() {
    ['game', 'compat', 'calendar', 'items', 'music', 'punish', 'gameover'].forEach(id => {
      const el = document.getElementById(id);
      if (el) makeDraggable(el);
    });

    // 桌面图标：打开窗口
    document.querySelectorAll('.desk-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        const id = icon.dataset.target;
        const win = document.getElementById(id);
        if (!win) return;
        ensurePosition(id);
        win.style.display = 'block';
        win.style.zIndex = 100;
      });
    });

    // 关闭按钮：扫雷窗口不可关闭
    document.querySelectorAll('.win-close').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const win = btn.closest('.window');
        if (!win) return;
        if (win.id === 'game') return;
        win.style.display = 'none';
      });
    });

    // 点击窗口置顶
    document.querySelectorAll('.window').forEach(w => {
      w.addEventListener('mousedown', () => w.style.zIndex = 100);
    });

    // 初始化扫雷窗口位置
    const game = document.getElementById('game');
    game.style.left = Math.max(90, (innerWidth - game.offsetWidth) / 2) + 'px';
    game.style.top = Math.max(80, (innerHeight - game.offsetHeight) / 2) + 'px';
    game.style.display = 'block';

    buildCalendar();
  }

  function updateStress(v) {
    v = Math.max(0, Math.min(100, v));
    document.getElementById('bar-stress').style.width = v + '%';
    document.getElementById('val-stress').textContent = Math.round(v);
  }

  function updateDark(v) {
    v = Math.max(0, Math.min(100, v));
    document.getElementById('bar-dark').style.width = v + '%';
    document.getElementById('val-dark').textContent = Math.round(v);
  }

  function updateGameTime(secLeft) {
    const elapsed = CONFIG.LEVEL_TIME - secLeft;
    const hours = Math.floor(elapsed / 10);
    const minutes = Math.floor((elapsed % 10) * 6);
    const clock = document.getElementById('clock');
    if (clock) {
      clock.textContent = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    }
  }

  function buildCalendar() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    ['日','一','二','三','四','五','六'].forEach(l => {
      const d = document.createElement('div');
      d.className = 'day-label';
      d.textContent = l;
      grid.appendChild(d);
    });
    const firstDay = new Date(2000, CONFIG.CAL_MONTH - 1, 1).getDay();
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= CONFIG.CAL_DAYS; d++) {
      const el = document.createElement('div');
      el.className = 'day';
      el.textContent = d;
      grid.appendChild(el);
      dayCells.push(el);
    }
  }

  function updateCalendarDay(day) {
    dayCells.forEach((el, i) => el.classList.toggle('active', i + 1 === day));
  }

  return { init, updateStress, updateDark, updateGameTime, updateCalendarDay };
})();
