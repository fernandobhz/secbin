import { Transform } from "stream";

export class TimestampExtractStream extends Transform {
  constructor({ options } = {}) {
    super({ ...options });
    this.firstChunk = true;
  }

  _transform(chunk, encoding, callback) {
    try {
      if (this.firstChunk) {
        const isoDate = chunk.slice(0, 24);
        this.date = new Date(isoDate);
        chunk = chunk.slice(25);
        this.firstChunk = false;
      }

      this.push(chunk, encoding);
      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }
}
