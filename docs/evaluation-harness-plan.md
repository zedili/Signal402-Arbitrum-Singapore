# Signal402 evaluation harness plan

Status: **pre-event test design only; no in-window harness or result is
claimed.**

This plan defines reproducible evidence for the versioned agent workflow. The
harness is substantive Buildathon work and must not be implemented before the
official start is verified under `docs/sep14-kickoff-runbook.md`.

## Honest baseline

At the pre-event baseline, `front-end/src/lib/x402/protocol.test.ts` contains
three tests:

1. an unpaid request advertises exact 0.01 test USDC on Arbitrum Sepolia;
2. the official client signs, performs one paid retry, and exposes a simulated
   settlement receipt;
3. a simulated report-generation failure makes zero settlement calls.

These tests are valuable baseline evidence but are **not** Buildathon-period
evaluation work. They do not prove the planned strict agent schema, canonical
hashes, durable replay behavior, concurrent deduplication, store outages,
settlement reconciliation, live model quality, or registry calldata/event
verification.

## Evaluation principles

- Separate deterministic protocol correctness from variable model behavior.
- Separate simulated payments from owner-approved onchain payments.
- Record every failure; never drop failed samples from a denominator.
- Publish synthetic fixtures and aggregate results. Treat live report bodies,
  raw payment credentials, idempotency keys, provider responses, and wallet
  metadata as private unless separately reviewed for release.
- Never use the report-generating model as the sole judge of its own quality.
- Do not claim prediction accuracy or calibration without resolved outcomes and
  a statistically meaningful, preregistered sample.
- Pin the commit, lockfile hash, runtime versions, configuration fingerprint,
  fixture manifest, and run identifier for every result.

## Harness layers

### 1. Deterministic contract suite

Use synthetic, provenance-clean inputs and local fakes only. Cover:

- exact request parsing, duplicate JSON names, unknown members, body limit,
  invalid UTF-8, normalized string market IDs, and unsupported market shapes;
- strict success and RFC 9457 problem schemas from
  `docs/agent-api-contract-wireframe.md`;
- status/body-status agreement, media types, `Retry-After`, stable `code`,
  `action`, and `paymentState`;
- `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, and `PAYMENT-RESPONSE` parsing using
  the pinned official x402 packages;
- exact response bytes passed into settlement and returned to the caller;
- canonical JCS bytes, domain-separated hashes, registry calldata, and event
  decoding described in `docs/canonical-proof-wireframe.md`;
- cross-runtime golden vectors in supported Node.js and browser execution;
- redaction checks for logs, snapshots, thrown errors, and test artifacts.

Every deterministic vector must pass. A single mismatch blocks the claim it
tests; averages cannot hide protocol failures.

### 2. Failure-injection suite

Each injected failure records HTTP status, problem code/action/payment state,
provider call count, settlement call count, replay-store transition, response
headers, and secret-scan result.

| Boundary | Injected conditions | Required invariant |
| --- | --- | --- |
| Request | malformed/duplicate JSON, wrong type, oversized body, invalid/zero/leading-zero ID | Reject before x402 verification and provider work |
| Market source | timeout, DNS/network error, 404, 429, 5xx, malformed JSON, missing outcomes, non-binary/unsupported shape, inconsistent probability array | Typed failure; zero provider and settlement calls where source is unusable |
| Model provider | missing configuration, timeout, network error, 401/429/5xx, empty content, fenced/malformed JSON, extra fields, out-of-range numbers, overlong strings/arrays | Typed failure; zero settlement calls; no raw provider error leakage |
| Replay store | unavailable, timeout, insert conflict, stale version, expired row, corrupt settled row | Fail closed or follow the documented replay state; never duplicate provider/settlement work |
| Facilitator | unsupported network, invalid authorization, timeout, verification error, definite unconsumed settlement failure, ambiguous settlement result | Preserve the documented payment state; ambiguous results never invite an automatic new authorization |
| Response receipt | missing, malformed, failed, wrong network, wrong payer/amount where present, invalid transaction hash | Reference client refuses success even when body schema is valid |
| Registry | wrong chain/address/runtime code/calldata, wallet rejection, reverted/replaced/cancelled/unknown transaction, absent/spoofed/mismatched event, stored-field mismatch | Purchased report remains valid; optional attestation is not claimed or blindly resubmitted |

Provider/facilitator raw messages must be captured only in a private redacted
diagnostic channel if needed. Public API details remain stable and generic.

### 3. Idempotency and concurrency suite

Use the provider and settlement spies plus both the deterministic local store
adapter and the selected production-compatible adapter:

- issue 16 concurrent requests with the same purchase key, credential, and
  request fingerprint;
- repeat the settled request sequentially;
- vary body, credential, and idempotency key one at a time;
- interrupt at `verifying`, `processing`, `prepared`, `settling`, and receipt
  persistence boundaries;
- start requests from separate processes to avoid proving only an in-process
  mutex;
- force the state store to return stale-version and unavailable outcomes.

Required deterministic result for an exact concurrent tuple:

```text
provider_calls   = 1
settlement_calls = 1
settled_rows     = 1
response_hashes  = 1 unique value for every successful replay
new_signatures   = 0 after the first authorized payload
```

A test-only in-memory adapter can verify interface behavior but cannot satisfy
the cross-instance production gate. The production adapter needs the same
suite against an isolated, owner-approved test database.

### 4. Bounded live-provider evaluation

This suite exercises the real market and model providers without using a real
x402 settlement. Call the same extracted source/generation/validation functions
behind a verified-payment fake and settlement spy; do not create many wallet
authorizations just to test model variability.

Candidate sample, subject to an owner-reviewed cost packet:

- six active binary markets selected by a deterministic manifest across at
  least three categories and low/middle/high market-probability bands;
- two model generations per frozen normalized snapshot (12 total calls);
- no cherry-picking after results are visible; replacement is allowed only for
  a preregistered exclusion such as source deletion or unsupported shape, and
  both exclusion and replacement remain in the manifest;
- maximum 12 requests, maximum configured input/output tokens per request, and
  a hard total-token/cost ceiling calculated from the provider's live pricing
  immediately before approval.

Running this suite consumes the owner's existing model-provider quota and sends
market snapshot text to that provider. Present the exact model, request count,
token ceiling, estimated maximum cost, transmitted fields, retention terms,
and abort behavior before requesting approval. No live evaluation is authorized
by this document.

Measure:

- source fetch success rate;
- provider HTTP success rate;
- strict schema-valid rate over all attempted samples;
- grounded evidence rate from a field-level audit against the frozen snapshot;
- unsupported-claim count, including URLs, news, accuracy, or external facts
  absent from the supplied snapshot;
- probability/confidence range validity;
- end-to-end, source, provider, validation, and proof latency;
- prompt/output token counts and estimated cost when the provider reports or
  the client can reliably calculate them;
- settlement-spy calls, which must remain zero in this suite.

The evidence audit records, for every evidence item, the exact snapshot field
or marks it unsupported. AI assistance may propose mappings, but the final
artifact must preserve the source text and mapping for human review. Do not
promote a subjective “quality score” to an accuracy claim.

### 5. Owner-approved end-to-end proof

After all deterministic and live-provider gates pass, request authorization for
one testnet purchase with an exact packet containing network, asset, atomic and
display amount, recipient, market, idempotency key handling, purpose, and one
wallet signature. Then validate:

1. initial 402 terms;
2. one authorization and paid retry;
3. strict body and receipt channels;
4. recomputed hashes and registry calldata;
5. one exact replay with no second transfer;
6. optional registry attestation only under a separate owner confirmation.

The baseline Sepolia receipts do not substitute for this in-window agent-client
proof.

## Metrics and denominators

Each run emits integer counts plus derived rates. At minimum:

```text
attempted_samples
source_successes
provider_http_successes
schema_valid_reports
grounded_evidence_items
total_evidence_items
unsupported_claims
verification_calls
provider_calls
settlement_calls
successful_settlements
unique_settlement_transactions
receipt_validations
hash_vector_passes
hash_vector_total
redaction_findings
```

Derived rates always disclose numerator and denominator, for example
`schema_valid_rate = schema_valid_reports / attempted_samples`. Report latency
as count, median, p95, minimum, and maximum; with 12 live calls, call these
observations rather than performance guarantees. Do not calculate a percentile
after excluding timeouts.

## Acceptance thresholds

| Gate | Threshold |
| --- | --- |
| Deterministic contract/hash/receipt vectors | 100% pass |
| Failure mapping | 100% matches documented status/code/action/payment state |
| Pre-settlement injected failures | 0 unintended settlement calls |
| Exact 16-way concurrent replay | 1 provider call, 1 settlement call, 1 settled record |
| Settled replay | Same body digest and receipt, 0 new provider/settlement/signature operations |
| Replay mismatch | 0 provider and settlement calls |
| Store outage | Typed fail-closed response before paid work |
| Live schema validity | Target 12/12; report every failure and do not round |
| Grounded evidence | 100% of published evidence items mapped to snapshot fields |
| Unsupported external claims | 0 in the accepted run |
| Receipt and proof validation | 100% pass |
| Secret/redaction scan | 0 findings |

If the live sample misses a threshold, fix the product and run a new complete
manifest. Keep the failed run in the private ledger and disclose prior run
counts in the final aggregate; do not overwrite evidence.

## Artifact layout

The in-window implementation should create a reproducible layout such as:

```text
evaluation/
  fixtures/synthetic/
  vectors/canonical-proof-v1.json
  schemas/
  scripts/
  runs/<run-id>/manifest.json
  runs/<run-id>/metrics.json
  runs/<run-id>/failures.redacted.jsonl
  README.md
```

Only approved, non-secret artifacts are committed. Each manifest records:

- run ID and UTC start/end;
- Git commit and dirty/clean status;
- dependency-lockfile hash, Node/pnpm/browser versions, and operating system;
- fixture/vector hashes;
- x402 package versions and configured network/asset/recipient;
- provider/model identifier and safe generation parameters;
- whether calls were fake, live-provider/no-settlement, or owner-approved
  testnet settlement;
- exact commands and exit codes;
- every excluded or retried sample and reason.

Do not store environment-variable values, raw authorization headers,
idempotency keys, wallet signatures, complete private paid reports, or raw
provider prompts/responses in public run artifacts.

## Submission evidence

The final judge-facing evidence should contain:

- the baseline three-test count separately from new in-window coverage;
- a commit-linked test matrix and clean command transcript;
- aggregate metrics with integer denominators;
- one redacted concurrency trace showing a single provider/settlement path;
- one owner-approved in-window receipt and exact replay proof;
- optional separately approved registry receipt/event verification;
- limitations: small sample, testnet-only, no prediction-accuracy claim, one
  model provider unless a second provider is genuinely implemented and tested.

Any model-provider spend, external database connection, wallet signature,
onchain transaction, production deployment, public push, or publication of run
artifacts remains subject to the corresponding owner gate.
