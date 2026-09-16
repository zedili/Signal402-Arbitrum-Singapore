import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ready: false,
      code: "legacy_endpoint_retired",
      successor: "/api/v1/reports",
    },
    { status: 410, headers: { "Cache-Control": "private, no-store" } },
  );
}
