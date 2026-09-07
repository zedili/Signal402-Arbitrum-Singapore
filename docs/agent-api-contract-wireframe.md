# Signal402 agent API contract wireframe

Status: **pre-event design only; no implementation is claimed.**

This document narrows the planned Buildathon feature into one versioned,
machine-consumable contract. Validate it against tests during the official
window and publish the final schema from the production origin. The current
baseline endpoint remains `POST /api/analysis`; it does not yet satisfy this
contract.

## Canonical surface

The target paid endpoint is:

```http
POST /api/v1/reports
Content-Type: application/json
Accept: application/json, application/problem+json
Idempotency-Key: <client-generated high-entropy value>
```

Request body:

```json
{
  "marketId": "123456"
}
```

Rules:

- The JSON object has exactly one member; unknown members, duplicate names,
  non-UTF-8 input, or a body over the documented small limit are rejected
  before payment verification.
- `marketId` is a string using the normalization rules in
  `docs/canonical-proof-wireframe.md`. A JSON number is not accepted because
  identifiers must not inherit JavaScript number limits.
- `Idempotency-Key` is required for the paid agent contract and follows
  `docs/x402-idempotency-replay-wireframe.md`. It is never echoed, logged, or
  accepted as the sole credential for a stored report.
- The human UI and reference client use this same canonical endpoint. After
  migration, `/api/analysis` must not remain a second independent settlement
  implementation. Retire it with an unpaid typed response or a separately
  tested compatibility adapter that cannot create a second purchase path.

## Successful response

The response is `200 application/json`, `Cache-Control: private, no-store`, and
contains the report body below. The authoritative settlement result is only in
the standard `PAYMENT-RESPONSE` header. The server body does not copy the
transaction, payer, or success flag from that header.

```json
{
  "schemaVersion": "signal402.report.v1",
  "request": {
    "marketId": "123456",
    "requestFingerprint": "0x<32-byte hash>",
    "purchaseId": "<opaque non-secret correlation id>",
    "receivedAt": "2026-09-14T00:00:00.000Z"
  },
  "source": {
    "provider": "polymarket",
    "fetchedAt": "2026-09-14T00:00:01.000Z",
    "market": {
      "id": "123456",
      "question": "Will …?",
      "description": "…",
      "outcomes": [
        { "label": "Yes", "probabilityBps": 5100 },
        { "label": "No", "probabilityBps": 4900 }
      ],
      "volumeUsd": "12345.67",
      "liquidityUsd": "890.12",
      "endTime": "2026-12-31T23:59:59.000Z",
      "resolutionSource": "https://example.invalid/rules"
    },
    "references": [
      {
        "rel": "market",
        "url": "https://example.invalid/market/123456",
        "retrievedAt": "2026-09-14T00:00:01.000Z"
      }
    ]
  },
  "analysis": {
    "marketProbabilityBps": 5100,
    "independentProbabilityBps": 4800,
    "confidenceBps": 6200,
    "summary": "…",
    "evidence": ["…"],
    "counterarguments": ["…"],
    "risks": ["…"],
    "assumptions": ["…"]
  },
  "generation": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "generatedAt": "2026-09-14T00:00:03.000Z",
    "validatedAgainst": "signal402.analysis.v1"
  },
  "proof": {
    "canonicalization": "RFC8785-JCS",
    "hashAlgorithm": "ethereum-keccak256",
    "contentSchema": "signal402.content.v1",
    "marketIdHash": "0x<32-byte hash>",
    "contentHash": "0x<32-byte hash>",
    "coveredGroups": ["source", "analysis", "generation"],
    "registry": {
      "required": false,
      "network": "eip155:421614",
      "address": "0xc896eB3B013a60deCA7029dc2aa4F0da9a5faf82",
      "function": "attest(bytes32,bytes32)",
      "args": {
        "marketIdHash": "0x<32-byte hash>",
        "contentHash": "0x<32-byte hash>"
      }
    }
  },
  "payment": {
    "protocol": "x402",
    "version": 2,
    "scheme": "exact",
    "expected": {
      "network": "eip155:421614",
      "asset": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      "amountAtomic": "10000",
      "payTo": "0x0573f139d21fb3140155567Cba7630d3948F4ea3"
    },
    "authoritativeReceiptHeader": "PAYMENT-RESPONSE"
  },
  "attestation": {
    "required": false,
    "status": "not_requested"
  },
  "disclaimer": "This is informational model output, not financial advice."
}
```

The example uses reserved documentation hosts and placeholders; it is not a
claim about a real market or completed Buildathon response.

### Field invariants

- All objects are strict (`additionalProperties: false`) in the published JSON
  Schema and runtime validator.
- Timestamps are UTC RFC 3339 strings with a trailing `Z`.
- Probabilities and confidence are integer basis points in `[0, 10000]`.
  Monetary values from the market source are non-negative canonical decimal
  strings; token amount is an atomic-unit integer string.
- `source.market.id` equals normalized `request.marketId`.
- The v1 endpoint accepts only positive market identifiers, so normalized `0`
  is rejected even though the generic canonicalization grammar can represent
  it.
- Outcome order is source-semantic and therefore hash-significant. The endpoint
  must not silently assume binary Yes/No markets if the source does not prove
  that shape.
- `requestFingerprint` covers the normalized request and quoted payment terms,
  but not generated content. `contentHash` follows
  `docs/canonical-proof-wireframe.md` and excludes payment, request-correlation,
  and attestation-result fields.
- `purchaseId` is an opaque support correlation value, not the raw
  idempotency key, wallet address, credential digest, or payment nonce.
- `references` contain only URLs actually supplied or deterministically built
  from verified source identifiers. The model cannot invent them.
- `generation.provider` and `model` describe the actual successful generation;
  they are not performance, accuracy, or endorsement claims.
- `proof.registry` is a call preview only. `attestation.status` starts as
  `not_requested`, and no `attestationId` exists before a mined event.
- `payment.expected` restates the quoted terms for validation. It is not proof
  of settlement; clients must decode and validate `PAYMENT-RESPONSE`.

## Payment-required response

An unpaid valid request returns the x402 v2 `402 Payment Required` response and
standard `PAYMENT-REQUIRED` header described by the
[official x402 HTTP documentation](https://docs.x402.org/core-concepts/http-402).
Its body may use the problem shape below, but the header remains the protocol
authority for accepted terms. A client must compare network, asset, atomic
amount, recipient, scheme, resource, and timeout to its policy before signing.

```json
{
  "type": "https://signal402.vercel.app/problems/payment-required",
  "title": "Payment required",
  "status": 402,
  "detail": "Authorize the quoted testnet payment to generate this report.",
  "code": "payment_required",
  "action": "present_payment_terms",
  "paymentState": "not_present",
  "purchaseId": "<opaque correlation id>"
}
```

## Problem Details contract

All non-402 application failures use `application/problem+json` following
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html). Problem-type pages
must be published at stable production-origin URLs before the contract is
called public. `status` must equal the actual HTTP status. Human-readable
`detail` is not machine-parsed and must not expose raw provider/facilitator
errors, stack traces, prompts, credentials, signatures, report contents, or
personal data.

Stable extension members:

```json
{
  "type": "https://signal402.vercel.app/problems/purchase-in-progress",
  "title": "Purchase is still processing",
  "status": 409,
  "detail": "Retry the same purchase after the indicated delay.",
  "instance": "urn:signal402:problem:<opaque id>",
  "code": "purchase_in_progress",
  "action": "wait_then_retry_same_purchase",
  "paymentState": "verified_unsettled",
  "purchaseId": "<opaque correlation id>",
  "retryAfterSeconds": 2
}
```

`action` is one of:

- `fix_request_without_payment`
- `present_payment_terms`
- `retry_same_purchase`
- `wait_then_retry_same_purchase`
- `check_settlement_before_new_purchase`
- `start_new_purchase_with_confirmation`
- `stop`

`paymentState` is one of:

- `not_present`
- `unverified`
- `verified_unsettled`
- `settled`
- `unknown`

The response may include a matching `Retry-After` header when a bounded wait is
appropriate. A machine client follows `action`, never guesses from the prose.

## Error taxonomy

Exact facilitator error strings remain internal. The public mapping is small,
stable, and testable:

| Code | HTTP | Payment state | Client action | Settlement rule |
| --- | ---: | --- | --- | --- |
| `invalid_json` | 400 | `not_present` | `fix_request_without_payment` | Must occur before verification |
| `invalid_market_id` | 422 | `not_present` | `fix_request_without_payment` | Must occur before verification |
| `market_not_found` | 404 | `not_present` or `verified_unsettled` | `stop` | Never settle |
| `unsupported_market_shape` | 422 | `not_present` or `verified_unsettled` | `stop` | Never silently coerce an unsupported outcome set; never settle |
| `payment_required` | 402 | `not_present` | `present_payment_terms` | No authorization exists |
| `payment_authorization_invalid` | 402 | `unverified` | `start_new_purchase_with_confirmation` | Invalid authorization must not settle |
| `idempotency_conflict` | 409 | `unverified` or `verified_unsettled` | `stop` | Mismatched tuple must not reach provider/settlement |
| `purchase_in_progress` | 409 | `verified_unsettled` | `wait_then_retry_same_purchase` | Same tuple only; no parallel work |
| `source_unavailable` | 503 | `verified_unsettled` | `retry_same_purchase` | Never settle; optional `Retry-After` |
| `provider_unavailable` | 502 | `verified_unsettled` | `retry_same_purchase` | Never settle |
| `provider_timeout` | 504 | `verified_unsettled` | `retry_same_purchase` | Never settle |
| `provider_invalid_output` | 502 | `verified_unsettled` | `retry_same_purchase` | Never settle |
| `replay_store_unavailable` | 503 | `unverified` | `retry_same_purchase` | Fail closed before provider/settlement |
| `settlement_failed_unconsumed` | 502 | `verified_unsettled` | `retry_same_purchase` | Emit only after authoritative evidence proves the authorization was not consumed |
| `settlement_outcome_unknown` | 503 | `unknown` | `check_settlement_before_new_purchase` | Reconcile before any new payment |
| `stored_receipt_invalid` | 500 | `unknown` | `check_settlement_before_new_purchase` | Never synthesize success |
| `internal_error` | 500 | state-specific, never guessed | `stop` | Fail closed and expose only opaque instance ID |

For a request failure discovered before payment verification, the server must
not describe the authorization as verified. For a provider failure after valid
authorization, it must cancel the pre-settlement path and preserve the exact
credential for a safe same-purchase retry while it remains valid.
An already-used nonce, timeout during settlement, or ambiguous facilitator
failure must never be mapped to `payment_authorization_invalid` or
`settlement_failed_unconsumed`; it enters `settlement_outcome_unknown` until
authoritative evidence resolves the state.

## Reference-client validation order

1. Validate HTTP status and media type.
2. On `402`, decode `PAYMENT-REQUIRED`, compare every term to local policy, and
   ask for explicit wallet authorization.
3. On success, validate the strict report schema and exact request identity.
4. Decode `PAYMENT-RESPONSE`; require success, Arbitrum Sepolia, the expected
   payer/recipient/asset/amount where the standard response exposes them, and a
   valid transaction hash.
5. Recompute `marketIdHash`, `contentHash`, and registry calldata from the body.
6. Only then expose a client-composed `{ report, settlement }` convenience
   object. Label it as client-composed rather than a raw server response.
7. On a problem response, follow the stable `action`. Never parse `detail` and
   never generate a new idempotency key or authorization from a transport
   timeout.

## Versioning and compatibility

- `/api/v1/reports` and `signal402.report.v1` are breaking-change boundaries.
- Additive optional fields may be introduced only if strict clients have an
  explicit negotiated schema version; otherwise publish `/api/v2`.
- Canonical-content and hash-domain versions change independently and must not
  be silently reused for different covered fields.
- x402 protocol version and application schema version are independent.
- Publish a machine-readable JSON Schema, example 402/problem responses, and a
  field-by-field receipt validation table from the same commit as the endpoint.

## In-window acceptance evidence

- strict request and response validators shared by server and reference client;
- explicit rejection coverage for missing, inconsistent, or unsupported market
  outcome shapes rather than silently inventing a binary market;
- golden success, 402, and every problem-code fixture with no secrets;
- contract tests for HTTP status/body `status` agreement, media type,
  `Retry-After`, action, and payment-state mapping;
- proof that invalid request bytes fail before x402 verification;
- proof that each provider/source failure causes zero settlement calls;
- proof that the canonical endpoint is the only active paid settlement route;
- exact-response-byte, receipt-header, hash, idempotency, and concurrency tests
  required by the linked wireframes;
- published problem-type documentation and JSON Schema URLs;
- one owner-approved in-window testnet transcript showing 402 → authorization →
  paid response → independent receipt and proof validation.

Any wallet signature, production deployment, public push, or paid test remains
subject to the owner's explicit confirmation.
