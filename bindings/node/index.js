const root = require("path").join(__dirname, "..", "..");

module.exports =
  typeof globalThis.process?.dlopen === "function"
    ? require("node-gyp-build")(root)
    : null;

try {
  module.exports.nodeTypeInfo = require("../../src/node-types.json");
} catch (_) {}
