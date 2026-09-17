import "server-only";

import { neon } from "@neondatabase/serverless";

import {
  PostgresReplayStore,
  type PostgresQueryExecutor,
} from "./postgres-replay-store";

export const SIGNAL402_REPLAY_DATABASE_URL =
  "SIGNAL402_REPLAY_DATABASE_URL" as const;

export function createNeonReplayStore(connectionString: string) {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new TypeError("Invalid replay database connection string");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.pathname.slice(1)
  ) {
    throw new TypeError("Invalid replay database connection string");
  }

  const sql = neon(connectionString);
  const executor: PostgresQueryExecutor = {
    async query<Row extends Record<string, unknown>>(
      text: string,
      values: readonly unknown[],
    ) {
      return (await sql.query(text, [...values])) as Row[];
    },
  };
  return new PostgresReplayStore(executor);
}

export function createNeonReplayStoreFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const connectionString = environment[SIGNAL402_REPLAY_DATABASE_URL];
  if (!connectionString) {
    throw new Error("Durable replay store is not configured");
  }
  return createNeonReplayStore(connectionString);
}
