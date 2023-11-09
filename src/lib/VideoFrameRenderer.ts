import {mat4} from 'gl-matrix'

export class Rect {
  x: number;
  y: number;
  height: number;
  width: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

export class VideoFrameRenderer {
  gl: WebGLRenderingContext;
  rgbaTex: WebGLTexture | undefined;
  vShader: WebGLShader | undefined;
  fShader: WebGLShader | undefined;
  glProgram: WebGLProgram | undefined;

  uProjectionMatrix!: WebGLUniformLocation | null;

  private vertexShaderSource = `
    attribute vec2 a_position;
    uniform mat4 uProjectionMatrix;
    varying vec2 v_texCoord;

    void main() {
      gl_Position = uProjectionMatrix * vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position * 0.5 + 0.5;
    }
    `;

  private yuvShaderSource = `
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

  private rgbaShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D rgbaTexture;

    void main() {
      gl_FragColor = texture2D(rgbaTexture, v_texCoord);
    }
    `;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    console.log('initwebgl');
    this.initWebGL();
  }

  private initWebGL() {
    this.initTexture();
    this.initShaders();
    this.initProgram();
    this.initVertexBuffer();
    this.clear();
  }

  private initTexture() {
    const tex = this.createTexture();
    if (tex) {
      this.rgbaTex = tex;
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
    const internalFormat = this.gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = this.gl.RGBA;
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
    this.gl.shaderSource(fragmentShader, this.rgbaShaderSource);
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
    const rgbaTextureLocation = this.gl.getUniformLocation(this.glProgram, 'rgbaTexture');
    this.uProjectionMatrix = this.gl.getUniformLocation(this.glProgram, 'uProjectionMatrix');
    this.gl.uniform1i(rgbaTextureLocation, 0);
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

  public renderFrame = (frame: ImageData, viewport: Rect) => {
    // if (!this.rgbaTex) {
    //   console.log('render error: uninitialized texture');
    //   return;
    // }

    const textureWidth = frame.width;
    const textureHeight = frame.height;
    this.gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    const tex = this.gl.createTexture();
    if (!tex) {
      console.log('failed to create texture');
      return null;
    }
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      frame,
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

    const textureAspectRatio = textureWidth / textureHeight;
    const canvasAspectRatio = viewport.width / viewport.height;

    let scaleWidth = 1;
    let scaleHeight = 1;

    if (textureAspectRatio > canvasAspectRatio) {
      // texture is wider than the canvas
      scaleWidth = canvasAspectRatio / textureAspectRatio;
    } else {
      // texture is taller than the canvas
      scaleHeight = textureAspectRatio / canvasAspectRatio;
    }

    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -scaleWidth, scaleWidth, -scaleHeight, scaleHeight, -1, 1);

    this.gl.uniformMatrix4fv(this.uProjectionMatrix, false, projectionMatrix);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  };

  public clear = () => {
    this.gl.clearColor(0, 0, 0, 1)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  };
}