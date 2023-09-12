// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type {AudioFrame, VideoFrame} from 'agora-electron-sdk';

declare global {
  declare namespace App {

    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }


  interface ImportMetaEnv {
    readonly VITE_FIREBASE_APIKEY: string;
    readonly VITE_FIREBASE_AUTHDOMAIN: string;
    readonly VITE_FIREBASE_DATABASEURL: string;
    readonly VITE_FIREBASE_PROJECTID: string;
    readonly VITE_FIREBASE_STORAGEBUCKET: string;
    readonly VITE_FIREBASE_MESSAGINGSENDERID: string;
    readonly VITE_FIREBASE_APPID: string;
    readonly VITE_FIREBASE_MEASUREMENTID: string;
    readonly VITE_AGORA_APP_ID: string;
    readonly VITE_AGORA_PRIMARY_CERT: string;
    readonly VITE_REDI_PASSWORD: string;
    readonly VITE_REDIS_HOST: string;
    readonly VITE_REDIS_PORT: string;
    readonly VITE_TOKEN_EXPIRATION_SECONDS: string;
    readonly VITE_API_URL: string;
    readonly VITE_SOCKETS_API_URL: string;
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
      onLocalVideoFrame: (callback: (frame: VideoFrame) => void) => void;
      onRemoteVideoFrame: (callback: (frame: VideoFrame) => void) => void;
      onMixedAudioFrame: (callback: (frame: AudioFrame) => void) => void;
      writeBuffer: (buffer: ArrayBuffer) => void;
      onFinishedEncoding: () => void;
    };
  }
}
