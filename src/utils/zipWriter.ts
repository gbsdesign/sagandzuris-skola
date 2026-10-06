// A small ZIP writer without compression ("stored"): MP3s don't shrink anyway, and storing keeps it fast.
// Files go out one by one to a sink (a file on disk, or Blob parts kept by the browser), so a big
// archive never sits in one array in memory. Names are UTF-8 (Georgian). No ZIP64: stays under 4 GB.

export interface ZipSink {
  write: (data: Uint8Array) => Promise<void>;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const dosTime = (d: Date) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

interface Entry { name: Uint8Array; crc: number; size: number; offset: number }

export class ZipWriter {
  private entries: Entry[] = [];
  private offset = 0;
  private queue: Promise<void> = Promise.resolve();
  private stamp = dosTime(new Date());

  constructor(private sink: ZipSink) {}

  private out(data: Uint8Array) {
    this.offset += data.length;
    return this.sink.write(data);
  }

  /** Adds one file; calls are queued, so several can be added at once. */
  add(path: string, data: Uint8Array): Promise<void> {
    const run = async () => {
      const name = new TextEncoder().encode(path);
      const entry: Entry = { name, crc: crc32(data), size: data.length, offset: this.offset };
      if (this.offset + data.length > 0xfffffff0) throw new Error('zip: over 4 GB');
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true);
      h.setUint16(4, 20, true);
      h.setUint16(6, 0x0800, true); // UTF-8 names
      h.setUint16(8, 0, true); // stored
      h.setUint16(10, this.stamp.time, true);
      h.setUint16(12, this.stamp.date, true);
      h.setUint32(14, entry.crc, true);
      h.setUint32(18, entry.size, true);
      h.setUint32(22, entry.size, true);
      h.setUint16(26, name.length, true);
      h.setUint16(28, 0, true);
      await this.out(new Uint8Array(h.buffer));
      await this.out(name);
      await this.out(data);
      this.entries.push(entry);
    };
    const p = this.queue.then(run);
    this.queue = p.catch(() => {});
    return p;
  }

  /** Writes the central directory; the archive is complete after this. */
  async finish(): Promise<void> {
    await this.queue;
    const start = this.offset;
    for (const e of this.entries) {
      const h = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x02014b50, true);
      h.setUint16(4, 20, true);
      h.setUint16(6, 20, true);
      h.setUint16(8, 0x0800, true);
      h.setUint16(10, 0, true);
      h.setUint16(12, this.stamp.time, true);
      h.setUint16(14, this.stamp.date, true);
      h.setUint32(16, e.crc, true);
      h.setUint32(20, e.size, true);
      h.setUint32(24, e.size, true);
      h.setUint16(28, e.name.length, true);
      h.setUint32(42, e.offset, true);
      await this.out(new Uint8Array(h.buffer));
      await this.out(e.name);
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, this.offset - start, true);
    end.setUint32(16, start, true);
    await this.out(new Uint8Array(end.buffer));
  }
}
