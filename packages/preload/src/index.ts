/**
 * @module preload
 */

import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';

import type { AudioFrame, VideoFrame } from 'agora-electron-sdk';

contextBridge.exposeInMainWorld('agoraAPI', {
  joinChannel: (channel: string, token: string) => {
    console.log('join channel');
  },
  leaveChannel: () => {
    console.log('leave channel');
    ipcRenderer.send('leave');
  },
  startRecording: () => {
    ipcRenderer.send('start-recording');
  },
  stopRecording: () => {
    ipcRenderer.send('stop-recording');
  },
});

contextBridge.exposeInMainWorld('recorderAPI', {
  onStart: (callback: () => void) => ipcRenderer.on('start-recording', () => callback()),
  onStop: (callback: () => void) => ipcRenderer.on('stop-recording', () => callback()),
  onLocalVideoFrame: (callback: (frame: VideoFrame) => void) =>
    ipcRenderer.on('on-local-video-frame', (event: IpcRendererEvent, frame: VideoFrame) => callback(frame)),
  onRemoteVideoFrame: (callback: (frame: VideoFrame) => void) =>
    ipcRenderer.on('on-remote-video-frame', (event: IpcRendererEvent, frame: VideoFrame) => callback(frame)),
  onMixedAudioFrame: (callback: (frame: AudioFrame) => void) =>
    ipcRenderer.on('on-mixed-audio-frame', (event: IpcRendererEvent, frame: AudioFrame) => callback(frame)),
  writeBuffer: (buffer: ArrayBuffer) => ipcRenderer.send('write-buffer', buffer),
  onFinishedEncoding: () => ipcRenderer.send('on-finished-encoding'),
});
