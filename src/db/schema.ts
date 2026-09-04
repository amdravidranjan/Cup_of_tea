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
  // Real-world cover photo of the project site, shown on the public
  // portal (landing page card + project detail hero).
  coverPhotoUrl: text("cover_photo_url"),
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
  // Real-world site survey photo — set when a field officer photographs
  // the parcel during verification.
  sitePhotoUrl: text("site_photo_url"),
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
  // Succession: set when the head of household has died mid-process and
  // their entitlement has been split across heirs (see the `heirs` table).
  deceasedAt: integer("deceased_at", { mode: "timestamp" }),
  successionNote: text("succession_note"),
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
  // Real-world completion photo, uploaded when an item is marked complete.
  completionPhotoUrl: text("completion_photo_url"),
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

// Public citizens/bodies requesting that a new acquisition project be
// taken up. Reviewed internally; approval can be linked to a real
// project once one is created for it.
export const projectRequests = sqliteTable("project_requests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  purpose: text("purpose").notNull(),
  description: text("description").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  village: text("village"),
  requesterName: text("requester_name").notNull(),
  requesterContact: text("requester_contact"),
  status: text("status").notNull().default("SUBMITTED"),
  reviewNote: text("review_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  linkedProjectId: text("linked_project_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Legal disputes tracker — litigation concerning a project, mirroring
// the reference GLMS's Court Case Monitoring System.
export const legalDisputes = sqliteTable("legal_disputes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  caseNumber: text("case_number").notNull(),
  court: text("court").notNull(),
  title: text("title").notNull(),
  partyName: text("party_name"),
  status: text("status").notNull().default("FILED"),
  filedDate: integer("filed_date", { mode: "timestamp" }).notNull(),
  nextHearingDate: integer("next_hearing_date", { mode: "timestamp" }),
  summary: text("summary").notNull(),
  outcome: text("outcome"),
  isStayOrder: integer("is_stay_order", { mode: "boolean" }).notNull().default(false),
  stayClearedAt: integer("stay_cleared_at", { mode: "timestamp" }),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const contractors = sqliteTable("contractors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  specialization: text("specialization"),
  rating: real("rating"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const tenders = sqliteTable("tenders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  tenderNumber: text("tender_number").notNull().unique(),
  title: text("title").notNull(),
  scope: text("scope").notNull(),
  estimatedValue: real("estimated_value").notNull(),
  status: text("status").notNull().default("PUBLISHED"),
  publishedDate: integer("published_date", { mode: "timestamp" }).notNull(),
  submissionDeadline: integer("submission_deadline", { mode: "timestamp" }),
  contractorId: text("contractor_id"),
  awardedValue: real("awarded_value"),
  awardedDate: integer("awarded_date", { mode: "timestamp" }),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Rehabilitation facilitation — concrete follow-through services offered
// to a family beyond the entitlement payout itself (skill training, job
// placement, housing allotment, transport, counseling).
export const rehabilitationServices = sqliteTable("rehabilitation_services", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  projectId: text("project_id").notNull(),
  serviceType: text("service_type").notNull(),
  status: text("status").notNull().default("REQUESTED"),
  notes: text("notes"),
  scheduledDate: integer("scheduled_date", { mode: "timestamp" }),
  completedDate: integer("completed_date", { mode: "timestamp" }),
  facilitatedBy: text("facilitated_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// --- Stay-order extension on legal disputes (isStayOrder / stayClearedAt,
// inlined into the legalDisputes table above): a stay order actively
// blocks compensation-pay and possession/parcel-status actions on the
// project until it's logged as cleared. ---

// Multi-channel notification log: voice call, email, SMS, and postal
// notice, per family — the "informing affected parties" trail. Postal
// entries carry a tracking id + delivery status since that's the one
// channel with a real physical document (generated via the existing PDF
// pipeline) and a real courier-style tracking lifecycle.
export const notificationLog = sqliteTable("notification_log", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  projectId: text("project_id").notNull(),
  channel: text("channel").notNull(), // VOICE | EMAIL | SMS | POST
  status: text("status").notNull().default("QUEUED"), // QUEUED | SENT | DELIVERED | FAILED
  postalTrackingId: text("postal_tracking_id"),
  postalDocumentId: text("postal_document_id"),
  note: text("note"),
  sentBy: text("sent_by").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Title-chain conflict flags — persisted so a reviewer can dismiss a
// false positive rather than it resurfacing every page load.
export const conflictDismissals = sqliteTable("conflict_dismissals", {
  id: text("id").primaryKey(),
  conflictKey: text("conflict_key").notNull().unique(),
  dismissedBy: text("dismissed_by").notNull(),
  note: text("note"),
  dismissedAt: integer("dismissed_at", { mode: "timestamp" }).notNull(),
});

// Succession: when a landowner dies mid-process, their entitlement
// splits across legal heirs rather than the record just freezing
// (deceasedAt/successionNote are inlined into the `families` table above).
export const heirs = sqliteTable("heirs", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  sharePercent: real("share_percent").notNull(),
  contactPhone: text("contact_phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});


// Gram Sabha (village council) consultation record — structured minutes,
// attendance, and resolution, tied to a project.
export const gramSabhaConsultations = sqliteTable("gram_sabha_consultations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  village: text("village").notNull(),
  consultationDate: integer("consultation_date", { mode: "timestamp" }).notNull(),
  attendanceCount: integer("attendance_count").notNull(),
  minutes: text("minutes").notNull(),
  resolution: text("resolution").notNull(),
  recordedBy: text("recorded_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Land bank — acquired-but-unused parcels get tracked here rather than
// just disappearing from view once a project winds down or descopes.
export const landBankEntries = sqliteTable("land_bank_entries", {
  id: text("id").primaryKey(),
  parcelId: text("parcel_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  status: text("status").notNull().default("IDLE"), // IDLE | UNDER_REVIEW | REPURPOSED | DISPOSED
  reason: text("reason").notNull(),
  note: text("note"),
  flaggedBy: text("flagged_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Auto-drafted citizen notices — a template-generated first draft of the
// plain-language notice text, held here until a district officer reviews
// and approves it (mandatory human-in-the-loop before it can be turned
// into a real PDF via the existing document-generation pipeline).
export const noticeDrafts = sqliteTable("notice_drafts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  familyId: text("family_id"),
  draftText: text("draft_text").notNull(),
  status: text("status").notNull().default("DRAFT"), // DRAFT | APPROVED
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
