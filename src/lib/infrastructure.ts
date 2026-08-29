// Third Schedule (RFCTLARR Act, 2013) — infrastructure/amenities the
// Collector must ensure at every resettlement colony. Verbatim list from
// the parent spec's Section 2.1 research, not invented.
export type InfrastructureItem =
  | "ROADS"
  | "DRAINAGE"
  | "DRINKING_WATER"
  | "GRAZING_LAND"
  | "FAIR_PRICE_SHOP"
  | "GRAM_PANCHAYAT_GHAR"
  | "POST_OFFICE"
  | "IRRIGATION_FACILITY"
  | "TRANSPORT_FACILITY"
  | "BURIAL_GROUND"
  | "PLAYGROUND"
  | "ELECTRICITY"
  | "SCHOOL"
  | "ANGANWADI_CENTRE"
  | "PUBLIC_HEALTH_CENTRE"
  | "COMMUNITY_CENTRE"
  | "PLACE_OF_WORSHIP"
  | "VETERINARY_CENTRE";

export const INFRASTRUCTURE_ITEMS: InfrastructureItem[] = [
  "ROADS",
  "DRAINAGE",
  "DRINKING_WATER",
  "GRAZING_LAND",
  "FAIR_PRICE_SHOP",
  "GRAM_PANCHAYAT_GHAR",
  "POST_OFFICE",
  "IRRIGATION_FACILITY",
  "TRANSPORT_FACILITY",
  "BURIAL_GROUND",
  "PLAYGROUND",
  "ELECTRICITY",
  "SCHOOL",
  "ANGANWADI_CENTRE",
  "PUBLIC_HEALTH_CENTRE",
  "COMMUNITY_CENTRE",
  "PLACE_OF_WORSHIP",
  "VETERINARY_CENTRE",
];

export const INFRASTRUCTURE_LABELS: Record<InfrastructureItem, string> = {
  ROADS: "Roads",
  DRAINAGE: "Drainage",
  DRINKING_WATER: "Drinking water",
  GRAZING_LAND: "Grazing land",
  FAIR_PRICE_SHOP: "Fair-price shop",
  GRAM_PANCHAYAT_GHAR: "Gram Panchayat Ghar",
  POST_OFFICE: "Post office",
  IRRIGATION_FACILITY: "Irrigation facility",
  TRANSPORT_FACILITY: "Transport facility",
  BURIAL_GROUND: "Burial ground",
  PLAYGROUND: "Playground",
  ELECTRICITY: "Electricity",
  SCHOOL: "School",
  ANGANWADI_CENTRE: "Anganwadi centre",
  PUBLIC_HEALTH_CENTRE: "Public health centre",
  COMMUNITY_CENTRE: "Community centre",
  PLACE_OF_WORSHIP: "Place of worship",
  VETERINARY_CENTRE: "Veterinary centre",
};
