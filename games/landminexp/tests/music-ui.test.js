const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../index.html'),
  'utf8'
);
const MUSIC_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../js/music.js'),
  'utf8'
);

test('播放器只用上一首和下一首切歌，不提供展开式歌曲选择器', () => {
  assert.doesNotMatch(INDEX_SOURCE, /music-track-select/);
  assert.doesNotMatch(MUSIC_SOURCE, /trackSelect|buildTrackOptions/);
});
