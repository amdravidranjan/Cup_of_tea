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
