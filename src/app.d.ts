// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

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
    recorderAPI: {
      onStart: (callback: () => void) => void;
      onStop: (callback: () => void) => void;
      writeBuffer: (buffer: ArrayBuffer) => void;
      initStorageStream: () => void;
      onFinishedEncoding: () => void;
    };
  }
}

export {};