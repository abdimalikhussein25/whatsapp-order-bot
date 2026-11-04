import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { extractTextMessages, verifySignature } from "../src/whatsapp.js";

describe("verifySignature", () => {
  const secret = "app-secret";
  const body = '{"hello":"world"}';
  const good = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a valid signature", () => expect(verifySignature(body, good, secret)).toBe(true));
  it("rejects a tampered body", () => expect(verifySignature(body + " ", good, secret)).toBe(false));
  it("rejects a missing header", () => expect(verifySignature(body, undefined, secret)).toBe(false));
  it("rejects garbage", () => expect(verifySignature(body, "sha256=abc", secret)).toBe(false));
});

describe("extractTextMessages", () => {
  it("reads text and interactive replies, ignores the rest", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { from: "2526", id: "m1", type: "text", text: { body: "menu" } },
                  { from: "2526", id: "m2", type: "interactive", interactive: { button_reply: { id: "dalbo" } } },
                  { from: "2526", id: "m3", type: "image", image: {} },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(extractTextMessages(payload)).toEqual([
      { from: "2526", text: "menu", messageId: "m1" },
      { from: "2526", text: "dalbo", messageId: "m2" },
    ]);
  });

  it("handles status-only webhooks", () => {
    expect(extractTextMessages({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
  });
});
