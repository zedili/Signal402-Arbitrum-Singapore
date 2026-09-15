import { decodeFunctionData, encodeFunctionData, type Hex } from "viem";

const bytes32Pattern = /^0x[0-9a-f]{64}$/;

export const signal402RegistryAbi = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "contentHash", type: "bytes32" },
    ],
    outputs: [{ name: "attestationId", type: "bytes32" }],
  },
] as const;

function assertNonzeroHash(value: string, label: string): asserts value is Hex {
  if (!bytes32Pattern.test(value) || value === `0x${"0".repeat(64)}`) {
    throw new TypeError(`${label} must be a nonzero lowercase bytes32 hash`);
  }
}

export function encodeRegistryAttestation(
  marketIdHash: string,
  contentHash: string,
): Hex {
  assertNonzeroHash(marketIdHash, "Market ID hash");
  assertNonzeroHash(contentHash, "Content hash");
  return encodeFunctionData({
    abi: signal402RegistryAbi,
    functionName: "attest",
    args: [marketIdHash, contentHash],
  });
}

export function decodeRegistryAttestation(data: Hex) {
  const decoded = decodeFunctionData({ abi: signal402RegistryAbi, data });
  if (decoded.functionName !== "attest" || !decoded.args) {
    throw new TypeError("Calldata is not a Signal402 attest call");
  }
  const [marketIdHash, contentHash] = decoded.args;
  assertNonzeroHash(marketIdHash, "Market ID hash");
  assertNonzeroHash(contentHash, "Content hash");
  return { functionName: "attest" as const, marketIdHash, contentHash };
}
