import type { Role } from "@/lib/workflow";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  district?: string;
  state?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u-central-1", name: "Priya Sharma (DoLR, Central)", role: "central" },
  {
    id: "u-state-1",
    name: "Anil Kumar (State Govt, Odisha)",
    role: "state",
    state: "Odisha",
  },
  {
    id: "u-state-2",
    name: "Lakshmi Narayanan (State Govt, Tamil Nadu)",
    role: "state",
    state: "Tamil Nadu",
  },
  {
    id: "u-district-1",
    name: "Sub-Collector, Koraput",
    role: "district",
    state: "Odisha",
    district: "Koraput",
  },
  { id: "u-agency-1", name: "NHAI Project Office", role: "agency" },
  {
    id: "u-field-1",
    name: "Field Verification Officer, Koraput",
    role: "field",
    state: "Odisha",
    district: "Koraput",
  },
];
