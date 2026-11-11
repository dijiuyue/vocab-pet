'use strict';
const $ = (id) => document.getElementById(id);
const pet = $('pet'), bubble = $('bubble'), card = $('card');
const SHOTS = new URLSearchParams(location.search).get('shots') === '1';
if (SHOTS) document.body.classList.add('shots');
let cur = null, shown = false, hideT = 0;

// —————— 粒子特效（canvas）——————
const fx = $('fx'), ctx = fx.getContext('2d');
let parts = [];
function resize() { fx.width = innerWidth * devicePixelRatio; fx.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
resize(); addEventListener('resize', resize);
const COLORS = ['#f0abfc', '#c4b5fd', '#a5f3fc', '#fde68a', '#ffffff'];
function burst(x, y, n = 18, spread = 3.2) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * spread + 0.6;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, r: Math.random() * 2.6 + 1.2, life: 1, rot: Math.random() * 6, c: COLORS[i % COLORS.length] });
  }
  if (parts.length === n) requestAnimationFrame(tick);
}
function star(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.4 : r * 1.6, a = rot + (i * Math.PI) / 4; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function tick() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => (p.life -= 0.018) > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.98; p.rot += 0.1;
    ctx.globalAlpha = p.life; ctx.fillStyle = p.c;
    star(p.x, p.y, p.r * p.life, p.rot);
  }
  if (parts.length) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
}

// —————— 单词渲染 ——————
function render(w) {
  cur = w;
  const word = $('word');
  word.style.fontSize = w.w.length > 12 ? '20px' : w.w.length > 9 ? '24px' : '28px';
  word.textContent = w.w;
  $('phon').textContent = w.p || '';
  $('meaning').textContent = w.m;
  $('example').textContent = w.e || '';
  $('prog').textContent = `${w.index + 1}/${w.total}`;
  card.classList.remove('flipped');
}

function showBubble() {
  clearTimeout(hideT);
  pet.classList.add('hover');
  if (shown) return;
  shown = true;
  render(cur);
  bubble.classList.add('show');
  pet.classList.remove('alert');
  burst(130, 120, 22);
  api.mark('viewed', cur.w);
}
function hideBubble() {
  hideT = setTimeout(() => { shown = false; bubble.classList.remove('show'); pet.classList.remove('hover'); card.classList.remove('flipped'); setIgnore(true); }, 650);
}
function flip() {
  const on = card.classList.toggle('flipped');
  burst(130, 80, on ? 26 : 12, 4);
  if (on) api.mark('revealed', cur.w);
}
function bounce() {
  pet.classList.remove('bounce', 'happy'); void pet.offsetWidth;
  pet.classList.add('bounce', 'happy');
  burst(130, 220, 14, 2.5);
  clearTimeout(bounce.t); bounce.t = setTimeout(() => pet.classList.remove('bounce', 'happy'), 900);
}

// —————— 鼠标穿透：只有宠物/气泡区域接收鼠标 ——————
let ignoring = true;
function setIgnore(v) { if (v !== ignoring) { ignoring = v; api.setIgnore(v); } }
document.addEventListener('mousemove', (e) => setIgnore(!e.target.closest('.hit')));

for (const el of [pet, bubble]) {
  el.addEventListener('mouseenter', showBubble);
  el.addEventListener('mouseleave', hideBubble);
}
$('cardWrap').addEventListener('click', flip);
$('prev').addEventListener('click', () => api.step(-1));
$('next').addEventListener('click', () => api.step(1));
pet.addEventListener('contextmenu', (e) => { e.preventDefault(); api.petMenu(); });

// 拖动 vs 点击：按下即开始跟随，松开时位移很小则视为点击
let down = null;
pet.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  down = { x: e.screenX, y: e.screenY };
  pet.setPointerCapture(e.pointerId); pet.classList.add('dragging'); api.drag(true);
});
pet.addEventListener('pointerup', (e) => {
  if (!down) return;
  api.drag(false); pet.classList.remove('dragging');
  const moved = Math.hypot(e.screenX - down.x, e.screenY - down.y) > 4;
  down = null;
  if (!moved) { bounce(); shown ? flip() : showBubble(); }
});

api.onWord((w) => {
  const was = cur; cur = w;
  if (shown) { render(w); burst(130, 80, 16); if (was?.w !== w.w) api.mark('viewed', w.w); }
  else render(w);
  if (w.isNew && !shown) pet.classList.add('alert');
});
api.getWord().then((w) => render(w));

// 截图自检用
window.__shots = { hover: showBubble, flip, alert: () => pet.classList.add('alert') };
