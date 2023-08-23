<script lang="ts">
  import {onDestroy, onMount} from 'svelte';
  import type {AudioFrame, VideoFrame} from 'agora-electron-sdk';

  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;
  let yTex: WebGLTexture;
  let uTex: WebGLTexture;
  let vTex: WebGLTexture;
  let vShader: WebGLShader;
  let fShader: WebGLShader;
  let glProgram: WebGLProgram;
  let mediaRecorder: MediaRecorder;

  let audioStream: MediaStream;
  let videoStream: MediaStream;
  const combinedStream = new MediaStream();

  let audioBuffer: AudioBuffer;
  let audioSource: AudioBufferSourceNode;

  const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
      }
      `;

  const fragmentShaderSource = `
  precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D yTexture;
    uniform sampler2D uTexture;
    uniform sampler2D vTexture;
    const mat4 YUV2RGB = mat4(
		1.0, 1.0, 1.0, 0.0,
  0.0, -0.344136, 1.772, 0.0,
  1.402, -0.714136, 0.0, 0.0,
  0.0, 0.0, 0.0, 1.0
    );
    void main() {
      vec3 yuv;
      yuv.x = texture2D(yTexture, v_texCoord).r;
      yuv.y = texture2D(uTexture, v_texCoord).r - 0.5;
      yuv.z = texture2D(vTexture, v_texCoord).r - 0.5;
      gl_FragColor = vec4(YUV2RGB * vec4(yuv, 1.0)).rgba;
    }
      `;

  // Pseudocode example
  const audioContext = new AudioContext();

  const audioDestination = audioContext.createMediaStreamDestination();
  function processAudioFrame(audioFrame: AudioFrame) {
    audioSource = audioContext.createBufferSource();
    // Convert Uint8Array audioFrame to Float32Array (assuming PCM format)
    let buffer = audioFrame.buffer;
    if (!buffer) return;
    const audioData = audioBuffer.getChannelData(0);
    // for (let i = 0; i < buffer.length; i++) {
    //   audioData[i] = (buffer[i] - 128) / 128.0;
    // }

    for (let i = 0; i < buffer.length; i += 2) {
    const sample = (buffer[i]<< 8) | (buffer[i + 1]);
    audioData[i / 2] = (sample / 32768.0); // Normalize to [-1, 1]
    
  }
  console.log('32-bit audio: ', audioData);

    // Set the audio data for the buffer
    // audioBuffer.copyToChannel(audioData, 0);
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioDestination);
    audioSource.start();
  }

  onMount(() => {
    initWebGL();

    videoStream = canvas.captureStream(30);
    audioStream = new MediaStream();
    initAudio();
    combinedStream.addTrack(videoStream.getVideoTracks()[0]);

    
    mediaRecorder = new MediaRecorder(combinedStream, {mimeType: 'video/webm; codecs=vp9'});
    mediaRecorder.ondataavailable = async (event: BlobEvent) => {
      window.compositorAPI.writeBuffer(await event.data.arrayBuffer());
      console.log('media recorder output: ', await event.data.arrayBuffer());
    };
    window.compositorAPI.onCompositeLocalFrame(compositeLocalFrame);
    window.compositorAPI.onMixedAudioFrame(processAudioFrame);
    mediaRecorder.start(1);
  });

  onDestroy(() => {
    mediaRecorder.stop();
  });

  function initWebGL() {
    let context = canvas.getContext('webgl');
    if (!context) {
      alert('WebGL is not supported.');
      return;
    }
    gl = context;
    initTextures();
    initShaders();
    initProgram();
    initVertexBuffer();
  }

  function initTextures() {
    let tex = createTexture();
    if (tex) {
      yTex = tex;
    }
    tex = createTexture();
    if (tex) {
      uTex = tex;
    }
    tex = createTexture();
    if (tex) {
      vTex = tex;
    }
  }

  function initAudio() {
    // Create an AudioBuffer
    const numChannels = 1; // Mono audio
    const sampleRate = 16000;
    audioBuffer = audioContext.createBuffer(numChannels, 1024, sampleRate);
    // Create an AudioBufferSourceNode to play the audio buffer
 

    // Connect the audio source to the audio stream
     

    // Add the audio stream to your audio stream
    combinedStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
  }

  function createTexture(): WebGLTexture | null {
    const tex = gl.createTexture();
    if (!tex) {
      console.log('failed to create texture');
      return null;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);

    const level = 0;
    const internalFormat = gl.LUMINANCE;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.LUMINANCE;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return tex;
  }

  function initShaders() {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) {
      console.log('failed to create vertex shader');
      return;
    }
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    vShader = vertexShader;

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      console.log('failed to create fragment shader');
      return;
    }
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    fShader = fragmentShader;
  }

  function initProgram() {
    const program = gl.createProgram();
    if (!program) {
      console.log('failed to create gl program');
      return;
    }
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    glProgram = program;
    const yTextureLocation = gl.getUniformLocation(glProgram, 'yTexture');
    const uTextureLocation = gl.getUniformLocation(glProgram, 'uTexture');
    const vTextureLocation = gl.getUniformLocation(glProgram, 'vTexture');
    gl.uniform1i(yTextureLocation, 0);
    gl.uniform1i(uTextureLocation, 1);
    gl.uniform1i(vTextureLocation, 2);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  }

  function initVertexBuffer() {
    const positions = [-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0];
    const positionAttributeLocation = gl.getAttribLocation(glProgram, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  }

  function compositeLocalFrame(frame: VideoFrame) {
    canvas.width = frame.width ?? 640;
    canvas.height = frame.height ?? 480;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, yTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      canvas.width,
      canvas.height,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      frame.yBuffer ?? new Uint8Array(),
    );

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, uTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      canvas.width / 2,
      canvas.height / 2,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      frame.uBuffer ?? new Uint8Array(),
    );

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, vTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      canvas.width / 2,
      canvas.height / 2,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      frame.vBuffer ?? new Uint8Array(),
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
</script>

<svelte:head>
  <title>Offscreen</title>
</svelte:head>

<canvas bind:this={canvas} />

<style>
</style>
