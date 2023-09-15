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
  startRecording: () => {
    callManager.isRecording = true;
    ipcRenderer.send('start-recording');
  },
  stopRecording: () => {
    callManager.isRecording = false;
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
