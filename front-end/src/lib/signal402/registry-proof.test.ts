import { describe, expect, it } from "vitest";

import {
  decodeRegistryAttestation,
  encodeRegistryAttestation,
} from "./registry-proof";

const MARKET_HASH = `0x${"a".repeat(64)}`;
const CONTENT_HASH = `0x${"b".repeat(64)}`;
const EXPECTED_CALLDATA =
  "0x8acbf78eaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("Signal402 registry call preview", () => {
  it("matches the frozen selector and calldata fixture", () => {
    expect(encodeRegistryAttestation(MARKET_HASH, CONTENT_HASH)).toBe(
      EXPECTED_CALLDATA,
    );
  });

  it("decodes to the exact function and ordered hashes", () => {
    expect(decodeRegistryAttestation(EXPECTED_CALLDATA)).toEqual({
      functionName: "attest",
      marketIdHash: MARKET_HASH,
      contentHash: CONTENT_HASH,
    });
  });

  it.each([
    ["zero market hash", `0x${"0".repeat(64)}`, CONTENT_HASH],
    ["zero content hash", MARKET_HASH, `0x${"0".repeat(64)}`],
    ["uppercase hash", `0x${"A".repeat(64)}`, CONTENT_HASH],
    ["short hash", "0x12", CONTENT_HASH],
  ])("rejects %s", (_label, marketIdHash, contentHash) => {
    expect(() =>
      encodeRegistryAttestation(marketIdHash, contentHash),
    ).toThrow();
  });

  it("rejects calldata for any other selector", () => {
    expect(() =>
      decodeRegistryAttestation(
        "0x70a082310000000000000000000000000000000000000000000000000000000000000000",
      ),
    ).toThrow();
  });
});
