"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Landmark, MapPinned, IndianRupee, AlertTriangle } from "lucide-react";
import { slaStatusTone, stageTone, toneHex } from "@/lib/status-colors";

interface PortfolioStatsProps {
  projectCount: number;
  stageCounts: Record<string, number>;
  totalAreaHectares: number;
  compensationPaid: number;
  compensationTotal: number;
  slaCounts: { onTrack: number; atRisk: number; breached: number };
}

interface StateBreakdownRowProps extends PortfolioStatsProps {
  state: string;
}

function formatLakh(amount: number): string {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

export function DashboardStats({
  stats,
  stateBreakdown,
}: {
  stats: PortfolioStatsProps;
  stateBreakdown?: StateBreakdownRowProps[];
}) {
  const stageData = Object.entries(stats.stageCounts)
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => ({ stage, count, fill: toneHex(stageTone(stage)) }));

  const slaData = [
    { name: "On track", value: stats.slaCounts.onTrack, fill: toneHex(slaStatusTone("on-track")) },
    { name: "At risk", value: stats.slaCounts.atRisk, fill: toneHex(slaStatusTone("at-risk")) },
    { name: "Breached", value: stats.slaCounts.breached, fill: toneHex(slaStatusTone("breached")) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Projects</CardTitle>
            <Landmark className="size-4 text-[#16294d]" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.projectCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Area under acquisition
            </CardTitle>
            <MapPinned className="size-4 text-emerald-700" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stats.totalAreaHectares.toFixed(1)} ha
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Compensation paid
            </CardTitle>
            <IndianRupee className="size-4 text-brand" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatLakh(stats.compensationPaid)} / {formatLakh(stats.compensationTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              SLA breaches
            </CardTitle>
            <AlertTriangle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.slaCounts.breached}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Projects by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {stageData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {stageData.map((entry) => (
                      <Cell key={entry.stage} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">SLA health</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {slaData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SLA-tracked milestones yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slaData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {slaData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {stateBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">State-wise breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Area (ha)</TableHead>
                  <TableHead>Compensation paid</TableHead>
                  <TableHead>SLA breaches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateBreakdown.map((row) => (
                  <TableRow key={row.state}>
                    <TableCell className="font-medium">{row.state}</TableCell>
                    <TableCell>{row.projectCount}</TableCell>
                    <TableCell>{row.totalAreaHectares.toFixed(1)}</TableCell>
                    <TableCell>{formatLakh(row.compensationPaid)}</TableCell>
                    <TableCell>{row.slaCounts.breached}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
