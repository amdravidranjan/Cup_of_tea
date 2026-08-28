import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProject, getStageHistory } from "@/db/projects";
import { getAvailableActions, STAGES, type Stage } from "@/lib/workflow";
import { ProjectActions } from "@/components/project-actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const history = await getStageHistory(id);
  const currentStage = project.stage as Stage;
  const availableActions = getAvailableActions(currentStage, session.role);
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-gray-500">{project.purpose}</p>
        <p className="text-sm text-gray-500">
          {project.district}, {project.state}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Stage</h3>
        <ol className="flex flex-wrap gap-2 text-xs">
          {STAGES.map((stage, i) => (
            <li
              key={stage}
              className={
                i === currentIndex
                  ? "rounded-full bg-blue-600 px-2 py-1 text-white"
                  : i < currentIndex
                    ? "rounded-full bg-gray-300 px-2 py-1 text-gray-700"
                    : "rounded-full border border-gray-300 px-2 py-1 text-gray-400"
              }
            >
              {stage}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Actions</h3>
        <ProjectActions projectId={project.id} availableActions={availableActions} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">History</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          {history.map((h) => (
            <li key={h.id}>
              {h.fromStage ?? "—"} → {h.toStage} ({h.action}) by {h.actorRole} on{" "}
              {h.createdAt.toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
