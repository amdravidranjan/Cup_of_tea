import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { schemaFor } from "@/lib/extraction/schemas";
import {
  buildTemplateCsv,
  buildTemplateGuide,
  templateFileName,
} from "@/lib/extraction/templates";

/**
 * Serves the upload template for a document category.
 *
 * Generated on demand from the schema the validator enforces, so the template
 * cannot describe a format the platform would then reject. `?format=guide`
 * returns the field-by-field explanation instead of the blank sheet.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category } = await params;
  const schema = schemaFor(category.toUpperCase());
  if (!schema) {
    return NextResponse.json(
      { error: "There is no upload template for that document type — it carries no structured records." },
      { status: 404 }
    );
  }

  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (format === "guide") {
    return new NextResponse(buildTemplateGuide(schema), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${templateFileName(schema, "md")}"`,
      },
    });
  }

  return new NextResponse(buildTemplateCsv(schema), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${templateFileName(schema, "csv")}"`,
    },
  });
}
