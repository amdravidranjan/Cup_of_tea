/**
 * Auto-drafted citizen notice text. This is a template/mail-merge
 * generator, not an LLM call — no external model is wired up here — but
 * it produces a genuinely usable plain-language first draft from the
 * project's own real data, which a district officer then edits and must
 * explicitly approve before it's ever turned into a document (see
 * notice-drafts schema: status starts DRAFT, requires an approvedBy).
 */
export function draftCitizenNotice(input: {
  projectName: string;
  purpose: string;
  district: string;
  state: string;
  stage: string;
  familyName?: string;
  village?: string;
}): string {
  const greeting = input.familyName ? `Dear ${input.familyName},` : "To the residents concerned,";
  const villageLine = input.village ? ` in ${input.village}` : "";

  const stageParagraph: Record<string, string> = {
    NOTIFIED: `This is to inform you that your land${villageLine} falls within the area notified for the "${input.projectName}" project (${input.purpose}). You have the right to file an objection within the statutory window if you believe this notification affects you incorrectly.`,
    DECLARED: `This is to inform you that the acquisition of land${villageLine} for the "${input.projectName}" project has now been formally declared. The next step is the award of compensation, and you will be contacted separately regarding the amount due to you.`,
    AWARDED: `This is to inform you that compensation for your land${villageLine}, acquired for the "${input.projectName}" project, has been awarded. Please visit your district office with identification documents to complete the payment process.`,
    RR_IN_PROGRESS: `This is to inform you that as part of the "${input.projectName}" project, you are eligible for rehabilitation and resettlement assistance. An officer will be in touch to help you complete the necessary registration.`,
  };

  const body =
    stageParagraph[input.stage] ??
    `This is to inform you of an update regarding the "${input.projectName}" project (${input.purpose}) in ${input.district}, ${input.state}, which may affect land${villageLine} that concerns you.`;

  return [
    greeting,
    "",
    body,
    "",
    "If you have questions or wish to raise an objection, you may contact your district land acquisition office, or file a grievance through the public portal using this project's page.",
    "",
    "Regards,",
    `Land Acquisition Office, ${input.district}`,
  ].join("\n");
}
