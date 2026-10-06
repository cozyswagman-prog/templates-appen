// Shared browser/Worker policy. Parses containers, dimensions and metadata;
// compressed pixels are decoded by the browser, not by this structural validator.
(function (root) {
  const MAX_BYTES = 1900000, MAX_SIDE = 1600, MAX_PIXELS = 40000000;
  const fail = message => Object.assign(new Error(message), { code: 'image' });
  const invalid = () => { throw fail('Bildfilen är skadad eller har ett format som inte stöds. Välj bilden på nytt.'); };
  function inspect(bytes, format) {
    const b = bytes, view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const text = (p, n) => String.fromCharCode(...b.subarray(p, p + n));
    const range = (p, n) => { if (p < 0 || n < 0 || p + n > b.length) invalid(); };
    const u16 = p => { range(p, 2); return view.getUint16(p); };
    const u32 = p => { range(p, 4); return view.getUint32(p); };
    const le32 = p => { range(p, 4); return view.getUint32(p, true); };
    let width, height, clean = true; const metadata = [];
    if (format === 'png') {
      if (text(0, 8) !== '\x89PNG\r\n\x1a\n') invalid();
      let p = 8, header = false, pixels = false, end = false, color;
      while (p < b.length) {
        range(p, 12); const size = u32(p), kind = text(p + 4, 4); range(p, size + 12);
        if (!header && kind !== 'IHDR') invalid();
        if (kind === 'IHDR') {
          if (header || size !== 13) invalid(); header = true;
          width = u32(p + 8); height = u32(p + 12);
          color = b[p + 17];
          if (!({0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]})[color]?.includes(b[p + 16])) invalid();
          if (b[p + 18] !== 0 || b[p + 19] !== 0 || b[p + 20] > 1) invalid();
        } else if (kind === 'IDAT') pixels = true;
        else if (kind === 'IEND') { if (size !== 0 || !pixels || p + 12 !== b.length) invalid(); end = true; }
        else if (kind === 'PLTE') { if (pixels || !size || size > 768 || size % 3) invalid(); }
        else if (kind === 'tRNS') { if (pixels || !size || size > (color === 3 ? 256 : color === 0 ? 2 : color === 2 ? 6 : 0)) invalid(); }
        else if (['sRGB', 'gAMA', 'cHRM', 'pHYs'].includes(kind)) {
          if (size !== ({sRGB:1,gAMA:4,cHRM:32,pHYs:9})[kind]) invalid();
        } else { clean = false; if (kind.charCodeAt(0) & 32) metadata.push([p, p + size + 12]); }
        p += size + 12;
      }
      if (!header || !end) invalid();
    } else if (format === 'jpeg') {
      if (u16(0) !== 0xffd8) invalid();
      let p = 2, pixels = false, end = false;
      while (p < b.length) {
        const markerStart = p;
        if (b[p++] !== 255) invalid();
        while (b[p] === 255) p++;
        range(p, 1); const marker = b[p++];
        if (marker === 0xd9) { if (!pixels || p !== b.length) invalid(); end = true; break; }
        const size = u16(p); if (size < 2) invalid(); range(p, size);
        if ([0xc0, 0xc2].includes(marker)) {
          if (width || size < 8) invalid(); height = u16(p + 3); width = u16(p + 5);
        } else if (marker === 0xe0) {
          if (size !== 16 || text(p + 2, 5) !== 'JFIF\0' || b[p + 14] || b[p + 15]) { clean = false; metadata.push([markerStart, p + size]); }
        } else if (![0xc4, 0xdb, 0xdd, 0xda].includes(marker)) {
          clean = false;
          if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) metadata.push([markerStart, p + size]);
        }
        p += size;
        if (marker === 0xda) {
          if (!width) invalid(); pixels = true;
          // Entropy-coded FF00 and restart markers are pixels, not metadata.
          while (p < b.length) {
            if (b[p] !== 255) { p++; continue; }
            const next = b[p + 1];
            if (next === 0 || (next >= 0xd0 && next <= 0xd7)) { p += 2; continue; }
            break;
          }
        }
      }
      if (!width || !end) invalid();
    } else if (format === 'gif') {
      range(0, 13); if (!['GIF87a', 'GIF89a'].includes(text(0, 6))) invalid();
      width = view.getUint16(6, true); height = view.getUint16(8, true); clean = false;
    } else if (format === 'webp') {
      if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'WEBP' || le32(4) + 8 !== b.length) invalid();
      let p = 12; clean = false;
      while (p < b.length) {
        range(p, 8); const kind = text(p, 4), size = le32(p + 4), start = p + 8; range(start, size + (size % 2));
        if (!width && kind === 'VP8X') {
          if (size !== 10) invalid();
          width = 1 + b[start + 4] + (b[start + 5] << 8) + (b[start + 6] << 16);
          height = 1 + b[start + 7] + (b[start + 8] << 8) + (b[start + 9] << 16);
        } else if (!width && kind === 'VP8L') {
          if (size < 5 || b[start] !== 47) invalid();
          const bits = le32(start + 1); width = 1 + (bits & 0x3fff); height = 1 + ((bits >>> 14) & 0x3fff);
        } else if (!width && kind === 'VP8 ') {
          if (size < 10 || text(start + 3, 3) !== '\x9d\x01\x2a') invalid();
          width = view.getUint16(start + 6, true) & 0x3fff; height = view.getUint16(start + 8, true) & 0x3fff;
        }
        p = start + size + (size % 2);
      }
    } else invalid();
    if (!width || !height) invalid();
    return { width, height, clean, format, metadata };
  }
  // Only call after pixels were re-encoded to sRGB with EXIF orientation applied.
  // Canvas JPEG encoders may add their own ICC profile; remove it as well.
  function stripMetadata(bytes, format) {
    const { metadata } = inspect(bytes, format);
    const result = new Uint8Array(bytes.length - metadata.reduce((n, [start,end]) => n + end - start, 0));
    let source = 0, target = 0;
    for (const [start,end] of metadata) { result.set(bytes.subarray(source,start),target); target += start-source; source=end; }
    result.set(bytes.subarray(source),target); return result;
  }
  function validate(bytes, format) {
    if (bytes.length > MAX_BYTES) throw fail('En bild är för stor för publicering (högst 1,9 MB). Öppna projektet i appen och publicera igen för att anpassa bilden.');
    const info = inspect(bytes, format);
    if (!info.clean || info.width > MAX_SIDE || info.height > MAX_SIDE)
      throw fail('En bild behöver anpassas före publicering. Öppna projektet i appen och publicera igen. Bilder får vara högst 1600 pixlar och ska sakna kamerametadata.');
    return info;
  }
  const api = { inspect, validate, stripMetadata, MAX_BYTES, MAX_SIDE, MAX_PIXELS };
  root.ImagePolicy = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
