import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, "../.next");

function getDirectorySizeInMB(targetDir) {
  let size = 0;

  function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walk(filePath);
      } else {
        size += stat.size;
      }
    });
  }

  if (fs.existsSync(targetDir)) {
    walk(targetDir);
  }

  return (size / 1024 / 1024).toFixed(2);
}

console.log("📊 Bundle Size Analysis");
console.log("========================");

const sizes = {
  static: getDirectorySizeInMB(path.join(buildDir, "static")),
  server: getDirectorySizeInMB(path.join(buildDir, "server")),
  cache: getDirectorySizeInMB(path.join(buildDir, "cache")),
};

console.log(`Static: ${sizes.static} MB`);
console.log(`Server: ${sizes.server} MB`);
console.log(`Cache: ${sizes.cache} MB`);
const totalSize =
  parseFloat(sizes.static || "0") +
  parseFloat(sizes.server || "0") +
  parseFloat(sizes.cache || "0");
console.log(`Total: ${totalSize.toFixed(2)} MB`);

console.log("\n💡 Recommendations:");
if (parseFloat(sizes.static) > 2) {
  console.log("⚠️  Static bundle is large. Consider code splitting.");
}
if (parseFloat(sizes.server) > 3) {
  console.log("⚠️  Server bundle is large. Consider extracting utilities.");
}
