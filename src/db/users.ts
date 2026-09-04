import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db as defaultDb } from "./client";
import { users } from "./schema";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

export interface UserRecord {
  id: string;
  name: string;
  role: string;
  district: string | null;
  state: string | null;
}

/**
 * Every user, keyed by id.
 *
 * Audit columns across the app store the acting user's *id* (`assessedBy`,
 * `setBy`, `createdBy`, …), which meant screens were showing raw strings like
 * "u-district-1" where a person's name belongs. The user table is six rows of
 * demo logins, so resolving the whole set in one query and looking names up in
 * memory is cheaper than a join per row.
 */
export async function getUserMapWith(database: Db): Promise<Map<string, UserRecord>> {
  const rows = await database.select().from(users);
  return new Map(rows.map((r) => [r.id, r as UserRecord]));
}

export const getUserMap = () => getUserMapWith(defaultDb);

/** The display name for a user id, falling back to the id when unknown. */
export function displayName(map: Map<string, UserRecord>, id: string): string {
  return map.get(id)?.name ?? id;
}
