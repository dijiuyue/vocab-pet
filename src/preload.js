'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch) => (cb) => ipcRenderer.on(ch, (_e, d) => cb(d));
contextBridge.exposeInMainWorld('api', {
  getWord: () => ipcRenderer.invoke('get-word'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  importList: () => ipcRenderer.invoke('import'),
  clearProgress: () => ipcRenderer.invoke('clear-progress'),
  setInterval: (m) => ipcRenderer.invoke('set-interval', m),
  step: (n) => ipcRenderer.send('step', n),
  mark: (kind, word) => ipcRenderer.send('mark', kind, word),
  openDashboard: () => ipcRenderer.send('open-dashboard'),
  petMenu: () => ipcRenderer.send('pet-menu'),
  setIgnore: (v) => ipcRenderer.send('set-ignore', v),
  drag: (on) => ipcRenderer.send('drag', on),
  onWord: on('word'),
  onStats: on('stats'),
});
