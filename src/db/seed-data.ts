import type { Role } from "@/lib/workflow";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  district?: string;
  state?: string;
}

export const DEMO_USERS: DemoUser[] = [
  // --- Central & State ---
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
    id: "u-state-3",
    name: "Raghavendra Rao (State Govt, Karnataka)",
    role: "state",
    state: "Karnataka",
  },

  // --- District officers ---
  {
    id: "u-district-1",
    name: "Sub-Collector, Koraput",
    role: "district",
    state: "Odisha",
    district: "Koraput",
  },
  {
    id: "u-district-krishnagiri",
    name: "Sub-Collector, Krishnagiri",
    role: "district",
    state: "Tamil Nadu",
    district: "Krishnagiri",
  },
  {
    id: "u-district-chennai",
    name: "Sub-Collector, Chennai",
    role: "district",
    state: "Tamil Nadu",
    district: "Chennai",
  },
  {
    id: "u-district-sivaganga",
    name: "Sub-Collector, Sivaganga",
    role: "district",
    state: "Tamil Nadu",
    district: "Sivaganga",
  },
  {
    id: "u-district-thiruvallur",
    name: "Sub-Collector, Thiruvallur",
    role: "district",
    state: "Tamil Nadu",
    district: "Thiruvallur",
  },
  {
    id: "u-district-coimbatore",
    name: "Sub-Collector, Coimbatore",
    role: "district",
    state: "Tamil Nadu",
    district: "Coimbatore",
  },
  {
    id: "u-district-perambalur",
    name: "Sub-Collector, Perambalur",
    role: "district",
    state: "Tamil Nadu",
    district: "Perambalur",
  },
  {
    id: "u-district-madurai",
    name: "Sub-Collector, Madurai",
    role: "district",
    state: "Tamil Nadu",
    district: "Madurai",
  },
  {
    id: "u-district-trichy",
    name: "Sub-Collector, Tiruchirappalli",
    role: "district",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
  },
  {
    id: "u-district-thoothukudi",
    name: "Sub-Collector, Thoothukudi",
    role: "district",
    state: "Tamil Nadu",
    district: "Thoothukudi",
  },
  {
    id: "u-district-salem",
    name: "Sub-Collector, Salem",
    role: "district",
    state: "Tamil Nadu",
    district: "Salem",
  },
  {
    id: "u-district-vellore",
    name: "Sub-Collector, Vellore",
    role: "district",
    state: "Tamil Nadu",
    district: "Vellore",
  },
  {
    id: "u-district-bengaluru",
    name: "Sub-Collector, Bengaluru Urban",
    role: "district",
    state: "Karnataka",
    district: "Bengaluru Urban",
  },
  {
    id: "u-district-thanjavur",
    name: "Sub-Collector, Thanjavur",
    role: "district",
    state: "Tamil Nadu",
    district: "Thanjavur",
  },
  {
    id: "u-district-kanchipuram",
    name: "Sub-Collector, Kanchipuram",
    role: "district",
    state: "Tamil Nadu",
    district: "Kanchipuram",
  },

  // --- Agency ---
  { id: "u-agency-1", name: "NHAI Project Office", role: "agency" },

  // --- Field officers ---
  {
    id: "u-field-1",
    name: "Field Verification Officer, Koraput",
    role: "field",
    state: "Odisha",
    district: "Koraput",
  },
  {
    id: "u-field-2",
    name: "Field Verification Officer, Sivaganga",
    role: "field",
    state: "Tamil Nadu",
    district: "Sivaganga",
  },
  {
    id: "u-field-3",
    name: "Field Verification Officer, Chennai",
    role: "field",
    state: "Tamil Nadu",
    district: "Chennai",
  },
  {
    id: "u-field-4",
    name: "Field Verification Officer, Thiruvallur",
    role: "field",
    state: "Tamil Nadu",
    district: "Thiruvallur",
  },
];
