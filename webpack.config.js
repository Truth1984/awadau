const path = require("path");
const fs = require("fs");
const u = require("./index");

let fetchModPath = "./node_modules/isomorphic-fetch/fetch-npm-browserify.js";
if (fs.existsSync(fetchModPath)) {
  let content = fs.readFileSync(fetchModPath, "utf8").toString();
  if (u.contains(content, "self.fetch.bind")) {
    let replacement =
      'var globalObject = typeof self === "undefined" ? global : self; module.exports = globalObject.fetch.bind(globalObject);';
    content = content.replace("module.exports = self.fetch.bind(self);", replacement);
    fs.writeFileSync(fetchModPath, content);
  }
}

module.exports = {
  entry: "./entry.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
};
