// @ts-nocheck

import { AudioBufferPool } from "./AudioBufferPool";
import { Queue } from "./Queue";

class AudioProcessor extends AudioWorkletProcessor {
  SAMPLES_IN = 1024;
  SAMPLES_OUT = 128;

  numProcessedSamples = 0;
  numInputSamples = 0;
  startTime = null;
  started = false;

  constructor() {
    super();
    this.port.onmessage = this.onMessage.bind(this);
    this.bufferPool = new AudioBufferPool(this.SAMPLES_OUT, this.SAMPLES_IN / this.SAMPLES_OUT * 2);
    this.outputBufferQueue = new Queue();
  }

  onMessage(event) {
    const inputBuffer = Uint8Array.from(event.data);
    var outputBuffer = this.bufferPool.getNextBuffer();
    if(!outputBuffer) {
      console.log('input overflow');
      return;
    }

    for (let i = 0; i < inputBuffer.length; i += 2) {
      let int = inputBuffer[i] | (inputBuffer[i + 1] << 8);
      let sample = int >= 0x8000 ? -(0x10000 - int) / 0x8000 : int / 0x7fff;
      let bufferIndex = (i/2) % this.SAMPLES_OUT;
      if (i != 0 && bufferIndex === 0) {
        this.outputBufferQueue.enqueue(outputBuffer);
        outputBuffer = this.bufferPool.getNextBuffer();
        if(!outputBuffer) {
          console.log('input overflow');
          return;
        }
        
      }
      outputBuffer[bufferIndex] = sample;
    }
    this.outputBufferQueue.enqueue(outputBuffer);
    // console.log(this.outputBufferQueue);

    this.numInputSamples += this.SAMPLES_IN;
    // console.log('input sample rate: ' + this.numInputSamples / (Date.now() - this.startTime) + '/s');
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const outputBuffer = this.outputBufferQueue.dequeue();
    if (!outputBuffer) {
      console.log('output buffer underflow');
      return true;
    }

    output[0].set(outputBuffer);
    this.bufferPool.returnBuffer(outputBuffer);
    this.numProcessedSamples += this.SAMPLES_OUT;
    if (!this.startTime) this.startTime = Date.now();
    // console.log('output sample rate: ' + this.numProcessedSamples / (Date.now() - this.startTime) * 1000 + '/s');

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
