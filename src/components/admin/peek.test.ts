import { describe, expect, it } from "vitest";
import { kindOf, mimeOf } from "./AdminPeek";

describe("HQ preview kinds", () => {
  it("guesses the type from the name when the sender gave none", () => {
    expect(mimeOf("clip.MP4", "")).toBe("video/mp4");
    expect(mimeOf("a.jpeg", "application/octet-stream")).toBe("image/jpeg");
    expect(mimeOf("x.bin", "")).toBe("application/octet-stream");
    expect(mimeOf("photo.png", "image/webp")).toBe("image/webp");
  });
  it("shows media, PDFs and text, never runs markup", () => {
    expect(kindOf("image/png")).toBe("image");
    expect(kindOf("video/quicktime")).toBe("video");
    expect(kindOf("audio/mpeg")).toBe("audio");
    expect(kindOf("application/pdf")).toBe("pdf");
    expect(kindOf("text/html")).toBe("text");
    expect(kindOf("image/svg+xml")).toBe("text");
    expect(kindOf("text/x-orbit-link")).toBe("link");
    expect(kindOf("application/x-orbit-folder")).toBe("folder");
    expect(kindOf("application/zip")).toBe("other");
  });
});
