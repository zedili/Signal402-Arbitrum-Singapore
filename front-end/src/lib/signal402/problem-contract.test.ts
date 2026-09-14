import { describe, expect, it } from "vitest";

import {
  parseProblemForHttpStatus,
  problemRules,
  problemSchema,
  type ProblemCode,
} from "./problem-contract";

const firstState = (code: ProblemCode) => problemRules[code].paymentStates[0];

function validProblem(code: ProblemCode) {
  const rule = problemRules[code];
  return {
    type: `https://signal402.vercel.app/problems/${code.replaceAll("_", "-")}`,
    title: "Stable fixture title",
    status: rule.status,
    detail: "Stable fixture detail without provider internals.",
    instance: "urn:signal402:problem:fixture-01",
    code,
    action: rule.action,
    paymentState: firstState(code),
    purchaseId: "purchase_fixture_01",
    ...(rule.action === "retry_same_purchase" ||
    rule.action === "wait_then_retry_same_purchase"
      ? { retryAfterSeconds: 2 }
      : {}),
  };
}

describe("problemSchema", () => {
  it.each(Object.keys(problemRules) as ProblemCode[])(
    "accepts the golden %s mapping",
    (code) => {
      expect(problemSchema.parse(validProblem(code))).toEqual(
        validProblem(code),
      );
    },
  );

  it.each(Object.keys(problemRules) as ProblemCode[])(
    "rejects a wrong status for %s",
    (code) => {
      expect(
        problemSchema.safeParse({ ...validProblem(code), status: 418 }).success,
      ).toBe(false);
    },
  );

  it("rejects prose-driven action and payment-state substitutions", () => {
    const problem = validProblem("settlement_outcome_unknown");
    expect(
      problemSchema.safeParse({
        ...problem,
        action: "start_new_purchase_with_confirmation",
        paymentState: "unverified",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown members and mismatched stable type URLs", () => {
    expect(
      problemSchema.safeParse({
        ...validProblem("invalid_json"),
        rawError: "secret",
      }).success,
    ).toBe(false);
    expect(
      problemSchema.safeParse({
        ...validProblem("invalid_json"),
        type: "https://signal402.vercel.app/problems/internal-error",
      }).success,
    ).toBe(false);
  });

  it("allows retry delays only on retry actions", () => {
    expect(
      problemSchema.safeParse({
        ...validProblem("invalid_json"),
        retryAfterSeconds: 2,
      }).success,
    ).toBe(false);
  });
});

describe("parseProblemForHttpStatus", () => {
  it("requires the body status to match the actual HTTP status", () => {
    const problem = validProblem("purchase_in_progress");
    expect(parseProblemForHttpStatus(problem, 409)).toEqual(problem);
    expect(() => parseProblemForHttpStatus(problem, 503)).toThrow(
      /does not match HTTP status/,
    );
  });
});
