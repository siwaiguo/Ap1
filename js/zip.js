/* 简单的无压缩 ZIP 写入器：用于把本页面渲染的 PNG 一起打包。没有外部依赖。 */
(function (root) {
  'use strict';
  const encoder = new TextEncoder();
  const table = Array.from({length:256}, (_, index) => {
    let c = index;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    return c >>> 0;
  });
  function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) value = (value >>> 8) ^ table[(value ^ byte) & 255];
    return (value ^ 0xffffffff) >>> 0;
  }
  function zipFiles(files) {
    const localParts = [], directoryParts = [];
    let offset = 0, directorySize = 0;
    for (const file of files) {
      const name = encoder.encode(file.name), data = file.data;
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length), l = new DataView(local.buffer);
      l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true);
      l.setUint16(6, 0x800, true); l.setUint16(12, 33, true); // UTF-8 名称；1980-01-01。
      l.setUint32(14, crc, true); l.setUint32(18, data.length, true); l.setUint32(22, data.length, true);
      l.setUint16(26, name.length, true); local.set(name, 30);
      localParts.push(local, data);
      const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
      c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, offset, true); central.set(name, 46);
      directoryParts.push(central); directorySize += central.length; offset += local.length + data.length;
    }
    const end = new Uint8Array(22), view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true); view.setUint16(8, files.length, true); view.setUint16(10, files.length, true);
    view.setUint32(12, directorySize, true); view.setUint32(16, offset, true);
    return new Blob([...localParts, ...directoryParts, end], {type:'application/zip'});
  }
  root.FractalZip = {zipFiles};
})(globalThis);
