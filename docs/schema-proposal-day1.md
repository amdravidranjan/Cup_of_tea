# Schema Proposal — Day 1 Lane B

> **Author:** Lane B  
> **For:** Integrator to merge into `src/db/schema.ts`  
> **Date:** Day 1

---

## New Fields on Existing Tables

### `projects` table

```typescript
// Add after coverPhotoUrl
assetKind: text("asset_kind"), // bridge | canal | residential | transmission-line | highway | metro | rail | industrial | airport | pipeline
```

### `parcels` table

```typescript
// Add after sitePhotoUrl
structureType: text("structure_type"), // house | agricultural | commercial | empty-land | temple | industrial
```

### `compensations` table

```typescript
// Add after paidAt
paidVia: text("paid_via"), // bank_transfer | cheque | cash
```

### `families` table

```typescript
// Already has contactPhone — the following are additional contact channels
mobileNumber: text("mobile_number"), // for SMS/voice notifications
emailAddress: text("email_address"), // for email notifications
```

### `entitlements` table

```typescript
// Add after note
grantedPhotoId: text("granted_photo_id"), // FK to documents.id — proof of grant
```

### `grievances` table

```typescript
// Add after compensationId
linkedParcelId: text("linked_parcel_id"), // FK to parcels.id — the specific parcel this grievance concerns
```

---

## New Table: `auditLog`

```typescript
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),          // user id
  actorRole: text("actor_role").notNull(),  // role at time of action
  action: text("action").notNull(),        // CREATE | UPDATE | DELETE | TRANSITION
  entityType: text("entity_type").notNull(), // project | parcel | family | compensation | etc.
  entityId: text("entity_id").notNull(),   // PK of the affected row
  before: text("before"),                  // JSON snapshot of previous state (null for CREATE)
  after: text("after"),                    // JSON snapshot of new state (null for DELETE)
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  hash: text("hash").notNull(),            // SHA-256 chain: hash(prev_hash + action + timestamp)
});
```

---

## Notes

- All new fields are nullable and have no default — existing data is unaffected.
- The `auditLog` table has no foreign keys to keep it append-only and portable.
- The SHA-256 hash chain in `auditLog` makes tampering detectable (each row's hash depends on the previous row's hash).
