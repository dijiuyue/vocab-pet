// 解析词单：每行 `单词,释义[,音标/例句...]`，支持 Tab / 逗号 / 空格分隔，UTF-8（自动去 BOM）
'use strict';

function splitCsv(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const isPhonetic = (s) => /^[\/\[].*[\/\]]$/.test(s);

function parseLine(raw) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return null;
  let f;
  if (line.includes('\t')) f = line.split('\t');
  else if (line.includes(',')) f = splitCsv(line);
  else { const m = line.match(/^(\S+)\s+(.+)$/); f = m ? [m[1], m[2]] : [line]; }
  f = f.map((s) => s.trim()).filter((s, i) => i < 2 || s);
  const w = f[0]; const m = f[1] || '';
  if (!w || !m || /^(word|单词)$/i.test(w)) return null; // 跳过空行/表头
  const item = { w, m };
  for (const extra of f.slice(2)) {
    if (!item.p && isPhonetic(extra)) item.p = extra;
    else item.e = item.e ? `${item.e} ${extra}` : extra;
  }
  return item;
}

function parseWordList(text) {
  return String(text).replace(/^\uFEFF/, '').split(/\r?\n|\r/).map(parseLine).filter(Boolean);
}

module.exports = { parseWordList, parseLine, splitCsv };
