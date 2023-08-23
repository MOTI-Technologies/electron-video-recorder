import {app, BrowserWindow, IpcMain, ipcMain, IpcMainEvent} from 'electron';
import {join} from 'node:path';
import {URL} from 'node:url';
import { RawAudioFrameOpModeType, createAgoraRtcEngine, VideoSourceType, RenderModeType, ChannelProfileType, ClientRoleType, ChannelMediaOptions, AudioFrame, VideoFrame, IVideoFrameObserver, IAudioFrameObserver, IRtcEngineEx } from "agora-electron-sdk";
import * as fs from 'fs';
import * as path from'path';
import * as os from 'os';
import { write } from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegstatic from 'ffmpeg-static-electron';

ffmpeg.setFfmpegPath(ffmpegstatic.path);

let compositorWindow: BrowserWindow;
let storageStream: fs.WriteStream;
let videoPath: fs.PathLike;
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

  // ipcMain.on('joinChannel', (event, channel, token) => {
  //   console.log('received test event', token);
  //   joinChannel(channel, token);
  // });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test.
   */


  await browserWindow.loadURL(pageUrl);

  return browserWindow;
}

function initCompositorWindow() {
  const width = 1280; // Frame width
  const height = 720; // Frame height

  compositorWindow = new BrowserWindow({
    show: true, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
    backgroundColor: '#181A22',
    height,
    width,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Sandbox disabled because the demo of preload script depend on the Node.js api
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(app.getAppPath(), 'packages/preload/dist/index.cjs'),
    },
  });

  compositorWindow.loadURL(pageUrl + 'offscreen');
  
  compositorWindow.once('ready-to-show', () => {
    compositorWindow.webContents.openDevTools({mode: 'detach'});
    console.log('ready to show compositor window')
  });

  ipcMain.on('composite-local-frame', compositeLocalFrame);
  videoPath = path.join(os.homedir(), 'Desktop/test' + new Date().toTimeString() + '.ts')
  console.log('video path:', videoPath);
  storageStream = fs.createWriteStream(videoPath);
  ipcMain.on('write-buffer', writeBuffer)
  ipcMain.on('on-mixed-audio-frame', onMixedAudioFrame);
  ipcMain.on('leave', (event: IpcMainEvent) => {
    convertToMP4(videoPath.toString(), app.getPath('temp') + 'video.mp4');
  })
//   mp4Container.on('data', (segment: any) => {
// console.log('on data');
//     let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
//     data.set(segment.initSegment, 0);
//     data.set(segment.data, segment.initSegment.byteLength);
//     console.log(mp4Container.mp4.tools.inspect(data));
//     storageStream.write(data);
    // mp4Container.off('data');
    // mp4Container.on('data', (segment:any) =>{
    //   storageStream.write(new Uint8Array(segment.data));
    // })
  // })
}

function convertToMP4(inputFile, outputFile) {
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
    .on('error', (err) => {
      console.error('Error converting to MP4:', err);
    })
    .run();
}

function onMixedAudioFrame(event: IpcMainEvent, frame: AudioFrame) {
  compositorWindow?.webContents.send('on-mixed-audio-frame', frame);
}
function writeBuffer(event: IpcMainEvent, buffer:ArrayBuffer) {
  // mp4Container.push(new Uint8Array(buffer));
  // mp4Container.flush();
    storageStream.write(Buffer.from(buffer));
  // Get the converted MP4 Blob

}

function compositeLocalFrame(event: IpcMainEvent, frame: VideoFrame) {
  compositorWindow?.webContents.send('composite-local-frame', frame);
}
/**
 * Restore an existing BrowserWindow or Create a new BrowserWindow.
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
    initCompositorWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}


