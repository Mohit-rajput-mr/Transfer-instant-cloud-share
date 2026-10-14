import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Orbi Transfer — free instant file transfer, no login required, end-to-end encrypted";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The link preview card (WhatsApp, X, LinkedIn, Slack, iMessage…): the lockup on the black sky.
export default async function Image() {
  const svg = await readFile(join(process.cwd(), "public/brand/lockup.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 40%, #13161d 0%, #000 70%)", color: "#fff" }}>
        <img src={logo} width={828} height={120} alt="" />
        <div style={{ marginTop: 46, fontSize: 40, letterSpacing: 2, color: "#e8e8e8" }}>Free instant file transfer · No login required</div>
        <div style={{ marginTop: 16, fontSize: 26, letterSpacing: 4, color: "#3dff8c", textTransform: "uppercase" }}>End-to-end encrypted · Up to 2 GB · Burns in 5–30 min</div>
      </div>
    ),
    size,
  );
}
