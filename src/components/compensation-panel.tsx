"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ParcelWithCompensation {
  id: string;
  village: string;
  areaHectares: number;
  compensation: { id: string; total: number; status: string } | null;
}

export function CompensationPanel({
  projectId,
  canManageRate,
  canAssess,
  datesResolved,
  currentRate,
  parcels,
}: {
  projectId: string;
  canManageRate: boolean;
  canAssess: boolean;
  datesResolved: boolean;
  currentRate: { ratePerHectare: number; multiplier: number } | null;
  parcels: ParcelWithCompensation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("rate");
    setError(null);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/compensation-rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratePerHectare: Number(formData.get("ratePerHectare")),
        multiplier: Number(formData.get("multiplier")),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to set rate");
      return;
    }
    router.refresh();
  }

  async function handleAssess(event: FormEvent<HTMLFormElement>, parcelId: string) {
    event.preventDefault();
    setPending(parcelId);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/parcels/${parcelId}/compensation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        assetsValue: Number(formData.get("assetsValue") ?? 0),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to assess compensation");
      return;
    }
    router.refresh();
  }

  async function handlePay(compensationId: string) {
    setPending(compensationId);
    setError(null);
    const res = await fetch(`/api/compensation/${compensationId}/pay`, { method: "POST" });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to mark paid");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManageRate && (
        <form
          onSubmit={handleSetRate}
          className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 p-3"
        >
          <div>
            <label className="block text-xs text-gray-500" htmlFor="ratePerHectare">
              Rate (Rs/hectare)
            </label>
            <input
              id="ratePerHectare"
              name="ratePerHectare"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.ratePerHectare}
              className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500" htmlFor="multiplier">
              Multiplier
            </label>
            <input
              id="multiplier"
              name="multiplier"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.multiplier ?? 1}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending !== null}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {pending === "rate" ? "Saving..." : "Set current rate"}
          </button>
        </form>
      )}

      {!currentRate && (
        <p className="text-sm text-gray-500">No compensation rate set for this district yet.</p>
      )}

      {currentRate && !datesResolved && (
        <p className="text-sm text-gray-500">
          Compensation can be assessed once the project reaches the AWARDED stage (needs both
          the SIA notification date and the award date from its own history).
        </p>
      )}

      {currentRate && parcels.length > 0 && (
        <ul className="space-y-2">
          {parcels.map((p) => (
            <li key={p.id} className="rounded-md border border-gray-200 p-3 text-sm">
              <p className="font-medium">
                {p.village} — {p.areaHectares} ha
              </p>
              {p.compensation ? (
                <div className="mt-1 flex items-center gap-3">
                  <span>
                    Total: Rs {p.compensation.total.toLocaleString("en-IN")} —{" "}
                    {p.compensation.status}
                  </span>
                  {canAssess && p.compensation.status === "ASSESSED" && (
                    <button
                      type="button"
                      onClick={() => handlePay(p.compensation!.id)}
                      disabled={pending !== null}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                    >
                      {pending === p.compensation.id ? "Working..." : "Mark paid"}
                    </button>
                  )}
                </div>
              ) : (
                canAssess &&
                datesResolved && (
                  <form
                    onSubmit={(e) => handleAssess(e, p.id)}
                    className="mt-1 flex items-end gap-2"
                  >
                    <div>
                      <label className="block text-xs text-gray-500">Assets value (Rs)</label>
                      <input
                        name="assetsValue"
                        type="number"
                        step="any"
                        defaultValue={0}
                        className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pending !== null}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
                    >
                      {pending === p.id ? "Assessing..." : "Assess compensation"}
                    </button>
                  </form>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
