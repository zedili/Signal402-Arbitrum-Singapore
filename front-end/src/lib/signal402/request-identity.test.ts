import { describe, expect, it } from "vitest";

import {
  deriveCredentialDigest,
  derivePurchaseKey,
  deriveRequestFingerprint,
  normalizePositiveMarketId,
} from "./request-identity";

const terms = {
  network: "eip155:421614",
  asset: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  amountAtomic: "10000",
  payTo: "0x0573f139d21fb3140155567Cba7630d3948F4ea3",
};

describe("normalizePositiveMarketId", () => {
  it("preserves a canonical identifier exactly", () => {
    expect(normalizePositiveMarketId("123456")).toBe("123456");
  });

  it.each([0, "0", "01", "+1", " 1", "1 ", "1.0", "١"])(
    "rejects %s",
    (value) => {
      expect(() => normalizePositiveMarketId(value)).toThrow();
    },
  );
});

describe("deriveRequestFingerprint", () => {
  it("matches the frozen request and quoted-payment fixture", () => {
    expect(deriveRequestFingerprint("123456", terms)).toBe(
      "0x320d5453784f1ace97a3bc2f769092ce0af35f388afd86bd2718626b0abcf7a5",
    );
  });

  it.each([
    ["marketId", "654321", terms],
    ["network", "123456", { ...terms, network: "eip155:42161" }],
    [
      "asset",
      "123456",
      { ...terms, asset: "0x0000000000000000000000000000000000000001" },
    ],
    ["amount", "123456", { ...terms, amountAtomic: "10001" }],
    [
      "recipient",
      "123456",
      { ...terms, payTo: "0x0000000000000000000000000000000000000002" },
    ],
  ])("changes when %s changes", (_field, marketId, changedTerms) => {
    expect(deriveRequestFingerprint(marketId, changedTerms)).not.toBe(
      deriveRequestFingerprint("123456", terms),
    );
  });

  it("rejects invalid payment terms before hashing", () => {
    expect(() =>
      deriveRequestFingerprint("123456", { ...terms, amountAtomic: "010000" }),
    ).toThrow();
    const termsWithUnknownMember = {
      ...terms,
      unexpected: true,
    } as typeof terms;
    expect(() =>
      deriveRequestFingerprint("123456", termsWithUnknownMember),
    ).toThrow();
  });
});

describe("private purchase identity digests", () => {
  it("matches frozen SHA-256 fixtures without retaining raw values", () => {
    expect(derivePurchaseKey("fixture-idempotency-key-0001")).toBe(
      "0x07ac9cb08fd123e50f89b02d3f51cf16ef5e6e4308570da4ee6ee7ebb3528a1a",
    );
    expect(
      deriveCredentialDigest(
        new TextEncoder().encode("fixture-payment-header"),
      ),
    ).toBe(
      "0xe459384f398dcbe8200ba75ce9c7a84fd98a34f73d23019496d1ef73812b0486",
    );
  });

  it("changes with any raw identity change", () => {
    expect(derivePurchaseKey("fixture-idempotency-key-0001")).not.toBe(
      derivePurchaseKey("fixture-idempotency-key-0002"),
    );
    expect(deriveCredentialDigest(new Uint8Array([1]))).not.toBe(
      deriveCredentialDigest(new Uint8Array([2])),
    );
  });

  it("rejects empty, control-bearing, oversized, and short identity material", () => {
    for (const value of [
      "",
      "too-short",
      "valid-length-key\n",
      "x".repeat(257),
    ]) {
      expect(() => derivePurchaseKey(value)).toThrow();
    }
    expect(() => deriveCredentialDigest(new Uint8Array())).toThrow();
    expect(() => deriveCredentialDigest(new Uint8Array(16_385))).toThrow();
  });
});
