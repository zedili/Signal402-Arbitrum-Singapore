import { describe, expect, it } from "vitest";

import {
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
