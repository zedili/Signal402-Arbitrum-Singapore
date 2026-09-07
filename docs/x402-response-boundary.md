# x402 response-channel boundary

Status: **pre-event SDK audit; no in-window implementation is claimed.**

This note records the response boundary verified against the installed official
x402 TypeScript packages pinned at version `2.24.0`. Re-run the audit at kickoff
if the lockfile or SDK version changes.

## Verified behavior

The current paid handler creates the application response before settlement,
copies that exact body into the HTTP transport context, and calls
`x402HTTPResourceServer.processSettlement`. On success, the SDK returns the
facilitator settlement fields plus a generated `PAYMENT-RESPONSE` header. The
handler adds that header to the already-created response.

The installed official packages establish the same separation:

- `@x402/core` `2.24.0` implements `createSettlementHeaders` by encoding the
  `SettleResponse` into `PAYMENT-RESPONSE`.
- `x402HTTPClient.getPaymentSettleResponse` decodes `PAYMENT-RESPONSE` (with
  legacy `X-PAYMENT-RESPONSE` fallback).
- `x402HTTPClient.parsePaymentResult` returns the application body and decoded
  protocol header as separate `body` and `header` values.
- `@x402/fetch` returns the paid `Response` unchanged after processing the
  settlement header; it does not merge the receipt into the JSON body.

The repository's existing protocol test also asserts that the receipt is
present in `response.headers.get('payment-response')`.

## Target wire contract

The in-window versioned endpoint must preserve those two channels:

1. The JSON body contains the versioned report envelope: request and source
   metadata, structured analysis, generation metadata, canonical hashes,
   registry call preview, and non-authoritative payment context such as the
   expected network, asset, amount, recipient, and receipt-channel name.
2. The authoritative x402 settlement result remains in the standard
   `PAYMENT-RESPONSE` header. The pinned SDK requires `success`, `transaction`,
   and `network`; `payer`, actual settled `amount`, `extensions`, and `extra`
   are optional and must be treated as present only when decoded from that
   header. The client validates quoted asset, maximum/exact amount, and
   recipient against the accepted `PAYMENT-REQUIRED` requirement and payment
   payload rather than inventing those fields in the settlement receipt.
3. The reference client may expose a convenience object that combines the
   validated body with the decoded settlement result, but documentation must
   label it as a **client-composed result**, not the server's JSON response.

The server must not settle against one byte sequence and then silently replace
the response body with a different sequence. This keeps the response supplied
to settlement and the response delivered to the caller identical, and remains
safe if a current or future declared extension binds metadata to the response.

## Required in-window tests

- Assert that the exact body bytes passed to `processSettlement` are the bytes
  returned to the client.
- Assert that a successful paid response carries a decodable
  `PAYMENT-RESPONSE` header and a schema-valid body.
- Assert that the body does not duplicate or contradict authoritative
  settlement fields.
- Assert that the reference client rejects a missing, failed, malformed, or
  network-mismatched settlement header even if the report body is valid.
- Assert that every provider, parsing, or schema failure occurs before
  settlement and produces no success receipt.

## Claim boundary

Before these tests, the versioned endpoint, and an in-window deployment exist,
only the baseline human-facing flow is proven. Do not claim a published agent
wire contract or a stable receipt/body composition yet.
