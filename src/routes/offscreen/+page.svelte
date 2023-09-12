<script lang="ts">
  import {onDestroy, onMount} from 'svelte';
  import {VideoFrameRenderer} from '../../lib/VideoFrameRenderer'
  import {AudioFrameRenderer} from '../../lib/AudioFrameRenderer'

  let videoCanvas: HTMLCanvasElement;
  let mediaRecorder: MediaRecorder;

  const combinedStream = new MediaStream();

  let videoFrameRenderer: VideoFrameRenderer;
  let audioFrameRenderer: AudioFrameRenderer;

  onMount(async () => {
    let context = videoCanvas.getContext('webgl');
    if (!context) {
      alert('WebGL is not supported.');
      return;
    }
    videoFrameRenderer = new VideoFrameRenderer(context);
    audioFrameRenderer = new AudioFrameRenderer();
    combinedStream.addTrack(audioFrameRenderer.stream.getAudioTracks()[0]);
    combinedStream.addTrack(videoCanvas.captureStream(30).getVideoTracks()[0]);

    mediaRecorder = new MediaRecorder(combinedStream, {mimeType: 'video/webm; codecs=vp9'});
    mediaRecorder.ondataavailable = async (event: BlobEvent) => {
      window.recorderAPI.writeBuffer(await event.data.arrayBuffer());
    };
    mediaRecorder.onstart = () => {
      console.log('media recorder started');
    };
    mediaRecorder.onstop = () => {
      console.log('media recorder stopped');
      window.recorderAPI.onFinishedEncoding();
    };

    window.recorderAPI.onStart(startRecording);
    window.recorderAPI.onStop(stopRecording);
    window.recorderAPI.onLocalVideoFrame(videoFrameRenderer.renderFrame);
    window.recorderAPI.onMixedAudioFrame(audioFrameRenderer.renderFrame);
  });

  onDestroy(() => {
    
  });

  function startRecording() {
    mediaRecorder.start(1);
  }

  function stopRecording() {
    mediaRecorder.stop();
    videoFrameRenderer.clear();
  }

</script>

<svelte:head>
  <title>Offscreen</title>
</svelte:head>

  <canvas
    class="videoCanvas"
    width=1280px
    height=720px
    bind:this={videoCanvas}
  />

<style>

</style>
