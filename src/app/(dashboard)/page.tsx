import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listProjects } from "@/db/projects";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const projects = await listProjects();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projects</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500">No projects yet.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="rounded-md border border-gray-200 p-3">
              <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                {p.name}
              </Link>
              <p className="text-sm text-gray-500">
                {p.district}, {p.state} — Stage: {p.stage}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
