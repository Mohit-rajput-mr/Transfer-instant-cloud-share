import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { planOfPrice, verifyPaddle } from "./paddle";

const sign = (raw: string, secret: string, ts: number) => `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${raw}`).digest("hex")}`;

describe("verifyPaddle", () => {
  const raw = '{"event_type":"subscription.created"}';
  const now = 1_800_000_000_000;
  const ts = now / 1000;
  it("accepts a fresh, correct signature", () => expect(verifyPaddle(raw, sign(raw, "s3cret", ts), "s3cret", now)).toBe(true));
  it("rejects a wrong secret", () => expect(verifyPaddle(raw, sign(raw, "other", ts), "s3cret", now)).toBe(false));
  it("rejects a changed body", () => expect(verifyPaddle(raw + " ", sign(raw, "s3cret", ts), "s3cret", now)).toBe(false));
  it("rejects an old signature", () => expect(verifyPaddle(raw, sign(raw, "s3cret", ts - 600), "s3cret", now)).toBe(false));
  it("rejects a missing header or secret", () => {
    expect(verifyPaddle(raw, null, "s3cret", now)).toBe(false);
    expect(verifyPaddle(raw, sign(raw, "s3cret", ts), "", now)).toBe(false);
  });
});

describe("planOfPrice", () => {
  it("maps only our four prices", () => {
    process.env.PADDLE_PRICE_PRO_YEARLY = "pri_proy";
    process.env.PADDLE_PRICE_BUSINESS_MONTHLY = "pri_bizm";
    expect(planOfPrice("pri_proy")).toEqual({ plan: "pro", billing: "yearly" });
    expect(planOfPrice("pri_bizm")).toEqual({ plan: "business", billing: "monthly" });
    expect(planOfPrice("pri_other")).toBeNull();
    expect(planOfPrice(undefined)).toBeNull();
  });
});
