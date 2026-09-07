# Signal402 reference client wireframe

Status: **pre-event design only; no client implementation, signature, or paid
request is claimed.**

This document defines the judge-facing command-line client to build during the
official Buildathon window. Its purpose is to make one Signal402 purchase
inspectable and safe for an autonomous agent: the default command stops at the
quoted `402`, signing is a separate explicit action, and a transport retry
reuses the one existing authorization rather than creating another.

The design is based on the repository's locked `@x402/core`, `@x402/evm`, and
`@x402/fetch` version `2.24.0`. Revalidate those exact installed packages before
implementation.

## Product boundary

The planned package exposes a small library plus a CLI:

```text
signal402 inspect --market-id 123456
signal402 purchase --market-id 123456 --authorize-once
```

`inspect` is the default behavior when no subcommand is supplied. It sends the
unpaid request, validates the `PAYMENT-REQUIRED` declaration, prints a redacted
review packet, and exits without constructing a signer or calling
`signTypedData`.

`purchase` is available only when all of these are true:

- `--authorize-once` is present;
- an owner-approved `ClientEvmSigner` adapter was explicitly injected;
- the live 402 matches every exact local policy field;
- the user or controlling agent confirms the displayed purchase packet through
  the selected signer interaction;
- no other purchase is in progress in that process.

This is not an unattended wallet bot. It does not generate, fund, import,
persist, or recover a private key. Selecting the signer mechanism and supplying
or funding the testnet wallet are separate owner decisions.

## Why the high-level fetch wrapper is not the canonical client

The pinned `wrapFetchWithPayment` convenience wrapper performs the initial
request and paid retry correctly for the current browser flow, but it hides the
signed payload from the caller. A registered `onPaymentResponse` recovery hook
can also cause transport code to create another payload. That is a poor fit for
the reference client's central invariant: the caller must retain and reuse the
exact one authorization across bounded network retries.

The planned CLI therefore uses the low-level public interfaces:

- `x402HTTPClient.getPaymentRequiredResponse` to decode the standard header;
- `x402HTTPClient.createPaymentPayload` exactly once per confirmed purchase;
- `x402HTTPClient.encodePaymentSignatureHeader` to build the paid request;
- `x402HTTPClient.getPaymentSettleResponse` to decode the standard receipt.

It does not register payment-response recovery hooks and does not call
`processPaymentResult` for retry control. It may use an `x402Client` policy and
spend controls as defence in depth, but the client also performs an explicit
exact comparison before a signer becomes reachable. The SDK's default `$1`
cap is not sufficient by itself because it does not pin the route, recipient,
or exact 0.01 test-USDC price.

## Frozen purchase policy

The production profile is immutable for the lifetime of a command:

| Field | Required value |
| --- | --- |
| HTTP method | `POST` |
| Origin | `https://signal402.vercel.app` after in-window deployment verification |
| Path | `/api/v1/reports` |
| Redirects | forbidden; `redirect: "manual"` |
| x402 version | `2` |
| Scheme | `exact` |
| Network | `eip155:421614` |
| Asset | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Amount | exactly `10000` atomic units (0.01 test USDC) |
| Recipient | `0x0573f139d21fb3140155567Cba7630d3948F4ea3` |
| Resource URL | exact configured origin plus `/api/v1/reports` |
| MIME type | `application/json` |
| Timeout | positive and no greater than the documented 300-second profile |
| Transfer method | EIP-3009 authorization only; no Permit2, escrow, `upto`, or batch flow |
| Extensions | none unless separately allowlisted, implemented, and tested |

Address comparison is checksum-insensitive after strict 20-byte hexadecimal
validation. Amounts are parsed as decimal integer strings with `BigInt`; no
floating-point conversion is permitted. The client rejects a 402 if:

- `resource.url` is not the exact frozen URL, contains credentials, fragments,
  an unexpected query, or normalizes to another path;
- `accepts` has no single exact allowed option, or an unexpected option could be
  selected by insertion order;
- any scheme, network, asset, amount, recipient, or timeout differs;
- `extra.paymentFlow` is anything other than absent or the documented
  authorization flow, or `extra.assetTransferMethod` is not absent/EIP-3009;
- unexpected extensions could add signing, approval, or recovery behavior;
- the response crossed an HTTP redirect or TLS/origin check failed.

Development and test origins use separate explicit profiles. A permissive
wildcard or a command-line `--url` override must never silently inherit the
production signing profile.

## One-authorization state machine

```text
created
  -> unpaid_request_sent
  -> terms_validated
  -> awaiting_confirmation
  -> authorization_created
  -> paid_request_in_flight
       -> verified_success
       -> same_authorization_retryable
       -> outcome_unknown
       -> terminal_failure
```

The process creates the high-entropy `Idempotency-Key` and canonical request
bytes once in `created`. Both stay unchanged for the unpaid request and every
paid attempt. It records only digests in ordinary diagnostics.

The transition from `awaiting_confirmation` to `authorization_created` calls
`createPaymentPayload` once. A signer-call counter guards the boundary in tests
and development. After that transition:

- no code path may call `createPaymentPayload` again;
- retries reuse the same encoded `PAYMENT-SIGNATURE`, idempotency key, method,
  URL, headers, and exact body bytes;
- the process refuses a redirect, body mutation, market change, policy change,
  expired authorization, or retry after its bounded attempt/deadline budget;
- an ambiguous response never starts a new logical purchase automatically.

If the process remains alive after a connection reset or response timeout, it
may retry the same authorization using bounded exponential backoff and the
server's stable `action` value. `retry_same_purchase` and
`wait_then_retry_same_purchase` permit only this exact replay.
`check_settlement_before_new_purchase` enters `outcome_unknown` and stops.

If the process crashes after signing, the default client intentionally cannot
recreate the authorization. It writes only a non-secret recovery record with
the purchase ID, request fingerprint, body digest, credential digest, payer
address, timestamp, and last observed state. It does **not** persist the raw
signature, `PAYMENT-SIGNATURE` header, nonce, idempotency key, report, or
provider response. A future encrypted recovery feature is out of scope unless
its key custody and threat model receive separate owner approval. The honest
post-crash state is `outcome_unknown`, followed by onchain/server
reconciliation before any fresh purchase.

## Planned control flow

1. Strictly normalize `marketId`; generate one idempotency key and one canonical
   UTF-8 JSON body. Freeze the production URL and request fingerprint.
2. Send one unpaid `POST` with `redirect: "manual"`, a bounded timeout, and the
   frozen key/body. Reject redirects and unexpected success responses.
3. Decode `PAYMENT-REQUIRED` with `getPaymentRequiredResponse`; require x402 v2
   and validate the full frozen policy before constructing the signer.
4. Print a safe review packet containing market ID, origin/path, network,
   asset symbol/address, human and atomic amount, recipient, timeout, and
   request fingerprint. Do not print keys, signatures, nonces, or raw headers.
5. In inspect mode, exit here with signer-call count zero. In purchase mode,
   require the explicit one-time authorization gate and injected signer.
6. Instantiate `ExactEvmScheme` for only `eip155:421614`; retain the selected
   requirement and call `createPaymentPayload` once. Validate the resulting
   payload again against the selected requirement before encoding it.
7. Send the paid request with the exact frozen bytes, key, and encoded header.
   For bounded transport retries, reuse those same in-memory values.
8. Parse application failures as RFC 9457 Problem Details and follow the stable
   `action`; never infer retry behavior from `title` or `detail`.
9. For success, validate the strict `signal402.report.v1` schema, request
   identity, and `PAYMENT-RESPONSE`. Require `success`, network, payer where
   exposed, and a valid transaction hash; do not manufacture absent receipt
   fields from `payment.expected` in the body.
10. Recompute the request fingerprint, `marketIdHash`, `contentHash`, and
    registry calldata. Only after all checks pass, output a clearly labelled
    client-composed object containing the raw report body and decoded receipt.

The standard settlement response currently guarantees `success`, `network`,
and `transaction`, and may expose `payer`; it does not necessarily echo asset,
amount, or recipient. Those quoted terms are validated before signing and
bound to the accepted payment payload. The client must not imply that the
settlement header contains fields it does not actually expose.

## Signer and secret boundary

The library accepts the minimal pinned SDK shape:

```ts
type ClientEvmSigner = {
  readonly address: `0x${string}`;
  signTypedData(message: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
};
```

The canonical EIP-3009 path does not need transaction broadcasting or approval
helpers. The reference client rejects payment declarations that would require
optional `readContract`, `signTransaction`, allowance, Permit2, or gas-sponsored
approval capabilities.

The executable must never accept a private key as a command-line argument,
configuration file, stdin prompt captured by logs, or committed environment
template. The eventual in-window implementation should prefer an interactive
wallet/provider adapter. If the owner instead approves a dedicated testnet-only
environment key for the single evidence run, its exact variable name, custody,
funding, spend limit, deletion, and log-redaction procedure must be recorded in
the private decision register first.

## Output and redaction contract

Normal output may contain:

- command mode and state;
- normalized market ID and public payment policy;
- public wallet address;
- request/content hashes, transaction hash, and public explorer URLs;
- validated report output when the caller explicitly requests it.

Normal output and error telemetry must not contain:

- private keys, provider secrets, cookies, authorization headers, or RPC
  credentials;
- raw `PAYMENT-SIGNATURE`, EIP-712 signature, nonce, idempotency key, or signer
  request object;
- unvalidated server bodies, raw model output, stack traces, or facilitator
  internals.

The final success object is marked `clientComposed: true`; the report body is
kept byte-for-byte separate from decoded receipt metadata so the client never
misrepresents a reconstructed object as the server's signed/returned body.

## Stable exit codes

| Code | Meaning |
| ---: | --- |
| `0` | inspect policy validated, or paid response and proof fully verified |
| `2` | invalid local input or configuration |
| `3` | 402 missing, malformed, redirected, or refused by policy |
| `4` | explicit authorization absent, rejected, or signer failed before send |
| `5` | paid outcome unknown; reconcile before a new authorization |
| `6` | same purchase is retryable but bounded retry budget ended |
| `7` | response, receipt, request identity, or proof validation failed |
| `8` | internal invariant failure |

Problem `action` values determine state; exit codes are only process outcomes.
An automation must not turn exit code `4`, `5`, `6`, or `7` into a new purchase.

## In-window acceptance evidence

- inspect mode performs a live 402 handshake with signer-call count zero;
- malicious or mismatched origin, redirect, method, resource, scheme, network,
  asset, amount, recipient, timeout, transfer method, and extension fixtures are
  rejected before signing;
- multiple accepted options cannot influence selection order; only the exact
  allowlisted tuple is eligible;
- purchase mode cannot run without the explicit gate and approved signer
  adapter;
- signer-call count remains exactly one across a connection reset, timeout,
  `409 purchase_in_progress`, and every same-purchase retry;
- request-body bytes, idempotency key, and encoded payment credential are
  identical across captured paid attempts;
- a process-restart fixture enters `outcome_unknown` without persisting or
  creating a signature;
- all logs, snapshots, test reports, and failure artifacts pass secret and
  payment-header redaction tests;
- malformed problem bodies, misleading prose, missing/failed settlement
  headers, invalid report schemas, request mismatches, and proof mismatches fail
  closed with stable exit codes;
- one owner-approved Arbitrum Sepolia transcript proves 402 inspection,
  explicit authorization, one signed payload, paid response, receipt decoding,
  independent proof validation, and no second transfer.

Any signer connection, testnet funding, wallet signature, paid request, public
deployment, or public push remains subject to the owner's explicit confirmation.
