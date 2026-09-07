# Canonical proof wireframe

Status: **pre-event design only; no hashing implementation or production API is
claimed.** Validate this design at kickoff before writing code.

## Candidate standard

Use the [RFC 8785 JSON Canonicalization Scheme
(JCS)](https://www.rfc-editor.org/rfc/rfc8785.html) for the semantic proof
payload, then hash the resulting UTF-8 bytes with Ethereum `keccak256`.

JCS is a suitable interoperability boundary because it constrains inputs to
[I-JSON](https://www.rfc-editor.org/rfc/rfc7493.html), uses
ECMAScript-compatible primitive serialization, recursively sorts object
properties, preserves array order, emits no insignificant whitespace, and
produces UTF-8 bytes. It does not perform Unicode normalization; strings must
be preserved exactly as received after schema validation.

The implementation must reject duplicate object names, unpaired Unicode
surrogates, Unicode noncharacters, `NaN`, positive or negative infinity, and
values outside the declared schema. Raw external JSON cannot prove this after a
generic last-name-wins parse; it must either receive duplicate-name-aware
validation before parsing or be reconstructed field-by-field from strictly
validated values. Identifiers, token amounts, and other integers that may
exceed JavaScript's safe integer range must be represented as strings. Do not
confuse Ethereum `keccak256` with the standardized SHA3-256 variant.

## Domain-separated hashes

The exact ASCII prefixes below are part of the candidate v1 contract. They end
with a single line-feed byte (`0x0a`) and have no byte-order mark.

```text
marketIdHash = keccak256(
  UTF8("signal402:market-id:v1\n" + normalizedMarketId)
)

contentHash = keccak256(
  UTF8("signal402:content:v1\n") || JCS_UTF8(contentPayload)
)
```

`normalizedMarketId` is the canonical base-10 ASCII identifier accepted by the
endpoint: digits only, no sign, no whitespace, and no leading zero unless the
entire value is `0`. The production schema may reject `0`; normalization must
never silently turn an invalid identifier into a valid one.

The prefixes prevent a market identifier and a report payload from sharing an
undifferentiated hash namespace. Any incompatible change requires a new prefix
and schema version rather than silently changing v1 behavior.

## `contentPayload` coverage

The payload is a newly constructed, schema-validated object rather than the
whole HTTP response with fields deleted. Its v1 meaning covers:

- the explicit report-schema identifier;
- the normalized market identifier;
- the exact normalized source snapshot delivered with the report, including
  its source timestamp and upstream references;
- the structured analysis, including estimate, confidence, summary, evidence,
  counterarguments, risks, assumptions, and disclaimer;
- generation facts that affect interpretation, including provider/model,
  generation timestamp, and schema-validation result.

It deliberately excludes:

- random request, trace, retry, or idempotency identifiers;
- x402 requirements and the `PAYMENT-RESPONSE` settlement header;
- `marketIdHash`, `contentHash`, canonicalization metadata, and covered-field
  declarations;
- registry address, calldata preview, transaction, event, and attestation ID;
- UI-only labels, explorer URLs, and delivery timestamps.

These exclusions avoid recursive hashes and keep commercial delivery metadata
separate from the report's semantic identity. A new purchase of semantically
identical content may therefore have a different settlement receipt but the
same `contentHash`. A different source timestamp, report statement, ordered
array, model identifier, or generation timestamp produces a different hash.

## Response proof metadata

The versioned JSON body should identify, without claiming that implementation
already exists:

- algorithm: `keccak256`;
- canonicalization: `RFC8785`;
- domain: `signal402:content:v1`;
- `marketIdHash` and `contentHash` as lowercase `0x`-prefixed 32-byte hex;
- a fixed list of covered top-level semantic groups;
- the canonical registry chain ID, address, function signature
  `attest(bytes32,bytes32)`, and ordered arguments.

The response must not return a predicted `attestationId`. The current contract
also commits to caller, chain ID, and inclusion block when deriving that ID, so
the authoritative value exists only in the mined `InsightAttested` event.

## In-window test-vector gate

Before deployment, commit public non-secret fixtures containing the input
object, exact canonical UTF-8 hex, expected `marketIdHash`, expected
`contentHash`, and deterministic registry calldata. Cover at least:

1. recursively reordered object keys producing the same hash;
2. changed array order producing a different hash;
3. one changed analysis value and one changed source timestamp producing
   different hashes;
4. Unicode outside ASCII, escaped control characters, `-0`, and representative
   number-serialization edges from RFC 8785;
5. invalid duplicate keys, unsafe integers, `NaN`, infinity, and malformed
   market identifiers being rejected;
6. independent browser/client and Node/server calculations producing the same
   bytes and hashes;
7. registry calldata decoding back to the exact two documented hashes.

Use a vetted implementation or a small audited implementation with RFC test
vectors. Any new package must pass the repository's license, provenance,
production-audit, and lockfile gates before adoption.

## Relationship to x402 settlement

Canonical proof bytes are generated before settlement. The JSON response bytes
supplied to `processSettlement` must remain the bytes delivered to the caller,
while the authoritative settlement result remains in `PAYMENT-RESPONSE` as
defined in `docs/x402-response-boundary.md`. The `contentHash` commits to the
semantic proof payload, not to the transport serialization or receipt header.
