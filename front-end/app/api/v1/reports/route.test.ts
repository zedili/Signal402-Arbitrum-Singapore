import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { POST as legacyPost } from "../../analysis/route";
import { GET as legacyStatus } from "../../analysis/status/route";
import { problemSchema } from "../../../../src/lib/signal402/problem-contract";
import {
  MAX_REPORT_REQUEST_BYTES,
  createReportPostHandler,
} from "../../../../src/lib/x402/report-route";
import { POST } from "./route";

const encoder = new TextEncoder();

function request(
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return new NextRequest("https://signal402.test/api/v1/reports", {
    method: "POST",
    headers,
    body,
  });
}

async function bodyJson(response: Response) {
  return JSON.parse(await response.text());
}

function productionSources(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) {
      return [];
    }
    return [readFileSync(path, "utf8")];
  });
}

describe("POST /api/v1/reports route boundary", () => {
  it("forwards strict JSON and opaque headers to the sole resource handler", async () => {
    const exactBody = encoder.encode('{"ok":true}');
    const handler = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        "content-type": "application/json",
        "payment-response": "fixture-receipt",
      },
      body: exactBody,
    });
    const post = createReportPostHandler(handler);
    const response = await post(
      request('{"marketId":"123456"}', {
        "content-type": "application/json; charset=utf-8",
        "idempotency-key": "fixture-idempotency-key-0001",
        "payment-signature": "fixture-payment-signature",
        "x-payment": "ignored-legacy-header",
      }),
    );

    expect(handler).toHaveBeenCalledWith({
      body: { marketId: "123456" },
      idempotencyKey: "fixture-idempotency-key-0001",
      paymentHeader: "fixture-payment-signature",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("payment-response")).toBe("fixture-receipt");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(exactBody);
  });

  it.each([
    ["missing media type", '{"marketId":"123456"}', {}],
    ["malformed JSON", '{"marketId":', { "content-type": "application/json" }],
    [
      "duplicate member",
      '{"marketId":"123456","marketId":"654321"}',
      { "content-type": "application/json" },
    ],
    [
      "oversized body",
      `{"marketId":"${"1".repeat(MAX_REPORT_REQUEST_BYTES)}"}`,
      { "content-type": "application/json" },
    ],
  ] as const)(
    "rejects %s before the resource handler",
    async (_name, body, headers) => {
      const handler = vi.fn();
      const response = await createReportPostHandler(handler)(
        request(body, { ...headers }),
      );
      expect(response.status).toBe(400);
      expect(problemSchema.parse(await bodyJson(response)).code).toBe(
        "invalid_json",
      );
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it("fails closed until an owner-approved durable store is connected", async () => {
    const response = await POST(request('{"marketId":"123456"}'));
    const problem = problemSchema.parse(await bodyJson(response));
    expect(response.status).toBe(503);
    expect(problem).toMatchObject({
      code: "replay_store_unavailable",
      action: "retry_same_purchase",
      paymentState: "not_present",
    });
    expect(response.headers.get("payment-required")).toBeNull();
  });

  it("redacts an unexpected resource failure into a typed problem", async () => {
    const post = createReportPostHandler(
      vi.fn().mockRejectedValue(new Error("private database details")),
    );
    const response = await post(
      request('{"marketId":"123456"}', {
        "content-type": "application/json",
        "payment-signature": "fixture-payment-signature",
      }),
    );
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(problemSchema.parse(JSON.parse(text))).toMatchObject({
      code: "internal_error",
      paymentState: "unverified",
    });
    expect(text).not.toContain("database");
  });
});

describe("legacy paid-route retirement", () => {
  it("returns an unpaid typed 410 without redirecting or settling", async () => {
    const response = legacyPost();
    const problem = problemSchema.parse(await bodyJson(response));
    expect(response.status).toBe(410);
    expect(problem).toMatchObject({
      code: "legacy_endpoint_retired",
      action: "stop",
      paymentState: "not_present",
    });
    expect(response.headers.get("link")).toContain("/api/v1/reports");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("payment-required")).toBeNull();
    expect(response.headers.get("payment-response")).toBeNull();
  });

  it("marks the legacy readiness surface unavailable", async () => {
    const response = legacyStatus();
    expect(response.status).toBe(410);
    await expect(bodyJson(response)).resolves.toEqual({
      ready: false,
      code: "legacy_endpoint_retired",
      successor: "/api/v1/reports",
    });
  });

  it("contains no second production settlement implementation", () => {
    const root = process.cwd();
    expect(existsSync(join(root, "src/lib/x402/server.ts"))).toBe(false);
    const source = [
      ...productionSources(join(root, "app")),
      ...productionSources(join(root, "src")),
    ].join("\n");
    expect(source).not.toMatch(
      /handlePaidAnalysis|processSettlement|x402HTTPResourceServer/,
    );

    const legacySource = readFileSync(
      join(root, "app/api/analysis/route.ts"),
      "utf8",
    );
    expect(legacySource).not.toMatch(
      /payment-signature|x-payment|settlePayment|verifyPayment/,
    );
  });
});
