// 截图自检（VOCABPET_SHOTS=1）：依次截取 宠物待机 / 悬停单词 / 翻转释义 / 后台
'use strict';
const fs = require('fs');
const path = require('path');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(__dirname, '..', 'screenshots');

async function snap(win, name) {
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, name), img.toPNG());
  console.log('[shots] saved', name, img.getSize());
}

exports.run = async ({ pet, openDashboard, app }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [];
  pet.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await new Promise((r) => pet.webContents.once('did-finish-load', r));
  pet.show();
  await wait(1500); await snap(pet, '1-pet-idle.png');
  await pet.webContents.executeJavaScript('__shots.alert()');
  await wait(900); await snap(pet, '2-pet-new-word.png');
  await pet.webContents.executeJavaScript('__shots.hover()');
  await wait(1700); await snap(pet, '3-hover-word.png');
  await pet.webContents.executeJavaScript('__shots.flip()');
  await wait(1400); await snap(pet, '4-flipped-meaning.png');
  const dash = openDashboard();
  dash.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await new Promise((r) => dash.webContents.once('did-finish-load', r));
  await wait(2500); await snap(dash, '5-dashboard.png');
  console.log('[shots] renderer errors:', errors.length ? errors : 'none');
  app.exit(errors.length ? 1 : 0);
};
