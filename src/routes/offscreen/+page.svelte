<script lang="ts">
  import {onDestroy, onMount} from 'svelte';
  import {VideoFrameRenderer, Rect} from '../../lib/VideoFrameRenderer';
  import {AudioFrameRenderer} from '../../lib/AudioFrameRenderer';
  import type {VideoFrame, AudioFrame} from 'agora-electron-sdk';

  let videoCanvas: HTMLCanvasElement;
  let mediaRecorder: MediaRecorder;

  const combinedStream = new MediaStream();
  var videoStreamTrack: CanvasCaptureMediaStreamTrack;

  let videoFrameRenderer: VideoFrameRenderer;
  let audioFrameRenderer: AudioFrameRenderer;

  let canvasWidth = 1280;
  let canvasHeight = 720;

  var frameCount = 0;
  var fps = 0;
  var startTime: number | null;

  var localFrame: VideoFrame | null, remoteFrame: VideoFrame | null;

  var isRecording = false,
    encoderStarted = false,
    videoReady = false,
    audioReady = false;

  let rerenderLocal = false;

  onMount(async () => {
    let context = videoCanvas.getContext('webgl');
    if (!context) {
      alert('WebGL is not supported.');
      return;
    }
    videoFrameRenderer = new VideoFrameRenderer(context);
    audioFrameRenderer = new AudioFrameRenderer();
    videoStreamTrack = videoCanvas.captureStream(0).getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    combinedStream.addTrack(audioFrameRenderer.stream.getAudioTracks()[0]);
    combinedStream.addTrack(videoStreamTrack);

    mediaRecorder = new MediaRecorder(combinedStream, {mimeType: 'video/webm'});
    mediaRecorder.ondataavailable = async (event: BlobEvent) => {
      window.recorderAPI.writeBuffer(await event.data.arrayBuffer());
    };
    mediaRecorder.onstart = () => {
      console.log('media recorder started');
      // isRecording = true;
    };
    mediaRecorder.onstop = () => {
      console.log('media recorder stopped');
      window.recorderAPI.onFinishedEncoding();
      videoFrameRenderer.clear();
    };

    window.recorderAPI.onStart(startRecording);
    window.recorderAPI.onStop(stopRecording);
    window.recorderAPI.onLocalVideoFrame(onLocalVideoFrame);
    window.recorderAPI.onMixedAudioFrame(onMixedAudioFrame);
  });

  onDestroy(() => {});

  function startRecording() {
    console.log('starting media recorder');
    isRecording = true;
  }

  function stopRecording() {
    mediaRecorder.stop();
    isRecording = videoReady = audioReady = encoderStarted = false;
    localFrame = remoteFrame = startTime = null;
    frameCount = 0;
  }

  function onLocalVideoFrame(frame: VideoFrame, uid: number) {
    if (!isRecording) return;
    let isLocal = uid === 0;
    if (isLocal) {
      localFrame = frame;
      if (rerenderLocal) remoteFrame = frame;
    } else {
      remoteFrame = frame;
    }

    if (localFrame && remoteFrame) {
      if (!videoReady) {
        videoReady = true;
        if (audioReady && !encoderStarted) {
          mediaRecorder.start(1);
          encoderStarted = true;
        }
      }

      videoFrameRenderer.renderFrame(localFrame, new Rect(0, 0, canvasWidth / 2, canvasHeight));
      videoFrameRenderer.renderFrame(remoteFrame, new Rect(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight));
      videoStreamTrack.requestFrame();
      frameCount++;
      localFrame = remoteFrame = null;
      if (!startTime) startTime = Date.now();
      fps = frameCount / (Date.now() - startTime) * 1000;
    }
  }

  function onMixedAudioFrame(frame: AudioFrame) {
    if (!isRecording) return;
    if (!audioReady) {
      audioReady = true;
      if (videoReady && !encoderStarted) {
        mediaRecorder.start(1);
        encoderStarted = true;
      }
    }
    audioFrameRenderer.renderFrame(frame);
    
  }
</script>

<svelte:head>
  <title>Offscreen</title>
</svelte:head>

<canvas
  class="videoCanvas"
  width="{canvasWidth}px"
  height="{canvasHeight}px"
  bind:this={videoCanvas}
/>
<p>FPS: {fps}</p>

<style>
</style>
