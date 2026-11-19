import { describe, expect, it } from "vitest";
import { codeAt, otpOn, sessionOf } from "./otp";

const jwt = (p: object) => `x.${Buffer.from(JSON.stringify(p)).toString("base64url")}.y`;

describe("login codes", () => {
  it("reads the session id from a Supabase token", () => {
    expect(sessionOf(jwt({ session_id: "6f1c0d3e-1111-4222-8333-944455556666" }))).toBe("6f1c0d3e-1111-4222-8333-944455556666");
    expect(sessionOf(jwt({ session_id: "nope" }))).toBeNull();
    expect(sessionOf("garbage")).toBeNull();
  });
  it("a session counts as logged in only after an email code", () => {
    expect(codeAt(jwt({ amr: [{ method: "password", timestamp: 5 }] }))).toBeNull();
    expect(codeAt(jwt({ amr: [{ method: "oauth", timestamp: 5 }] }))).toBeNull();
    expect(codeAt(jwt({ amr: [{ method: "otp", timestamp: 9 }] }))).toBe(9);
  });
  it("is on unless switched off", () => {
    delete process.env.LOGIN_CODE;
    expect(otpOn()).toBe(true);
    process.env.LOGIN_CODE = "off";
    expect(otpOn()).toBe(false);
    delete process.env.LOGIN_CODE;
  });
});
