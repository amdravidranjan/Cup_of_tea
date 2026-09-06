import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFile } from "node:fs/promises";

const pdf = await PDFDocument.create();
const navy = rgb(0.06, 0.14, 0.23);
const blue = rgb(0.04, 0.33, 0.58);
const sand = rgb(0.97, 0.94, 0.88);
const green = rgb(0.09, 0.5, 0.37);
const white = rgb(1, 1, 1);
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

function text(page, value, x, y, size, color = navy, face = font) {
  page.drawText(value, { x, y, size, font: face, color });
}
function header(page, title, subtitle) {
  page.drawRectangle({ x: 0, y: 735, width: 595, height: 107, color: navy });
  text(page, "TN-GLMS", 42, 792, 29, white, bold);
  text(page, title, 42, 762, 17, white, bold);
  text(page, subtitle, 42, 741, 10, rgb(0.8, 0.87, 0.91));
}
function card(page, x, y, n, title, body, color) {
  page.drawRectangle({ x, y, width: 245, height: 118, color: sand, borderColor: rgb(0.83, 0.77, 0.68), borderWidth: 1 });
  page.drawCircle({ x: x + 25, y: y + 90, size: 15, color });
  text(page, String(n), x + 20.5, y + 85, 12, white, bold);
  text(page, title, x + 50, y + 88, 13, navy, bold);
  body.forEach((line, i) => text(page, line, x + 22, y + 60 - i * 17, 10, rgb(0.25, 0.33, 0.39)));
}

const p1 = pdf.addPage([595, 842]);
header(p1, "End-to-End Demo Handout", "Smart India Hackathon | PS 26016 | National Land Acquisition & Management System");
text(p1, "The story in one sentence", 42, 690, 17, blue, bold);
text(p1, "A community bridge moves from a citizen need to transparent delivery,", 42, 663, 12);
text(p1, "with every decision, family outcome and public update in one auditable record.", 42, 645, 12);
card(p1, 42, 475, 1, "Public entry", ["Request a project", "Track notices & grievances"], blue);
card(p1, 308, 475, 2, "Plan lawfully", ["GIS parcels & SIA", "Role-based approvals"], rgb(0.05, 0.48, 0.47));
card(p1, 42, 326, 3, "Protect people", ["Award & compensation", "R&R, heirs, services"], rgb(0.78, 0.29, 0.19));
card(p1, 308, 326, 4, "Deliver openly", ["Tenders & field evidence", "Reports & public status"], green);
text(p1, "Live path", 42, 265, 17, blue, bold);
text(p1, "Public portal > District dashboard > Koraput River Bridge Project >", 42, 237, 11);
text(p1, "Overview > Documents > Compensation > R&R & Families > Legal > Tenders > Reports", 42, 219, 11);
text(p1, "Use the 'Switch demo role' control to show why authority and accountability matter.", 42, 165, 11, green, bold);
text(p1, "See live-demo-runbook.md for exact clicks, narrative and fallbacks.", 42, 64, 9, rgb(0.3, 0.38, 0.44));

const p2 = pdf.addPage([595, 842]);
header(p2, "Presenter Checklist", "Run this in a local demo database - never use real citizen information or personal integration credentials.");
text(p2, "Setup", 42, 690, 17, blue, bold);
['npm install', 'npm run db:push', 'npm run db:seed', 'npm run dev', 'Open http://localhost:3000 and /app'].forEach((item, i) => {
  p2.drawRectangle({ x: 45, y: 650 - i * 31, width: 13, height: 13, borderColor: blue, borderWidth: 1.5 });
  text(p2, item, 72, 651 - i * 31, 12);
});
text(p2, "What success looks like", 42, 475, 17, blue, bold);
['Public users can discover, request and track.', 'Staff operate one project record across the lifecycle.', 'Legal / permission controls are visible, not implicit.', 'Families, field evidence and delivery progress remain accountable.', 'Portfolio reports support timely intervention.'].forEach((item, i) => text(p2, `- ${item}`, 48, 443 - i * 28, 11));
text(p2, "Recovery lines", 42, 275, 17, blue, bold);
text(p2, "Map issue: 'The lifecycle and evidence remain available; this is the project's auditable record.'", 48, 245, 10);
text(p2, "Integration issue: 'External channels are optional; the demo uses seeded, non-personal data.'", 48, 219, 10);
text(p2, "Closing", 42, 155, 17, green, bold);
text(p2, "TN-GLMS turns a fragmented, legally sensitive process into a transparent,", 42, 128, 12, navy, bold);
text(p2, "role-aware and evidence-led public service lifecycle.", 42, 108, 12, navy, bold);
text(p2, "demo-kit/TN-GLMS-demo-handout.pdf", 42, 64, 9, rgb(0.3, 0.38, 0.44));

await writeFile(new URL("./TN-GLMS-demo-handout.pdf", import.meta.url), await pdf.save());
console.log("Created demo-kit/TN-GLMS-demo-handout.pdf");
