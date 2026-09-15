import { keccak256, sha256 } from "viem";
import { z } from "zod";

import { canonicalizeJcsBytes } from "./canonical-proof";

const encoder = new TextEncoder();
const REQUEST_DOMAIN = "signal402:paid-request:v1\n";
const PURCHASE_KEY_DOMAIN = "signal402:purchase-key:v1\n";

export const requestPaymentTermsSchema = z.strictObject({
  network: z.string().min(1),
  asset: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amountAtomic: z.string().regex(/^[1-9]\d*$/),
  payTo: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export type RequestPaymentTerms = z.infer<typeof requestPaymentTermsSchema>;

export function normalizePositiveMarketId(input: unknown): string {
  if (typeof input !== "string" || !/^[1-9]\d*$/.test(input)) {
    throw new TypeError(
      "Market ID must be a positive canonical base-10 string",
    );
  }
  return input;
}

export function deriveRequestFingerprint(
  marketId: string,
  inputTerms: RequestPaymentTerms,
) {
  const normalizedMarketId = normalizePositiveMarketId(marketId);
  const terms = requestPaymentTermsSchema.parse(inputTerms);
  const payload = canonicalizeJcsBytes({
    method: "POST",
    route: "/api/v1/reports",
    marketId: normalizedMarketId,
    responseSchema: "signal402-report-v1",
    network: terms.network,
    asset: terms.asset,
    amount: terms.amountAtomic,
    payTo: terms.payTo,
  });
  const prefix = encoder.encode(REQUEST_DOMAIN);
  const bytes = new Uint8Array(prefix.length + payload.length);
  bytes.set(prefix);
  bytes.set(payload, prefix.length);
  return keccak256(bytes);
}

export const requestIdentityDomain = REQUEST_DOMAIN;

export function derivePurchaseKey(idempotencyKey: string) {
  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(idempotencyKey)
  ) {
    throw new TypeError(
      "Idempotency key must be a bounded, high-entropy printable value",
    );
  }
  return sha256(encoder.encode(PURCHASE_KEY_DOMAIN + idempotencyKey));
}

export function deriveCredentialDigest(paymentHeaderBytes: Uint8Array) {
  if (
    !(paymentHeaderBytes instanceof Uint8Array) ||
    paymentHeaderBytes.length === 0 ||
    paymentHeaderBytes.length > 16_384
  ) {
    throw new TypeError("Payment header bytes must be non-empty and bounded");
  }
  return sha256(paymentHeaderBytes);
}

export const purchaseKeyDomain = PURCHASE_KEY_DOMAIN;
