import { describe, expect, it } from "vitest";
import { otpOn, sessionOf } from "./otp";

const jwt = (p: object) => `x.${Buffer.from(JSON.stringify(p)).toString("base64url")}.y`;

describe("otp", () => {
  it("reads the session id from a Supabase token", () => {
    expect(sessionOf(jwt({ session_id: "6f1c0d3e-1111-4222-8333-944455556666" }))).toBe("6f1c0d3e-1111-4222-8333-944455556666");
    expect(sessionOf(jwt({ session_id: "nope" }))).toBeNull();
    expect(sessionOf("garbage")).toBeNull();
  });
  it("is off until a mail key is set", () => {
    delete process.env.RESEND_API_KEY;
    expect(otpOn()).toBe(false);
    process.env.RESEND_API_KEY = "re_x";
    expect(otpOn()).toBe(true);
    delete process.env.RESEND_API_KEY;
  });
});
