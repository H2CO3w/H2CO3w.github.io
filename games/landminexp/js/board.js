window.MineBoard = (() => {
  let R, C, M;
  let board, state, flags, revealed, hitR, hitC;
  let callbacks = {};
  let protectCheck = null;

  const nbors = (r, c) => {
    const list = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < R && nc >= 0 && nc < C) list.push([nr, nc]);
      }
    return list;
  };

  function init(cfg) {
    R = cfg.rows; C = cfg.cols; M = cfg.mines;
    state = 'waiting';
    flags = 0; revealed = 0;
    hitR = hitC = -1;
    board = [];
    for (let r = 0; r < R; r++) {
      board[r] = [];
      for (let c = 0; c < C; c++)
        board[r][c] = { m: 0, o: 0, f: 0, q: 0, n: 0 };
    }
  }

  function placeMines(exR, exC) {
    let placed = 0;
    while (placed < M) {
      const r = Math.random() * R | 0;
      const c = Math.random() * C | 0;
      if (board[r][c].m || (r === exR && c === exC)) continue;
      board[r][c].m = 1;
      placed++;
    }
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++)
        if (!board[r][c].m)
          board[r][c].n = nbors(r, c).filter(([nr, nc]) => board[nr][nc].m).length;
  }

  function flood(r, c) {
    const stack = [[r, c]];
    while (stack.length) {
      const [rr, cc] = stack.pop();
      const cur = board[rr][cc];
      if (cur.o || cur.f || cur.q || cur.m) continue;
      cur.o = 1;
      revealed++;
      if (!cur.n)
        for (const [nr, nc] of nbors(rr, cc))
          if (!board[nr][nc].o && !board[nr][nc].f && !board[nr][nc].q && !board[nr][nc].m)
            stack.push([nr, nc]);
    }
  }

  function open(r, c) {
    const cell = board[r][c];
    if (cell.o || cell.f || cell.q || state === 'lost' || state === 'won') return;
    if (state === 'waiting') {
      placeMines(r, c);
      state = 'playing';
      if (callbacks.onStart) callbacks.onStart();
    }

    if (cell.m) {
      // 免疫命中
      if (protectCheck && protectCheck()) {
        cell.o = 1;
        if (callbacks.onProtectedMine) callbacks.onProtectedMine();
        for (const [nr, nc] of nbors(r, c)) {
          const n = board[nr][nc];
          if (!n.o && !n.f && !n.q && !n.m) flood(nr, nc);
        }
        if (revealed === R * C - M) { state = 'won'; if (callbacks.onWin) callbacks.onWin(); }
        if (callbacks.onDraw) callbacks.onDraw();
        return;
      }
      // 正常踩雷
      state = 'lost';
      hitR = r; hitC = c;
      if (callbacks.onLose) callbacks.onLose(r, c);
      return;
    }

    flood(r, c);
    if (revealed === R * C - M) { state = 'won'; if (callbacks.onWin) callbacks.onWin(); return; }
    if (callbacks.onDraw) callbacks.onDraw();
  }

  function flag(r, c) {
    const cell = board[r][c];
    if (cell.o || state === 'lost' || state === 'won') return;
    if (cell.f) {
      cell.f = 0; cell.q = 1; flags--;
      if (cell.m) GameData.addCorrectFlag(-1);
    } else if (cell.q) {
      cell.q = 0;
    } else {
      cell.f = 1; flags++;
      if (cell.m) GameData.addCorrectFlag(1);
    }
    if (callbacks.onDraw) callbacks.onDraw();
  }

  function chord(r, c) {
    const cell = board[r][c];
    if (!cell.o || cell.n === 0) return;
    const ns = nbors(r, c);
    if (ns.filter(([nr, nc]) => board[nr][nc].f).length !== cell.n) return;
    for (const [nr, nc] of ns) {
      const n = board[nr][nc];
      if (!n.o && !n.f && !n.q) open(nr, nc);
      if (state === 'lost' || state === 'won') return;
    }
    if (callbacks.onDraw) callbacks.onDraw();
  }

  function fail() {
    state = 'lost';
  }

  return {
    init, open, flag, chord, fail,
    getBoard: () => board,
    getState: () => state,
    getStats: () => ({ R, C, M, flags, revealed, hitR, hitC, state }),
    setCallbacks: cb => { callbacks = cb; },
    setProtectCheck: fn => { protectCheck = fn; }
  };
})();
