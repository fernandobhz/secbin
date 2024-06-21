import { Transform } from "stream";

export class TimestampAddStream extends Transform {
  constructor(date, options) {
    super({ ...options });
    this.date = date;
    this.firstChunk = true;
  }

  _transform(chunk, encoding, callback) {
    try {
      if (this.firstChunk) {
        const isoDate = this.date.toISOString();
        const isoDateLine = `${isoDate}\n`
        this.push(isoDateLine);
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
