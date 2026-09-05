/**
 * DEPRECATED: This file has been merged into seed.ts.
 *
 * Running `npm run db:seed` now creates the complete dataset including
 * legal disputes, contractors, tenders, rehab services, and project requests.
 *
 * This file is kept as a backward-compatibility proxy — it simply warns
 * and exits successfully so any script still invoking it won't break.
 */
console.warn(
  "⚠️  seed-new-features.ts is deprecated — its logic has been merged into seed.ts.\n" +
  "   Run `npm run db:seed` instead for the complete dataset."
);
process.exit(0);
