"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

interface ReportRow {
  id: string;
  name: string;
  purpose: string;
  state: string;
  district: string;
  stage: string;
  totalAreaHectares: number;
  parcelCount: number;
  compensationPaid: number;
  compensationTotal: number;
  slaDeclaration: string;
  slaCompensation: string;
  slaRRAward: string;
  slaInfrastructure: string;
  createdAt: string;
}

const FIELDS: { key: keyof ReportRow; label: string }[] = [
  { key: "name", label: "Project" },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
  { key: "stage", label: "Stage" },
  { key: "totalAreaHectares", label: "Area (ha)" },
  { key: "parcelCount", label: "Parcels" },
  { key: "compensationPaid", label: "Compensation Paid (Rs)" },
  { key: "compensationTotal", label: "Compensation Total (Rs)" },
  { key: "slaDeclaration", label: "SLA: Declaration" },
  { key: "slaCompensation", label: "SLA: Compensation" },
  { key: "slaRRAward", label: "SLA: R&R Award" },
  { key: "slaInfrastructure", label: "SLA: Infrastructure" },
  { key: "createdAt", label: "Created" },
];

const DEFAULT_FIELDS = new Set<keyof ReportRow>([
  "name",
  "state",
  "district",
  "stage",
  "totalAreaHectares",
  "compensationPaid",
]);

function formatCell(row: ReportRow, key: keyof ReportRow): string {
  const value = row[key];
  if (key === "createdAt") return formatDate(new Date(row.createdAt));
  if (key === "totalAreaHectares") return row.totalAreaHectares.toFixed(2);
  if (key === "compensationPaid" || key === "compensationTotal") {
    return Number(value).toLocaleString("en-IN");
  }
  return String(value);
}

function toCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ReportBuilder({ rows }: { rows: ReportRow[] }) {
  const [selected, setSelected] = useState<Set<keyof ReportRow>>(new Set(DEFAULT_FIELDS));

  const activeFields = useMemo(() => FIELDS.filter((f) => selected.has(f.key)), [selected]);

  function toggle(key: keyof ReportRow) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function downloadCsv() {
    const header = activeFields.map((f) => toCsvValue(f.label)).join(",");
    const lines = rows.map((row) =>
      activeFields.map((f) => toCsvValue(formatCell(row, f.key))).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `land-acquisition-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Fields</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(f.key)}
                onChange={() => toggle(f.key)}
                className="h-4 w-4"
              />
              {f.label}
            </label>
          ))}
        </div>
        <Button className="mt-3" onClick={downloadCsv} disabled={activeFields.length === 0}>
          Download CSV ({rows.length} projects)
        </Button>
      </div>

      {activeFields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {activeFields.map((f) => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {activeFields.map((f) => (
                    <TableCell key={f.key} className="whitespace-nowrap">
                      {formatCell(row, f.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
