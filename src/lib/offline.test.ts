import { describe, expect, it } from "vitest";
import { decodeSignal, encodeSignal, slimSdp } from "./offline";

const SDP = [
  "v=0", "o=- 4611731400430051336 2 IN IP4 127.0.0.1", "s=-", "t=0 0", "a=group:BUNDLE 0", "a=extmap-allow-mixed", "a=msid-semantic: WMS",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel", "c=IN IP4 0.0.0.0",
  "a=candidate:1 1 udp 2113937151 3f2a9c1e-1111-2222-3333-444455556666.local 54321 typ host generation 0 network-cost 999",
  "a=ice-ufrag:abcd", "a=ice-pwd:0123456789abcdefghijklmn", "a=ice-options:trickle",
  "a=fingerprint:sha-256 12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0",
  "a=setup:actpass", "a=mid:0", "a=sctp-port:5000", "a=max-message-size:262144", "",
].join("\r\n");

describe("offline signal codes", () => {
  it("round-trips an offer and keeps every line a data channel needs", () => {
    const back = decodeSignal("offer", encodeSignal("offer", SDP));
    expect(back).toBe(slimSdp(SDP));
    for (const k of ["a=candidate:", "a=ice-ufrag:abcd", "a=ice-pwd:", "a=fingerprint:", "a=setup:actpass", "a=sctp-port:5000", "m=application"]) expect(back).toContain(k);
    expect(back).not.toContain("extmap-allow-mixed");
  });
  it("stays short enough for a QR code", () => {
    expect(encodeSignal("answer", SDP).length).toBeLessThan(700);
  });
  it("rejects the wrong kind of code and damaged codes with a readable message", () => {
    const a = encodeSignal("answer", SDP);
    expect(() => decodeSignal("offer", a)).toThrow(/reply code/);
    expect(() => decodeSignal("answer", encodeSignal("offer", SDP))).toThrow(/sender's code/);
    expect(() => decodeSignal("offer", "hello")).toThrow(/isn't an Orbi offline code/);
    expect(() => decodeSignal("answer", a.slice(0, 20) + "!!")).toThrow(/damaged/);
  });
});
