'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let stats = null, range = 14, lastChartKey = '';

// 数字滚动动画
function countUp(el, to) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  const t0 = performance.now();
  const f = (t) => { const p = Math.min(1, (t - t0) / 900), e = 1 - (1 - p) ** 3; el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

function drawChart(force) {
  const svg = $('#chart'), W = svg.clientWidth || 640, H = svg.clientHeight || 260, pad = { l: 30, r: 8, t: 14, b: 26 };
  const days = stats.days.slice(-range);
  const key = range + JSON.stringify(days) + W + H;
  if (key === lastChartKey && !force) return; lastChartKey = key;
  const max = Math.max(5, ...days.map((d) => d.viewed));
  const top = Math.ceil(max / 5) * 5, cw = (W - pad.l - pad.r) / days.length, ih = H - pad.t - pad.b;
  const y = (v) => pad.t + ih - (v / top) * ih;
  let g = `<defs>
    <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4b5fd"/><stop offset="1" stop-color="#6366f1" stop-opacity=".5"/></linearGradient>
    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9a8d4"/><stop offset="1" stop-color="#fb923c" stop-opacity=".7"/></linearGradient></defs>`;
  for (let i = 0; i <= 5; i++) { const v = (top / 5) * i; g += `<line class="grid-l" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`; }
  days.forEach((d, i) => {
    const x = pad.l + i * cw, bw = Math.min(26, cw * 0.62), bx = x + (cw - bw) / 2, rw = bw * 0.5, delay = (i * 0.03).toFixed(2);
    const label = d.date.slice(5).replace('-', '/');
    g += `<g class="col" data-i="${i}"><rect x="${x}" y="${pad.t}" width="${cw}" height="${ih}" fill="transparent"/>`;
    if (d.viewed) g += `<rect class="bar" style="animation-delay:${delay}s" x="${bx}" y="${y(d.viewed)}" width="${bw}" height="${y(0) - y(d.viewed)}" rx="${Math.min(6, bw / 3)}" fill="url(#gv)"/>`;
    if (d.revealed) g += `<rect class="bar" style="animation-delay:${+delay + 0.12}s" x="${bx + (bw - rw) / 2}" y="${y(d.revealed)}" width="${rw}" height="${y(0) - y(d.revealed)}" rx="${Math.min(4, rw / 3)}" fill="url(#gr)"/>`;
    if (range === 14 || i % 3 === 0 || i === days.length - 1) g += `<text x="${x + cw / 2}" y="${H - 8}" text-anchor="middle">${i === days.length - 1 ? '今天' : label}</text>`;
    g += '</g>';
  });
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = g;
  svg.querySelectorAll('.col').forEach((c) => {
    const d = days[+c.dataset.i], tip = $('#tip');
    c.addEventListener('mouseenter', () => {
      const r = c.getBoundingClientRect(), p = $('.chart-card').getBoundingClientRect();
      tip.innerHTML = `<b>${d.date}</b><br>浏览 ${d.viewed} 个 · 看释义 ${d.revealed} 个`;
      tip.style.left = `${r.left - p.left + r.width / 2}px`; tip.style.top = `${y(d.viewed) + 46}px`; tip.classList.add('on');
    });
    c.addEventListener('mouseleave', () => tip.classList.remove('on'));
  });
}

function render(s) {
  stats = s;
  const today = s.days[s.days.length - 1];
  countUp($('[data-k=viewed]'), today.viewed); countUp($('[data-k=revealed]'), today.revealed);
  countUp($('[data-k=streak]'), s.streak); countUp($('[data-k=total]'), s.total);
  drawChart();
  const pct = s.list.size ? s.list.learned / s.list.size : 0;
  $('#ringBar').style.strokeDashoffset = 314.16 * (1 - pct);
  $('#pct').textContent = `${Math.round(pct * 100)}%`;
  $('#listCount').textContent = `${s.list.learned}/${s.list.size} 已学`;
  $('#listName').textContent = s.list.name;
  $('#position').textContent = `当前第 ${s.list.index + 1} 个单词`;
  if (document.activeElement !== $('#interval')) $('#interval').value = s.settings.intervalMin;
  $('#todayCount').textContent = `${s.today.length} 个`;
  $('#todayList').innerHTML = s.today.length
    ? s.today.slice().reverse().map((w, i) => `<div class="w" style="animation-delay:${i * 0.03}s">${w.revealed ? '<span class="tag">已看释义</span>' : ''}<b>${esc(w.w)}</b><div class="m">${esc(w.m)}</div></div>`).join('')
    : '<div class="empty">今天还没有背单词哦～把鼠标移到桌面宠物上看看吧 ✨</div>';
}

function tickCountdown() {
  if (!stats) return;
  const ms = Math.max(0, stats.nextAt - Date.now()), m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000);
  $('#countdown').textContent = `下一个单词：${m} 分 ${String(sec).padStart(2, '0')} 秒后`;
}
setInterval(tickCountdown, 1000);

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }

document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
  range = +b.dataset.range; drawChart(true);
}));
$('#interval').addEventListener('change', async (e) => { const v = await api.setInterval(e.target.value); e.target.value = v; toast(`已设置：每 ${v} 分钟换一个单词`); });
$('#importBtn').addEventListener('click', async () => { const r = await api.importList(); if (r.ok) toast(`导入成功：${r.count} 个单词`); });
$('#clearBtn').addEventListener('click', async () => { if (await api.clearProgress()) toast('学习进度已清空'); });
addEventListener('resize', () => stats && drawChart());

api.onStats(render);
api.getStats().then((s) => { render(s); tickCountdown(); });
