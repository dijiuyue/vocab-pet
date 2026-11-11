'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, screen, nativeImage } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseWordList } = require('./parser');
const { Store, dayKey } = require('./store');

const SHOTS = process.env.VOCABPET_SHOTS === '1'; // 截图自检模式
if (SHOTS) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'vocabpet-')));
if (!SHOTS && !app.requestSingleInstanceLock()) app.quit();

const asset = (f) => path.join(__dirname, '..', 'assets', f);
const PET_W = 260, PET_H = 300;
const PASSTHROUGH = process.platform !== 'linux'; // Linux 不支持 forward，保持小窗即可
let store, pet, dash, tray;

const defaultList = () => ({ name: '默认词单（CET4/雅思 52 词）', words: parseWordList(fs.readFileSync(asset('default-words.tsv'), 'utf8')) });
const broadcast = (ch, data) => [pet, dash].forEach((w) => w && !w.isDestroyed() && w.webContents.send(ch, data));
const pushWord = (isNew = false) => broadcast('word', { ...store.current(), isNew });
const pushStats = () => broadcast('stats', store.stats());
function step(n, isNew = false) { store.move(n); pushWord(isNew); pushStats(); }

function createPet() {
  const wa = screen.getPrimaryDisplay().workArea;
  let pos = store.data.settings.pos;
  const visible = pos && screen.getAllDisplays().some(({ workArea: a }) =>
    pos.x > a.x - PET_W / 2 && pos.x < a.x + a.width - PET_W / 2 && pos.y > a.y - PET_H / 2 && pos.y < a.y + a.height - PET_H / 2);
  if (!visible) pos = { x: wa.x + wa.width - PET_W - 40, y: wa.y + wa.height - PET_H - 20 };
  pet = new BrowserWindow({
    ...pos, width: PET_W, height: PET_H, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, focusable: !PASSTHROUGH || SHOTS, show: false,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  pet.setAlwaysOnTop(true, 'screen-saver');
  pet.loadFile(path.join(__dirname, 'pet.html'), { query: { shots: SHOTS ? '1' : '' } });
  if (PASSTHROUGH) pet.setIgnoreMouseEvents(true, { forward: true });
  pet.once('ready-to-show', () => store.data.settings.petVisible && pet.showInactive());
  pet.on('moved', () => { const [x, y] = pet.getPosition(); store.data.settings.pos = { x, y }; store.save(); });
}

function openDashboard() {
  if (dash && !dash.isDestroyed()) { dash.show(); dash.focus(); return dash; }
  dash = new BrowserWindow({
    width: 1060, height: 780, minWidth: 820, minHeight: 560, show: false, title: 'VocabPet 后台',
    backgroundColor: '#0b0b1a', icon: asset('icon.png'), autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#0b0b1a', symbolColor: '#c9c6ff', height: 38 },
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  dash.loadFile(path.join(__dirname, 'dashboard.html'));
  dash.once('ready-to-show', () => dash.show());
  return dash;
}

async function importList(parent) {
  const r = await dialog.showOpenDialog(parent, {
    title: '导入词单', properties: ['openFile'],
    filters: [{ name: '词单', extensions: ['txt', 'csv', 'tsv'] }, { name: '所有文件', extensions: ['*'] }],
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  const file = r.filePaths[0];
  const words = parseWordList(fs.readFileSync(file, 'utf8'));
  if (!words.length) {
    dialog.showMessageBox(parent, { type: 'warning', message: '没有识别到单词', detail: '每行格式：单词,释义  或  单词<Tab>释义（可选第 3 列音标/例句），UTF-8 编码。' });
    return { ok: false };
  }
  store.setList(path.basename(file).replace(/\.\w+$/, ''), words);
  pushWord(true); pushStats();
  return { ok: true, count: words.length };
}

function togglePet() {
  const show = !pet.isVisible();
  show ? pet.showInactive() : pet.hide();
  store.data.settings.petVisible = show; store.save(); buildTray();
}

const menuTemplate = () => [
  { label: '打开后台', click: openDashboard },
  { label: '导入词单…', click: () => importList() },
  { label: '下一个单词', click: () => step(1) },
  { label: '上一个单词', click: () => step(-1) },
  { type: 'separator' },
  { label: pet?.isVisible() ? '隐藏宠物' : '显示宠物', click: togglePet },
  { type: 'separator' },
  { label: '退出', click: () => app.quit() },
];

function buildTray() {
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(asset('tray.png')));
    tray.setToolTip('VocabPet 桌面背单词');
    tray.on('click', togglePet);
    tray.on('double-click', openDashboard);
  }
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate()));
}

// —— IPC ——
ipcMain.handle('get-word', () => store.current());
ipcMain.handle('get-stats', () => store.stats());
ipcMain.handle('import', (e) => importList(BrowserWindow.fromWebContents(e.sender)));
ipcMain.handle('clear-progress', async (e) => {
  const { response } = await dialog.showMessageBox(BrowserWindow.fromWebContents(e.sender), {
    type: 'warning', buttons: ['取消', '清空'], defaultId: 0, cancelId: 0, message: '确定清空所有学习记录吗？', detail: '每日统计和进度都会被清除，词单保留。',
  });
  if (response !== 1) return false;
  store.clearProgress(); pushWord(); pushStats(); return true;
});
ipcMain.handle('set-interval', (_e, min) => {
  store.data.settings.intervalMin = Math.max(1, Math.min(1440, Math.round(+min) || 30));
  store.data.lastAdvance = Date.now(); store.save(); pushStats();
  return store.data.settings.intervalMin;
});
ipcMain.on('step', (_e, n) => step(n));
ipcMain.on('mark', (_e, kind, word) => { if (['viewed', 'revealed'].includes(kind) && word) { store.mark(kind, word); pushStats(); } });
ipcMain.on('open-dashboard', openDashboard);
ipcMain.on('pet-menu', () => Menu.buildFromTemplate(menuTemplate()).popup({ window: pet }));
ipcMain.on('set-ignore', (_e, ignore) => PASSTHROUGH && pet.setIgnoreMouseEvents(ignore, { forward: true }));

// 拖动：按下后主进程跟随鼠标移动窗口（不用 app-region:drag，以保留 hover/click）
let dragTimer = null;
ipcMain.on('drag', (_e, on) => {
  clearInterval(dragTimer);
  if (!on) return;
  const c = screen.getCursorScreenPoint(); const [wx, wy] = pet.getPosition();
  const off = { x: c.x - wx, y: c.y - wy };
  dragTimer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    pet.setPosition(p.x - off.x, p.y - off.y);
  }, 12);
});

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'), defaultList());
  if (SHOTS) seedDemo();
  createPet();
  buildTray();
  // 定时换词：每 30 秒检查一次是否到点
  setInterval(() => {
    if (Date.now() - store.data.lastAdvance >= store.data.settings.intervalMin * 60000) step(1, true);
  }, 30000);
  if (SHOTS) require('./shots').run({ pet, openDashboard, store, app });
});
app.on('second-instance', openDashboard);
app.on('window-all-closed', () => {}); // 关闭后台不退出，宠物常驻
app.on('before-quit', () => store?.saveNow());

function seedDemo() { // 截图模式：造一些历史数据，方便展示图表
  const w = store.words.map((x) => x.w);
  for (let i = 29; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const n = i > 20 && i % 3 === 0 ? 0 : 4 + ((i * 7) % 13);
    if (n) store.data.history[dayKey(d)] = { viewed: w.slice(0, n), revealed: w.slice(0, Math.ceil(n * 0.7)) };
  }
  w.slice(0, 18).forEach((x) => { store.data.seen[x] = '2026-01-01'; });
  ['abandon', 'ability', 'absorb', 'abstract', 'academic'].forEach((x, i) => { store.mark('viewed', x); if (i % 2 === 0) store.mark('revealed', x); });
  store.data.index = 5;
}
