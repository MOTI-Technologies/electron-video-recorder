export class AudioBufferPool {
    constructor(bufferSize, poolSize) {
      if (bufferSize <= 0 || poolSize <= 0) {
        throw new Error('Buffer size and pool size must be greater than zero.');
      }
  
      this.bufferSize = bufferSize;
      this.poolSize = poolSize;
      this.inputBufferList = null;
      this.initializeBufferList();
    }
  
    initializeBufferList() {
      let currentBuffer = null;
      for (let i = 0; i < this.poolSize; i++) {
        const buffer = new Float32Array(this.bufferSize);
        const bufferNode = { buffer, next: null };
        if (currentBuffer) {
          currentBuffer.next = bufferNode;
        } else {
          this.inputBufferList = bufferNode;
        }
        currentBuffer = bufferNode;
      }
    }
  
    getNextBuffer() {
      if (this.inputBufferList) {
        const bufferNode = this.inputBufferList;
        this.inputBufferList = bufferNode.next;
        return bufferNode.buffer;
      }
      return null;
    }
  
    returnBuffer(buffer) {
      const bufferNode = { buffer, next: this.inputBufferList };
      this.inputBufferList = bufferNode;
    }
  }