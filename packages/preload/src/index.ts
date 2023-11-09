/**
 * @module preload
 */

import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('recorderAPI', {
  onStart: (callback: () => void) => ipcRenderer.on('start-recording', () => callback()),
  onStop: (callback: () => void) => ipcRenderer.on('stop-recording', () => callback()),
  writeBuffer: (buffer: ArrayBuffer) => ipcRenderer.send('write-buffer', buffer),
  initStorageStream: () => ipcRenderer.send('init-storage-stream'),
  onFinishedEncoding: () => ipcRenderer.send('on-finished-encoding'),
});