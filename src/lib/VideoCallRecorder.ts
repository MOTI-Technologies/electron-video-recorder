import {Rect, VideoFrameRenderer} from './VideoFrameRenderer';
import { writable } from 'svelte/store';

export interface VideoFrameSource {
  requestFrames(): VideoRecorderFrames;
}

export class VideoRecorderFrames {
  localFrame?: ImageData;
  remoteFrame?: ImageData;

  constructor(localFrame?: ImageData, remoteFrame?: ImageData) {
    this.localFrame = localFrame;
    this.remoteFrame = remoteFrame;
  }
}

export class VideoCallRecorder {
  videoCanvas: HTMLCanvasElement;
  context: OffscreenCanvasRenderingContext2D;
  mediaRecorder: MediaRecorder;

  combinedStream = new MediaStream();
  videoStreamTrack: CanvasCaptureMediaStreamTrack;
  videoFrameSource: VideoFrameSource;
  // videoFrameRenderer: VideoFrameRenderer;

  canvasWidth = 1280;
  canvasHeight = 720;

  canvasAspectRatio = this.canvasWidth / this.canvasHeight;

  frameCount = 0;
  fps = writable<number>(0);

  startTime: number | null = null;

  isRecording = false;
  fpsInterval?: NodeJS.Timeout | null;

  renderedFrames: VideoRecorderFrames = new VideoRecorderFrames();

  constructor(frameSource: VideoFrameSource) {
    this.videoCanvas = document.createElement('canvas');
    this.videoCanvas.width = this.canvasWidth;
    this.videoCanvas.height = this.canvasHeight;
    const context = this.videoCanvas.transferControlToOffscreen().getContext('2d');
    if (!context) {
      throw new Error('Unable to get 2d canvas context');
    }
    this.context = context;
    this.videoStreamTrack = this.videoCanvas.captureStream(0).getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    this.videoFrameSource = frameSource;
    this.combinedStream.addTrack(this.videoStreamTrack);
    this.mediaRecorder = new MediaRecorder(this.combinedStream, {mimeType: 'video/webm'});

    this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
      if (!this.isRecording) return;
      window.recorderAPI.writeBuffer(await event.data.arrayBuffer());
    };
    this.mediaRecorder.onstart = () => {
      console.log('media recorder started');
    };
    this.mediaRecorder.onstop = () => {
      console.log('media recorder stopped');
      window.recorderAPI.onFinishedEncoding();
    };
    // this.videoFrameRenderer = new VideoFrameRenderer(context);
  }

  start() {
    window.recorderAPI.initStorageStream();
    this.mediaRecorder.start(10);
    this.isRecording = true;
    requestAnimationFrame(this.onFrame);
  }

  stop() {
    this.isRecording = false;
    this.mediaRecorder.stop();
    this.startTime = null;
    this.frameCount = 0;
    this.fps.set(0);
  }

  addAudioTrack = (track: MediaStreamTrack) => {
    this.combinedStream.addTrack(track);
  };

  onFrame = () => {
    // this.context.clearRect(0, 0, this.videoCanvas.width, this.videoCanvas.height);
    if (this.renderedFrames.remoteFrame) {
        this.drawAspectFill(this.renderedFrames.remoteFrame, this.canvasWidth / 2, 0, this.canvasWidth / 2, this.canvasHeight);
      // this.videoFrameRenderer.renderFrame(
      //   this.renderedFrames.remoteFrame,
      //   new Rect(this.canvasWidth / 2, 0, this.canvasWidth / 2, this.canvasHeight),
      // );
    }
    if (this.renderedFrames.localFrame) {
      // this.videoFrameRenderer.renderFrame(
      //   this.renderedFrames.localFrame,
      //   new Rect(0, 0, this.canvasWidth / 2, this.canvasHeight),
      // );
        this.drawAspectFill(this.renderedFrames.localFrame, 0, 0, this.canvasWidth / 2, this.canvasHeight);
    }

    if (this.startTime == null) {
      this.startTime = Date.now();
    } else {
      this.fps.set((++this.frameCount / (Date.now() - this.startTime)) * 1000);
    }
    if (this.isRecording) {
      requestAnimationFrame(this.onFrame);
      this.videoStreamTrack.requestFrame();
    }
    this.renderedFrames = this.videoFrameSource.requestFrames();
  };

  async drawAspectFill(frame: ImageData, xOffset: number, yOffset: number, width: number, height: number) {
    const sourceWidth = frame.width;
    const sourceHeight = frame.height;

    const destWidth = width;
    const destHeight = height;

    const sourceAspectRatio = sourceWidth / sourceHeight;
    const destAspectRatio = destWidth / destHeight;

    let drawWidth, drawHeight;

    if (destAspectRatio > sourceAspectRatio) {
        drawWidth = destWidth;
        drawHeight = drawWidth / sourceAspectRatio;
    } else {
        drawHeight = destHeight;
        drawWidth = drawHeight * destAspectRatio;
    }

     const x = (sourceWidth - destWidth) / 2;
     const y = (sourceHeight - drawHeight) / 2;
     const imageBitmap = await createImageBitmap(frame);

    this.context.drawImage(imageBitmap, x, y, drawWidth, drawHeight, xOffset, yOffset, width, height);
  }
}
