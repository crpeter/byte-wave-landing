/* Regression checks for stalled playback, user gestures, retries and stale loads. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/video-player.js', 'utf8');
function setup({native = true, blocked = false, compatible = true, mp4 = false} = {}) {
  const timers = new Map(); let timerId = 0;
  const handlers = {}, attrs = {}, status = {};
  const button = {addEventListener: (event, fn) => {button[event] = fn;}, setAttribute: (key, value) => {attrs[key] = value;}};
  const video = {
    dataset: {stream: mp4 ? 'original.mp4' : 'original.m3u8', compatible: compatible ? 'compatible.mp4' : undefined},
    currentTime: 0, seeking: false, ended: false,
    closest: () => ({querySelector: selector => selector === '.bw-play' ? button : status}),
    querySelector: () => ({src: 'original.m3u8'}),
    addEventListener: (event, fn) => {handlers[event] = fn;},
    canPlayType: () => native ? 'probably' : '',
    load() {}, pause() {},
    play: () => blocked ? Promise.reject(Object.assign(new Error(), {name: 'NotAllowedError'})) : new Promise(() => {})
  };
  const window = {}; let script;
  const document = {querySelectorAll: () => [video], createElement: () => (script = {remove() {}}), head: {append() {}}};
  vm.runInNewContext(source, {document, window,
    setTimeout: fn => {const id = ++timerId; timers.set(id, fn); return id;},
    clearTimeout: id => timers.delete(id)});
  return {video, button, status, attrs, handlers, timers, window, script: () => script,
    expire() {const next = timers.entries().next().value; assert.ok(next, 'watchdog armed'); timers.delete(next[0]); next[1]();}};
}
(async () => {
  const stalled = setup();
  assert.equal(stalled.video.src, undefined, 'no eager media request');
  await stalled.button.click();
  assert.equal(stalled.video.src, 'original.m3u8', 'HQ first');
  assert.equal(stalled.button.hidden, true, 'native loading UI, no extra spinner');
  stalled.expire(); assert.equal(stalled.video.src, 'compatible.mp4');
  stalled.expire(); assert.equal(stalled.button.hidden, false); assert.equal(stalled.attrs['aria-label'], 'Retry video');
  await stalled.button.click(); assert.equal(stalled.video.src, 'compatible.mp4');

  const progress = setup(); await progress.button.click();
  progress.video.currentTime = 1; progress.handlers.timeupdate();
  const before = [...progress.timers.keys()][0]; progress.handlers.timeupdate();
  assert.equal([...progress.timers.keys()][0], before, 'unchanged timestamp cannot hide a stall');
  progress.video.currentTime = .5; progress.handlers.timeupdate();
  assert.notEqual([...progress.timers.keys()][0], before, 'backward seeks can resume');
  progress.handlers.pause(); assert.equal(progress.timers.size, 0); assert.equal(progress.button.hidden, false);
  await progress.button.click(); progress.handlers.play(); progress.expire(); assert.equal(progress.video.src, 'compatible.mp4');
  progress.video.ended = true; progress.handlers.ended(); assert.equal(progress.attrs['aria-label'], 'Replay video');
  await progress.button.click(); assert.equal(progress.video.currentTime, 0);

  const permission = setup({blocked: true}); await permission.button.click(); await Promise.resolve();
  assert.equal(permission.timers.size, 0); assert.equal(permission.attrs['aria-label'], 'Tap to play video'); assert.equal(permission.button.disabled, false);

  const late = setup({native: false}); const pending = late.button.click(); late.expire();
  late.window.Hls = class {constructor() {throw new Error('stale HLS setup');}};
  late.script().onload(); await pending; assert.equal(late.video.src, 'compatible.mp4');

  const noFallback = setup({compatible: false}); await noFallback.button.click(); noFallback.expire();
  assert.equal(noFallback.attrs['aria-label'], 'Retry video');
  const mp4 = setup({mp4: true, native: false, compatible: false}); await mp4.button.click();
  assert.equal(mp4.video.src, 'original.mp4');

  const hls = setup({native: false}); const callbacks = {};
  hls.window.Hls = class {static Events = {MANIFEST_PARSED: 'manifest', ERROR: 'error'}; static isSupported() {return true;}
    on(name, fn) {callbacks[name] = fn;} loadSource() {} attachMedia() {} destroy() {}};
  await hls.button.click(); callbacks.manifest(); hls.handlers.playing(); hls.handlers.pause(); await hls.button.click();
  callbacks.error(null, {fatal: true}); assert.equal(hls.video.src, 'compatible.mp4', 'HLS errors still recover after a pause/resume');
  console.log('Video player regressions passed: HQ, stalls, retry, pause/resume, replay, gestures, MP4, HLS, and stale loads.');
})();
