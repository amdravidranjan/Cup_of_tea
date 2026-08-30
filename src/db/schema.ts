import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  district: text("district"),
  state: text("state"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  stage: text("stage").notNull().default("DRAFT"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  geometryType: text("geometry_type"),
  geometryGeoJson: text("geometry_geo_json"),
  rrStage: text("rr_stage"),
});

export const stageHistory = sqliteTable("stage_history", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  category: text("category").notNull(),
  version: integer("version").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull(),
});

export const parcels = sqliteTable("parcels", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  village: text("village").notNull(),
  areaHectares: real("area_hectares").notNull(),
  status: text("status").notNull(),
  geometryGeoJson: text("geometry_geo_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  surveyNumber: text("survey_number"),
  pattaNumber: text("patta_number"),
});

export const compensationRates = sqliteTable("compensation_rates", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  ratePerHectare: real("rate_per_hectare").notNull(),
  multiplier: real("multiplier").notNull(),
  setBy: text("set_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const compensations = sqliteTable("compensations", {
  id: text("id").primaryKey(),
  parcelId: text("parcel_id").notNull(),
  projectId: text("project_id").notNull(),
  ratePerHectare: real("rate_per_hectare").notNull(),
  multiplier: real("multiplier").notNull(),
  assetsValue: real("assets_value").notNull(),
  marketValue: real("market_value").notNull(),
  multipliedMarketValue: real("multiplied_market_value").notNull(),
  solatium: real("solatium").notNull(),
  interest: real("interest").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull(),
  assessedBy: text("assessed_by").notNull(),
  assessedAt: integer("assessed_at", { mode: "timestamp" }).notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }),
});

export const rrStageHistory = sqliteTable("rr_stage_history", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const families = sqliteTable("families", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  parcelId: text("parcel_id"),
  headOfHouseholdName: text("head_of_household_name").notNull(),
  village: text("village").notNull(),
  category: text("category").notNull(),
  memberCount: integer("member_count").notNull(),
  vulnerableGroup: integer("vulnerable_group", { mode: "boolean" }).notNull().default(false),
  contactPhone: text("contact_phone"),
  surveyedBy: text("surveyed_by").notNull(),
  surveyedAt: integer("surveyed_at", { mode: "timestamp" }).notNull(),
});

export const entitlements = sqliteTable("entitlements", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("PENDING"),
  amount: real("amount"),
  grantedBy: text("granted_by"),
  grantedAt: integer("granted_at", { mode: "timestamp" }),
  note: text("note"),
});

export const notificationReads = sqliteTable("notification_reads", {
  userId: text("user_id").primaryKey(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
});

export const infrastructureItems = sqliteTable("infrastructure_items", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  item: text("item").notNull(),
  status: text("status").notNull().default("PENDING"),
  completedBy: text("completed_by"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const grievances = sqliteTable("grievances", {
  id: text("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(),
  type: text("type").notNull(),
  projectId: text("project_id").notNull(),
  compensationId: text("compensation_id"),
  submitterName: text("submitter_name").notNull(),
  submitterContact: text("submitter_contact"),
  description: text("description").notNull(),
  attachmentFileName: text("attachment_file_name"),
  attachmentStoragePath: text("attachment_storage_path"),
  status: text("status").notNull().default("FILED"),
  resolution: text("resolution"),
  resolutionNote: text("resolution_note"),
  resolvedBy: text("resolved_by"),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const elevationProfiles = sqliteTable("elevation_profiles", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().unique(),
  samplesJson: text("samples_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
