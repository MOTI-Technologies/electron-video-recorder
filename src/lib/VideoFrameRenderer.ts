import type {VideoFrame} from 'agora-electron-sdk';

export class VideoFrameRenderer {
  gl: WebGLRenderingContext;
  yTex: WebGLTexture | undefined;
  uTex: WebGLTexture | undefined;
  vTex: WebGLTexture | undefined;
  vShader: WebGLShader | undefined;
  fShader: WebGLShader | undefined;
  glProgram: WebGLProgram | undefined;

  private vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position * 0.5 + 0.5;
    }
    `;

  private fragmentShaderSource = `
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

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    console.log('initwebgl');
    this.initWebGL();
  }

  private initWebGL() {
    this.initTextures();
    this.initShaders();
    this.initProgram();
    this.initVertexBuffer();
  }

  private initTextures() {
    let tex = this.createTexture();
    if (tex) {
      this.yTex = tex;
    }
    tex = this.createTexture();
    if (tex) {
      this.uTex = tex;
    }
    tex = this.createTexture();
    if (tex) {
      this.vTex = tex;
    }
  }

  private createTexture(): WebGLTexture | null {
    const tex = this.gl.createTexture();
    if (!tex) {
      console.log('failed to create texture');
      return null;
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

    const level = 0;
    const internalFormat = this.gl.LUMINANCE;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = this.gl.LUMINANCE;
    const srcType = this.gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    return tex;
  }

  private initShaders() {
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!vertexShader) {
      console.log('failed to create vertex shader');
      return;
    }
    this.gl.shaderSource(vertexShader, this.vertexShaderSource);
    this.gl.compileShader(vertexShader);
    this.vShader = vertexShader;

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      console.log('failed to create fragment shader');
      return;
    }
    this.gl.shaderSource(fragmentShader, this.fragmentShaderSource);
    this.gl.compileShader(fragmentShader);
    this.fShader = fragmentShader;
  }

  private initProgram() {
    const program = this.gl.createProgram();
    if (!program || !this.vShader || !this.fShader) {
      console.log('failed to create gl program');
      return;
    }
    this.gl.attachShader(program, this.vShader);
    this.gl.attachShader(program, this.fShader);
    this.gl.linkProgram(program);
    this.gl.useProgram(program);
    this.glProgram = program;
    const yTextureLocation = this.gl.getUniformLocation(this.glProgram, 'yTexture');
    const uTextureLocation = this.gl.getUniformLocation(this.glProgram, 'uTexture');
    const vTextureLocation = this.gl.getUniformLocation(this.glProgram, 'vTexture');
    this.gl.uniform1i(yTextureLocation, 0);
    this.gl.uniform1i(uTextureLocation, 1);
    this.gl.uniform1i(vTextureLocation, 2);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
  }

  private initVertexBuffer() {
    if (!this.glProgram) {
      console.log('failed to create vertex buffer: invalid glProgram');
      return;
    }
    const positions = [-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0];
    const positionAttributeLocation = this.gl.getAttribLocation(this.glProgram, 'a_position');
    const positionBuffer = this.gl.createBuffer();
    if (!positionBuffer) {
      console.log('failed to create vertex buffer');
      return;
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  public renderFrame = (frame: VideoFrame) => {
    if (!this.yTex || !this.uTex || !this.vTex) {
      console.log('render error: undefined textures');
      return;
    }

    let width = frame.width ?? 640;
    let height = frame.height ?? 480;

    this.gl.viewport(0, 0, 1280, 720);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTex!);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      width,
      height,
      0,
      this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE,
      frame.yBuffer ?? new Uint8Array(),
    );

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTex!);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      width / 2,
      height / 2,
      0,
      this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE,
      frame.uBuffer ?? new Uint8Array(),
    );

    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTex!);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      width / 2,
      height / 2,
      0,
      this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE,
      frame.vBuffer ?? new Uint8Array(),
    );

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  };

  public clear = () => {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }
}
