/**
 * One demo acquisition, resolved for whichever region the visitor picked.
 *
 * Tamil Nadu comes from the hand-drawn flagship; every other region is
 * generated. Callers — the seeder, the demo-kit builder, the walkthrough —
 * work from this shape and never need to know which of the two they got.
 */

import type { DemoRegion } from "@/lib/demo/regions";
import {
  FLAGSHIP,
  ALIGNMENT,
  BHAVANI_CENTRELINE,
  BRIDGE_SPAN,
  buildParcels,
  buildHolders,
  buildSurveyedFamilies,
  flagshipTotals,
  type FlagshipParcel,
  type FlagshipHolder,
  type SurveyedFamily,
} from "./flagship-project";
import {
  buildRegionParcels,
  buildRegionHolders,
  buildRegionSurveyedFamilies,
  regionAlignment,
  regionCentreline,
  regionSpan,
} from "./region-project";

export interface DemoProjectData {
  region: DemoRegion;
  name: string;
  purpose: string;
  state: string;
  district: string;
  taluk: string;
  requiringBody: string;
  dprNumber: string;
  ratePerHectare: number;
  alignment: [number, number][];
  centreline: [number, number][];
  span: { north: [number, number]; south: [number, number] };
  parcels: FlagshipParcel[];
  holders: FlagshipHolder[];
  families: SurveyedFamily[];
  totals: ReturnType<typeof flagshipTotals>;
}

export function demoProject(region: DemoRegion): DemoProjectData {
  const parcels = region.flagship ? buildParcels() : buildRegionParcels(region);
  const holders = region.flagship ? buildHolders(parcels) : buildRegionHolders(region, parcels);
  const families = region.flagship
    ? buildSurveyedFamilies(parcels)
    : buildRegionSurveyedFamilies(region, parcels);

  return {
    region,
    name: region.projectName,
    purpose: region.purpose,
    state: region.state,
    district: region.district,
    taluk: region.taluk,
    requiringBody: region.requiringBody,
    dprNumber: region.dprNumber,
    ratePerHectare: region.ratePerHectare,
    alignment: region.flagship ? [...ALIGNMENT] : regionAlignment(region),
    centreline: region.flagship ? [...BHAVANI_CENTRELINE] : regionCentreline(region),
    span: region.flagship ? BRIDGE_SPAN : regionSpan(region),
    parcels,
    holders,
    families,
    totals: flagshipTotals(parcels, holders, families),
  };
}

/** The flagship's own project id, kept for the pre-seeded Tamil Nadu case. */
export const FLAGSHIP_ID = FLAGSHIP.id;
