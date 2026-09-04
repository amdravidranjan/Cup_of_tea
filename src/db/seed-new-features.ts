import { eq } from "drizzle-orm";
import { db } from "./client";
import * as schema from "./schema";

async function main() {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  // Pick a couple of well-progressed seeded projects.
  const projects = await db.select().from(schema.projects);
  const cvg = projects.find((p) => p.id === "p-tn-cvg-canal");
  const bridge = projects.find((p) => p.id === "p-demo-bridge-1");
  const metro = projects.find((p) => p.id === "p-tn-chennai-metro");
  if (!cvg || !bridge || !metro) {
    console.error("Expected seeded projects not found — run db:seed first.");
    process.exit(1);
  }

  // Legal disputes
  await db.insert(schema.legalDisputes).values([
    {
      id: crypto.randomUUID(),
      projectId: cvg.id,
      caseNumber: "WP(C) 4821/2026",
      court: "Madras High Court",
      title: "Objection to canal alignment through temple land",
      partyName: "Sri Meenakshi Devasthanam Trust",
      status: "HEARING",
      filedDate: daysAgo(90),
      nextHearingDate: daysAgo(-14),
      summary:
        "Petitioner contends the notified alignment encroaches on trust-held temple land not covered by the original notification.",
      outcome: null,
      createdBy: "u-district-1",
      createdAt: daysAgo(90),
      updatedAt: daysAgo(10),
    },
    {
      id: crypto.randomUUID(),
      projectId: cvg.id,
      caseNumber: "WP(C) 3390/2025",
      court: "Madras High Court",
      title: "Compensation rate revision petition",
      partyName: "K. Rajendran & Ors.",
      status: "DISPOSED",
      filedDate: daysAgo(400),
      nextHearingDate: null,
      summary: "Group petition seeking compensation rate parity with an adjoining district.",
      outcome: "Disposed — compensation rate revised upward by 8% per court direction.",
      createdBy: "u-district-1",
      createdAt: daysAgo(400),
      updatedAt: daysAgo(120),
    },
  ]);

  // Contractors
  const contractor1 = crypto.randomUUID();
  const contractor2 = crypto.randomUUID();
  await db.insert(schema.contractors).values([
    {
      id: contractor1,
      name: "Sundaram Infra Projects Pvt. Ltd.",
      registrationNumber: "TN-CON-88213",
      specialization: "Canal & irrigation works",
      rating: 4.2,
      createdAt: daysAgo(300),
    },
    {
      id: contractor2,
      name: "Kaveri Bridgeworks & Co.",
      registrationNumber: "OD-CON-40217",
      specialization: "Bridge & structural works",
      rating: 3.8,
      createdAt: daysAgo(200),
    },
  ]);

  // Tenders
  await db.insert(schema.tenders).values([
    {
      id: crypto.randomUUID(),
      projectId: cvg.id,
      tenderNumber: "TND-2026-4471",
      title: "Canal lining and embankment works — Reach 2",
      scope: "Concrete lining, embankment reinforcement, and access road construction along Reach 2 of the canal alignment.",
      estimatedValue: 84_500_000,
      status: "IN_PROGRESS",
      publishedDate: daysAgo(150),
      submissionDeadline: daysAgo(120),
      contractorId: contractor1,
      awardedValue: 81_200_000,
      awardedDate: daysAgo(100),
      createdBy: "u-district-1",
      createdAt: daysAgo(150),
    },
    {
      id: crypto.randomUUID(),
      projectId: bridge.id,
      tenderNumber: "TND-2026-5023",
      title: "Bridge superstructure works",
      scope: "Fabrication and erection of bridge superstructure, including approach spans.",
      estimatedValue: 212_000_000,
      status: "PUBLISHED",
      publishedDate: daysAgo(20),
      submissionDeadline: daysAgo(-25),
      contractorId: null,
      awardedValue: null,
      awardedDate: null,
      createdBy: "u-agency-1",
      createdAt: daysAgo(20),
    },
    {
      id: crypto.randomUUID(),
      projectId: cvg.id,
      tenderNumber: "TND-2025-2210",
      title: "Preliminary earthwork — Reach 1",
      scope: "Site clearance and preliminary earthwork for Reach 1.",
      estimatedValue: 32_000_000,
      status: "COMPLETED",
      publishedDate: daysAgo(320),
      submissionDeadline: daysAgo(295),
      contractorId: contractor1,
      awardedValue: 30_500_000,
      awardedDate: daysAgo(280),
      createdBy: "u-district-1",
      createdAt: daysAgo(320),
    },
  ]);

  // Rehabilitation facilitation — attach to an existing family if one exists.
  const families = await db
    .select()
    .from(schema.families)
    .where(eqProjectId(cvg.id));
  if (families.length > 0) {
    await db.insert(schema.rehabilitationServices).values([
      {
        id: crypto.randomUUID(),
        familyId: families[0].id,
        projectId: cvg.id,
        serviceType: "SKILL_TRAINING",
        status: "SCHEDULED",
        notes: "Enrolled in a 6-week masonry skills program at the district ITI.",
        scheduledDate: daysAgo(-10),
        completedDate: null,
        facilitatedBy: "u-district-1",
        createdAt: daysAgo(30),
      },
      {
        id: crypto.randomUUID(),
        familyId: families[Math.min(1, families.length - 1)].id,
        projectId: cvg.id,
        serviceType: "HOUSING_ALLOTMENT",
        status: "COMPLETED",
        notes: "Allotted Plot 14, Resettlement Colony Block B.",
        scheduledDate: daysAgo(60),
        completedDate: daysAgo(45),
        facilitatedBy: "u-district-1",
        createdAt: daysAgo(70),
      },
    ]);
  }

  // Public project requests
  await db.insert(schema.projectRequests).values([
    {
      id: "REQ-2026-K3P9XZ",
      title: "Bridge over Kolab river at Semiliguda",
      purpose: "Connect Semiliguda to the district headquarters during monsoon flooding",
      description:
        "Every monsoon the existing low-level crossing floods for 3-4 weeks, cutting off nearly 6,000 residents from the district hospital and market. A permanent bridge would resolve this.",
      state: "Odisha",
      district: "Koraput",
      village: "Semiliguda",
      requesterName: "Biswajit Mohanty",
      requesterContact: "9437xxxxxx",
      status: "UNDER_REVIEW",
      reviewNote: null,
      reviewedBy: "u-district-1",
      reviewedAt: daysAgo(5),
      linkedProjectId: null,
      createdAt: daysAgo(20),
    },
    {
      id: "REQ-2026-M7QW2A",
      title: "Community water tank in Kundra",
      purpose: "Piped water supply for Kundra village cluster",
      description: "Requesting acquisition of a small parcel to build an elevated water tank serving four adjoining hamlets currently relying on a single seasonal well.",
      state: "Odisha",
      district: "Koraput",
      village: "Kundra",
      requesterName: "Laxmi Priya Sahu",
      requesterContact: null,
      status: "SUBMITTED",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      linkedProjectId: null,
      createdAt: daysAgo(3),
    },
  ]);

  console.log("Demo data added for legal disputes, tenders, contractors, rehab, project requests.");
}

// small helper since we didn't import eq at top
function eqProjectId(projectId: string) {
  return eq(schema.families.projectId, projectId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
