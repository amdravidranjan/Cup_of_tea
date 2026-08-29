import type { Stage } from "./workflow";
import type { DocumentCategory } from "./document-categories";

// Which document categories must exist by the time a project reaches a
// given stage. Matches the parent spec's DPR contents (Section 2.4: site
// investigation reports, design drawings, land acquisition/RoW plan, SIA)
// mapped onto the stage where each becomes a real blocker in practice —
// not every category is required, only the ones with a genuine real-world
// gate (e.g. an SIA report must exist before SIA can complete).
export const REQUIRED_DOCUMENTS_BY_STAGE: Partial<Record<Stage, DocumentCategory[]>> = {
  DRAFT: ["DPR", "DESIGN_DRAWING"],
  SCRUTINY: ["SITE_INVESTIGATION", "ROW_PLAN"],
  SIA: ["SIA_REPORT"],
};

export interface DocumentRequirementStatus {
  category: DocumentCategory;
  requiredAtStage: Stage;
  satisfied: boolean;
}

export function computeDocumentChecklist(
  currentStage: Stage,
  uploadedCategories: Set<DocumentCategory>,
  stages: Stage[]
): DocumentRequirementStatus[] {
  const currentIndex = stages.indexOf(currentStage);
  const result: DocumentRequirementStatus[] = [];
  for (const stage of stages) {
    if (stages.indexOf(stage) > currentIndex) break;
    const categories = REQUIRED_DOCUMENTS_BY_STAGE[stage];
    if (!categories) continue;
    for (const category of categories) {
      result.push({
        category,
        requiredAtStage: stage,
        satisfied: uploadedCategories.has(category),
      });
    }
  }
  return result;
}
