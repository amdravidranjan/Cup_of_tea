import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
      <code>{children.trim()}</code>
    </pre>
  );
}

export default function InteroperabilityPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Platform Integration
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Interoperability</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Documented API contracts this platform is designed to speak — modeled directly on the
          two systems Bhoomi Rashi (bhoomirashi.gov.in, NHAI&apos;s national land-acquisition
          portal) already integrates with in production. Not live connections in this build; the
          contracts below are the real shape a production deployment would implement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">e-Gazette Publication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            When a Section 19 Final Declaration is published (this app&apos;s{" "}
            <code className="text-xs">PUBLISH_DECLARATION</code> action), Bhoomi Rashi
            auto-routes the notification to the national e-Gazette for official publication. A
            production deployment of this platform would call the equivalent contract at the
            moment a declaration document is generated (see the{" "}
            <code className="text-xs">GENERATED_DOCUMENT_STAGE.DECLARATION</code> hook in{" "}
            <code className="text-xs">src/lib/generated-documents.ts</code>).
          </p>
          <p className="font-medium">Request — POST /egazette/v1/notifications</p>
          <CodeBlock>{`{
  "projectId": "p-tn-chennai-metro",
  "notificationType": "SECTION_19_DECLARATION",
  "actNumber": "RFCTLARR-2013",
  "issuingAuthority": "District Collector, Chennai",
  "state": "Tamil Nadu",
  "district": "Chennai",
  "publicationDate": "2026-06-15",
  "documentUrl": "https://land-acquisition.example.gov.in/api/documents/{id}/download"
}`}</CodeBlock>
          <p className="font-medium">Response</p>
          <CodeBlock>{`{
  "gazetteId": "CG-DL-E-15062026-123456",
  "status": "PUBLISHED",
  "publicUrl": "https://egazette.gov.in/WriteReadData/2026/123456.pdf"
}`}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">PFMS Compensation Disbursement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Bhoomi Rashi pays compensation directly via PFMS (Public Financial Management
            System) bank transfer rather than a manual disbursement process — this is the
            mechanism the CAG audit findings in this platform&apos;s design spec cite as the fix
            for the &ldquo;2,208 families never paid&rdquo; class of failure. A production
            deployment would call this contract from{" "}
            <code className="text-xs">markCompensationPaidWith</code> (
            <code className="text-xs">src/db/compensation.ts</code>) instead of the direct
            status flip this demo build uses.
          </p>
          <p className="font-medium">Request — POST /pfms/v1/payments</p>
          <CodeBlock>{`{
  "compensationId": "c-8f2a...",
  "beneficiaryName": "Muthu Selvam",
  "beneficiaryIfsc": "SBIN0001234",
  "beneficiaryAccountNumber": "XXXXXXXXXXXX",
  "amount": 285000.50,
  "purpose": "RFCTLARR_COMPENSATION",
  "schemeCode": "DOLR-LA-COMP",
  "referenceId": "p-tn-chennai-metro/pc-a2"
}`}</CodeBlock>
          <p className="font-medium">Response</p>
          <CodeBlock>{`{
  "pfmsTransactionId": "PFMS2026061512345678",
  "status": "SETTLED",
  "settledAt": "2026-06-15T11:42:03Z"
}`}</CodeBlock>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Sources: PIB — Bhoomi Rashi Portal (e-Gazette auto-routing, PFMS disbursement);{" "}
        CAG Audit Report Ch. 5 (R&amp;R payment-tracking failures this integration prevents). See
        the parent design spec, Section 2.5, for full citations.
      </p>
    </div>
  );
}
