import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { findTitleConflicts } from "@/db/title-conflicts";
import { listDismissedConflictKeys } from "@/db/conflict-dismissals";
import { ConflictsList } from "@/components/conflicts-list";

export default async function ConflictsPage() {
  const session = await getSession();
  if (!session) return null;
  if (!can(session.role, "conflict:review")) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not have access to title-chain conflict review.
      </p>
    );
  }

  const [allConflicts, dismissed] = await Promise.all([
    findTitleConflicts(),
    listDismissedConflictKeys(),
  ]);
  const conflicts = allConflicts.filter((c) => !dismissed.has(c.key));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Fraud Detection
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Title-Chain Conflicts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Families with the same head-of-household name and village registered on more than one
          project — the pattern behind the same land being compensated twice under two different
          project codes.
        </p>
      </div>
      <ConflictsList conflicts={conflicts} />
    </div>
  );
}
