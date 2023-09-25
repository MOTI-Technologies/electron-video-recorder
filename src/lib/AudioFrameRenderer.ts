import type {AudioFrame} from 'agora-electron-sdk';

export class AudioFrameRenderer {
  private audioContext = new AudioContext({sampleRate: 16000});
  private audioDestination = this.audioContext.createMediaStreamDestination();
  private audioWorkletNode!: AudioWorkletNode;

  get stream(): MediaStream {
    return this.audioDestination.stream;
  }

  constructor() {
    this.initWorklet();
  }

  private async initWorklet() {
    try {
      await this.audioContext.audioWorklet.addModule('/src/lib/AudioProcessor.js');
    } catch (error) {
      console.log(error);
      return;
    }
    this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
    this.audioWorkletNode.connect(this.audioDestination);
  }

  public renderFrame = (audioFrame: AudioFrame) => {
    let buffer = audioFrame.buffer;
    if (!buffer) return;
    
    this.audioWorkletNode.port.postMessage(buffer);
  };
}
