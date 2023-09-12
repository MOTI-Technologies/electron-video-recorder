import {app, BrowserWindow, IpcMain, ipcMain, IpcMainEvent} from 'electron';
import {join} from 'node:path';
import {URL} from 'node:url';
import {AudioFrame, VideoFrame} from 'agora-electron-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {write} from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegstatic from 'ffmpeg-static-electron';

ffmpeg.setFfmpegPath(ffmpegstatic.path);

let recorderWindow: BrowserWindow;
let storageStream: fs.WriteStream;
let tempVideoPath: fs.PathLike;
const pageUrl =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
    ? import.meta.env.VITE_DEV_SERVER_URL
    : new URL('../renderer/dist/index.html', 'file://' + __dirname).toString();

async function createWindow() {
  const appIcon = join(app.getAppPath(), 'static/images/moti-webapp-icon.png');

  const browserWindow = new BrowserWindow({
    show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
    backgroundColor: '#181A22',
    minHeight: 668,
    minWidth: 960,
    height: 668,
    width: 960,
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

    if (import.meta.env.DEV) {
      browserWindow?.webContents.openDevTools({mode: 'detach'});
    }
  });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test.
   */

  await browserWindow.loadURL(pageUrl);

  return browserWindow;
}

function initRecorderWindow() {
  const width = 1280; // Frame width
  const height = 720; // Frame height

  recorderWindow = new BrowserWindow({
    show: true,
    backgroundColor: '#181A22',
    height,
    width,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false,
      preload: join(app.getAppPath(), 'packages/preload/dist/index.cjs'),
    },
  });

  recorderWindow.loadURL(pageUrl + 'offscreen');

  recorderWindow.once('ready-to-show', () => {
    recorderWindow.webContents.openDevTools({mode: 'detach'});
  });

  ipcMain.on('on-local-video-frame', onLocalVideoFrame);
  ipcMain.on('on-mixed-audio-frame', onMixedAudioFrame);
  ipcMain.on('start-recording', startRecording);
  ipcMain.on('stop-recording', stopRecording);
  ipcMain.on('write-buffer', writeBuffer);
  ipcMain.on('on-finished-encoding', onFinishedEncoding);
}

function startRecording(event: IpcMainEvent) {
  tempVideoPath = path.join(os.tmpdir(), Date.now() + '.ts');
  console.log('temp video path:', tempVideoPath);
  storageStream = fs.createWriteStream(tempVideoPath);
  storageStream.on('finish', () => {
    convertToMP4(tempVideoPath.toString(), app.getPath('videos') + '/moti-' + Date.now() + '.mp4');
  })
  recorderWindow?.webContents.send('start-recording');
}

function stopRecording(event: IpcMainEvent) {
  recorderWindow?.webContents.send('stop-recording');
}

function onFinishedEncoding(event: IpcMainEvent) {
  storageStream.end();
}

function onLocalVideoFrame(event: IpcMainEvent, frame: VideoFrame) {
  recorderWindow?.webContents.send('on-local-video-frame', frame);
}

function onMixedAudioFrame(event: IpcMainEvent, frame: AudioFrame) {
  recorderWindow?.webContents.send('on-mixed-audio-frame', frame);
}

function writeBuffer(event: IpcMainEvent, buffer: ArrayBuffer) {
  storageStream.write(Buffer.from(buffer));
}

function convertToMP4(inputFile: string, outputFile: string) {
  ffmpeg()
    .input(inputFile)
    .videoCodec('libx264')
    // .audioCodec('aac')
    .format('mp4')
    .output(outputFile)
    .videoBitrate(900)
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
    initRecorderWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}
