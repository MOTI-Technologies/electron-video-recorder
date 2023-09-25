// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { AudioFrame, VideoFrame } from 'agora-electron-sdk';

declare global {
  declare namespace App {

    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }


  interface ImportMetaEnv {
    readonly VITE_AGORA_APP_ID: string;
    readonly DEV: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    agoraAPI: {
      joinChannel: (channel: string, token: string) => void;
      leaveChannel: () => void;
      startRecording: () => void;
      stopRecording: () => void;
    };
    recorderAPI: {
      onStart: (callback: () => void) => void;
      onStop: (callback: () => void) => void;
      onLocalVideoFrame: (callback: (frame: VideoFrame, uid: number) => void) => void;
      onRemoteVideoFrame: (callback: (frame: VideoFrame) => void) => void;
      onMixedAudioFrame: (callback: (frame: AudioFrame) => void) => void;
      writeBuffer: (buffer: ArrayBuffer) => void;
      onFinishedEncoding: () => void;
    };
  }
}
