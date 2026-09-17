import { sha256, type Hex } from "viem";

import {
  legalReplayTransitions,
  replayStates,
  type ClaimInput,
  type ClaimResult,
  type PreparedResponse,
  type ReplayRecord,
  type ReplayState,
  type ReplayStore,
  type SettlementReceipt,
  type TransitionInput,
  type TransitionResult,
} from "./replay-store";

export interface PostgresQueryExecutor {
  query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[],
  ): Promise<readonly Row[]>;
}

type ReplayRow = Readonly<{
  schema_version: unknown;
  purchase_key: unknown;
  credential_digest: unknown;
  request_fingerprint: unknown;
  state: unknown;
  version: unknown;
  response_body: unknown;
  response_body_sha256: unknown;
  settlement_header: unknown;
  payment_network: unknown;
  payment_tx_hash: unknown;
  created_at: unknown;
  updated_at: unknown;
  expires_at: unknown;
}>;

type ClaimRow = ReplayRow & { result_kind: unknown };

const hashPattern = /^0x[0-9a-f]{64}$/;
const transactionPattern = /^0x[0-9a-fA-F]{64}$/;

const claimSql = `
  select *
  from signal402.claim_purchase(
    $1::bytea,
    $2::bytea,
    $3::bytea,
    $4::timestamptz,
    $5::timestamptz
  )
`;

const getSql = `
  select
    schema_version,
    purchase_key,
    credential_digest,
    request_fingerprint,
    state,
    version,
    response_body,
    response_body_sha256,
    settlement_header,
    payment_network,
    payment_tx_hash,
    created_at,
    updated_at,
    expires_at
  from signal402.paid_purchase_replays
  where purchase_key = $1::bytea
    and expires_at > $2::timestamptz
  limit 1
`;

const transitionSql = `
  update signal402.paid_purchase_replays
  set
    state = $4,
    version = version + 1,
    updated_at = $5::timestamptz,
    response_body = case
      when $6::boolean then null
      when $7::bytea is not null then $7::bytea
      else response_body
    end,
    response_body_sha256 = case
      when $6::boolean then null
      when $8::bytea is not null then $8::bytea
      else response_body_sha256
    end,
    settlement_header = case
      when $6::boolean then null
      when $9::text is not null then $9::text
      else settlement_header
    end,
    payment_network = case
      when $6::boolean then null
      when $10::text is not null then $10::text
      else payment_network
    end,
    payment_tx_hash = case
      when $6::boolean then null
      when $11::bytea is not null then $11::bytea
      else payment_tx_hash
    end
  where purchase_key = $1::bytea
    and version = $2::bigint
    and state = $3
    and expires_at > $5::timestamptz
  returning
    schema_version,
    purchase_key,
    credential_digest,
    request_fingerprint,
    state,
    version,
    response_body,
    response_body_sha256,
    settlement_header,
    payment_network,
    payment_tx_hash,
    created_at,
    updated_at,
    expires_at
`;

function assertHash(value: string, label: string) {
  if (!hashPattern.test(value)) throw new TypeError(`Invalid ${label}`);
}

function assertSafeTimestamp(value: number, label: string) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`Invalid ${label}`);
}

function toBytea(value: Hex | Uint8Array) {
  const bytes =
    typeof value === "string"
      ? value.slice(2)
      : Buffer.from(value).toString("hex");
  return `\\x${bytes}`;
}

function fromBytea(value: unknown, label: string): Uint8Array {
  if (value instanceof Uint8Array) return value.slice();
  if (typeof value === "string" && /^\\x[0-9a-fA-F]*$/.test(value)) {
    return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
  }
  throw new TypeError(`Invalid ${label} from replay store`);
}

function fromHash(value: unknown, label: string): Hex {
  const bytes = fromBytea(value, label);
  if (bytes.length !== 32) throw new TypeError(`Invalid ${label} length`);
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

function fromTimestamp(value: unknown, label: string) {
  const milliseconds =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string" || typeof value === "number"
        ? new Date(value).getTime()
        : Number.NaN;
  if (!Number.isSafeInteger(milliseconds)) {
    throw new TypeError(`Invalid ${label} from replay store`);
  }
  return milliseconds;
}

function nullableString(value: unknown, label: string) {
  if (value === null) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`Invalid ${label} from replay store`);
  }
  return value;
}

function rowToRecord(row: ReplayRow): ReplayRecord {
  if (row.schema_version !== "signal402.replay.v1") {
    throw new TypeError("Unsupported replay schema version");
  }
  if (
    typeof row.state !== "string" ||
    !replayStates.includes(row.state as ReplayState)
  ) {
    throw new TypeError("Invalid replay state from replay store");
  }
  let version: bigint;
  try {
    version = BigInt(row.version as string | number | bigint);
  } catch {
    throw new TypeError("Invalid replay version from replay store");
  }
  if (version < BigInt(0)) throw new TypeError("Invalid replay version");

  const preparedBody =
    row.response_body === null
      ? undefined
      : fromBytea(row.response_body, "prepared response");
  const preparedHash =
    row.response_body_sha256 === null
      ? undefined
      : fromHash(row.response_body_sha256, "prepared response digest");
  if (Boolean(preparedBody) !== Boolean(preparedHash)) {
    throw new TypeError("Incomplete prepared response from replay store");
  }
  const preparedResponse: PreparedResponse | undefined =
    preparedBody && preparedHash
      ? { body: preparedBody, sha256: preparedHash }
      : undefined;
  if (
    preparedResponse &&
    sha256(preparedResponse.body) !== preparedResponse.sha256
  ) {
    throw new TypeError("Prepared response digest mismatch");
  }

  const settlementHeader = nullableString(
    row.settlement_header,
    "settlement header",
  );
  const settlementNetwork = nullableString(
    row.payment_network,
    "settlement network",
  );
  const settlementTransaction =
    row.payment_tx_hash === null
      ? undefined
      : fromHash(row.payment_tx_hash, "settlement transaction");
  const settlementCount = [
    settlementHeader,
    settlementNetwork,
    settlementTransaction,
  ].filter(Boolean).length;
  if (settlementCount !== 0 && settlementCount !== 3) {
    throw new TypeError("Incomplete settlement receipt from replay store");
  }
  const settlement: SettlementReceipt | undefined =
    settlementHeader && settlementNetwork && settlementTransaction
      ? {
          header: settlementHeader,
          network: settlementNetwork,
          transaction: settlementTransaction,
        }
      : undefined;
  if (row.state === "settled" && (!preparedResponse || !settlement)) {
    throw new TypeError("Settled replay is incomplete");
  }
  if (row.state !== "settled" && settlement) {
    throw new TypeError("Unsettled replay contains a receipt");
  }

  return {
    schemaVersion: "signal402.replay.v1",
    purchaseKey: fromHash(row.purchase_key, "purchase key"),
    credentialDigest: fromHash(row.credential_digest, "credential digest"),
    requestFingerprint: fromHash(
      row.request_fingerprint,
      "request fingerprint",
    ),
    state: row.state as ReplayState,
    version,
    createdAtMs: fromTimestamp(row.created_at, "created timestamp"),
    updatedAtMs: fromTimestamp(row.updated_at, "updated timestamp"),
    expiresAtMs: fromTimestamp(row.expires_at, "expiry timestamp"),
    preparedResponse,
    settlement,
  };
}

function assertClaim(input: ClaimInput) {
  assertHash(input.purchaseKey, "purchase key");
  assertHash(input.credentialDigest, "credential digest");
  assertHash(input.requestFingerprint, "request fingerprint");
  assertSafeTimestamp(input.nowMs, "claim timestamp");
  assertSafeTimestamp(input.expiresAtMs, "claim expiry");
  if (input.expiresAtMs <= input.nowMs) {
    throw new TypeError("Replay expiry must be in the future");
  }
}

function assertPrepared(value: PreparedResponse) {
  if (!(value.body instanceof Uint8Array) || value.body.length === 0) {
    throw new TypeError("Prepared response body must be non-empty bytes");
  }
  assertHash(value.sha256, "prepared response digest");
  if (sha256(value.body) !== value.sha256) {
    throw new TypeError("Prepared response digest mismatch");
  }
}

function assertSettlement(value: SettlementReceipt) {
  if (
    !value.header ||
    !value.network ||
    !transactionPattern.test(value.transaction)
  ) {
    throw new TypeError("Invalid settlement receipt");
  }
}

function assertTransition(input: TransitionInput) {
  assertHash(input.purchaseKey, "purchase key");
  assertSafeTimestamp(input.nowMs, "transition timestamp");
  if (input.expectedVersion < BigInt(0)) {
    throw new TypeError("Invalid expected replay version");
  }
  if (!legalReplayTransitions[input.from].includes(input.to)) {
    throw new TypeError(
      `Illegal replay transition ${input.from} -> ${input.to}`,
    );
  }
  if (input.clearPrepared && input.to !== "verifying") {
    throw new TypeError("Prepared data may only be cleared while retrying");
  }
  if (input.preparedResponse) assertPrepared(input.preparedResponse);
  if (input.settlement) assertSettlement(input.settlement);
  if (input.to === "settled" && !input.settlement) {
    throw new TypeError("Settled replay requires a settlement receipt");
  }
  if (input.to !== "settled" && input.settlement) {
    throw new TypeError("Settlement receipt requires settled state");
  }
}

export class PostgresReplayStore implements ReplayStore {
  readonly adapterKind = "durable" as const;

  constructor(private readonly executor: PostgresQueryExecutor) {}

  async claim(input: ClaimInput): Promise<ClaimResult> {
    assertClaim(input);
    const rows = await this.executor.query<ClaimRow>(claimSql, [
      toBytea(input.purchaseKey),
      toBytea(input.credentialDigest),
      toBytea(input.requestFingerprint),
      new Date(input.nowMs).toISOString(),
      new Date(input.expiresAtMs).toISOString(),
    ]);
    const row = rows[0];
    if (!row) throw new Error("Replay claim returned no result");
    if (row.result_kind === "purchase_key_mismatch") {
      return { kind: "conflict", reason: "purchase_key_mismatch" };
    }
    if (row.result_kind === "credential_reused") {
      return { kind: "conflict", reason: "credential_reused" };
    }
    if (row.result_kind !== "claimed" && row.result_kind !== "existing_match") {
      throw new TypeError("Invalid replay claim result");
    }
    return {
      kind: row.result_kind,
      record: rowToRecord(row),
    };
  }

  async get(purchaseKey: Hex, nowMs: number): Promise<ReplayRecord | null> {
    assertHash(purchaseKey, "purchase key");
    assertSafeTimestamp(nowMs, "read timestamp");
    const rows = await this.executor.query<ReplayRow>(getSql, [
      toBytea(purchaseKey),
      new Date(nowMs).toISOString(),
    ]);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async transition(input: TransitionInput): Promise<TransitionResult> {
    assertTransition(input);
    const prepared = input.preparedResponse;
    const settlement = input.settlement;
    const rows = await this.executor.query<ReplayRow>(transitionSql, [
      toBytea(input.purchaseKey),
      input.expectedVersion.toString(),
      input.from,
      input.to,
      new Date(input.nowMs).toISOString(),
      Boolean(input.clearPrepared),
      prepared ? toBytea(prepared.body) : null,
      prepared ? toBytea(prepared.sha256) : null,
      settlement?.header ?? null,
      settlement?.network ?? null,
      settlement ? toBytea(settlement.transaction) : null,
    ]);
    if (rows[0]) return { kind: "transitioned", record: rowToRecord(rows[0]) };
    const current = await this.get(input.purchaseKey, input.nowMs);
    return current
      ? { kind: "version_or_state_mismatch", record: current }
      : { kind: "not_found" };
  }
}

export const postgresReplaySql = Object.freeze({
  claim: claimSql,
  get: getSql,
  transition: transitionSql,
});
