const fs = require("fs");
const content = fs.readFileSync("public/OHP.svg", "utf8");
const rectRegex = /<rect[^>]+id="([^"]+)"[^>]+height="([^"]+)"[^>]+width="([^"]+)"[^>]+y="([^"]+)"[^>]+x="([^"]+)"/g;
let match;
console.log("// RECTS");
while ((match = rectRegex.exec(content)) !== null) {
  console.log(`<rect id="${match[1]}" x="${parseFloat(match[5]).toFixed(1)}" y="${parseFloat(match[4]).toFixed(1)}" width="${parseFloat(match[3]).toFixed(1)}" height="${parseFloat(match[2]).toFixed(1)}" fill="#3a4449" stroke="#20272b" strokeWidth="4" rx="8" />`);
}
console.log("// PATHS");
const pathRegex = /<path[^>]+id="([^"]+)"[^>]+d="([^"]+)"/g;
while ((match = pathRegex.exec(content)) !== null) {
  console.log(`<path id="${match[1]}" d="${match[2]}" fill="#435057" stroke="#20272b" strokeWidth="8" />`);
}

