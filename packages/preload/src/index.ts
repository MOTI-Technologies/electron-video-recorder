/**
 * @module preload
 */

import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

import { CallManager } from './CallManager';
import type { AudioFrame, VideoFrame } from 'agora-electron-sdk';

const callManager = new CallManager();

contextBridge.exposeInMainWorld('agoraAPI', {
  joinChannel: (channel: string, token: string) => callManager.joinChannel(channel, token),
  leaveChannel: () => {
    ipcRenderer.send('leave');
    callManager.leaveChannel();
  },
});

contextBridge.exposeInMainWorld('compositorAPI', {
  onCompositeLocalFrame: (callback: (frame: VideoFrame) => void) =>
    ipcRenderer.on('composite-local-frame', (event: IpcRendererEvent, frame: VideoFrame) => callback(frame)),
  onMixedAudioFrame: (callback: (frame: AudioFrame) => void) =>
    ipcRenderer.on('on-mixed-audio-frame', (event: IpcRendererEvent, frame: AudioFrame) => callback(frame)),
  writeBuffer: (buffer: ArrayBuffer) => ipcRenderer.send('write-buffer', buffer),
});
