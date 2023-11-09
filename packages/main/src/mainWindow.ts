import { app, BrowserWindow, IpcMain, ipcMain, IpcMainEvent } from 'electron';
import { join, resolve } from 'node:path';
import { createWriteStream } from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegstatic from 'ffmpeg-static-electron';
import { tmpdir } from 'node:os';
import type { PathLike, WriteStream } from 'node:fs';

ffmpeg.setFfmpegPath(ffmpegstatic.path);

let recorderWindow: BrowserWindow;
let storageStream: WriteStream;
let tempVideoPath: PathLike;
const pageUrl = import.meta.env.VITE_DEV_SERVER_URL;
const isDev = import.meta.env.DEV && pageUrl !== undefined;

const windowWidth = 1280;
const windowHeight = 720;

ipcMain.on('init-storage-stream', initStorageStream);
ipcMain.on('write-buffer', writeBuffer);
ipcMain.on('on-finished-encoding', onFinishedEncoding);

async function createWindow() {
  const appIcon = join(app.getAppPath(), 'static/images/moti-webapp-icon.png');

  const browserWindow = new BrowserWindow({
    show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
    backgroundColor: '#181A22',
    minHeight: windowHeight,
    minWidth: windowWidth,
    height: windowHeight,
    width: windowWidth,
    center: true,
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Sandbox disabled because the demo of preload script depend on the Node.js api
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(app.getAppPath(), 'packages/preload/dist/index.cjs'),
    },
  });

  /**
   * If the 'show' property of the BrowserWindow's constructor is omitted from the initialization options,
   * it then defaults to 'true'. This can cause flickering as the window loads the html content,
   * and it also has show problematic behaviour with the closing of the window.
   * Use `show: false` and listen to the  `ready-to-show` event to show the window.
   *
   * @see https://github.com/electron/electron/issues/25012 for the afford mentioned issue.
   */
  browserWindow.on('ready-to-show', () => {
    browserWindow?.show();

    if (isDev) {
      browserWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test.
   */



  if (isDev && pageUrl) {
    await browserWindow.loadURL(pageUrl);
  } else {
    const file = join(app.getAppPath(), 'packages/renderer/dist/index.html')
    await browserWindow.loadFile(file);
  }

  return browserWindow;
}

// async function initRecorderWindow() {
//   const width = 1280; // Frame  width
//   const height = 720; // Frame height

//   recorderWindow = new BrowserWindow({
//     show: true,
//     backgroundColor: '#181A22',
//     height,
//     width,
//     center: true,
//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,
//       sandbox: false,
//       webviewTag: false,
//       preload: join(app.getAppPath(), 'packages/preload/dist/index.cjs'),
//     },
//   });

//   if (isDev && pageUrl) {
//     console.log('compositor window: ', pageUrl + 'offscreen');
//     await recorderWindow.loadURL(pageUrl + 'offscreen');
//   } else {
//     await recorderWindow.loadFile(resolve(__dirname, '../../renderer/dist/offscreen.html'));
//   }

//   recorderWindow.once('ready-to-show', () => {
//     recorderWindow.webContents.openDevTools({ mode: 'detach' });
//     console.log('ready to show compositor window')
//   });

//   ipcMain.on('on-local-video-frame', onLocalVideoFrame);
//   ipcMain.on('on-mixed-audio-frame', onMixedAudioFrame);
//   ipcMain.on('start-recording', startRecording);
//   ipcMain.on('stop-recording', stopRecording);
//   ipcMain.on('write-buffer', writeBuffer);
//   ipcMain.on('on-finished-encoding', onFinishedEncoding);
// }

function initStorageStream(event: IpcMainEvent) {
  tempVideoPath = join(tmpdir(), Date.now() + '.webm');
  console.log('temp video path:', tempVideoPath);
  storageStream = createWriteStream(tempVideoPath);
  // recorderWindow?.webContents.send('start-recording');
}

function onFinishedEncoding(event: IpcMainEvent) {
  storageStream.end(() => {
    console.log('storage stream ended - closing');
    storageStream.close(() => {
      console.log('storage stream closed - converting');
      convertToMP4(tempVideoPath.toString(), app.getPath('videos') + '/moti-' + Date.now() + '.mp4');
    })
  });
}

function writeBuffer(event: IpcMainEvent, buffer: ArrayBuffer) {
  storageStream.write(Buffer.from(buffer));
}

function convertToMP4(inputFile: string, outputFile: string) {
  ffmpeg()
    .input(inputFile)
    .videoCodec('libx264')
    .inputOptions([
      '-vsync vfr', // Specify variable frame rate (VFR)
    ])
    // .audioCodec('aac')
    // .format('mp4')
    .output(outputFile)
    .outputFormat('mp4')
    // .outputFPS(30)
    // .videoBitrate(900)
    // .audioBitrate(96)
    .on('end', () => {
      console.log('Conversion to MP4 completed.', outputFile);
    })
    .on('error', err => {
      console.error('Error converting to MP4:', err);
    })
    .run();
}

/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
    // initRecorderWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}
