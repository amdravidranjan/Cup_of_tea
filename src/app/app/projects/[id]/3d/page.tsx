import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getProject } from "@/db/projects";
import { listParcels } from "@/db/parcels";
import { parseStoredGeometry, computeParcelsWithImpact } from "@/lib/geo";
import { Project3DView } from "@/components/project-3d-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Flagship 3D terrain showcase — scoped to a single polished project
// rather than built out generically for every project type.
const FLAGSHIP_PROJECT_ID = "p-demo-bridge-1";

export default async function Project3DPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  if (id !== FLAGSHIP_PROJECT_ID) notFound();

  const project = await getProject(id);
  if (!project) notFound();

  const alignment = parseStoredGeometry(project.geometryType, project.geometryGeoJson);
  const parcelList = await listParcels(id);
  const parcelsWithImpact = computeParcelsWithImpact(alignment, parcelList);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/projects/${id}`} className="text-xs text-brand hover:underline">
          ← Back to {project.name}
        </Link>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          3D terrain view — {project.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{project.purpose}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Draped satellite + real terrain</CardTitle>
        </CardHeader>
        <CardContent>
          <Project3DView alignment={alignment} parcels={parcelsWithImpact} />
        </CardContent>
      </Card>
    </div>
  );
}
