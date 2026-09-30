/* Regression checks for silent mobile stalls; no browser or network required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/layout-videos.js', 'utf8');
function setup({ native = true, blocked = false } = {}) {
  const timers = new Map();
  let timerId = 0;
  const handlers = {};
  const label = {};
  const button = { addEventListener: (event, fn) => { button[event] = fn; }, querySelector: () => label };
  const status = {};
  const video = {
    dataset: { stream: 'original.m3u8', compatible: 'compatible.mp4' },
    currentTime: 0, seeking: false,
    closest: () => ({ querySelector: selector => selector === '.layout-play' ? button : status }),
    addEventListener: (event, fn) => { handlers[event] = fn; },
    canPlayType: type => native || type.includes('hvc1') ? 'probably' : '',
    load() {}, pause() {},
    play: () => blocked ? Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })) : new Promise(() => {})
  };
  const window = {};
  let script;
  const document = {
    querySelectorAll: () => [video],
    createElement: () => (script = { remove() {} }),
    head: { append() {} }
  };
  vm.runInNewContext(source, {
    document, window,
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id)
  });
  return { video, button, status, label, handlers, timers, window, script: () => script,
    expire() { const next = timers.entries().next().value; assert.ok(next, 'watchdog armed'); timers.delete(next[0]); next[1](); }
  };
}
(async () => {
  const stalled = setup();
  assert.equal(stalled.video.src, undefined, 'no media request on page load');
  await stalled.button.click();
  assert.equal(stalled.video.src, 'original.m3u8', 'preserve HQ first');
  stalled.expire();
  assert.equal(stalled.video.src, 'compatible.mp4', 'pending play without error must fall back');
  stalled.expire();
  assert.equal(stalled.button.hidden, false);
  assert.equal(stalled.button.disabled, false);
  assert.equal(stalled.label.textContent, 'Try again');
  await stalled.button.click();
  assert.equal(stalled.video.src, 'compatible.mp4', 'retry uses working format candidate');
  assert.equal(stalled.timers.size, 1);

  const progress = setup();
  await progress.button.click();
  progress.video.currentTime = 1;
  progress.handlers.timeupdate();
  assert.equal(progress.status.textContent, '');
  const before = [...progress.timers.keys()][0];
  progress.handlers.timeupdate();
  assert.equal([...progress.timers.keys()][0], before, 'same timestamp does not conceal a stall');
  progress.video.currentTime = 0.5;
  progress.handlers.timeupdate();
  assert.notEqual([...progress.timers.keys()][0], before, 'seeking backward accepts renewed progress');
  progress.handlers.pause();
  assert.equal(progress.timers.size, 0, 'user pause cancels watchdog');
  progress.handlers.play();
  progress.expire();
  assert.equal(progress.video.src, 'compatible.mp4', 'mid-playback stall also recovers');

  const permission = setup({ blocked: true });
  await permission.button.click();
  await Promise.resolve();
  assert.equal(permission.timers.size, 0);
  assert.equal(permission.label.textContent, 'Tap to play');
  assert.equal(permission.button.disabled, false);

  const late = setup({ native: false });
  const pending = late.button.click();
  late.expire();
  assert.equal(late.video.src, 'compatible.mp4', 'library loading cannot hang forever');
  late.window.Hls = class { constructor() { throw new Error('stale HLS setup must not run'); } };
  late.script().onload();
  await pending;
  assert.equal(late.video.src, 'compatible.mp4', 'late library cannot replace fallback');
  assert.equal(late.button.hidden, true);
  console.log('Layout player: silent startup/mid-playback stalls, fallback retry, pause, seek, permission, and late library checks passed.');
})();
