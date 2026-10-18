// The QR an Orbi file shows in its share panel (Panels.tsx ShareBlock: origin + "/?o=" + id), as a module matrix
const QR = require(process.argv[3] || "qrcode");
const q = QR.create("https://orbitransfer.com/?o=lx0001", {});
const n = q.modules.size, data = Array.from(q.modules.data).map(Number);
require("fs").writeFileSync(process.argv[2], JSON.stringify({ n, data }));
console.log("size", n);
