import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Builds a fresh in-memory SQLite database with every table this app
 * defines in schema.ts, for tests. This is the single source of truth
 * for the test-DB shape — individual test files should call
 * `createTestDb()` instead of hand-writing their own CREATE TABLE SQL.
 *
 * Why this exists: before this helper, ~14 test files each wrote their
 * own subset of CREATE TABLE statements by hand. Every time a column was
 * added to schema.ts, all of them needed a matching manual edit, and it
 * was easy to miss one — which is exactly what happened twice in the same
 * week. Consolidating to one file means a schema change only needs to be
 * reflected here once.
 *
 * This still isn't generated directly from schema.ts (drizzle-kit's
 * generator is a build-time CLI tool, not something to invoke per test
 * run), so it can still drift — but the drift now has exactly one place
 * to fix instead of fourteen.
 */
export async function createTestDb(): Promise<LibSQLDatabase<typeof schema>> {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });

  await db.run(sql`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
      district TEXT, state TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL,
      state TEXT NOT NULL, district TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      geometry_type TEXT, geometry_geo_json TEXT, rr_stage TEXT, cover_photo_url TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE stage_history (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_stage TEXT, to_stage TEXT NOT NULL,
      action TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, category TEXT NOT NULL,
      version INTEGER NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL, storage_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL, uploaded_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE parcels (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, village TEXT NOT NULL,
      area_hectares REAL NOT NULL, status TEXT NOT NULL,
      geometry_geo_json TEXT NOT NULL, created_at INTEGER NOT NULL,
      survey_number TEXT, patta_number TEXT, site_photo_url TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE compensation_rates (
      id TEXT PRIMARY KEY, state TEXT NOT NULL, district TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL,
      set_by TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE compensations (
      id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL, project_id TEXT NOT NULL,
      rate_per_hectare REAL NOT NULL, multiplier REAL NOT NULL, assets_value REAL NOT NULL,
      market_value REAL NOT NULL, multiplied_market_value REAL NOT NULL,
      solatium REAL NOT NULL, interest REAL NOT NULL, total REAL NOT NULL,
      status TEXT NOT NULL, assessed_by TEXT NOT NULL, assessed_at INTEGER NOT NULL,
      paid_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE rr_stage_history (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_stage TEXT, to_stage TEXT NOT NULL,
      action TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, note TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE families (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, parcel_id TEXT,
      head_of_household_name TEXT NOT NULL, village TEXT NOT NULL, category TEXT NOT NULL,
      member_count INTEGER NOT NULL, vulnerable_group INTEGER NOT NULL DEFAULT 0,
      contact_phone TEXT, surveyed_by TEXT NOT NULL, surveyed_at INTEGER NOT NULL,
      deceased_at INTEGER, succession_note TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE entitlements (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL, type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', amount REAL, granted_by TEXT,
      granted_at INTEGER, note TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE notification_reads (
      user_id TEXT PRIMARY KEY, last_seen_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE infrastructure_items (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, item TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', completed_by TEXT, completed_at INTEGER,
      completion_photo_url TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE grievances (
      id TEXT PRIMARY KEY, tracking_number TEXT NOT NULL UNIQUE, type TEXT NOT NULL,
      project_id TEXT NOT NULL, compensation_id TEXT, submitter_name TEXT NOT NULL,
      submitter_contact TEXT, description TEXT NOT NULL,
      attachment_file_name TEXT, attachment_storage_path TEXT,
      status TEXT NOT NULL DEFAULT 'FILED', resolution TEXT, resolution_note TEXT,
      resolved_by TEXT, resolved_at INTEGER, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE elevation_profiles (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE,
      samples_json TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE project_requests (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, purpose TEXT NOT NULL,
      description TEXT NOT NULL, state TEXT NOT NULL, district TEXT NOT NULL, village TEXT,
      requester_name TEXT NOT NULL, requester_contact TEXT,
      status TEXT NOT NULL DEFAULT 'SUBMITTED', review_note TEXT, reviewed_by TEXT,
      reviewed_at INTEGER, linked_project_id TEXT, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE legal_disputes (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, case_number TEXT NOT NULL,
      court TEXT NOT NULL, title TEXT NOT NULL, party_name TEXT,
      status TEXT NOT NULL DEFAULT 'FILED', filed_date INTEGER NOT NULL,
      next_hearing_date INTEGER, summary TEXT NOT NULL, outcome TEXT,
      is_stay_order INTEGER NOT NULL DEFAULT 0, stay_cleared_at INTEGER,
      created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE contractors (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, registration_number TEXT NOT NULL,
      specialization TEXT, rating REAL, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE tenders (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, tender_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL, scope TEXT NOT NULL, estimated_value REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PUBLISHED', published_date INTEGER NOT NULL,
      submission_deadline INTEGER, contractor_id TEXT, awarded_value REAL,
      awarded_date INTEGER, created_by TEXT NOT NULL, created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE rehabilitation_services (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL, project_id TEXT NOT NULL,
      service_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'REQUESTED', notes TEXT,
      scheduled_date INTEGER, completed_date INTEGER, facilitated_by TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE notification_log (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL, project_id TEXT NOT NULL,
      channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'QUEUED',
      postal_tracking_id TEXT, postal_document_id TEXT, note TEXT,
      sent_by TEXT NOT NULL, sent_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE conflict_dismissals (
      id TEXT PRIMARY KEY, conflict_key TEXT NOT NULL UNIQUE,
      dismissed_by TEXT NOT NULL, note TEXT, dismissed_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE heirs (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL,
      relationship TEXT NOT NULL, share_percent REAL NOT NULL, contact_phone TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE gram_sabha_consultations (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, village TEXT NOT NULL,
      consultation_date INTEGER NOT NULL, attendance_count INTEGER NOT NULL,
      minutes TEXT NOT NULL, resolution TEXT NOT NULL, recorded_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE land_bank_entries (
      id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL UNIQUE, project_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IDLE', reason TEXT NOT NULL, note TEXT,
      flagged_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE notice_drafts (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, family_id TEXT,
      draft_text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT',
      approved_by TEXT, approved_at INTEGER, created_at INTEGER NOT NULL
    );
  `);

  return db;
}
