// Ensure all parent and child processes running in Node 26 use the cross-platform WASM SWC bindings
if (typeof process !== 'undefined' && process.versions) {
  process.versions.webcontainer = '1';
}
