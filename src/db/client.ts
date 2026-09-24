import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./bootstrap";

// `file:local.db` for development; a libsql URL plus token when hosted, which
// is what a deployed demo runs on — the filesystem there is not durable.
const client = createClient({
  url: resolveDatabaseUrl(),
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
