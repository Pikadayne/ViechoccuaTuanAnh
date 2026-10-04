// Ensure FormData.prototype.keys exists so formdata-polyfill never attempts
// to patch window.fetch.
if (typeof window !== 'undefined') {
  try {
    if (typeof FormData !== 'undefined' && !FormData.prototype.keys) {
      (FormData.prototype as unknown as Record<string, unknown>).keys = function () {
        return [][Symbol.iterator]();
      };
    }
  } catch {
    // Ignore
  }
}
