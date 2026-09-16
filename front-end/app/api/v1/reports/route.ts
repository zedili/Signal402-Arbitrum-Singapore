import {
  createResourceProblemResponse,
  type ResourceResponse,
} from "../../../../src/lib/x402/report-resource-server";
import {
  createReportPostHandler,
  type ReportResourceHandler,
} from "../../../../src/lib/x402/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Slice 7 will replace this fail-closed boundary only after the owner approves
// a durable replay store and its production data/secret configuration.
const unavailableResource: ReportResourceHandler = async () =>
  createResourceProblemResponse(
    "replay_store_unavailable",
    "not_present",
    "https://signal402.vercel.app",
  ) satisfies ResourceResponse;

export const POST = createReportPostHandler(unavailableResource);
