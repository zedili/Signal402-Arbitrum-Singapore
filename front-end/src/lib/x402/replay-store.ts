import type { Hex } from "viem";

export const replayStates = [
  "verifying",
  "processing",
  "prepared",
  "settling",
  "settled",
  "failed_retryable",
  "outcome_unknown",
] as const;

export type ReplayState = (typeof replayStates)[number];

export type PurchaseIdentity = Readonly<{
  purchaseKey: Hex;
  credentialDigest: Hex;
  requestFingerprint: Hex;
}>;

export type PreparedResponse = Readonly<{
  body: Uint8Array;
  sha256: Hex;
}>;

export type SettlementReceipt = Readonly<{
  header: string;
  network: string;
  transaction: Hex;
}>;

export type ReplayRecord = PurchaseIdentity &
  Readonly<{
    schemaVersion: "signal402.replay.v1";
    state: ReplayState;
    version: bigint;
    createdAtMs: number;
    updatedAtMs: number;
    expiresAtMs: number;
    preparedResponse?: PreparedResponse;
    settlement?: SettlementReceipt;
  }>;

export type ClaimInput = PurchaseIdentity &
  Readonly<{
    nowMs: number;
    expiresAtMs: number;
  }>;

export type ClaimResult =
  | { kind: "claimed"; record: ReplayRecord }
  | { kind: "existing_match"; record: ReplayRecord }
  | { kind: "conflict"; reason: "purchase_key_mismatch" | "credential_reused" };

export type TransitionInput = Readonly<{
  purchaseKey: Hex;
  expectedVersion: bigint;
  from: ReplayState;
  to: ReplayState;
  nowMs: number;
  preparedResponse?: PreparedResponse;
  settlement?: SettlementReceipt;
  clearPrepared?: boolean;
}>;

export type TransitionResult =
  | { kind: "transitioned"; record: ReplayRecord }
  | { kind: "not_found" }
  | { kind: "version_or_state_mismatch"; record: ReplayRecord };

export interface ReplayStore {
  readonly adapterKind: "memory-test-only" | "durable";
  claim(input: ClaimInput): Promise<ClaimResult>;
  get(purchaseKey: Hex, nowMs: number): Promise<ReplayRecord | null>;
  transition(input: TransitionInput): Promise<TransitionResult>;
}

export const legalReplayTransitions: Readonly<
  Record<ReplayState, readonly ReplayState[]>
> = {
  verifying: ["processing", "failed_retryable"],
  processing: ["prepared", "failed_retryable"],
  prepared: ["settling", "failed_retryable"],
  settling: ["settled", "failed_retryable", "outcome_unknown"],
  settled: [],
  failed_retryable: ["verifying"],
  outcome_unknown: ["settled", "failed_retryable"],
};
