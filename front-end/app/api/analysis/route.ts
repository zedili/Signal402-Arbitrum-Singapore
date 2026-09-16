import { NextResponse } from "next/server";

import { createResourceProblemResponse } from "../../../src/lib/x402/report-resource-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  const retired = createResourceProblemResponse(
    "legacy_endpoint_retired",
    "not_present",
    "https://signal402.vercel.app",
  );
  return new NextResponse(retired.body, {
    status: retired.status,
    headers: {
      ...retired.headers,
      link: '</api/v1/reports>; rel="successor-version"',
    },
  });
}
