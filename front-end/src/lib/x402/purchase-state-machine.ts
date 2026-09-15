import { sha256 } from "viem";

import type {
  ClaimInput,
  PreparedResponse,
  ReplayRecord,
  ReplayState,
  ReplayStore,
  SettlementReceipt,
} from "./replay-store";

export type PurchaseProblemCode =
  | "idempotency_conflict"
  | "purchase_in_progress"
  | "replay_store_unavailable"
  | "settlement_outcome_unknown"
  | "stored_receipt_invalid";

export type BeginPurchaseResult =
  | { kind: "proceed"; record: ReplayRecord }
  | { kind: "replay"; body: Uint8Array; settlementHeader: string }
  | { kind: "problem"; code: PurchaseProblemCode };

export type StateChangeResult =
  | { ok: true; record: ReplayRecord }
  | { ok: false; code: "purchase_in_progress" | "replay_store_unavailable" };

function existingResult(record: ReplayRecord): BeginPurchaseResult {
  if (record.state === "settled") {
    if (!record.preparedResponse || !record.settlement) {
      return { kind: "problem", code: "stored_receipt_invalid" };
    }
    if (
      sha256(record.preparedResponse.body) !== record.preparedResponse.sha256
    ) {
      return { kind: "problem", code: "stored_receipt_invalid" };
    }
    return {
      kind: "replay",
      body: record.preparedResponse.body.slice(),
      settlementHeader: record.settlement.header,
    };
  }
  if (record.state === "outcome_unknown") {
    return { kind: "problem", code: "settlement_outcome_unknown" };
  }
  return { kind: "problem", code: "purchase_in_progress" };
}

export async function beginPurchase(
  store: ReplayStore,
  input: ClaimInput,
): Promise<BeginPurchaseResult> {
  try {
    const claim = await store.claim(input);
    if (claim.kind === "conflict")
      return { kind: "problem", code: "idempotency_conflict" };
    if (claim.kind === "claimed")
      return { kind: "proceed", record: claim.record };
    if (claim.record.state !== "failed_retryable")
      return existingResult(claim.record);

    const retry = await store.transition({
      purchaseKey: claim.record.purchaseKey,
      expectedVersion: claim.record.version,
      from: "failed_retryable",
      to: "verifying",
      nowMs: input.nowMs,
      clearPrepared: true,
    });
    return retry.kind === "transitioned"
      ? { kind: "proceed", record: retry.record }
      : retry.kind === "version_or_state_mismatch"
        ? existingResult(retry.record)
        : { kind: "problem", code: "replay_store_unavailable" };
  } catch {
    return { kind: "problem", code: "replay_store_unavailable" };
  }
}

async function changeState(
  store: ReplayStore,
  record: ReplayRecord,
  to: ReplayState,
  nowMs: number,
  fields: {
    preparedResponse?: PreparedResponse;
    settlement?: SettlementReceipt;
  } = {},
): Promise<StateChangeResult> {
  try {
    const result = await store.transition({
      purchaseKey: record.purchaseKey,
      expectedVersion: record.version,
      from: record.state,
      to,
      nowMs,
      ...fields,
    });
    return result.kind === "transitioned"
      ? { ok: true, record: result.record }
      : result.kind === "version_or_state_mismatch"
        ? { ok: false, code: "purchase_in_progress" }
        : { ok: false, code: "replay_store_unavailable" };
  } catch {
    return { ok: false, code: "replay_store_unavailable" };
  }
}

export const markProcessing = (
  store: ReplayStore,
  record: ReplayRecord,
  nowMs: number,
) => changeState(store, record, "processing", nowMs);

export function markPrepared(
  store: ReplayStore,
  record: ReplayRecord,
  body: Uint8Array,
  nowMs: number,
) {
  const immutableBody = body.slice();
  return changeState(store, record, "prepared", nowMs, {
    preparedResponse: { body: immutableBody, sha256: sha256(immutableBody) },
  });
}

export const markSettling = (
  store: ReplayStore,
  record: ReplayRecord,
  nowMs: number,
) => changeState(store, record, "settling", nowMs);

export const markSettled = (
  store: ReplayStore,
  record: ReplayRecord,
  settlement: SettlementReceipt,
  nowMs: number,
) => changeState(store, record, "settled", nowMs, { settlement });

export function markPreSettlementFailure(
  store: ReplayStore,
  record: ReplayRecord,
  nowMs: number,
) {
  if (
    !(["verifying", "processing", "prepared"] as ReplayState[]).includes(
      record.state,
    )
  ) {
    return Promise.resolve<StateChangeResult>({
      ok: false,
      code: "replay_store_unavailable",
    });
  }
  return changeState(store, record, "failed_retryable", nowMs);
}

export function markSettlementFailure(
  store: ReplayStore,
  record: ReplayRecord,
  outcome: "proven_unconsumed" | "unknown",
  nowMs: number,
) {
  return changeState(
    store,
    record,
    outcome === "proven_unconsumed" ? "failed_retryable" : "outcome_unknown",
    nowMs,
  );
}

export function reconcileUnknown(
  store: ReplayStore,
  record: ReplayRecord,
  result:
    | { kind: "settled"; settlement: SettlementReceipt }
    | { kind: "proven_unconsumed" },
  nowMs: number,
) {
  return result.kind === "settled"
    ? changeState(store, record, "settled", nowMs, {
        settlement: result.settlement,
      })
    : changeState(store, record, "failed_retryable", nowMs);
}
