// 简单 JSON 持久化 + 统计逻辑
'use strict';
const fs = require('fs');
const path = require('path');

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

class Store {
  constructor(dir, defaultList) {
    this.file = path.join(dir, 'vocabpet-data.json');
    const base = {
      settings: { intervalMin: 30, petVisible: true, pos: null },
      list: defaultList, index: 0, lastAdvance: Date.now(),
      history: {}, // { 'YYYY-MM-DD': { viewed: [w], revealed: [w] } }
      seen: {},    // { word: 首次见到的日期 }
    };
    try { this.data = { ...base, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; }
    catch { this.data = base; }
    this.data.settings = { ...base.settings, ...this.data.settings };
    if (!this.data.list?.words?.length) this.data.list = defaultList;
  }

  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.saveNow(), 300);
  }
  saveNow() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.data));
    fs.renameSync(this.file + '.tmp', this.file);
  }

  get words() { return this.data.list.words; }
  current() {
    const i = this.data.index;
    return { ...this.words[i], index: i, total: this.words.length };
  }
  move(step) {
    const n = this.words.length;
    this.data.index = (((this.data.index + step) % n) + n) % n;
    this.data.lastAdvance = Date.now();
    this.save();
    return this.current();
  }
  setList(name, words) {
    this.data.list = { name, words };
    this.data.index = 0; this.data.lastAdvance = Date.now();
    this.save();
  }
  mark(kind, word) { // kind: 'viewed' | 'revealed'
    const d = (this.data.history[dayKey()] ||= { viewed: [], revealed: [] });
    if (!d[kind].includes(word)) d[kind].push(word);
    if (kind === 'viewed' && !this.data.seen[word]) this.data.seen[word] = dayKey();
    this.save();
  }
  clearProgress() {
    Object.assign(this.data, { history: {}, seen: {}, index: 0, lastAdvance: Date.now() });
    this.save();
  }

  stats() {
    const h = this.data.history;
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      days.push({ date: k, viewed: h[k]?.viewed.length || 0, revealed: h[k]?.revealed.length || 0 });
    }
    // 连续天数：从今天（今天没背则从昨天）往前数
    let streak = 0; const d = new Date();
    if (!h[dayKey(d)]?.viewed.length) d.setDate(d.getDate() - 1);
    while (h[dayKey(d)]?.viewed.length) { streak++; d.setDate(d.getDate() - 1); }
    const today = h[dayKey()] || { viewed: [], revealed: [] };
    const byWord = Object.fromEntries(this.words.map((w) => [w.w, w]));
    const learnedInList = this.words.filter((w) => this.data.seen[w.w]).length;
    return {
      days, streak, total: Object.keys(this.data.seen).length,
      today: today.viewed.map((w) => ({ ...(byWord[w] || { w, m: '' }), revealed: today.revealed.includes(w) })),
      list: { name: this.data.list.name, size: this.words.length, index: this.data.index, learned: learnedInList },
      settings: this.data.settings,
      nextAt: this.data.lastAdvance + this.data.settings.intervalMin * 60000,
    };
  }
}

module.exports = { Store, dayKey };
