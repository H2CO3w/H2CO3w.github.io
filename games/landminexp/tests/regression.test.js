const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const GAME_ROOT = path.resolve(__dirname, '..');

function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: (...names) => names.forEach(name => classes.delete(name)),
    contains: name => classes.has(name)
  };
}

function createElement(id, hidden = false) {
  const listeners = new Map();
  return {
    id,
    classList: createClassList(hidden ? ['hidden'] : []),
    style: {},
    textContent: '',
    disabled: false,
    currentTime: 0,
    src: '',
    addEventListener(type, listener) {
      const group = listeners.get(type) || [];
      group.push(listener);
      listeners.set(type, group);
    },
    emit(type, event = {}) {
      if (this.disabled && type === 'click') return;
      for (const listener of listeners.get(type) || []) listener(event);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 80, height: 80 };
    },
    play() { return Promise.resolve(); },
    pause() {}
  };
}

function createGameHarness({ stress = 65 } = {}) {
  const hiddenIds = new Set([
    'cg-lock', 'failCG', 'winCG', 'restart-fail',
    'fx-blur', 'fx-smoke', 'fx-drug'
  ]);
  const elements = new Proxy({}, {
    get(target, id) {
      if (!(id in target)) target[id] = createElement(id, hiddenIds.has(id));
      return target[id];
    }
  });

  let nextTimerId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  const setTimeoutFake = callback => {
    const id = nextTimerId++;
    timeouts.set(id, callback);
    return id;
  };
  const clearTimeoutFake = id => timeouts.delete(id);
  const setIntervalFake = callback => {
    const id = nextTimerId++;
    intervals.set(id, callback);
    return id;
  };
  const clearIntervalFake = id => intervals.delete(id);

  const level = { rows: 2, cols: 2, mines: 1, time: 240 };
  const data = {
    stress,
    dark: 0,
    correctFlags: 0,
    currentLevel: 0,
    currentDay: 1
  };
  const GameData = {
    getStress: () => data.stress,
    setStress: value => { data.stress = Math.max(0, Math.min(100, value)); },
    addStress: delta => { GameData.setStress(data.stress + delta); return data.stress; },
    getDark: () => data.dark,
    setDark: value => { data.dark = Math.max(0, Math.min(100, value)); },
    addDark: delta => { GameData.setDark(data.dark + delta); return data.dark; },
    getCorrectFlags: () => data.correctFlags,
    setCorrectFlags: value => { data.correctFlags = Math.max(0, value); },
    addCorrectFlag: delta => { data.correctFlags = Math.max(0, data.correctFlags + delta); },
    getCurrentLevel: () => data.currentLevel,
    nextLevel: () => ++data.currentLevel,
    getLevelConfig: () => level,
    getCurrentDay: () => data.currentDay,
    nextDay: () => ++data.currentDay
  };

  let failStarts = 0;
  const context = {
    console,
    document: {
      body: { innerHTML: '' },
      getElementById: id => elements[id]
    },
    CONFIG: {
      TILE: 40,
      LEVEL_TIME: 240,
      STRESS_MAX: 100,
      INIT_STRESS: 40,
      CUT_REQUIRED: 8,
      CG_DELAY: 4000,
      PUNISH_DELAY: 800,
      LEVELS: [level, level]
    },
    GameData,
    Renderer: { draw() {}, resize() {} },
    UI: {
      init() {},
      updateGameTime() {},
      updateCalendarDay() {},
      updateStress() {},
      updateDark() {}
    },
    Items: {
      tickSmoke: () => false,
      reset() {},
      hasProtection: () => false,
      consumeProtection() {}
    },
    AudioSys: {
      playExplode() {},
      startFailureMusic() {},
      stopFailureMusic() {},
      startMusic() {},
      playClick() {},
      stopAll() {}
    },
    CG: {
      startFailCG() { failStarts++; },
      clearFailCG() {}
    },
    MusicPlayer: { init() {} },
    innerWidth: 1280,
    innerHeight: 720,
    setTimeout: setTimeoutFake,
    clearTimeout: clearTimeoutFake,
    setInterval: setIntervalFake,
    clearInterval: clearIntervalFake,
    close() {}
  };
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0;
  context.Math = deterministicMath;
  context.window = context;
  vm.createContext(context);

  vm.runInContext(
    fs.readFileSync(path.join(GAME_ROOT, 'js/board.js'), 'utf8'),
    context,
    { filename: 'board.js' }
  );
  vm.runInContext(
    fs.readFileSync(path.join(GAME_ROOT, 'js/main.js'), 'utf8'),
    context,
    { filename: 'main.js' }
  );

  const clickCell = (row, col) => {
    elements.board.emit('mousedown', {
      button: 0,
      clientX: col * 40 + 20,
      clientY: row * 40 + 20,
      preventDefault() {}
    });
  };
  const runTimeouts = () => {
    while (timeouts.size) {
      const pending = [...timeouts.entries()];
      timeouts.clear();
      for (const [, callback] of pending) callback();
    }
  };

  return {
    context,
    elements,
    clickCell,
    runTimeouts,
    getFailStarts: () => failStarts
  };
}

test('高压力失败进入强制 CG 阶段后，重置按钮不能跳过流程', () => {
  const game = createGameHarness({ stress: 65 });
  game.clickCell(1, 1); // 首开安全格；固定随机数会把雷放在 (0, 0)
  game.clickCell(0, 0);

  assert.equal(game.elements['reset-btn'].disabled, true);
  assert.equal(game.elements['cg-lock'].classList.contains('hidden'), false);

  game.elements['reset-btn'].emit('click');
  assert.equal(game.context.MineBoard.getState(), 'lost');

  game.runTimeouts();
  assert.equal(game.getFailStarts(), 1);
});

test('普通胜利进入强制 CG 阶段后，重置按钮不能跳过流程', () => {
  const game = createGameHarness({ stress: 40 });
  game.clickCell(1, 1);
  game.clickCell(0, 1);
  game.clickCell(1, 0);

  assert.equal(game.context.MineBoard.getState(), 'won');
  assert.equal(game.elements['reset-btn'].disabled, true);
  assert.equal(game.elements['cg-lock'].classList.contains('hidden'), false);

  game.elements['reset-btn'].emit('click');
  assert.equal(game.context.MineBoard.getState(), 'won');

  game.runTimeouts();
  assert.equal(game.elements.winCG.classList.contains('hidden'), false);
});

test('烟完整暂停 20 个计时拍', () => {
  const elements = new Proxy({}, {
    get(target, id) {
      if (!(id in target)) target[id] = createElement(id, true);
      return target[id];
    }
  });
  const context = {
    document: { getElementById: id => elements[id] },
    GameData: {
      addDark() {},
      getDark: () => 0,
      setStress() {}
    },
    UI: { updateDark() {}, updateStress() {} },
    AudioSys: { playClick() {} },
    setTimeout: () => 1,
    clearTimeout() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(GAME_ROOT, 'js/items.js'), 'utf8'),
    context,
    { filename: 'items.js' }
  );

  context.Items.use('smoke');
  let pausedTicks = 0;
  while (context.Items.tickSmoke()) pausedTicks++;

  assert.equal(pausedTicks, 20);
});
