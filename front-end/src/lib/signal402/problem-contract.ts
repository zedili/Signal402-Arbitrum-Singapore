import { z } from "zod";

export const problemCodeSchema = z.enum([
  "invalid_json",
  "invalid_market_id",
  "invalid_idempotency_key",
  "market_not_found",
  "unsupported_market_shape",
  "payment_required",
  "payment_authorization_invalid",
  "idempotency_conflict",
  "purchase_in_progress",
  "source_unavailable",
  "provider_unavailable",
  "provider_timeout",
  "provider_invalid_output",
  "replay_store_unavailable",
  "settlement_failed_unconsumed",
  "settlement_outcome_unknown",
  "stored_receipt_invalid",
  "internal_error",
]);

export const problemActionSchema = z.enum([
  "fix_request_without_payment",
  "present_payment_terms",
  "retry_same_purchase",
  "wait_then_retry_same_purchase",
  "check_settlement_before_new_purchase",
  "start_new_purchase_with_confirmation",
  "stop",
]);

export const paymentStateSchema = z.enum([
  "not_present",
  "unverified",
  "verified_unsettled",
  "settled",
  "unknown",
]);

export type ProblemCode = z.infer<typeof problemCodeSchema>;
export type ProblemAction = z.infer<typeof problemActionSchema>;
export type PaymentState = z.infer<typeof paymentStateSchema>;

type ProblemRule = Readonly<{
  status: number;
  action: ProblemAction;
  paymentStates: readonly PaymentState[];
}>;

export const problemRules = {
  invalid_json: {
    status: 400,
    action: "fix_request_without_payment",
    paymentStates: ["not_present"],
  },
  invalid_market_id: {
    status: 422,
    action: "fix_request_without_payment",
    paymentStates: ["not_present"],
  },
  invalid_idempotency_key: {
    status: 400,
    action: "fix_request_without_payment",
    paymentStates: ["not_present"],
  },
  market_not_found: {
    status: 404,
    action: "stop",
    paymentStates: ["not_present", "verified_unsettled"],
  },
  unsupported_market_shape: {
    status: 422,
    action: "stop",
    paymentStates: ["not_present", "verified_unsettled"],
  },
  payment_required: {
    status: 402,
    action: "present_payment_terms",
    paymentStates: ["not_present"],
  },
  payment_authorization_invalid: {
    status: 402,
    action: "start_new_purchase_with_confirmation",
    paymentStates: ["unverified"],
  },
  idempotency_conflict: {
    status: 409,
    action: "stop",
    paymentStates: ["unverified", "verified_unsettled"],
  },
  purchase_in_progress: {
    status: 409,
    action: "wait_then_retry_same_purchase",
    paymentStates: ["unverified", "verified_unsettled"],
  },
  source_unavailable: {
    status: 503,
    action: "retry_same_purchase",
    paymentStates: ["verified_unsettled"],
  },
  provider_unavailable: {
    status: 502,
    action: "retry_same_purchase",
    paymentStates: ["verified_unsettled"],
  },
  provider_timeout: {
    status: 504,
    action: "retry_same_purchase",
    paymentStates: ["verified_unsettled"],
  },
  provider_invalid_output: {
    status: 502,
    action: "retry_same_purchase",
    paymentStates: ["verified_unsettled"],
  },
  replay_store_unavailable: {
    status: 503,
    action: "retry_same_purchase",
    paymentStates: ["unverified", "verified_unsettled", "unknown"],
  },
  settlement_failed_unconsumed: {
    status: 502,
    action: "retry_same_purchase",
    paymentStates: ["verified_unsettled"],
  },
  settlement_outcome_unknown: {
    status: 503,
    action: "check_settlement_before_new_purchase",
    paymentStates: ["unknown"],
  },
  stored_receipt_invalid: {
    status: 500,
    action: "check_settlement_before_new_purchase",
    paymentStates: ["unknown"],
  },
  internal_error: {
    status: 500,
    action: "stop",
    paymentStates: [
      "not_present",
      "unverified",
      "verified_unsettled",
      "settled",
      "unknown",
    ],
  },
} as const satisfies Record<ProblemCode, ProblemRule>;

const problemBaseSchema = z.strictObject({
  type: z.url(),
  title: z.string().trim().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().trim().min(1),
  instance: z
    .string()
    .regex(/^urn:signal402:problem:[^\s]+$/)
    .optional(),
  code: problemCodeSchema,
  action: problemActionSchema,
  paymentState: paymentStateSchema,
  purchaseId: z.string().min(1).max(128).optional(),
  retryAfterSeconds: z.number().int().positive().max(3_600).optional(),
});

export const problemSchema = problemBaseSchema.superRefine(
  (problem, context) => {
    const rule: ProblemRule = problemRules[problem.code];
    const expectedTypeSuffix = `/problems/${problem.code.replaceAll("_", "-")}`;

    if (!problem.type.endsWith(expectedTypeSuffix)) {
      context.addIssue({
        code: "custom",
        path: ["type"],
        message: `Problem type must end with ${expectedTypeSuffix}`,
      });
    }
    if (problem.status !== rule.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: `Expected HTTP status ${rule.status}`,
      });
    }
    if (problem.action !== rule.action) {
      context.addIssue({
        code: "custom",
        path: ["action"],
        message: `Expected action ${rule.action}`,
      });
    }
    if (!rule.paymentStates.includes(problem.paymentState)) {
      context.addIssue({
        code: "custom",
        path: ["paymentState"],
        message: `Payment state ${problem.paymentState} is not valid for ${problem.code}`,
      });
    }
    if (
      problem.retryAfterSeconds !== undefined &&
      !["retry_same_purchase", "wait_then_retry_same_purchase"].includes(
        problem.action,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["retryAfterSeconds"],
        message: "Retry delay is only valid for retry actions",
      });
    }
  },
);

export function parseProblemForHttpStatus(
  input: unknown,
  actualStatus: number,
) {
  const problem = problemSchema.parse(input);
  if (problem.status !== actualStatus) {
    throw new Error(
      `Problem body status ${problem.status} does not match HTTP status ${actualStatus}`,
    );
  }
  return problem;
}

export type Signal402Problem = z.infer<typeof problemSchema>;
