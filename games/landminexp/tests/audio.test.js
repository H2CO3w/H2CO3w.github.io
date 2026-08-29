const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const AUDIO_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../js/audio.js'),
  'utf8'
);
const CONFIG_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../js/config.js'),
  'utf8'
);

class FakeAudio {
  constructor(src = '') {
    this.src = src;
    this.currentTime = 0;
    this.duration = 180;
    this.volume = 1;
    this.loop = false;
    this.paused = true;
    this.ended = false;
    this.listeners = new Map();
    FakeAudio.instances.push(this);
  }

  addEventListener(type, listener) {
    const group = this.listeners.get(type) || [];
    group.push(listener);
    this.listeners.set(type, group);
  }

  emit(type) {
    for (const listener of this.listeners.get(type) || []) listener();
  }

  play() {
    this.paused = false;
    this.ended = false;
    this.emit('play');
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.emit('pause');
  }

  load() {
    this.currentTime = 0;
    this.emit('loadedmetadata');
  }
}

FakeAudio.instances = [];

function createAudioSystem() {
  FakeAudio.instances = [];
  const context = {
    console,
    Audio: FakeAudio,
    CONFIG: {
      MUSIC_TRACKS: [
        { id: 'up', title: 'UP', src: 'assets/audio/up.mp3' },
        { id: 'night', title: 'NIGHT', src: 'assets/audio/night.mp3' }
      ]
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(AUDIO_SOURCE, context, { filename: 'audio.js' });
  return {
    audio: context.AudioSys,
    boot: FakeAudio.instances[0],
    bgm: FakeAudio.instances[1],
    event: FakeAudio.instances[2]
  };
}

test('普通音频文件全部进入播放器歌单，游戏专用音频除外', () => {
  const context = {};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(CONFIG_SOURCE, context, { filename: 'config.js' });

  const reserved = new Set(['boot.mp3', 'down.mp3']);
  const audioDir = path.resolve(__dirname, '../assets/audio');
  const bgmFiles = fs.readdirSync(audioDir)
    .filter(file => file.endsWith('.mp3') && !reserved.has(file))
    .sort();
  const configuredFiles = Array.from(
    context.CONFIG.MUSIC_TRACKS,
    track => path.basename(track.src)
  ).sort();

  assert.deepEqual(configuredFiles, bgmFiles);
  assert.equal(new Set(context.CONFIG.MUSIC_TRACKS.map(track => track.id)).size, bgmFiles.length);
});

test('播放器从配置读取曲目，并在播放状态下切换到下一首', () => {
  const { audio } = createAudioSystem();

  assert.equal(audio.getState().track.title, 'UP');
  assert.equal(audio.getState().trackCount, 2);

  audio.play();
  assert.equal(audio.getState().isPlaying, true);

  audio.next();
  assert.equal(audio.getState().track.title, 'NIGHT');
  assert.equal(audio.getState().currentIndex, 1);
  assert.equal(audio.getState().isPlaying, true);

  audio.pause();
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(audio.getState().playbackWanted, false);
});

test('暂停 BGM 不会阻止或暂停失败事件音乐', () => {
  const { audio, event } = createAudioSystem();

  audio.pause();
  audio.startFailureMusic();
  assert.equal(event.paused, false);

  audio.pause();
  assert.equal(event.paused, false);
  assert.equal(audio.getState().activeTitle, 'UP');
  assert.equal(audio.getState().isPlaying, false);
});

test('播放器音量只修改 BGM，不修改失败事件音乐', () => {
  const { audio, bgm, event } = createAudioSystem();

  audio.play();
  audio.startFailureMusic();
  audio.setVolume(0.25);

  assert.equal(bgm.volume, 0.25);
  assert.equal(event.volume, 0.7);
  assert.equal(audio.getState().activeTitle, 'UP');
});

test('失败事件结束后恢复原有 BGM 播放意图', () => {
  const { audio, bgm, event } = createAudioSystem();

  audio.play();
  audio.startFailureMusic();
  assert.equal(bgm.paused, true);
  assert.equal(event.paused, false);

  audio.stopFailureMusic();
  assert.equal(event.paused, true);
  assert.equal(audio.getState().track.title, 'UP');
  assert.equal(audio.getState().isPlaying, true);

  audio.pause();
  audio.startFailureMusic();
  assert.equal(event.paused, false);
  audio.stopFailureMusic();
  assert.equal(audio.getState().isPlaying, false);
});
