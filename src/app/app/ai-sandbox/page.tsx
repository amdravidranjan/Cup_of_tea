import { getSession } from "@/lib/auth";
import { listProjects } from "@/db/projects";
import { RiskWhatIf } from "@/components/risk-what-if";
import { LandRateWhatIf } from "@/components/land-rate-what-if";
import { DocumentReadSandbox } from "@/components/document-read-sandbox";
import { AssistantQueryBrowser } from "@/components/assistant-query-browser";
import { knowledgeIntegrityProblems, knowledgeStats } from "@/lib/ai/assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * One page where every analytics module can be pushed on.
 *
 * The four "AI" features are the ones a judge reaches for, because they are the
 * ones with a number in them that invites being changed — and on the project
 * workspace all four compute from database counts, so they can be looked at but
 * not tested. That asymmetry is what makes them read as an oracle rather than
 * as arithmetic. This page removes it.
 *
 * It sits behind login because it is an officer-facing explanation tool, not a
 * citizen surface — the citizen equivalents are the compensation calculator and
 * the VANI widget, both public. Any signed-in role may open it: there is
 * nothing here but formulas and sample data, no project record is read except
 * the public project list the assistant already uses, and nothing on it writes.
 */
export default async function AiSandboxPage() {
  const session = await getSession();
  if (!session) return null;

  // Project names, so the assistant's live lookup works here too. Everything
  // else on the page is computed from what the visitor types.
  const projects = (await listProjects()).map((p) => ({
    id: p.id,
    name: p.name,
    district: p.district,
    state: p.state,
    stage: p.stage,
  }));

  const problems = knowledgeIntegrityProblems();
  const stats = knowledgeStats();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Explainability
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Analytics sandbox
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Every score and projection in this platform is a fixed formula over data the project
          already holds — not a trained model, and not a live satellite feed. Change any input
          below and the working changes with it. That is the whole claim, and this is where you
          can test it rather than take it on trust.
        </p>
      </div>

      {problems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-900">
              {problems.length} problem(s) in the answer bank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-red-900">
            {/* Surfaced on the page and not only in the test suite: a broken
                follow-up reference is a button that does nothing, and it must
                not be able to sit unnoticed between test runs. */}
            {problems.map((problem, index) => (
              <p key={index}>
                <span className="font-mono">{problem.entryId}</span> — {problem.detail}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <RiskWhatIf />

      <LandRateWhatIf />

      <DocumentReadSandbox />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Assistant — {stats.total} pre-written answers
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            The same answer bank the public VANI widget uses, with match diagnostics turned on.
            Type anything, including nonsense — nothing here can produce an error state.
          </p>
        </CardHeader>
        <CardContent>
          <AssistantQueryBrowser projects={projects} showDiagnostics />
        </CardContent>
      </Card>
    </div>
  );
}
