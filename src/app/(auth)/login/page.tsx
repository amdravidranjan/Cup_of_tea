'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

const DEMO_USERS = [
  { id: "u-central-1", label: "Central Authority (DoLR)", icon: "mdi:bank-outline", desc: "National oversight, dashboards, central approvals." },
  { id: "u-state-1", label: "State Government", icon: "mdi:office-building-outline", desc: "State level approvals, notifications, project screening." },
  { id: "u-district-1", label: "District Collector", icon: "mdi:badge-account-horizontal-outline", desc: "Primary LAO, compensation assessment, SLA tracking." },
  { id: "u-agency-1", label: "Requiring Body (NHAI/Metro)", icon: "mdi:transit-connection-variant", desc: "Project creation, funds deposit, DPR upload." },
  { id: "u-field-1", label: "Field Surveyor", icon: "mdi:map-marker-path", desc: "On-ground geo-tagging, possession marking." },
];

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

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
            <div className="ta text-lg text-gray-500 font-normal mt-1">அரசு அதிகாரி உள்நுழைவு</div>
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            For demonstration purposes, select a role below to authenticate securely via TN-GLMS SSO.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_USERS.map(u => (
              <button
                key={u.id}
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
              <a href="/" className="text-sm font-medium text-[#0b5394] hover:underline flex items-center gap-1">
                <Icon icon="mdi:arrow-left" width={16} /> Back to Public Portal
              </a>
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
