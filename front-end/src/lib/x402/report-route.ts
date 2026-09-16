import { NextRequest, NextResponse } from "next/server";

import { parseUniqueJson } from "../signal402/canonical-proof";
import {
  createResourceProblemResponse,
  type ResourceRequest,
  type ResourceResponse,
} from "./report-resource-server";

export const MAX_REPORT_REQUEST_BYTES = 2_048;

export type ReportResourceHandler = (
  request: ResourceRequest,
) => Promise<ResourceResponse>;

export function toNextResponse(response: ResourceResponse) {
  return new NextResponse(response.body.slice(), {
    status: response.status,
    headers: response.headers,
  });
}

function invalidJsonResponse() {
  return toNextResponse(
    createResourceProblemResponse(
      "invalid_json",
      "not_present",
      "https://signal402.vercel.app",
    ),
  );
}

export function createReportPostHandler(handle: ReportResourceHandler) {
  return async function POST(request: NextRequest) {
    const mediaType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (mediaType !== "application/json") return invalidJsonResponse();

    const declaredLength = request.headers.get("content-length");
    if (
      declaredLength &&
      (!/^\d+$/.test(declaredLength) ||
        Number(declaredLength) > MAX_REPORT_REQUEST_BYTES)
    ) {
      return invalidJsonResponse();
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await request.arrayBuffer());
    } catch {
      return invalidJsonResponse();
    }
    if (bytes.length === 0 || bytes.length > MAX_REPORT_REQUEST_BYTES) {
      return invalidJsonResponse();
    }

    let body: unknown;
    try {
      body = parseUniqueJson(bytes);
    } catch {
      return invalidJsonResponse();
    }

    const paymentHeader =
      request.headers.get("payment-signature") ??
      request.headers.get("x-payment") ??
      undefined;
    try {
      const response = await handle({
        body,
        idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
        paymentHeader,
      });
      return toNextResponse(response);
    } catch {
      return toNextResponse(
        createResourceProblemResponse(
          "internal_error",
          paymentHeader ? "unverified" : "not_present",
          "https://signal402.vercel.app",
        ),
      );
    }
  };
}
