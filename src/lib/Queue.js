class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

export class Queue {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  enqueue(data) {
    const newNode = new Node(data);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.size++;
  }

  dequeue() {
    if (!this.head) {
      return null;
    }
    const data = this.head.data;
    this.head = this.head.next;
    this.size--;
    return data;
  }

  peek() {
    if (!this.head) {
      return null;
    }
    return this.head.data;
  }

  isEmpty() {
    return this.size === 0;
  }

  getSize() {
    return this.size;
  }
}
