import Link from "next/link";
import { listContractors } from "@/db/tenders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ContractorsPage() {
  const contractors = await listContractors();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">
          Tenders
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground">Contractors</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every contractor who has been awarded a tender on this system.
        </p>
      </div>
      {contractors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contractors on record yet.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Registration #</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/app/contractors/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.registrationNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.specialization ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.rating ? c.rating.toFixed(1) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
