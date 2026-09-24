'use client';
import { L2 } from "@/components/l2";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

const DEMO_USERS = [
  { id: "u-central-1", label: "Central Authority (DoLR)", icon: "mdi:bank-outline", desc: "National oversight, dashboards, central approvals." },
  { id: "u-state-tn", label: "Tamil Nadu State Government", icon: "mdi:office-building-outline", desc: "State-level approvals, notifications, and project screening." },
  { id: "u-district-coimbatore", label: "District Collector (Coimbatore)", icon: "mdi:bridge", desc: "Bhavani river bridge at Sirumugai — upload village land records, map parcels, 3D view." },
  { id: "u-district-sivaganga", label: "District Collector (Sivaganga)", icon: "mdi:gavel", desc: "Cauvery–Vaigai–Gundar canal — court stay order, compensation, R&R of families." },
  { id: "u-district-krishnagiri", label: "District Collector (Krishnagiri)", icon: "mdi:badge-account-horizontal-outline", desc: "Chennai-Salem expressway district officer, compensation assessment, and SLA tracking." },
  { id: "u-agency-1", label: "Requiring Body (NHAI/Metro)", icon: "mdi:transit-connection-variant", desc: "Project creation, funds deposit, DPR upload." },
  { id: "u-field-krishnagiri", label: "Field Officer (Krishnagiri)", icon: "mdi:map-marker-path", desc: "Chennai-Salem expressway field verification, geo-tagging, and reporting." },
];

interface DemoSession {
  projectId: string | null;
  users?: { district: { id: string; name: string }; state: { id: string; name: string } };
  region?: { district: string; state: string; river: string; town: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  // A visitor who has started the walkthrough has their own Collector, in the
  // district their demo project was sited in. Offer that one first — it is
  // the login the guide will use, and the only one whose project is theirs.
  const [demo, setDemo] = useState<DemoSession | null>(null);

  useEffect(() => {
    fetch("/api/demo/start")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: DemoSession | null) => {
        if (body?.projectId) setDemo(body);
      })
      .catch(() => {});
  }, []);

  async function loginAs(userId: string) {
    setPending(userId);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    
    if (!res.ok) {
      toast.error("Login failed");
      setPending(null);
      return;
    }
    toast.success("Successfully logged in");
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#0b5394] text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Icon icon="mdi:shield-key-outline" width={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-[#1c2b3a]">
            Government Official Login
            <L2 className="ta text-lg text-gray-500 font-normal mt-1 block" ta="அரசு அதிகாரி உள்நுழைவு" />
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            For demonstration purposes, select a role below to authenticate securely via NILAMS SSO.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demo?.users && (
              <button
                data-tour="login-demo"
                onClick={() => loginAs(demo.users!.district.id)}
                disabled={pending !== null}
                className="relative flex flex-col text-left p-5 bg-amber-50 border-2 border-amber-400 hover:border-amber-500 rounded-lg transition-all hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 bg-white rounded-md shadow-sm border border-amber-200 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    {pending === demo.users.district.id ? (
                      <Icon icon="mdi:loading" width={20} className="animate-spin text-amber-600 group-hover:text-white" />
                    ) : (
                      <Icon icon="mdi:star-circle-outline" width={20} className="text-amber-600 group-hover:text-white" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded">
                    Your demo
                  </span>
                </div>
                <div className="font-semibold text-[#1c2b3a] mb-1">{demo.users.district.name}</div>
                <div className="text-xs text-amber-900/80 leading-relaxed">
                  {demo.region
                    ? `${demo.region.river} river bridge at ${demo.region.town} — your own copy, with nothing uploaded yet.`
                    : "Your own copy of the demo project."}
                </div>
              </button>
            )}
            {DEMO_USERS.map(u => (
              <button
                key={u.id}
                data-tour={`login-${u.id}`}
                onClick={() => loginAs(u.id)}
                disabled={pending !== null}
                className="relative flex flex-col text-left p-5 bg-[#f8fafc] border border-gray-200 hover:border-[#0b5394] rounded-lg transition-all hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0b5394]"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 bg-white rounded-md shadow-sm border border-gray-100 group-hover:bg-[#0b5394] group-hover:text-white transition-colors">
                    {pending === u.id ? (
                      <Icon icon="mdi:loading" width={20} className="animate-spin text-gray-500 group-hover:text-white" />
                    ) : (
                      <Icon icon={u.icon} width={20} className="text-[#0b5394] group-hover:text-white" />
                    )}
                  </div>
                  <Icon icon="mdi:arrow-right" width={18} className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-[#0b5394] transition-all transform group-hover:translate-x-1" />
                </div>
                <div className="font-semibold text-[#1c2b3a] mb-1">{u.label}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{u.desc}</div>
              </button>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm font-medium text-[#0b5394] hover:underline flex items-center gap-1">
                <Icon icon="mdi:arrow-left" width={16} /> Back to Public Portal
              </Link>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Icon icon="mdi:lock-outline" width={12} /> Secured by NIC ePramaan
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
